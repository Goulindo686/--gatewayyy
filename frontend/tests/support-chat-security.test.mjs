import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
    decryptSupportMessageValue,
    deriveSupportChatEncryptionKey,
    encryptSupportMessageValue,
} from '../src/lib/support-chat-crypto-core.ts';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('support messages use authenticated encryption bound to thread and message', () => {
    const key = deriveSupportChatEncryptionKey(randomBytes(32));
    const aad = 'thread:t1:message:m1:body:v1';
    const plaintext = 'Minha conta e senha secreta';
    const encrypted = encryptSupportMessageValue(plaintext, aad, key);

    assert.notEqual(encrypted.ciphertext, plaintext);
    assert.doesNotMatch(encrypted.ciphertext, /senha secreta/);
    assert.equal(decryptSupportMessageValue(encrypted, aad, key), plaintext);
    assert.throws(() => decryptSupportMessageValue(encrypted, `${aad}:other`, key));
    assert.throws(() => decryptSupportMessageValue({
        ...encrypted,
        authTag: randomBytes(16).toString('base64'),
    }, aad, key));
});

test('support tables deny direct clients and encrypted fields stay server-side', () => {
    const migration = read('../migrations/043_encrypt_support_messages.sql');
    const support = read('../src/lib/support.ts');
    const sellerThread = read('../src/app/api/support/threads/[id]/route.ts');

    assert.match(migration, /FORCE ROW LEVEL SECURITY/g);
    assert.match(migration, /REVOKE ALL ON TABLE public\.support_messages FROM PUBLIC, anon, authenticated/);
    assert.match(support, /encryptSupportMessage\(/);
    assert.match(support, /decryptSupportMessage\(/);
    assert.match(support, /body: SUPPORT_MESSAGE_PLACEHOLDER/);
    assert.doesNotMatch(sellerThread, /\.select\('\*'\)/);
    assert.doesNotMatch(sellerThread, /buyer_access_token_hash/);
});
