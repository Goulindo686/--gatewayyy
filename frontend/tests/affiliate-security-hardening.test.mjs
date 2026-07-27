import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

const checkoutRoutes = [
    '../src/app/api/checkout/pay/route.ts',
    '../src/app/api/store-checkout/route.ts',
    '../src/app/api/subscriptions/subscribe/route.ts',
];

test('migration creates private replay, idempotency and financial snapshot state', () => {
    const sql = read('../migrations/026_harden_affiliate_security.sql');

    assert.match(sql, /CREATE TABLE IF NOT EXISTS payment_attempts/);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS pagarme_webhook_events/);
    assert.match(sql, /provider_event_key TEXT/);
    assert.match(sql, /affiliate_chargeback_liable BOOLEAN NOT NULL DEFAULT FALSE/);
    assert.match(sql, /accepted_hold_days INTEGER/);
    assert.match(sql, /accepted_commission_on_bumps BOOLEAN/);
    assert.match(sql, /accepted_commission_on_renewals BOOLEAN/);
    assert.match(sql, /paid_processing_token TEXT/);
    assert.match(sql, /ALTER TABLE payment_attempts ENABLE ROW LEVEL SECURITY/);
    assert.match(sql, /ALTER TABLE pagarme_webhook_events ENABLE ROW LEVEL SECURITY/);
    assert.match(sql, /DROP POLICY IF EXISTS "affiliate_affiliations_affiliate_request"/);
    assert.doesNotMatch(sql, /CREATE POLICY "affiliate_programs_marketplace_read"/);
});

test('all payment entry points require durable idempotency before provider calls', () => {
    for (const path of checkoutRoutes) {
        const source = read(path);
        assert.match(source, /checkout_session_id/, path);
        assert.match(source, /beginPaymentAttempt/, path);
        assert.match(source, /completePaymentAttempt/, path);
        assert.match(source, /createProviderIdempotencyKey/, path);
        assert.match(source, /state === 'conflict'/, path);
        assert.match(source, /state === 'in_progress'/, path);
    }
});

test('sale and fee ledger entries are idempotent and recoverable', () => {
    const checkout = read('../src/app/api/checkout/pay/route.ts');
    const store = read('../src/app/api/store-checkout/route.ts');
    const webhook = read('../src/app/api/webhooks/pagarme/route.ts');

    assert.match(checkout, /provider_event_key:\s*`order-sale:/);
    assert.match(checkout, /provider_event_key:\s*`order-fee:/);
    assert.match(store, /provider_event_key:\s*`order-sale:/);
    assert.match(webhook, /if \(!updatedSales\?\.length\)/);
    assert.match(webhook, /provider_event_key:\s*`order-sale:/);
});

test('provider requests carry idempotency and affiliate liability explicitly', () => {
    const pagarme = read('../src/lib/pagarme.ts');

    assert.match(pagarme, /'Idempotency-Key'/);
    assert.match(pagarme, /\/recipients\/\$\{recipientId\}\/transfer-settings/);
    assert.match(pagarme, /transfer_interval:\s*settings\.transfer_interval \|\| 'daily'/);
    assert.match(pagarme, /transfer_day:\s*settings\.transfer_day \?\? 0/);
    assert.match(pagarme, /recipient_id:\s*affiliateId,[\s\S]*liable:\s*true/);
});

test('affiliate attribution cannot override a valid cookie or redirect off checkout', () => {
    const affiliates = read('../src/lib/affiliates.ts');
    const redirect = read('../src/app/a/[code]/route.ts');
    const storeCheckout = read('../src/app/api/store-checkout/route.ts');

    assert.match(affiliates, /const rawToken = cookieToken \|\| normalizeAffiliateReference/);
    assert.match(affiliates, /normalized === `\/checkout\/\$\{productId\}`/);
    assert.match(affiliates, /await ensureAffiliatePayoutControl/);
    assert.match(affiliates, /buyerPhone\.slice\(-10\) === affiliatePhone\.slice\(-10\)/);
    assert.match(storeCheckout, /allowCommissionOnBumps:\s*false/);
    assert.match(redirect, /httpOnly:\s*true/);
    assert.doesNotMatch(redirect, /searchParams\.set\(['"]aff_ref/);
});

test('stale affiliate state never blocks a valid direct purchase', () => {
    for (const path of checkoutRoutes) {
        const source = read(path);
        assert.doesNotMatch(source, /hasAffiliateIntent/, path);
        assert.doesNotMatch(
            source,
            /Nao foi possivel validar este link de afiliado/,
            path,
        );
        assert.match(source, /if \(affiliateAttribution\)/, path);
    }

    const checkoutPage = read('../src/app/checkout/[id]/page.tsx');
    const subscriptionPage = read('../src/app/subscribe/[planId]/page.tsx');
    assert.doesNotMatch(checkoutPage, /sessionStorage\.setItem\(getAffiliateStorageKey/);
    assert.doesNotMatch(subscriptionPage, /sessionStorage\.setItem\(affiliateStorageKey/);
    assert.match(checkoutPage, /sessionStorage\.removeItem\(getAffiliateStorageKey/);
    assert.match(subscriptionPage, /sessionStorage\.removeItem\(affiliateStorageKey/);
});

test('affiliate enrollment requires current accepted terms and expiring invites', () => {
    const request = read('../src/app/api/affiliates/request/route.ts');
    const invitation = read('../src/app/api/affiliates/invite/[code]/route.ts');
    const program = read('../src/app/api/affiliates/programs/[productId]/route.ts');

    assert.match(request, /body\.terms_accepted !== true/);
    assert.match(request, /accepted_terms_version/);
    assert.match(request, /accepted_commission_rate_bps/);
    assert.match(request, /accepted_hold_days/);
    assert.match(request, /accepted_commission_on_bumps/);
    assert.match(request, /accepted_commission_on_renewals/);
    assert.match(invitation, /invite_expires_at/);
    assert.match(program, /terms_version/);
    assert.match(program, /invite_expires_at/);
});

test('webhook is replay-safe and handles current chargeback events', () => {
    const webhook = read('../src/app/api/webhooks/pagarme/route.ts');

    assert.match(webhook, /beginWebhookEvent/);
    assert.match(webhook, /completeWebhookEvent/);
    assert.match(webhook, /failWebhookEvent/);
    assert.match(webhook, /chargeback\.received/);
    assert.match(webhook, /charge\.chargedback/);
    assert.match(webhook, /provider_event_key/);
    assert.match(webhook, /paid_processing_token/);
    assert.doesNotMatch(webhook, /Order commission webhook sync failed/);
    assert.doesNotMatch(webhook, /24\s*\*\s*60\s*\*\s*60/);
});

test('affiliate reserves are deducted in every withdrawal decision', () => {
    const balance = read('../src/app/api/withdrawals/balance/route.ts');
    const withdrawal = read('../src/app/api/withdrawals/route.ts');
    const approval = read('../src/app/api/admin/withdrawals/[id]/approve/route.ts');

    for (const [path, source] of [
        ['balance', balance],
        ['withdrawal', withdrawal],
        ['approval', approval],
    ]) {
        assert.match(source, /getAffiliateWithdrawalReserve/, path);
    }
    assert.match(approval, /WITHDRAWAL_PROVIDER_FEE_CENTS/);
    assert.match(approval, /protectedAvailable/);
});
