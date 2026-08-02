import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
    buildRenderableStoreSections,
    normalizeStoreBackground,
    normalizeStoreFooter,
    normalizeStoreLayoutSections,
    StoreBuilderValidationError
} from '../src/lib/store-builder.ts';

test('store builder preserves configured order and appends products not yet assigned', () => {
    const sections = normalizeStoreLayoutSections([
        {
            id: 'row-1',
            type: 'products',
            title: 'Primeira linha',
            subtitle: '',
            product_ids: ['p2', 'p1']
        },
        {
            id: 'carousel-1',
            type: 'banner_carousel',
            title: 'Ofertas',
            slides: [{
                id: 'slide-1',
                image_url: 'https://cdn.example.com/banner.jpg',
                title: 'Oferta',
                description: '',
                button_text: '',
                button_url: ''
            }]
        }
    ]);

    const rendered = buildRenderableStoreSections(sections, ['p1', 'p2', 'p3', 'p4', 'p5']);
    assert.equal(rendered[0].type, 'products');
    assert.deepEqual(rendered[0].product_ids, ['p2', 'p1']);
    assert.equal(rendered[1].type, 'banner_carousel');
    assert.equal(rendered[2].type, 'products');
    assert.deepEqual(rendered[2].product_ids, ['p3', 'p4', 'p5']);
});

test('store builder enforces four products per row', () => {
    assert.throws(
        () => normalizeStoreLayoutSections([{
            id: 'row',
            type: 'products',
            title: '',
            subtitle: '',
            product_ids: ['1', '2', '3', '4', '5']
        }], { strict: true }),
        StoreBuilderValidationError
    );
});

test('store builder rejects script URLs and keeps safe HTTPS links', () => {
    assert.throws(
        () => normalizeStoreFooter({
            enabled: true,
            links: [{ id: 'bad', label: 'Clique', url: 'javascript:alert(1)' }]
        }, { strict: true }),
        StoreBuilderValidationError
    );

    const footer = normalizeStoreFooter({
        enabled: true,
        links: [{ id: 'safe', label: 'Suporte', url: 'https://example.com/help' }]
    }, { strict: true });
    assert.equal(footer.links[0].url, 'https://example.com/help');
});

test('store background clamps overlay and rejects unsafe image URLs', () => {
    const background = normalizeStoreBackground({
        mode: 'image',
        image_url: 'https://cdn.example.com/background.webp',
        overlay: 200
    }, { strict: true });
    assert.equal(background.overlay, 95);

    assert.throws(
        () => normalizeStoreBackground({ mode: 'image', image_url: 'data:text/html,bad', overlay: 50 }, { strict: true }),
        StoreBuilderValidationError
    );
});

test('store builder API requires authentication and validates product ownership', async () => {
    const source = await readFile(new URL('../src/app/api/store-builder/route.ts', import.meta.url), 'utf8');
    assert.match(source, /getAuthUser\(req\)/);
    assert.match(source, /\.eq\('user_id', auth\.user\.id\)/);
    assert.match(source, /não pertencem à sua conta/);
    assert.doesNotMatch(source, /SUPABASE_SERVICE_KEY.*jsonSuccess/s);
});

test('public store API keeps a legacy fallback until migration 029 is applied', async () => {
    const source = await readFile(new URL('../src/app/api/store/[slug]/route.ts', import.meta.url), 'utf8');
    assert.match(source, /LEGACY_PUBLIC_STORE_FIELDS/);
    assert.match(source, /normalizeStoreLayoutSections/);
    assert.match(source, /normalizeStoreFooter/);
    assert.match(source, /normalizeStoreBackground/);
});

test('store settings use an organized four-step editor with a live preview', async () => {
    const source = await readFile(new URL('../src/app/dashboard/store/settings/page.tsx', import.meta.url), 'utf8');
    const layout = await readFile(new URL('../src/app/dashboard/store/layout.tsx', import.meta.url), 'utf8');

    assert.match(source, /store-setup-navigation/);
    assert.match(source, /activeEditor === 'identity'/);
    assert.match(source, /activeEditor === 'appearance'/);
    assert.match(source, /activeEditor === 'structure'/);
    assert.match(source, /activeEditor === 'footer'/);
    assert.match(source, /store-save-bar/);
    assert.match(source, /StoreLivePreview/);
    assert.match(source, /store-live-preview-column/);
    assert.match(layout, /Personalização/);
    assert.match(layout, /Marca, visual e estrutura/);
    assert.match(layout, /Organizar/);
    assert.match(layout, /Publicar/);
});

test('default storefront includes the editorial brand, discovery and trust structure', async () => {
    const source = await readFile(new URL('../src/app/store/[slug]/page.tsx', import.meta.url), 'utf8');
    const css = await readFile(new URL('../src/app/store/[slug]/storefront.module.css', import.meta.url), 'utf8');
    assert.match(source, /styles\.header/);
    assert.match(source, /styles\.heroComposition/);
    assert.match(source, /styles\.heroNotes/);
    assert.match(source, /styles\.categoriesSection/);
    assert.match(source, /styles\.serviceBar/);
    assert.match(source, /StoreBannerCarousel/);
    assert.match(source, /buildRenderableStoreSections/);
    assert.match(css, /Iowan Old Style/);
    assert.match(css, /border-radius: 4px 90px 4px 4px/);
    assert.doesNotMatch(source, /className="featured-card"/);
});
