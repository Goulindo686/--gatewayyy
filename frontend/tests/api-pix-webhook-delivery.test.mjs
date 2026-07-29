import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('merchant webhooks use a private durable outbox with atomic claims', () => {
    const sql = read('../migrations/027_add_outgoing_webhook_deliveries.sql');

    assert.match(sql, /CREATE TABLE IF NOT EXISTS outgoing_webhook_deliveries/);
    assert.match(sql, /UNIQUE INDEX[\s\S]*order_id,\s*event_type,\s*url/);
    assert.match(sql, /FOR UPDATE SKIP LOCKED/);
    assert.match(sql, /attempt_count < 12/);
    assert.match(sql, /ALTER TABLE outgoing_webhook_deliveries ENABLE ROW LEVEL SECURITY/);
    assert.match(sql, /GRANT EXECUTE[\s\S]*TO service_role/);
});

test('outgoing webhook delivery is idempotent, timed out and retryable', () => {
    const outbox = read('../src/lib/outgoing-webhooks.ts');
    const sender = read('../src/lib/webhooks.ts');

    assert.match(outbox, /onConflict:\s*'order_id,event_type,url'/);
    assert.match(outbox, /ignoreDuplicates:\s*true/);
    assert.match(outbox, /claim_outgoing_webhook_deliveries/);
    assert.match(outbox, /status:\s*'delivered'/);
    assert.match(outbox, /status:\s*'failed'/);
    assert.match(outbox, /nextAttemptAt/);
    assert.match(sender, /AbortController/);
    assert.match(sender, /timeoutMs/);
});

test('Pagar.me processing persists callback before marking a paid order complete', () => {
    const webhook = read('../src/app/api/webhooks/pagarme/route.ts');
    const enqueueAt = webhook.indexOf('await enqueueOrderWebhookDeliveries(order, newStatus)');
    const completedAt = webhook.indexOf('paid_processed_at: new Date().toISOString()');

    assert.ok(enqueueAt >= 0);
    assert.ok(completedAt > enqueueAt);
    assert.match(webhook, /processOutgoingWebhookDeliveries/);
    assert.doesNotMatch(webhook, /sendWebhookPayload/);
});

test('API Pix polling reconciles provider status and dispatches merchant callback', () => {
    const statusRoute = read('../src/app/api/v1/pix/[id]/route.ts');
    const reconciliation = read('../src/lib/order-payment-reconciliation.ts');
    const cron = read('../src/app/api/cron/sales-recovery/route.ts');

    assert.match(statusRoute, /reconcileOrderPayment\(order\.id\)/);
    assert.match(reconciliation, /enqueueAndProcessOrderWebhook/);
    assert.match(reconciliation, /ensureMerchantWebhook\(currentOrder,\s*'paid'\)/);
    assert.match(cron, /processOutgoingWebhookDeliveries\(\{\s*limit:\s*100\s*\}\)/);
    assert.match(cron, /outgoing_webhooks:\s*outgoingWebhooks/);
});

test('public API docs describe reconciliation and at-least-once delivery', () => {
    const docs = read('../src/app/docs/page.tsx');

    assert.match(docs, /Reconciliação automática/);
    assert.match(docs, /Entrega pelo menos uma vez/);
    assert.match(docs, /até 12 tentativas com intervalos progressivos/);
    assert.match(docs, /qualquer HTTP 2xx em até 10 segundos/);
    assert.match(docs, /transaction_id como chave única/);
});
