import 'server-only';

import { createHash, createHmac, randomInt, timingSafeEqual } from 'crypto';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { supabase } from '@/lib/db';
import { sendEmailVerificationCode } from '@/lib/email';

const CODE_TTL_MS = 10 * 60 * 1000;
const CHALLENGE_TTL_SECONDS = 15 * 60;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

type VerificationUser = {
    id: string;
    email: string;
    name?: string | null;
    role?: string | null;
    email_verified?: boolean | null;
    email_verification_token?: string | null;
};

type StoredVerification = {
    expiresAt: number;
    attempts: number;
    sentAt: number;
    digest: string;
};

type VerificationChallenge = JwtPayload & {
    purpose?: string;
    sub?: string;
};

export class EmailVerificationError extends Error {
    status: number;

    constructor(message: string, status = 400) {
        super(message);
        this.name = 'EmailVerificationError';
        this.status = status;
    }
}

function getVerificationSecret() {
    const baseSecret = process.env.EMAIL_VERIFICATION_SECRET || process.env.JWT_SECRET;
    if (!baseSecret) throw new Error('EMAIL_VERIFICATION_SECRET ou JWT_SECRET nao configurado');

    return createHash('sha256')
        .update(`${baseSecret}:goupay-email-verification`)
        .digest('hex');
}

function createCodeDigest(userId: string, code: string) {
    return createHmac('sha256', getVerificationSecret())
        .update(`${userId}:${code}`)
        .digest('hex');
}

function serializeVerification(value: StoredVerification) {
    return `v1:${value.expiresAt}:${value.attempts}:${value.sentAt}:${value.digest}`;
}

function parseVerification(value?: string | null): StoredVerification | null {
    if (!value) return null;

    const [version, expiresAt, attempts, sentAt, digest] = value.split(':');
    if (version !== 'v1' || !/^\d+$/.test(expiresAt) || !/^\d+$/.test(attempts) || !/^\d+$/.test(sentAt) || !/^[a-f0-9]{64}$/.test(digest)) {
        return null;
    }

    return {
        expiresAt: Number(expiresAt),
        attempts: Number(attempts),
        sentAt: Number(sentAt),
        digest,
    };
}

export function maskEmail(email: string) {
    const [localPart, domain = ''] = email.split('@');
    const visible = localPart.slice(0, Math.min(2, localPart.length));
    const hidden = '*'.repeat(Math.max(3, localPart.length - visible.length));
    return `${visible}${hidden}@${domain}`;
}

export function createEmailVerificationChallenge(userId: string) {
    return jwt.sign(
        { purpose: 'email-verification' },
        getVerificationSecret(),
        { subject: userId, expiresIn: CHALLENGE_TTL_SECONDS }
    );
}

export function readEmailVerificationChallenge(token: string) {
    try {
        const payload = jwt.verify(token, getVerificationSecret()) as VerificationChallenge;
        if (payload.purpose !== 'email-verification' || !payload.sub) {
            throw new Error('invalid challenge');
        }
        return payload.sub;
    } catch {
        throw new EmailVerificationError('Esta verificacao expirou. Entre novamente para receber outro codigo.', 401);
    }
}

export async function requestEmailVerification(user: VerificationUser) {
    if (!user.id || !user.email) {
        throw new EmailVerificationError('Conta sem email valido para verificacao');
    }

    const now = Date.now();
    const previous = parseVerification(user.email_verification_token);
    const retryAfter = previous
        ? Math.max(0, Math.ceil((previous.sentAt + RESEND_COOLDOWN_MS - now) / 1000))
        : 0;

    const challenge = createEmailVerificationChallenge(user.id);

    if (retryAfter > 0 && previous && previous.expiresAt > now) {
        return {
            sent: false,
            retryAfter,
            verificationToken: challenge,
            emailMasked: maskEmail(user.email),
        };
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const storedValue = serializeVerification({
        expiresAt: now + CODE_TTL_MS,
        attempts: 0,
        sentAt: now,
        digest: createCodeDigest(user.id, code),
    });

    const { error } = await supabase
        .from('users')
        .update({
            email_verified: false,
            email_verification_token: storedValue,
            updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

    if (error) {
        console.error('[EMAIL VERIFICATION] Error saving code:', error);
        throw new EmailVerificationError('Nao foi possivel preparar a verificacao agora.', 500);
    }

    try {
        await sendEmailVerificationCode({
            toEmail: user.email,
            userName: user.name || 'usuario',
            code,
            expiresInMinutes: CODE_TTL_MS / 60_000,
        });
    } catch (error) {
        await supabase
            .from('users')
            .update({ email_verification_token: null })
            .eq('id', user.id)
            .eq('email_verification_token', storedValue);
        throw error;
    }

    return {
        sent: true,
        retryAfter: RESEND_COOLDOWN_MS / 1000,
        verificationToken: challenge,
        emailMasked: maskEmail(user.email),
    };
}

export async function getVerificationUser(challengeToken: string): Promise<VerificationUser> {
    const userId = readEmailVerificationChallenge(challengeToken);
    const { data: user, error } = await supabase
        .from('users')
        .select('id, name, email, role, status, email_verified, email_verification_token')
        .eq('id', userId)
        .single();

    if (error || !user) throw new EmailVerificationError('Conta nao encontrada', 404);
    if (user.status === 'blocked') throw new EmailVerificationError('Conta bloqueada', 403);
    return user;
}

export async function verifyEmailCode(challengeToken: string, rawCode: string) {
    const code = String(rawCode || '').replace(/\D/g, '');
    if (!/^\d{6}$/.test(code)) {
        throw new EmailVerificationError('Digite os seis numeros do codigo');
    }

    const user = await getVerificationUser(challengeToken);
    if (user.email_verified === true) return user;

    const stored = parseVerification(user.email_verification_token);
    if (!stored) {
        throw new EmailVerificationError('Solicite um novo codigo para continuar');
    }

    if (stored.expiresAt <= Date.now()) {
        throw new EmailVerificationError('Este codigo expirou. Solicite um novo codigo.');
    }

    if (stored.attempts >= MAX_ATTEMPTS) {
        throw new EmailVerificationError('Limite de tentativas atingido. Solicite um novo codigo.', 429);
    }

    const receivedDigest = Buffer.from(createCodeDigest(user.id, code), 'hex');
    const expectedDigest = Buffer.from(stored.digest, 'hex');
    const matches = receivedDigest.length === expectedDigest.length && timingSafeEqual(receivedDigest, expectedDigest);

    if (!matches) {
        const attempts = stored.attempts + 1;
        await supabase
            .from('users')
            .update({ email_verification_token: serializeVerification({ ...stored, attempts }) })
            .eq('id', user.id)
            .eq('email_verification_token', user.email_verification_token);

        const remaining = Math.max(0, MAX_ATTEMPTS - attempts);
        throw new EmailVerificationError(
            remaining > 0
                ? `Codigo incorreto. Voce ainda tem ${remaining} tentativa${remaining === 1 ? '' : 's'}.`
                : 'Limite de tentativas atingido. Solicite um novo codigo.',
            remaining > 0 ? 400 : 429
        );
    }

    const { data: confirmedUser, error } = await supabase
        .from('users')
        .update({
            email_verified: true,
            email_verification_token: null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .eq('email_verification_token', user.email_verification_token)
        .select('id')
        .single();

    if (error || !confirmedUser) {
        console.error('[EMAIL VERIFICATION] Error confirming email:', error);
        throw new EmailVerificationError('O codigo foi substituido. Use o codigo mais recente enviado ao seu email.', 409);
    }

    return { ...user, email_verified: true, email_verification_token: null };
}
