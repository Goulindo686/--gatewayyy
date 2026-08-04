import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('checkout customization can hide credit card without changing card processing', async () => {
    const editor = await readFile(
        new URL('../src/app/dashboard/products/[id]/checkout/page.tsx', import.meta.url),
        'utf8',
    );
    const checkout = await readFile(
        new URL('../src/app/checkout/[id]/page.tsx', import.meta.url),
        'utf8',
    );

    assert.match(editor, /show_credit_card:\s*true/);
    assert.match(editor, /Aceitar cartão de crédito/);
    assert.match(editor, /update\('show_credit_card', !settings\.show_credit_card\)/);
    assert.match(checkout, /show_credit_card:\s*true/);
    assert.match(checkout, /enableCreditCard && settings\.show_credit_card !== false/);
    assert.match(checkout, /const methodToSend = showCreditCard \? paymentMethod : 'pix'/);
    assert.match(checkout, /\{showCreditCard && \(/);
    assert.match(checkout, /tokenizePagarmeCard/);
    assert.match(checkout, /authenticatePagarme3DS/);
});

test('store owner can hide credit card in the storefront cart and the server enforces it', async () => {
    const settings = await readFile(
        new URL('../src/app/dashboard/store/settings/page.tsx', import.meta.url),
        'utf8',
    );
    const builder = await readFile(
        new URL('../src/lib/store-builder.ts', import.meta.url),
        'utf8',
    );
    const config = await readFile(
        new URL('../src/app/api/checkout/config/route.ts', import.meta.url),
        'utf8',
    );
    const cart = await readFile(
        new URL('../src/app/store/[slug]/cart/page.tsx', import.meta.url),
        'utf8',
    );
    const storeCheckout = await readFile(
        new URL('../src/app/api/store-checkout/route.ts', import.meta.url),
        'utf8',
    );

    assert.match(builder, /show_credit_card:\s*true/);
    assert.match(builder, /booleanValue\(value\.show_credit_card/);
    assert.match(settings, /Aceitar cartão de crédito/);
    assert.match(settings, /updateStyle\('show_credit_card', value\)/);
    assert.match(config, /searchParams\.get\('store_slug'\)/);
    assert.match(config, /disabled_by_store/);
    assert.match(cart, /checkout\/config\?store_slug=/);
    assert.match(cart, /if \(!enableCreditCard && paymentMethod !== 'pix'\)/);
    assert.match(storeCheckout, /store_slug, store_active, store_style_config/);
    assert.match(storeCheckout, /!enableCreditCard \|\| !storeAllowsCreditCard/);
});
