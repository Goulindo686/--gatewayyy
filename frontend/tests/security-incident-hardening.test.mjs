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
