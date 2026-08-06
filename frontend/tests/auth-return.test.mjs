import assert from 'node:assert/strict';
import test from 'node:test';

import { buildAuthUrl, getSafeReturnTo } from '../src/lib/auth-return.ts';

test('keeps a local return path with its order query', () => {
    const returnTo = getSafeReturnTo(
        '?returnTo=%2Fminhas-entregas%3Forder%3Dpedido-123',
    );

    assert.equal(returnTo, '/minhas-entregas?order=pedido-123');
    assert.equal(
        buildAuthUrl('/login', returnTo),
        '/login?returnTo=%2Fminhas-entregas%3Forder%3Dpedido-123',
    );
});

test('rejects external and protocol-relative return destinations', () => {
    assert.equal(getSafeReturnTo('?returnTo=https%3A%2F%2Fevil.example'), null);
    assert.equal(getSafeReturnTo('?returnTo=%2F%2Fevil.example'), null);
});
