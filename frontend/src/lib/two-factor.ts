import 'server-only';

import {
    createCipheriv,
    createDecipheriv,
    createHash,
    createHmac,
    randomBytes,
    timingSafeEqual,
} from 'crypto';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TOTP_PERIOD_SECONDS = 30;
const TOTP_DIGITS = 6;
const RECOVERY_CODE_COUNT = 8;

type TwoFactorChallenge = JwtPayload & {
    purpose?: string;
    sub?: string;
};

export type TwoFactorUser = {
    id: string;
    name?: string | null;
    email: string;
    role?: string | null;
    status?: string | null;
    password_hash?: string | null;
    password?: string | null;
    two_factor_enabled?: boolean | null;
    two_factor_secret?: string | null;
    two_factor_recovery_codes?: unknown;
    two_factor_confirmed_at?: string | null;
};

export class TwoFactorError extends Error {
    status: number;

    constructor(message: string, status = 400) {
        super(message);
        this.name = 'TwoFactorError';
        this.status = status;
    }
}

function getBaseSecret() {
    const secret = process.env.TWO_FACTOR_ENCRYPTION_KEY || process.env.JWT_SECRET;
    if (!secret) throw new Error('TWO_FACTOR_ENCRYPTION_KEY ou JWT_SECRET nao configurado');
    return secret;
}

function deriveKey(context: string) {
    return createHash('sha256')
        .update(`${getBaseSecret()}:${context}`)
        .digest();
}

function encodeBase32(bytes: Buffer) {
    let bits = '';
    for (const byte of bytes) bits += byte.toString(2).padStart(8, '0');

    let encoded = '';
    for (let index = 0; index < bits.length; index += 5) {
        const chunk = bits.slice(index, index + 5).padEnd(5, '0');
        encoded += BASE32_ALPHABET[Number.parseInt(chunk, 2)];
    }
    return encoded;
}

function decodeBase32(value: string) {
    const normalized = value.toUpperCase().replace(/[^A-Z2-7]/g, '');
    let bits = '';

    for (const char of normalized) {
        const index = BASE32_ALPHABET.indexOf(char);
        if (index < 0) throw new TwoFactorError('Segredo TOTP invalido', 500);
        bits += index.toString(2).padStart(5, '0');
    }

    const bytes: number[] = [];
    for (let index = 0; index + 8 <= bits.length; index += 8) {
        bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
    }
    return Buffer.from(bytes);
}

function safeStringEqual(left: string, right: string) {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function generateTotp(secret: string, timestampMs = Date.now()) {
    const counter = Math.floor(timestampMs / 1000 / TOTP_PERIOD_SECONDS);
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigUInt64BE(BigInt(counter));

    const digest = createHmac('sha1', decodeBase32(secret))
        .update(counterBuffer)
        .digest();
    const offset = digest[digest.length - 1] & 0x0f;
    const binary = (digest.readUInt32BE(offset) & 0x7fffffff) % (10 ** TOTP_DIGITS);
    return binary.toString().padStart(TOTP_DIGITS, '0');
}

function normalizeRecoveryCode(value: string) {
    const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return normalized.length === 8 ? `${normalized.slice(0, 4)}-${normalized.slice(4)}` : normalized;
}

function hashRecoveryCode(userId: string, code: string) {
    return createHmac('sha256', deriveKey('recovery-codes'))
        .update(`${userId}:${normalizeRecoveryCode(code)}`)
        .digest('hex');
}

function parseRecoveryHashes(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === 'string' && /^[a-f0-9]{64}$/.test(item));
}

export function generateTwoFactorSecret() {
    return encodeBase32(randomBytes(20));
}

export function formatTwoFactorSecret(secret: string) {
    return secret.match(/.{1,4}/g)?.join(' ') || secret;
}

