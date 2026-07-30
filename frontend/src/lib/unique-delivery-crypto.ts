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

export function hashUniqueDeliveryIp(ip: string) {
    return hashUniqueDeliveryAuditIdentifier(ip, getKeys().auditKey);
}

export type {
    EncryptedValue,
    UniqueDeliveryPayload,
};
