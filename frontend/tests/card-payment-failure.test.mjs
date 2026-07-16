import assert from 'node:assert/strict';
import test from 'node:test';

import {
    classifyCardPaymentFailure,
    classifyCardProviderRequestError,
} from '../src/lib/card-payment-failure.ts';

test('does not treat a technical antifraud failure as an antifraud decline', () => {
    const failure = classifyCardPaymentFailure({
        id: 'or_test',
        status: 'failed',
        charges: [{
            id: 'ch_test',
            status: 'failed',
            last_transaction: {
                status: 'failed',
                antifraud_response: {
                    status: 'failed',
                    reason: 'timeout while processing analysis',
                },
            },
        }],
    });

    assert.equal(failure.category, 'processing_error');
    assert.match(failure.message, /concluir a analise/i);
});

test('keeps explicit antifraud declines as security declines', () => {
    const failure = classifyCardPaymentFailure({
        id: 'or_test',
        status: 'failed',
        charges: [{
            id: 'ch_test',
            status: 'failed',
            last_transaction: {
                status: 'failed',
                antifraud_response: {
                    status: 'rejected',
                    reason: 'high risk',
                },
            },
        }],
    });

    assert.equal(failure.category, 'antifraud_declined');
    assert.match(failure.message, /analise de seguranca/i);
});

test('classifies gateway/acquirer declines as issuer declines', () => {
    const failure = classifyCardPaymentFailure({
        id: 'or_test',
        status: 'failed',
        charges: [{
            id: 'ch_test',
            status: 'failed',
            last_transaction: {
                status: 'not_authorized',
                acquirer_name: 'stone',
                acquirer_return_code: '57',
                gateway_response: { errors: [{ message: 'not authorized' }] },
            },
        }],
    });

    assert.equal(failure.category, 'issuer_declined');
    assert.match(failure.message, /banco emissor/i);
});

test('detects an antifraud block reported only inside gateway errors', () => {
    const failure = classifyCardPaymentFailure({
        id: 'or_test',
        status: 'failed',
        charges: [{
            id: 'ch_test',
            status: 'failed',
            last_transaction: {
                status: 'not_authorized',
                gateway_response: {
                    errors: [{ code: 'ANTIFRAUD_REJECTED', message: 'Blocked by risk analysis' }],
                },
            },
        }],
    });

    assert.equal(failure.category, 'antifraud_declined');
    assert.match(failure.message, /analise de seguranca/i);
});

test('does not blame the issuer without issuer evidence', () => {
    const failure = classifyCardPaymentFailure({
        id: 'or_test',
        status: 'failed',
        charges: [{
            id: 'ch_test',
            status: 'failed',
            last_transaction: {
                status: 'not_authorized',
                acquirer_return_code: '57',
            },
        }],
    });

    assert.equal(failure.category, 'not_authorized');
    assert.doesNotMatch(failure.message, /banco emissor/i);
});

test('classifies provider 412 as card verification failure', () => {
    const failure = classifyCardProviderRequestError({
        response: {
            status: 412,
            data: { message: 'card verification failed' },
        },
    });

    assert.equal(failure.category, 'card_verification_failed');
    assert.match(failure.message, /validar este cartao/i);
});
