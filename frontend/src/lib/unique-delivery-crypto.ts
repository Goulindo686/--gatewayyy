import 'server-only';

import {
    canonicalUniqueDeliveryPayload,
    decryptUniqueDeliveryValue,
    deriveUniqueDeliveryKeys,
    encryptUniqueDeliveryValue,
    fingerprintUniqueDeliveryPayload,
    hashUniqueDeliveryAuditIdentifier,
    parseUniqueDeliveryMasterKey,
    type EncryptedValue,
    type UniqueDeliveryFileMetadata,
    type UniqueDeliveryPayload,
} from '@/lib/unique-delivery-crypto-core';

let cachedKeys: ReturnType<typeof deriveUniqueDeliveryKeys> | null = null;

function getKeys() {
    if (!cachedKeys) {
        const masterKey = parseUniqueDeliveryMasterKey(
            process.env.UNIQUE_DELIVERY_ENCRYPTION_KEY || '',
        );
        cachedKeys = deriveUniqueDeliveryKeys(masterKey);
    }
    return cachedKeys;
}

function payloadAad(productId: string, itemId: string) {
    return `product:${productId}:item:${itemId}:payload:v1`;
}

function fileAad(productId: string, itemId: string, fileId: string) {
    return `product:${productId}:item:${itemId}:file:${fileId}:bytes:v1`;
}

function fileMetadataAad(productId: string, itemId: string, fileId: string) {
    return `product:${productId}:item:${itemId}:file:${fileId}:metadata:v1`;
}

export function assertUniqueDeliveryEncryptionConfigured() {
    getKeys();
}

export function encryptUniqueDeliveryPayload(
    productId: string,
    itemId: string,
    payload: UniqueDeliveryPayload,
) {
    const keys = getKeys();
    const encrypted = encryptUniqueDeliveryValue(
        canonicalUniqueDeliveryPayload(payload),
        payloadAad(productId, itemId),
        keys.encryptionKey,
    );

    return {
        ...encrypted,
        fingerprint: fingerprintUniqueDeliveryPayload(
            productId,
            payload,
            keys.fingerprintKey,
        ),
    };
}

export function decryptUniqueDeliveryPayload(
    productId: string,
    itemId: string,
    encrypted: EncryptedValue,
): UniqueDeliveryPayload {
    const plaintext = decryptUniqueDeliveryValue(
        encrypted,
        payloadAad(productId, itemId),
        getKeys().encryptionKey,
    );
    return JSON.parse(plaintext.toString('utf8')) as UniqueDeliveryPayload;
}

export function encryptUniqueDeliveryFile(
    productId: string,
    itemId: string,
    fileId: string,
    bytes: Buffer,
    metadata: UniqueDeliveryFileMetadata,
) {
    const encryptionKey = getKeys().encryptionKey;
    return {
        bytes: encryptUniqueDeliveryValue(
            bytes,
            fileAad(productId, itemId, fileId),
            encryptionKey,
        ),
        metadata: encryptUniqueDeliveryValue(
            JSON.stringify(metadata),
            fileMetadataAad(productId, itemId, fileId),
            encryptionKey,
        ),
    };
}

export function decryptUniqueDeliveryFile(
    productId: string,
    itemId: string,
    fileId: string,
    encryptedBytes: EncryptedValue,
    encryptedMetadata: EncryptedValue,
) {
    const encryptionKey = getKeys().encryptionKey;
    const bytes = decryptUniqueDeliveryValue(
        encryptedBytes,
        fileAad(productId, itemId, fileId),
        encryptionKey,
    );
    const metadata = JSON.parse(
        decryptUniqueDeliveryValue(
            encryptedMetadata,
            fileMetadataAad(productId, itemId, fileId),
            encryptionKey,
        ).toString('utf8'),
    ) as UniqueDeliveryFileMetadata;

    return { bytes, metadata };
}

export function decryptUniqueDeliveryFileMetadata(
    productId: string,
    itemId: string,
    fileId: string,
    encryptedMetadata: EncryptedValue,
) {
    return JSON.parse(
        decryptUniqueDeliveryValue(
            encryptedMetadata,
            fileMetadataAad(productId, itemId, fileId),
            getKeys().encryptionKey,
        ).toString('utf8'),
    ) as UniqueDeliveryFileMetadata;
}

export function hashUniqueDeliveryIp(ip: string) {
    return hashUniqueDeliveryAuditIdentifier(ip, getKeys().auditKey);
}

export type {
    EncryptedValue,
    UniqueDeliveryFileMetadata,
    UniqueDeliveryPayload,
};
