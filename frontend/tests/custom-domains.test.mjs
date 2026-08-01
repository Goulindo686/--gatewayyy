import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
    CustomDomainValidationError,
    isPlatformDomain,
    normalizeCustomDomain
} from '../src/lib/custom-domain-utils.ts';

test('normaliza domínio simples, URL e domínio internacional', () => {
    assert.equal(normalizeCustomDomain(' MinhaLoja.COM.BR '), 'minhaloja.com.br');
    assert.equal(normalizeCustomDomain('https://loja.exemplo.com/'), 'loja.exemplo.com');
    assert.match(normalizeCustomDomain('lojá.com.br'), /^xn--/);
});

test('rejeita caminhos, portas, IPs e domínios locais', () => {
    for (const invalid of [
        'loja.com/produto',
        'loja.com:8080',
        '127.0.0.1',
        'localhost',
        '*.loja.com',
        'nome_invalido.com'
    ]) {
        assert.throws(() => normalizeCustomDomain(invalid), CustomDomainValidationError);
    }
});

test('impede o domínio da plataforma e endereços vercel.app', () => {
    assert.equal(isPlatformDomain('goupay.com.br'), true);
    assert.equal(isPlatformDomain('painel.goupay.com.br'), true);
    assert.equal(isPlatformDomain('frontend.vercel.app'), true);
    assert.equal(isPlatformDomain('minhaloja.com.br'), false);
});

test('mantém cadastro privado, exclusivo e resolvido somente após verificação', async () => {
    const [migration, protectedApi, publicApi, envExample] = await Promise.all([
        readFile(new URL('../migrations/030_add_store_custom_domains.sql', import.meta.url), 'utf8'),
        readFile(new URL('../src/app/api/store-domain/route.ts', import.meta.url), 'utf8'),
        readFile(new URL('../src/app/api/store/[slug]/route.ts', import.meta.url), 'utf8'),
        readFile(new URL('../.env.local.example', import.meta.url), 'utf8')
    ]);

    assert.match(migration, /UNIQUE INDEX[\s\S]*LOWER\(domain\)/i);
    assert.match(migration, /ENABLE ROW LEVEL SECURITY/i);
    assert.match(migration, /REVOKE ALL[\s\S]*anon, authenticated/i);
    assert.match(protectedApi, /getAuthUser\(req\)/);
    assert.match(protectedApi, /\.eq\('user_id', auth\.user\.id\)/);
    assert.match(publicApi, /\.eq\('status', 'active'\)/);
    assert.match(publicApi, /\.eq\('verified', true\)/);
    assert.match(envExample, /^VERCEL_API_TOKEN=/m);
    assert.doesNotMatch(envExample, /^NEXT_PUBLIC_VERCEL_API_TOKEN=/m);
});
