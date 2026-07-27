import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';
import {
    SmtpConfigurationError,
    getSmtpConfigurationSummary,
} from '../src/lib/smtp.ts';

const SMTP_ENV_KEYS = [
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_SECURE',
    'SMTP_USER',
    'SMTP_PASS',
    'SMTP_FROM',
];

const originalEnv = Object.fromEntries(
    SMTP_ENV_KEYS.map((key) => [key, process.env[key]])
);

function clearSmtpEnv() {
    for (const key of SMTP_ENV_KEYS) delete process.env[key];
}

afterEach(() => {
    clearSmtpEnv();
    for (const [key, value] of Object.entries(originalEnv)) {
        if (value !== undefined) process.env[key] = value;
    }
});

describe('configuracao SMTP', () => {
    test('usa os padroes seguros da GoDaddy', () => {
        clearSmtpEnv();
        process.env.SMTP_USER = 'contato@goupay.com.br';
        process.env.SMTP_PASS = 'test-only';

        assert.deepEqual(getSmtpConfigurationSummary(), {
            host: 'smtpout.secureserver.net',
            port: 465,
            secure: true,
            from: '"GouPay" <contato@goupay.com.br>',
            userMasked: 'co***@goupay.com.br',
        });
    });

    test('aceita SMTP STARTTLS configurado por ambiente', () => {
        clearSmtpEnv();
        process.env.SMTP_HOST = 'smtp.office365.com';
        process.env.SMTP_PORT = '587';
        process.env.SMTP_SECURE = 'false';
        process.env.SMTP_USER = 'contato@goupay.com.br';
        process.env.SMTP_PASS = 'test-only';
        process.env.SMTP_FROM = 'GouPay <noreply@goupay.com.br>';

        const config = getSmtpConfigurationSummary();
        assert.equal(config.host, 'smtp.office365.com');
        assert.equal(config.port, 587);
        assert.equal(config.secure, false);
        assert.equal(config.from, 'GouPay <noreply@goupay.com.br>');
    });

    test('falha claramente quando as credenciais nao existem', () => {
        clearSmtpEnv();

        assert.throws(
            () => getSmtpConfigurationSummary(),
            (error) => {
                assert.ok(error instanceof SmtpConfigurationError);
                assert.match(error.message, /SMTP_USER, SMTP_PASS/);
                return true;
            }
        );
    });

    test('rejeita porta e modo seguro invalidos', () => {
        clearSmtpEnv();
        process.env.SMTP_USER = 'contato@goupay.com.br';
        process.env.SMTP_PASS = 'test-only';
        process.env.SMTP_PORT = 'invalid';

        assert.throws(() => getSmtpConfigurationSummary(), /SMTP_PORT/);

        process.env.SMTP_PORT = '465';
        process.env.SMTP_SECURE = 'talvez';
        assert.throws(() => getSmtpConfigurationSummary(), /SMTP_SECURE/);
    });
});
