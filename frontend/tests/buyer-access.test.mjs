import assert from 'node:assert/strict';
import test from 'node:test';

import {
    buyerProductDestination,
    buyerSupportDestination,
} from '../src/lib/buyer-access.ts';

test('unique deliveries return to the purchased order in My Deliveries', () => {
    assert.equal(
        buyerProductDestination('order 123', true),
        '/minhas-entregas?order=order%20123',
    );
});

test('member products return to the member area', () => {
    assert.equal(buyerProductDestination('order-123', false), '/area-membros');
});

test('support returns to the central for the purchased order', () => {
    assert.equal(
        buyerSupportDestination('order-123'),
        '/minhas-entregas?order=order-123&view=support',
    );
});
