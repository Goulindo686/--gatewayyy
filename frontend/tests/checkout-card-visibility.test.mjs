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
