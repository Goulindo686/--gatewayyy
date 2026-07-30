import {
    createCipheriv,
    createDecipheriv,
    createHmac,
    hkdfSync,
    randomBytes,
} from 'node:crypto';

export const UNIQUE_DELIVERY_ENCRYPTION_VERSION = 1;

export type UniqueDeliveryPayload = {
    access: string;
    instructions: string;
    customText: string;
    redirectUrl: string;
    notes: string;
};

export type UniqueDeliveryFileMetadata = {
    filename: string;
    contentType: string;
};

export type EncryptedValue = {
    ciphertext: string;
    iv: string;
    authTag: string;
    encryptionVersion: number;
};

type DerivedKeys = {
    encryptionKey: Buffer;
    fingerprintKey: Buffer;
    auditKey: Buffer;
};

function toBuffer(value: ArrayBuffer | Buffer): Buffer {
    return Buffer.isBuffer(value) ? value : Buffer.from(value);
}

export function parseUniqueDeliveryMasterKey(value: string): Buffer {
    const raw = String(value || '').trim();
    if (!raw) {
        throw new Error('UNIQUE_DELIVERY_ENCRYPTION_KEY is not configured');
    }

    const decoded = /^[a-f0-9]{64}$/i.test(raw)
        ? Buffer.from(raw, 'hex')
        : Buffer.from(raw, 'base64');

    if (decoded.length !== 32) {
        throw new Error('UNIQUE_DELIVERY_ENCRYPTION_KEY must contain exactly 32 bytes');
    }

    return decoded;
}

export function deriveUniqueDeliveryKeys(masterKey: Buffer): DerivedKeys {
    if (masterKey.length !== 32) {
        throw new Error('Unique delivery master key must contain exactly 32 bytes');
    }

    const salt = Buffer.from('goupay.unique-deliveries.v1', 'utf8');
    return {
        encryptionKey: toBuffer(hkdfSync(
            'sha256',
            masterKey,
            salt,
            Buffer.from('aes-256-gcm', 'utf8'),
            32,
        )),
        fingerprintKey: toBuffer(hkdfSync(
            'sha256',
            masterKey,
            salt,
            Buffer.from('duplicate-fingerprint', 'utf8'),
            32,
        )),
        auditKey: toBuffer(hkdfSync(
            'sha256',
            masterKey,
            salt,
            Buffer.from('audit-identifiers', 'utf8'),
            32,
        )),
    };
}

export function encryptUniqueDeliveryValue(
    plaintext: Buffer | string,
    aad: string,
    encryptionKey: Buffer,
): EncryptedValue {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);
    cipher.setAAD(Buffer.from(aad, 'utf8'));

    const ciphertext = Buffer.concat([
        cipher.update(typeof plaintext === 'string' ? Buffer.from(plaintext, 'utf8') : plaintext),
        cipher.final(),
    ]);

    return {
        ciphertext: ciphertext.toString('base64'),
        iv: iv.toString('base64'),
        authTag: cipher.getAuthTag().toString('base64'),
        encryptionVersion: UNIQUE_DELIVERY_ENCRYPTION_VERSION,
    };
}

export function decryptUniqueDeliveryValue(
    encrypted: EncryptedValue,
    aad: string,
    encryptionKey: Buffer,
): Buffer {
    if (encrypted.encryptionVersion !== UNIQUE_DELIVERY_ENCRYPTION_VERSION) {
        throw new Error('Unsupported unique delivery encryption version');
    }

    const decipher = createDecipheriv(
        'aes-256-gcm',
        encryptionKey,
        Buffer.from(encrypted.iv, 'base64'),
    );
    decipher.setAAD(Buffer.from(aad, 'utf8'));
    decipher.setAuthTag(Buffer.from(encrypted.authTag, 'base64'));

    return Buffer.concat([
        decipher.update(Buffer.from(encrypted.ciphertext, 'base64')),
        decipher.final(),
    ]);
}

export function canonicalUniqueDeliveryPayload(payload: UniqueDeliveryPayload): string {
    return JSON.stringify({
        access: payload.access,
        instructions: payload.instructions,
        customText: payload.customText,
        redirectUrl: payload.redirectUrl,
        notes: payload.notes,
    });
}

export function fingerprintUniqueDeliveryPayload(
    productId: string,
    payload: UniqueDeliveryPayload,
    fingerprintKey: Buffer,
): string {
    const normalizedAccess = payload.access.replace(/\r\n/g, '\n').trim();
    return createHmac('sha256', fingerprintKey)
        .update(productId, 'utf8')
        .update('\0', 'utf8')
        .update(normalizedAccess, 'utf8')
        .digest('hex');
}

export function hashUniqueDeliveryAuditIdentifier(
    value: string,
    auditKey: Buffer,
): string {
    return createHmac('sha256', auditKey)
        .update(String(value || ''), 'utf8')
        .digest('hex');
}
