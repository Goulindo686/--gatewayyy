import 'server-only';

import { parseUniqueDeliveryMasterKey } from '@/lib/unique-delivery-crypto-core';
import {
    decryptSupportMessageValue,
    deriveSupportChatEncryptionKey,
    encryptSupportMessageValue,
    type EncryptedSupportMessage,
} from '@/lib/support-chat-crypto-core';

let cachedEncryptionKey: Buffer | null = null;

function getEncryptionKey() {
    if (!cachedEncryptionKey) {
        const masterKey = parseUniqueDeliveryMasterKey(
            process.env.UNIQUE_DELIVERY_ENCRYPTION_KEY || '',
        );
        cachedEncryptionKey = deriveSupportChatEncryptionKey(masterKey);
    }
    return cachedEncryptionKey;
}

function messageAad(threadId: string, messageId: string) {
    return `thread:${threadId}:message:${messageId}:body:v1`;
}

export function assertSupportChatEncryptionConfigured() {
    getEncryptionKey();
}

export function encryptSupportMessage(
    threadId: string,
    messageId: string,
    plaintext: string,
) {
    return encryptSupportMessageValue(
        plaintext,
        messageAad(threadId, messageId),
        getEncryptionKey(),
    );
}

export function decryptSupportMessage(
    threadId: string,
    messageId: string,
    encrypted: EncryptedSupportMessage,
) {
    return decryptSupportMessageValue(
        encrypted,
        messageAad(threadId, messageId),
        getEncryptionKey(),
    );
}

export type { EncryptedSupportMessage };
