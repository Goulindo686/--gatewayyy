import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
    sanitizeStoreProductDescription,
} from '../src/lib/store-product-content.ts';

const readSource = relativePath => readFile(new URL(relativePath, import.meta.url), 'utf8');

test('store HTML descriptions keep useful markup and remove executable content', () => {
    const clean = sanitizeStoreProductDescription(`
        <h2>✨ Produto completo</h2>
        <p onclick="steal()">Conteúdo com <strong>destaque</strong>.</p>
        <img src=x onerror="steal()">
        <script>alert(document.cookie)</script>
        <a href="javascript:alert(1)">ruim</a>
        <a href="https://example.com/info">seguro</a>
        <ul><li>Benefício real</li></ul>
    `, 'html');

    assert.match(clean, /<h2>✨ Produto completo<\/h2>/);
    assert.match(clean, /<strong>destaque<\/strong>/);
    assert.match(clean, /<ul><li>Benefício real<\/li><\/ul>/);
    assert.match(clean, /href="https:\/\/example\.com\/info"/);
    assert.match(clean, /rel="noopener noreferrer nofollow"/);
    assert.doesNotMatch(clean, /script|onclick|onerror|javascript:|<img/i);
});

test('plain descriptions continue rejecting executable markup', () => {
    assert.throws(
        () => sanitizeStoreProductDescription('<script>alert(1)</script>', 'plain'),
        /conteúdo não permitido/i,
    );
});

test('standalone and storefront management are isolated by sales channel', async () => {
    const [mainProducts, mainProduct, storeProducts, storeProduct, storeBuilder, publicStore, checkout] = await Promise.all([
        readSource('../src/app/api/products/route.ts'),
        readSource('../src/app/api/products/[id]/route.ts'),
        readSource('../src/app/api/store-products/route.ts'),
        readSource('../src/app/api/store-products/[id]/route.ts'),
        readSource('../src/app/api/store-builder/route.ts'),
        readSource('../src/app/api/store/[slug]/route.ts'),
        readSource('../src/app/api/store-checkout/route.ts'),
    ]);

    assert.match(mainProducts, /\.eq\('sales_channel', 'checkout'\)/);
    assert.match(mainProduct, /\.eq\('sales_channel', 'checkout'\)/);
    assert.match(storeProducts, /\.eq\('sales_channel', 'store'\)/);
    assert.match(storeProducts, /sales_channel: 'store'/);
    assert.match(storeProduct, /\.eq\('sales_channel', 'store'\)/);
    assert.match(storeBuilder, /sales_channel\.eq\.store/);
    assert.match(storeBuilder, /sales_channel\.eq\.checkout,show_in_store\.eq\.true/);
    assert.match(publicStore, /\.in\('sales_channel', \['store', 'checkout'\]\)/);
    assert.match(checkout, /\.in\('sales_channel', \['store', 'checkout'\]\)/);
    assert.match(checkout, /\.eq\('show_in_store', true\)/);
    assert.match(checkout, /\.from\('product_plans'\)/);
    assert.match(checkout, /plan\.product_id|planMap\[String\(item\.plan_id\)\]/);
    assert.doesNotMatch(mainProduct, /body\.show_in_store|body\.store_category_id/);
});

test('store editor uses its dedicated API and offers sanitized HTML mode', async () => {
    const editor = await readSource('../src/app/dashboard/store/products/page.tsx');
    assert.match(editor, /storeProductsAPI\.list\(\)/);
    assert.match(editor, /storeProductsAPI\.create\(productData\)/);
    assert.match(editor, /Código HTML/);
    assert.match(editor, /store_description_format/);
    assert.doesNotMatch(editor, /productsAPI\./);
});

test('store product cards open a full detail page with plans and cart actions', async () => {
    const [storefront, details] = await Promise.all([
        readSource('../src/app/store/[slug]/page.tsx'),
        readSource('../src/app/store/[slug]/product/[product]/page.tsx'),
    ]);

    assert.match(storefront, /\/product\/\$\{encodeURIComponent\(identifier\)\}/);
    assert.doesNotMatch(storefront, /quickProduct|openQuick/);
    assert.match(details, /dangerouslySetInnerHTML/);
    assert.match(details, /store_description_format/);
    assert.match(details, /Adicionar ao carrinho/);
    assert.match(details, /Comprar agora/);
    assert.match(details, /productPlans\(currentProduct\)/);
});
