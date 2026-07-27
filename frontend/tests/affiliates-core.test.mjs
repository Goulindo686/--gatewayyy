import assert from 'node:assert/strict';
import test from 'node:test';
import {
    affiliateCommissionStatusForOrder,
    calculateAffiliateCommission,
    calculateAffiliatePlatformFee,
    normalizeAffiliateReference,
    normalizeAffiliateRateBps,
} from '../src/lib/affiliates-core.ts';

test('aceita somente referencias de afiliado opacas e bem formadas', () => {
    const validReference = 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcdef';
    assert.equal(normalizeAffiliateReference(validReference), validReference);
    assert.equal(normalizeAffiliateReference(`  ${validReference}  `), validReference);
    assert.equal(normalizeAffiliateReference('curta'), null);
    assert.equal(normalizeAffiliateReference('a'.repeat(43) + '?redirect=https://evil.test'), null);
    assert.equal(normalizeAffiliateReference(null), null);
});

test('calcula comissao sobre o valor apos a taxa da plataforma', () => {
    assert.deepEqual(calculateAffiliateCommission({
        grossAmount: 10_000,
        platformFeeAmount: 200,
        commissionRateBps: 3000,
    }), {
        grossAmount: 10_000,
        platformFeeAmount: 200,
        commissionBaseAmount: 9_800,
        commissionRateBps: 3000,
        commissionAmount: 2_940,
        sellerAmount: 6_860,
    });
});

test('distribui uma venda de R$ 29,90 com comissao de 30%', () => {
    assert.deepEqual(calculateAffiliateCommission({
        grossAmount: 2_990,
        platformFeeAmount: 0,
        commissionRateBps: 3000,
    }), {
        grossAmount: 2_990,
        platformFeeAmount: 0,
        commissionBaseAmount: 2_990,
        commissionRateBps: 3000,
        commissionAmount: 897,
        sellerAmount: 2_093,
    });

    assert.deepEqual(calculateAffiliateCommission({
        grossAmount: 2_990,
        platformFeeAmount: 200,
        commissionRateBps: 3000,
    }), {
        grossAmount: 2_990,
        platformFeeAmount: 200,
        commissionBaseAmount: 2_790,
        commissionRateBps: 3000,
        commissionAmount: 837,
        sellerAmount: 1_953,
    });
});

test('garante a taxa minima da plataforma antes da comissao do afiliado', () => {
    assert.equal(calculateAffiliatePlatformFee({
        grossAmount: 2_990,
        currentPlatformFeeAmount: 0,
        paymentMethod: 'pix',
    }), 200);
    assert.equal(calculateAffiliatePlatformFee({
        grossAmount: 2_990,
        currentPlatformFeeAmount: 300,
        paymentMethod: 'pix',
    }), 300);
    assert.equal(calculateAffiliatePlatformFee({
        grossAmount: 2_990,
        currentPlatformFeeAmount: 0,
        paymentMethod: 'credit_card',
    }), 60);
    assert.equal(calculateAffiliatePlatformFee({
        grossAmount: 100,
        currentPlatformFeeAmount: 0,
        paymentMethod: 'pix',
    }), 100);
});

test('arredonda em centavos e nunca distribui acima do valor bruto', () => {
    assert.deepEqual(calculateAffiliateCommission({
        grossAmount: 101,
        platformFeeAmount: 1,
        commissionRateBps: 3333,
    }), {
        grossAmount: 101,
        platformFeeAmount: 1,
        commissionBaseAmount: 100,
        commissionRateBps: 3333,
        commissionAmount: 33,
        sellerAmount: 67,
    });

    assert.equal(calculateAffiliateCommission({
        grossAmount: 100,
        platformFeeAmount: 500,
        commissionRateBps: 9000,
    }).commissionAmount, 0);
});

test('limita percentuais invalidos na fronteira permitida', () => {
    assert.equal(normalizeAffiliateRateBps(-10), 1);
    assert.equal(normalizeAffiliateRateBps(99_999), 9000);
});

test('mapeia status financeiros sem liberar pagamento pendente', () => {
    assert.equal(affiliateCommissionStatusForOrder('pending'), 'pending');
    assert.equal(affiliateCommissionStatusForOrder('paid'), 'approved');
    assert.equal(affiliateCommissionStatusForOrder('refunded'), 'refunded');
    assert.equal(affiliateCommissionStatusForOrder('chargeback'), 'chargeback');
    assert.equal(affiliateCommissionStatusForOrder('failed'), 'failed');
});
