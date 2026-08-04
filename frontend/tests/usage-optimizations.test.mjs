import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('payment status keeps the three-second visible refresh without hidden-tab duplication', async () => {
    const paymentPage = await read('../src/app/store/[slug]/payment/[orderId]/page.tsx');

    assert.match(paymentPage, /}, 3000\);/);
    assert.match(paymentPage, /document\.visibilityState !== 'visible'/);
    assert.match(paymentPage, /pollingInFlightRef\.current/);
    assert.match(paymentPage, /visibilitychange/);
});

test('dashboard refreshes keep their cadence and share only concurrent requests', async () => {
    const [dashboardPage, api] = await Promise.all([
        read('../src/app/dashboard/page.tsx'),
        read('../src/lib/api.ts'),
    ]);

    assert.match(dashboardPage, /setInterval\(refreshConversion, 15_000\)/);
    assert.match(dashboardPage, /document\.visibilityState !== 'visible' \|\| requestInFlight/);
    assert.match(api, /const dashboardRequests = new Map/);
    assert.match(api, /dashboardRequests\.delete\(key\)/);
    assert.match(api, /typeof window === 'undefined'/);
});

test('payment reconciliation shares concurrent provider checks without caching results', async () => {
    const reconciliation = await read('../src/lib/order-payment-reconciliation.ts');

    assert.match(reconciliation, /const reconciliationsInFlight = new Map/);
    assert.match(reconciliation, /performOrderPaymentReconciliation\(orderId\)\.finally/);
    assert.match(reconciliation, /reconciliationsInFlight\.delete\(orderId\)/);
});

test('database backup builds the same SQL through linear chunks', async () => {
    const backup = await read('../src/app/api/cron/backup/route.ts');

    assert.match(backup, /const chunks = \[/);
    assert.match(backup, /chunks\.push\(`INSERT INTO/);
    assert.match(backup, /return chunks\.join\(''\)/);
});
