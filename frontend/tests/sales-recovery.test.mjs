import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const route = readFileSync(
    new URL('../src/app/api/sales-recovery/route.ts', import.meta.url),
    'utf8',
);

test('sales recovery avoids the ambiguous orders-to-products embed', () => {
    assert.doesNotMatch(route, /products\(name, checkout_settings\)/);
    assert.match(route, /const productById = new Map/);
    assert.match(route, /productById\.get\(order\.product_id\)/);
});

test('sales recovery keeps checkout settings server-side', () => {
    assert.match(route, /status, checkout_settings/);
    assert.doesNotMatch(route, /products: \(products \|\| \[\]\)\.map\(\(product: ProductRow\) => \(\{\s*\.\.\.product/);
});
