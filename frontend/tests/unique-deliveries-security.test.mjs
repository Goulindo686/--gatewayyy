import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
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
    assert.match(migration, /AFTER INSERT OR UPDATE ON public\.orders/);
    assert.doesNotMatch(migration, /INSERT OR UPDATE OF/);
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

test('delivery mode is exclusive and file delivery endpoints are removed', () => {
    const sellerRoute = read('../src/app/api/products/[id]/unique-deliveries/route.ts');
    const buyerRoute = read('../src/app/api/my-unique-deliveries/route.ts');
    const memberEntitlements = read('../src/lib/member-entitlements.ts');
    const webhook = read('../src/app/api/webhooks/pagarme/route.ts');
    const managementPage = read('../src/app/dashboard/products/[id]/unique-deliveries/page.tsx');

    assert.match(sellerRoute, /delivery_mode/);
    assert.match(sellerRoute, /requestedMode === 'unique'/);
    assert.doesNotMatch(sellerRoute, /unique_delivery_files/);
    assert.doesNotMatch(buyerRoute, /unique_delivery_files|download_url/);
    assert.match(memberEntitlements, /getUniqueDeliveryPurchaseKeys/);
    assert.match(memberEntitlements, /!isUniqueDelivery/);
    assert.match(memberEntitlements, /orderUsesUniqueDelivery/);
    assert.match(webhook, /grantPaidOrderMemberEntitlement/);
    assert.match(managementPage, /Área de Membros/);
    assert.match(managementPage, /Entrega Única/);
    assert.match(managementPage, /updateDeliveryMode/);
    assert.doesNotMatch(managementPage, /type="file"|uploadFile|Arquivos protegidos/);

    const sellerUploadRoute = new URL(
        '../src/app/api/products/[id]/unique-deliveries/[deliveryId]/files/route.ts',
        import.meta.url,
    );
    const buyerDownloadRoute = new URL(
        '../src/app/api/my-unique-deliveries/[fulfillmentId]/files/[fileId]/route.ts',
        import.meta.url,
    );
    assert.equal(existsSync(sellerUploadRoute), false);
    assert.equal(existsSync(buyerDownloadRoute), false);
});

test('member delivery is granted by every paid-order path without creating buyer accounts', () => {
    const memberEntitlements = read('../src/lib/member-entitlements.ts');
    const paidPaths = [
        read('../src/app/api/checkout/pay/route.ts'),
        read('../src/app/api/store-checkout/route.ts'),
        read('../src/app/api/webhooks/pagarme/route.ts'),
        read('../src/lib/order-payment-reconciliation.ts'),
    ];

    assert.match(memberEntitlements, /order\.status !== 'paid'/);
    assert.match(memberEntitlements, /orderUsesUniqueDelivery\(order\.id, order\.product_id\)/);
    assert.match(memberEntitlements, /\.eq\('email_verified', true\)/);
    assert.match(memberEntitlements, /\.from\('enrollments'\)[\s\S]+\.upsert\(/);
    assert.doesNotMatch(memberEntitlements, /\.from\('users'\)[\s\S]+\.insert\(/);

    for (const source of paidPaths) {
        assert.match(source, /grantPaidOrderMemberEntitlement/);
    }
});
