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

test('store builder supports professional multi-niche content blocks safely', () => {
    const sections = normalizeStoreLayoutSections([
        {
            id: 'about',
            type: 'content',
            eyebrow: 'Sobre',
            title: 'Nossa proposta',
            description: 'Uma apresentação completa.',
            image_url: 'https://cdn.example.com/about.webp',
            image_position: 'left',
            tone: 'accent',
            button_text: 'Conhecer',
            button_url: '/store/demo'
        },
        {
            id: 'features',
            type: 'features',
            title: 'Diferenciais',
            subtitle: '',
            items: [{ id: 'feature-1', title: 'Atendimento', description: 'Suporte próximo.' }]
        },
        {
            id: 'testimonials',
            type: 'testimonials',
            title: 'Depoimentos',
            subtitle: '',
            items: [{ id: 'quote-1', quote: 'Excelente experiência.', name: 'Cliente', role: 'Comprador' }]
        },
        {
            id: 'faq',
            type: 'faq',
            title: 'Perguntas',
            subtitle: '',
            items: [{ id: 'faq-1', question: 'Como funciona?', answer: 'Escolha e finalize a compra.' }]
        }
    ], { strict: true });

    assert.deepEqual(sections.map(section => section.type), ['content', 'features', 'testimonials', 'faq']);
    assert.throws(
        () => normalizeStoreLayoutSections([{
            id: 'unsafe',
            type: 'content',
            image_url: 'javascript:alert(1)',
            button_url: 'data:text/html,bad'
        }], { strict: true }),
        StoreBuilderValidationError
    );
});

test('store visual configuration is backward compatible and clamps unsupported choices', () => {
    const defaults = normalizeStoreBackground({ mode: 'theme' });
    assert.equal(defaults.color_scheme, 'dark');
    assert.equal(defaults.hero_layout, 'split');
    assert.equal(defaults.header_style, 'floating');
    assert.equal(defaults.show_categories, true);
    assert.equal(defaults.show_header_categories, true);
    assert.equal(defaults.show_header_search, true);
    assert.deepEqual(defaults.hero_product_ids, []);

    const customized = normalizeStoreBackground({
        mode: 'theme',
        color_scheme: 'light',
        hero_layout: 'compact',
        font_style: 'editorial',
        card_style: 'minimal',
        product_image_ratio: 'portrait',
        hero_product_ids: ['product-3', 'product-1'],
        hero_info_title: 'Entrega imediata',
        show_benefit_strip: false
    }, { strict: true });
    assert.equal(customized.hero_layout, 'compact');
    assert.equal(customized.color_scheme, 'light');
    assert.equal(customized.font_style, 'editorial');
    assert.equal(customized.card_style, 'minimal');
    assert.equal(customized.product_image_ratio, 'portrait');
    assert.deepEqual(customized.hero_product_ids, ['product-3', 'product-1']);
    assert.equal(customized.hero_info_title, 'Entrega imediata');
    assert.equal(customized.show_benefit_strip, false);

    assert.throws(
        () => normalizeStoreBackground({ hero_product_ids: ['1', '2', '3', '4'] }, { strict: true }),
        StoreBuilderValidationError
    );

    const unsupported = normalizeStoreBackground({ hero_layout: 'unknown', card_style: 'neon' });
    assert.equal(unsupported.hero_layout, 'split');
    assert.equal(unsupported.card_style, 'elevated');
    assert.equal(normalizeStoreBackground({ color_scheme: 'sepia' }).color_scheme, 'dark');
});

test('store builder API requires authentication and validates product ownership', async () => {
    const source = await readFile(new URL('../src/app/api/store-builder/route.ts', import.meta.url), 'utf8');
    assert.match(source, /getAuthUser\(req\)/);
    assert.match(source, /\.eq\('user_id', auth\.user\.id\)/);
    assert.match(source, /background\.hero_product_ids/);
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

test('store settings use an organized panel editor without an embedded preview', async () => {
    const source = await readFile(new URL('../src/app/dashboard/store/settings/page.tsx', import.meta.url), 'utf8');
    const layout = await readFile(new URL('../src/app/dashboard/store/layout.tsx', import.meta.url), 'utf8');

    assert.match(source, /store-setup-navigation/);
    assert.match(source, /activeEditor/);
    assert.match(source, /HeroProductPicker/);
    assert.match(source, /id="store-identity"/);
    assert.match(source, /id="store-appearance"/);
    assert.match(source, /id="store-structure"/);
    assert.match(source, /id="store-footer"/);
    assert.match(source, /store-save-bar/);
    assert.doesNotMatch(source, /StoreMiniPreview/);
    assert.doesNotMatch(source, /store-preview-column/);
    assert.match(layout, /Marca, visual e conteúdo/);
    assert.match(layout, /Escolha os produtos exibidos/);
});

test('default storefront includes the renewed brand, discovery and trust structure', async () => {
    const source = await readFile(new URL('../src/app/store/[slug]/page.tsx', import.meta.url), 'utf8');
    assert.match(source, /store-main-header/);
    assert.match(source, /store-header-category-nav/);
    assert.match(source, /store-opening-shell/);
    assert.match(source, /store-showcase-stage/);
    assert.match(source, /is-showcase/);
    assert.match(source, /store-premium-hero/);
    assert.match(source, /store-premium-gallery/);
    assert.match(source, /store-premium-dock/);
    assert.match(source, /store-premium-product/);
    assert.match(source, /store-hero-grid/);
    assert.match(source, /store-hero-spotlight/);
    assert.match(source, /store-spotlight-media/);
    assert.match(source, /store-showcase-rail/);
    assert.match(source, /store-hero-discovery-dock/);
    assert.match(source, /store-showcase-arrow/);
    assert.match(source, /store-scheme-/);
    assert.match(source, /store-trust-badges/);
    assert.match(source, /store-featured-categories/);
    assert.match(source, /store-benefit-strip/);
    assert.match(source, /StoreBannerCarousel/);
    assert.match(source, /buildRenderableStoreSections/);
    assert.match(source, /store-content-block/);
    assert.match(source, /store-features-grid/);
    assert.match(source, /store-testimonials-grid/);
    assert.match(source, /store-faq-list/);
    assert.doesNotMatch(source, /className="featured-card"/);
});
