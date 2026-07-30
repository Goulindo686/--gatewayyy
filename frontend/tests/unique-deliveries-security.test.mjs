import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
    decryptUniqueDeliveryValue,
    deriveUniqueDeliveryKeys,
    encryptUniqueDeliveryValue,
    fingerprintUniqueDeliveryPayload,
    parseUniqueDeliveryMasterKey,
} from '../src/lib/unique-delivery-crypto-core.ts';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('unique delivery payloads use authenticated encryption and reject tampering', () => {
    const master = randomBytes(32);
    const keys = deriveUniqueDeliveryKeys(master);
    const aad = 'product:p:item:i:payload:v1';
    const plaintext = JSON.stringify({
        access: 'login: secret@example.com\nsenha: ultra-secret',
    });

    const encrypted = encryptUniqueDeliveryValue(plaintext, aad, keys.encryptionKey);
    assert.notEqual(encrypted.ciphertext, plaintext);
    assert.doesNotMatch(encrypted.ciphertext, /ultra-secret/);
    assert.equal(
        decryptUniqueDeliveryValue(encrypted, aad, keys.encryptionKey).toString('utf8'),
        plaintext,
    );

    const tampered = {
        ...encrypted,
        authTag: Buffer.from(randomBytes(16)).toString('base64'),
    };
    assert.throws(() => decryptUniqueDeliveryValue(tampered, aad, keys.encryptionKey));
    assert.throws(() => decryptUniqueDeliveryValue(encrypted, `${aad}:other`, keys.encryptionKey));
});

test('master keys must contain exactly 256 bits', () => {
    const key = randomBytes(32);
    assert.deepEqual(parseUniqueDeliveryMasterKey(key.toString('base64')), key);
    assert.deepEqual(parseUniqueDeliveryMasterKey(key.toString('hex')), key);
    assert.throws(() => parseUniqueDeliveryMasterKey(randomBytes(16).toString('base64')));
    assert.throws(() => parseUniqueDeliveryMasterKey(''));
});

test('duplicate fingerprints are keyed and scoped to a product', () => {
    const keys = deriveUniqueDeliveryKeys(randomBytes(32));
    const payload = {
        access: 'KEY-123',
        instructions: '',
        customText: '',
        redirectUrl: '',
        notes: '',
    };
    const first = fingerprintUniqueDeliveryPayload('product-a', payload, keys.fingerprintKey);
    const repeat = fingerprintUniqueDeliveryPayload('product-a', payload, keys.fingerprintKey);
    const otherProduct = fingerprintUniqueDeliveryPayload('product-b', payload, keys.fingerprintKey);
    const otherInstructions = fingerprintUniqueDeliveryPayload(
        'product-a',
        { ...payload, instructions: 'texto diferente' },
        keys.fingerprintKey,
    );
    assert.equal(first, repeat);
    assert.equal(first, otherInstructions);
    assert.notEqual(first, otherProduct);
    assert.doesNotMatch(first, /KEY-123/);
});

test('database allocation is atomic, one-time and service-role only', () => {
    const migration = read('../migrations/028_add_unique_deliveries.sql');
    assert.match(migration, /FOR UPDATE SKIP LOCKED/);
    assert.match(migration, /UNIQUE \(item_id\)/);
    assert.match(migration, /UNIQUE \(order_id, product_id\)/);
    assert.match(migration, /status = 'available'/);
    assert.match(migration, /status = 'assigned'/);
    assert.match(migration, /AFTER INSERT OR UPDATE OF status ON public\.orders/);
    assert.match(migration, /NEW\.status = 'paid'/);
    assert.match(migration, /FORCE ROW LEVEL SECURITY/g);
    assert.match(
        migration,
        /REVOKE ALL ON FUNCTION public\.assign_unique_delivery_for_product[\s\S]+FROM PUBLIC, anon, authenticated/,
    );
    assert.doesNotMatch(migration, /CREATE POLICY[\s\S]+unique_delivery_items/i);
});

test('plaintext and decryption stay out of seller and public order APIs', () => {
    const sellerRoute = read('../src/app/api/products/[id]/unique-deliveries/route.ts');
    const publicOrderRoute = read('../src/app/api/checkout/order/[id]/route.ts');
    const buyerRoute = read('../src/app/api/my-unique-deliveries/route.ts');

    assert.doesNotMatch(sellerRoute, /decryptUniqueDeliveryPayload/);
    assert.doesNotMatch(publicOrderRoute, /payload_ciphertext|payload_auth_tag|unique_delivery_items/);
    assert.match(buyerRoute, /auth\.user\.email_verified !== true/);
    assert.match(buyerRoute, /\.eq\('buyer_email_normalized', normalizedEmail\)/);
    assert.match(buyerRoute, /\.eq\('status', 'paid'\)/);

    const paidCheck = buyerRoute.indexOf(".eq('status', 'paid')");
    const decryptCall = buyerRoute.indexOf('decryptUniqueDeliveryPayload(');
    assert.ok(paidCheck >= 0 && decryptCall > paidCheck);
});

test('the encryption key has no public frontend alias', () => {
    const env = read('../.env.local.example');
    const cryptoFacade = read('../src/lib/unique-delivery-crypto.ts');
    assert.doesNotMatch(env, /NEXT_PUBLIC_UNIQUE_DELIVERY/);
    assert.doesNotMatch(cryptoFacade, /NEXT_PUBLIC_UNIQUE_DELIVERY/);
});
