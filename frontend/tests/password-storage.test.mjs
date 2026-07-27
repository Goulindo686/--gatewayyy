import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
    buildPasswordResetUpdate,
    buildPasswordSyncUpdate,
    getStoredPasswordCandidates,
    getStoredPasswordHash,
} from '../src/lib/password-storage.ts';

describe('armazenamento de senha', () => {
    test('atualiza password_hash no schema atual', () => {
        const update = buildPasswordResetUpdate({
            password_hash: 'old-hash',
            updated_at: 'old-date',
        }, 'new-hash', 'new-date');

        assert.deepEqual(update, {
            password_reset_token: null,
            password_reset_expires: null,
            password_hash: 'new-hash',
            updated_at: 'new-date',
        });
    });

    test('atualiza a coluna password no schema legado', () => {
        const update = buildPasswordResetUpdate({
            password: 'old-hash',
        }, 'new-hash');

        assert.equal(update.password, 'new-hash');
        assert.equal(update.password_hash, undefined);
    });

    test('sincroniza as duas colunas quando ambas existem', () => {
        const update = buildPasswordResetUpdate({
            password_hash: 'old-primary',
            password: 'old-legacy',
            updated_at: 'old-date',
        }, 'new-hash', 'new-date');

        assert.equal(update.password_hash, 'new-hash');
        assert.equal(update.password, 'new-hash');
        assert.equal(update.updated_at, 'new-date');
    });

    test('login usa password_hash e recorre ao campo legado', () => {
        assert.equal(
            getStoredPasswordHash({ password_hash: 'primary', password: 'legacy' }),
            'primary'
        );
        assert.equal(getStoredPasswordHash({ password: 'legacy' }), 'legacy');
        assert.equal(getStoredPasswordHash({ password_hash: null, password: 'legacy' }), 'legacy');
    });

    test('login pode validar e identificar hashes divergentes', () => {
        assert.deepEqual(
            getStoredPasswordCandidates({
                password_hash: 'old-primary',
                password: 'new-legacy',
            }),
            [
                { column: 'password_hash', hash: 'old-primary' },
                { column: 'password', hash: 'new-legacy' },
            ]
        );
    });

    test('sincronizacao nao consome token de recuperacao', () => {
        assert.deepEqual(
            buildPasswordSyncUpdate({
                password_hash: 'old-primary',
                password: 'new-legacy',
                updated_at: 'old-date',
            }, 'new-legacy', 'new-date'),
            {
                password_hash: 'new-legacy',
                password: 'new-legacy',
                updated_at: 'new-date',
            }
        );
    });

    test('falha quando o schema nao possui coluna de senha', () => {
        assert.throws(
            () => buildPasswordResetUpdate({ id: 'user-id' }, 'new-hash'),
            /Nenhuma coluna de senha/
        );
    });
});
