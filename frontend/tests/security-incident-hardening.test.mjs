import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { normalizeSafeText, SecurityValidationError } from '../src/lib/request-security.ts';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('content APIs require ownership throughout the product hierarchy', () => {
    const routes = [
        ['../src/app/api/content/[productId]/modules/route.ts', /getOwnedProduct\(productId, auth\.user\.id\)/],
        ['../src/app/api/content/modules/[moduleId]/route.ts', /getOwnedModule\(moduleId, auth\.user\.id\)/],
        ['../src/app/api/content/modules/[moduleId]/lessons/route.ts', /getOwnedModule\(moduleId, auth\.user\.id\)/],
        ['../src/app/api/content/lessons/[lessonId]/route.ts', /getOwnedLesson\(lessonId, auth\.user\.id\)/],
        ['../src/app/api/content/lessons/[lessonId]/files/route.ts', /getOwnedLesson\(lessonId, auth\.user\.id\)/],
        ['../src/app/api/content/files/[fileId]/route.ts', /getOwnedFile\(fileId, auth\.user\.id\)/],
    ];

    for (const [path, ownershipCheck] of routes) {
        const source = read(path);
        assert.match(source, ownershipCheck, path);
        assert.match(source, /enforceContentRateLimit\(auth\.user\.id/, path);
    }

    const access = read('../src/lib/content-access.ts');
    assert.match(access, /\.eq\('user_id', userId\)/);
    assert.match(access, /getOwnedProduct\(module\.product_id, userId\)/);
    assert.match(access, /getOwnedModule\(lesson\.module_id, userId\)/);
});

test('content writes are bounded and reject executable stored markup', () => {
    const moduleRoute = read('../src/app/api/content/[productId]/modules/route.ts');
    const lessonRoute = read('../src/app/api/content/modules/[moduleId]/lessons/route.ts');
    assert.match(moduleRoute, /requestBodyTooLarge\(req, 16_384\)/);
    assert.match(lessonRoute, /requestBodyTooLarge\(req, 65_536\)/);

    assert.equal(
        normalizeSafeText('Aula segura para o cliente', { field: 'Título', maxLength: 200, required: true }),
        'Aula segura para o cliente',
    );
    assert.throws(
        () => normalizeSafeText('<script>fetch("https://attacker")</script>', { field: 'Título', maxLength: 200 }),
        SecurityValidationError,
    );
    assert.throws(
        () => normalizeSafeText('<img src=x onerror=alert(1)>', { field: 'Descrição', maxLength: 500 }),
        SecurityValidationError,
    );
});

test('webhook sender blocks SSRF primitives and redirect bypasses', () => {
    const source = read('../src/lib/webhooks.ts');
    assert.match(source, /node:dns\/promises/);
    assert.match(source, /isPrivateAddress/);
    assert.match(source, /hostname === 'localhost'/);
    assert.match(source, /parsed\.protocol !== 'https:'/);
    assert.match(source, /redirect:\s*'manual'/);
});

test('public APIs expose allowlisted fields only', () => {
    const storeRoute = read('../src/app/api/store/[slug]/route.ts');
    const publicProductRoute = read('../src/app/api/products/public/[id]/route.ts');
    assert.match(storeRoute, /PUBLIC_PRODUCT_FIELDS/);
    assert.doesNotMatch(storeRoute, /from\('products'\)[\s\S]{0,80}select\('\*'\)/);
    assert.doesNotMatch(storeRoute.match(/PUBLIC_PRODUCT_FIELDS\s*=([^;]+)/)?.[1] || '', /facebook_api_token/);
    assert.doesNotMatch(storeRoute.match(/PUBLIC_PRODUCT_FIELDS\s*=([^;]+)/)?.[1] || '', /sales_count/);
    assert.match(publicProductRoute, /user_id:\s*_sellerId,\s*\.\.\.publicProduct/);
    assert.match(publicProductRoute, /\.\.\.publicProduct/);
});

test('known incident account is denied and product deletion proves ownership', () => {
    const auth = read('../src/lib/auth.ts');
    const productRoute = read('../src/app/api/products/[id]/route.ts');
    assert.match(auth, /585ad3a0-b8fa-4d57-84d2-16faf548f50b/);
    assert.match(auth, /INCIDENT_BLOCKED_USER_IDS\.has\(userId\)/);
    assert.match(productRoute, /\.eq\('id', id\)[\s\S]*\.eq\('user_id', auth\.user\.id\)[\s\S]*\.limit\(1\)/);
    assert.match(productRoute, /delete\(\)[\s\S]*select\('id'\)/);
});

test('database hardening removes browser access to privileged internals', () => {
    const migration = read('../migrations/034_harden_database_security.sql');

    assert.match(migration, /ALTER VIEW public\.user_profiles SET \(security_invoker = true\)/);
    assert.match(migration, /REVOKE ALL PRIVILEGES ON TABLE public\.user_profiles[\s\S]*FROM PUBLIC, anon, authenticated/);
    assert.match(migration, /ALTER FUNCTION public\.get_all_tables\(\) SECURITY INVOKER/);
    assert.match(migration, /ALTER FUNCTION public\.increment_rate_limit\(TEXT, TIMESTAMPTZ, INTEGER\)[\s\S]*SECURITY INVOKER/);
    assert.match(migration, /REVOKE ALL PRIVILEGES ON FUNCTION public\.goupay_assign_unique_deliveries_on_paid\(\)[\s\S]*FROM PUBLIC, anon, authenticated/);
    assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.claim_outgoing_webhook_deliveries\(INTEGER, UUID, TEXT\)[\s\S]*TO service_role/);
    assert.match(migration, /REVOKE ALL PRIVILEGES ON TABLE[\s\S]*public\.unique_delivery_items[\s\S]*FROM PUBLIC, anon, authenticated/);
});

test('admin webhook settings stay on the internal API and tolerate legacy duplicate rows', () => {
    const api = read('../src/lib/api.ts');
    const route = read('../src/app/api/admin/settings/route.ts');

    assert.match(api, /getSettings:\s*\(\) => internalApi\.get\('\/admin\/settings'\)/);
    assert.match(api, /updateSettings:\s*\(data: any\) => internalApi\.put\('\/admin\/settings', data\)/);
    assert.match(route, /\.order\('updated_at', \{ ascending: false, nullsFirst: false \}\)/);
    assert.match(route, /normalizeDiscordWebhookUrl\(row\.discord_webhook_url\)/);
    assert.match(route, /existingRows\?\.find/);
    assert.doesNotMatch(route, /from\('platform_settings'\)\.select\('id'\)\.limit\(1\)\.single\(\)/);
});
