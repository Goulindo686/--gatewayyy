import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

const paymentRoutes = [
    '../src/app/api/checkout/pay/route.ts',
    '../src/app/api/checkout/order/[id]/route.ts',
    '../src/app/api/subscriptions/subscribe/route.ts',
];

const paymentPages = [
    '../src/app/checkout/[id]/page.tsx',
    '../src/app/store/[slug]/payment/[orderId]/page.tsx',
    '../src/app/subscribe/[planId]/page.tsx',
];

test('payment endpoints never authenticate or create the buyer account', () => {
    for (const path of paymentRoutes) {
        const source = read(path);
        assert.doesNotMatch(source, /\bgenerateToken\b/, path);
        assert.doesNotMatch(source, /\bhashPassword\b/, path);
        assert.doesNotMatch(source, /\bresponse\.auth\b/, path);
        assert.doesNotMatch(source, /\.from\(['"]users['"]\)\s*\n?\s*\.insert\(/, path);
    }
});

test('public order status does not expose buyer identity', () => {
    const source = read('../src/app/api/checkout/order/[id]/route.ts');
    const publicSelection = source.slice(0, source.indexOf('// Sincroniza integrações'));
    assert.doesNotMatch(publicSelection, /\bbuyer_email\b/);
    assert.doesNotMatch(publicSelection, /\bbuyer_name\b/);
});

test('payment pages never store an authentication token or auto-redirect', () => {
    for (const path of paymentPages) {
        const source = read(path);
        assert.doesNotMatch(source, /autoLoginAndRedirect/, path);
        assert.doesNotMatch(source, /localStorage\.setItem\(['"]token['"]/, path);
        assert.match(source, /Criar conta para acessar/, path);
    }
});

test('legacy checkout accounts still require registration and email verification', () => {
    const source = read('../src/app/api/auth/register/route.ts');
    assert.match(source, /isLegacyCheckoutAccount/);
    assert.match(source, /email_verified !== true/);
    assert.match(source, /requestEmailVerification/);
    assert.doesNotMatch(source, /syncMemberEntitlements/);
    assert.doesNotMatch(source, /\bgenerateToken\b/);
});

test('purchased products are linked only after email verification', () => {
    const source = read('../src/app/api/auth/email-verification/verify/route.ts');
    const verificationIndex = source.indexOf('await verifyEmailCode');
    const entitlementIndex = source.indexOf('await syncMemberEntitlements');
    assert.ok(verificationIndex >= 0);
    assert.ok(entitlementIndex > verificationIndex);
});
