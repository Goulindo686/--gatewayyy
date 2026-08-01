import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
    CustomDomainValidationError,
    isPlatformDomain,
    normalizeCustomDomain
} from '../src/lib/custom-domain-utils.ts';
import { verifyEdgeDomainSignature } from '../src/lib/edge-domain-signature.ts';

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
    const [migration, cloudflareMigration, protectedApi, publicApi, envExample, provider, middleware, worker] = await Promise.all([
        readFile(new URL('../migrations/030_add_store_custom_domains.sql', import.meta.url), 'utf8'),
        readFile(new URL('../migrations/031_migrate_store_domains_to_cloudflare.sql', import.meta.url), 'utf8'),
        readFile(new URL('../src/app/api/store-domain/route.ts', import.meta.url), 'utf8'),
        readFile(new URL('../src/app/api/store/[slug]/route.ts', import.meta.url), 'utf8'),
        readFile(new URL('../.env.local.example', import.meta.url), 'utf8'),
        readFile(new URL('../src/lib/cloudflare-domains.ts', import.meta.url), 'utf8'),
        readFile(new URL('../src/middleware.ts', import.meta.url), 'utf8'),
        readFile(new URL('../../cloudflare/store-domain-proxy/src/index.js', import.meta.url), 'utf8')
    ]);

    assert.match(migration, /UNIQUE INDEX[\s\S]*LOWER\(domain\)/i);
    assert.match(migration, /ENABLE ROW LEVEL SECURITY/i);
    assert.match(migration, /REVOKE ALL[\s\S]*anon, authenticated/i);
    assert.match(protectedApi, /getAuthUser\(req\)/);
    assert.match(protectedApi, /\.eq\('user_id', auth\.user\.id\)/);
    assert.match(protectedApi, /addCloudflareCustomHostname/);
    assert.match(publicApi, /\.eq\('status', 'active'\)/);
    assert.match(publicApi, /\.eq\('verified', true\)/);
    assert.match(cloudflareMigration, /provider_hostname_id/i);
    assert.match(cloudflareMigration, /SET provider = 'vercel'/i);
    assert.match(envExample, /^CUSTOM_DOMAINS_CLOUDFLARE_API_TOKEN=/m);
    assert.match(envExample, /^CUSTOM_DOMAINS_EDGE_SECRET=/m);
    assert.doesNotMatch(envExample, /^NEXT_PUBLIC_.*CLOUDFLARE/i);
    assert.doesNotMatch(envExample, /^CUSTOM_DOMAINS_VERCEL_/m);
    assert.match(provider, /api\.cloudflare\.com\/client\/v4/);
    assert.match(provider, /SSL and Certificates|custom_hostnames/i);
    assert.doesNotMatch(provider, /api\.vercel\.com/);
    assert.match(middleware, /verifyEdgeDomainSignature/);
    assert.doesNotMatch(middleware, /forwardedHost\s*\|\|/);
    assert.match(worker, /x-goupay-edge-signature/);
});

test('aceita apenas hostname assinado pelo Worker dentro da janela de tempo', async () => {
    const secret = 'segredo-de-teste-com-pelo-menos-32-bytes';
    const method = 'GET';
    const hostname = 'loja.cliente.com.br';
    const pathWithSearch = '/?categoria=um';
    const timestamp = '1800000000';
    const signature = createHmac('sha256', secret)
        .update([method, hostname, pathWithSearch, timestamp].join('\n'))
        .digest('hex');

    assert.equal(await verifyEdgeDomainSignature({
        secret,
        method,
        hostname,
        pathWithSearch,
        timestamp,
        signature,
        nowSeconds: 1800000000
    }), true);
    assert.equal(await verifyEdgeDomainSignature({
        secret,
        method,
        hostname: 'outra-loja.com',
        pathWithSearch,
        timestamp,
        signature,
        nowSeconds: 1800000000
    }), false);
    assert.equal(await verifyEdgeDomainSignature({
        secret,
        method,
        hostname,
        pathWithSearch,
        timestamp,
        signature,
        nowSeconds: 1800001000
    }), false);
});
