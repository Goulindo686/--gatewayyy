import {
    createCipheriv,
    createDecipheriv,
    hkdfSync,
    randomBytes,
} from 'node:crypto';

export const SUPPORT_CHAT_ENCRYPTION_VERSION = 1;

export type EncryptedSupportMessage = {
    ciphertext: string;
    iv: string;
    authTag: string;
    encryptionVersion: number;
};

function toBuffer(value: ArrayBuffer | Buffer): Buffer {
    return Buffer.isBuffer(value) ? value : Buffer.from(value);
}

export function deriveSupportChatEncryptionKey(masterKey: Buffer): Buffer {
    if (masterKey.length !== 32) {
        throw new Error('Support chat master key must contain exactly 32 bytes');
    }

    return toBuffer(hkdfSync(
        'sha256',
        masterKey,
        Buffer.from('goupay.support-chat.v1', 'utf8'),
        Buffer.from('aes-256-gcm', 'utf8'),
        32,
    ));
}

export function encryptSupportMessageValue(
    plaintext: string,
    aad: string,
    encryptionKey: Buffer,
): EncryptedSupportMessage {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);
    cipher.setAAD(Buffer.from(aad, 'utf8'));

    const ciphertext = Buffer.concat([
        cipher.update(Buffer.from(plaintext, 'utf8')),
        cipher.final(),
    ]);

    return {
        ciphertext: ciphertext.toString('base64'),
        iv: iv.toString('base64'),
        authTag: cipher.getAuthTag().toString('base64'),
        encryptionVersion: SUPPORT_CHAT_ENCRYPTION_VERSION,
    };
}

export function decryptSupportMessageValue(
    encrypted: EncryptedSupportMessage,
    aad: string,
    encryptionKey: Buffer,
): string {
    if (encrypted.encryptionVersion !== SUPPORT_CHAT_ENCRYPTION_VERSION) {
        throw new Error('Unsupported support chat encryption version');
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
    ]).toString('utf8');
}
