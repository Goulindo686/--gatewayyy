import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('sales page applies its visible default period on the first request', () => {
    const page = read('../src/app/dashboard/sales/page.tsx');

    assert.match(page, /buildDateRangeFilters\('last7'\)/);
    assert.match(page, /appliedFilters\.current = initialFilters/);
    assert.doesNotMatch(page, /useEffect\(\(\) => \{ loadSales\(\); \}/);
});

test('sales history renders a bounded page and cancels obsolete searches', () => {
    const page = read('../src/app/dashboard/sales/page.tsx');
    const route = read('../src/app/api/sales/route.ts');

    assert.match(page, /params\.set\('per_page', '50'\)/);
    assert.match(page, /requestController\.current\?\.abort\(\)/);
    assert.match(route, /const paginatedSales = sales\.slice/);
    assert.match(route, /sales: paginatedSales/);
    assert.match(route, /total_pages: totalPages/);
});

test('sales API avoids ambiguous embedded product relationships', () => {
    const page = read('../src/app/dashboard/sales/page.tsx');
    const route = read('../src/app/api/sales/route.ts');

    assert.doesNotMatch(route, /products\(name\)/);
    assert.match(route, /productNameById/);
    assert.match(route, /\.from\('products'\)\.select\('id, name'\)/);
    assert.match(page, /error\.response\?\.data\?\.error/);
    assert.match(page, /toast\.error\(message\)/);
});

test('sales information is grouped without a horizontal table scroller', () => {
    const page = read('../src/app/dashboard/sales/page.tsx');

    assert.match(page, /<th>Produto e origem<\/th>/);
    assert.match(page, /<th>Pagamento<\/th>/);
    assert.match(page, /className="customer-meta"/);
    assert.match(page, /className="sales-pagination"/);
    assert.match(page, /table-layout: fixed/);
    assert.doesNotMatch(page, /overflowX:\s*'auto'/);
});