export function buildOtpAuthUri(secret: string, email: string) {
    const issuer = 'GouPay';
    const label = encodeURIComponent(`${issuer}:${email}`);
    const params = new URLSearchParams({
        secret,
        issuer,
        algorithm: 'SHA1',
        digits: String(TOTP_DIGITS),
        period: String(TOTP_PERIOD_SECONDS),
    });
    return `otpauth://totp/${label}?${params.toString()}`;
}

export function verifyTotp(secret: string, rawCode: string, window = 1) {
    const code = String(rawCode || '').replace(/\D/g, '');
    if (!/^\d{6}$/.test(code)) return false;

    const now = Date.now();
    for (let drift = -window; drift <= window; drift += 1) {
        const expected = generateTotp(secret, now + drift * TOTP_PERIOD_SECONDS * 1000);
        if (safeStringEqual(expected, code)) return true;
    }
    return false;
}

export function encryptTwoFactorSecret(secret: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', deriveKey('secret-encryption'), iv);
    const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `v1.${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptTwoFactorSecret(value: string) {
    try {
        const [version, ivValue, tagValue, encryptedValue] = value.split('.');
        if (version !== 'v1' || !ivValue || !tagValue || !encryptedValue) throw new Error('invalid payload');
        const decipher = createDecipheriv('aes-256-gcm', deriveKey('secret-encryption'), Buffer.from(ivValue, 'base64url'));
        decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
        return Buffer.concat([
            decipher.update(Buffer.from(encryptedValue, 'base64url')),
            decipher.final(),
        ]).toString('utf8');
    } catch {
        throw new TwoFactorError('Nao foi possivel ler a configuracao do autenticador', 500);
    }
}

export function createRecoveryCodes(userId: string) {
    const codes = Array.from({ length: RECOVERY_CODE_COUNT }, () => {
        let value = '';
        const bytes = randomBytes(8);
        for (let index = 0; index < 8; index += 1) {
            value += RECOVERY_ALPHABET[bytes[index] % RECOVERY_ALPHABET.length];
        }
        return `${value.slice(0, 4)}-${value.slice(4)}`;
    });

    return {
        codes,
        hashes: codes.map((code) => hashRecoveryCode(userId, code)),
    };
}

export function verifySecondFactor(user: TwoFactorUser, rawCode: string) {
    if (!user.two_factor_secret) throw new TwoFactorError('2FA nao esta configurado nesta conta', 409);
    const secret = decryptTwoFactorSecret(user.two_factor_secret);

    if (verifyTotp(secret, rawCode)) {
        return { valid: true, usedRecoveryCode: false, remainingRecoveryCodes: parseRecoveryHashes(user.two_factor_recovery_codes) };
    }

    const recoveryHashes = parseRecoveryHashes(user.two_factor_recovery_codes);
    const receivedHash = hashRecoveryCode(user.id, rawCode);
    const matchedIndex = recoveryHashes.findIndex((hash) => safeStringEqual(hash, receivedHash));
    if (matchedIndex < 0) {
        return { valid: false, usedRecoveryCode: false, remainingRecoveryCodes: recoveryHashes };
    }

    return {
        valid: true,
        usedRecoveryCode: true,
        remainingRecoveryCodes: recoveryHashes.filter((_, index) => index !== matchedIndex),
    };
}

export function createTwoFactorChallenge(userId: string) {
    return jwt.sign(
        { purpose: 'two-factor-login' },
        deriveKey('login-challenge'),
        { subject: userId, expiresIn: 5 * 60 }
    );
}

export function readTwoFactorChallenge(token: string) {
    try {
        const payload = jwt.verify(token, deriveKey('login-challenge')) as TwoFactorChallenge;
        if (payload.purpose !== 'two-factor-login' || !payload.sub) throw new Error('invalid challenge');
        return payload.sub;
    } catch {
        throw new TwoFactorError('Esta verificacao expirou. Entre novamente.', 401);
    }
}

export function recoveryCodeCount(value: unknown) {
    return parseRecoveryHashes(value).length;
}
