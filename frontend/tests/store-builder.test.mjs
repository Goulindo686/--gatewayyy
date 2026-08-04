import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
    buildRenderableStoreSections,
    normalizeStoreBackground,
    normalizeStoreFooter,
    normalizeStoreLayoutSections,
    normalizeStoreStyle,
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

test('store style keeps the original storefront as default and validates custom choices', () => {
    const defaults = normalizeStoreStyle(undefined);
    assert.equal(defaults.color_mode, 'theme');
    assert.equal(defaults.font_style, 'modern');
    assert.equal(defaults.hero_style, 'classic');
    assert.equal(defaults.catalog_columns, 4);
    assert.equal(defaults.show_search, true);
    assert.equal(defaults.show_credit_card, true);
    assert.equal(defaults.hero_content.top_badges.delivery, 'Entrega digital');
    assert.equal(defaults.hero_content.bottom_badges.payment, 'PIX e cartão');

    const customized = normalizeStoreStyle({
        color_mode: 'custom',
        custom_colors: { background: '#101114', accent: '#ff3366' },
        font_style: 'editorial',
        catalog_columns: 3,
        show_categories: false,
        show_credit_card: false,
        hero_content: {
            logo_url: 'https://cdn.example.com/logo.png',
            welcome_text: 'Você está na',
            description: 'Uma descrição exclusiva para a capa.',
            top_badges: { delivery: 'Envio imediato', security: '', protected: 'Compra garantida' },
            bottom_badges: { access: 'Acesso vitalício', checkout: 'Pagamento seguro', payment: 'PIX disponível' }
        }
    });
    assert.equal(customized.custom_colors.background, '#101114');
    assert.equal(customized.custom_colors.accent, '#ff3366');
    assert.equal(customized.font_style, 'editorial');
    assert.equal(customized.catalog_columns, 3);
    assert.equal(customized.show_categories, false);
    assert.equal(customized.show_credit_card, false);
    assert.equal(customized.hero_content.logo_url, 'https://cdn.example.com/logo.png');
    assert.equal(customized.hero_content.top_badges.security, '');
    assert.equal(customized.hero_content.bottom_badges.access, 'Acesso vitalício');

    assert.throws(
        () => normalizeStoreStyle({ color_mode: 'custom', custom_colors: { accent: 'red' } }, { strict: true }),
        StoreBuilderValidationError
    );
    assert.throws(
        () => normalizeStoreStyle({ hero_content: { logo_url: 'javascript:alert(1)' } }, { strict: true }),
        StoreBuilderValidationError
    );
    assert.throws(
        () => normalizeStoreStyle({ show_credit_card: 'false' }, { strict: true }),
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

test('public store API keeps fallbacks while style and builder migrations are pending', async () => {
    const source = await readFile(new URL('../src/app/api/store/[slug]/route.ts', import.meta.url), 'utf8');
    assert.match(source, /BUILDER_PUBLIC_STORE_FIELDS/);
    assert.match(source, /LEGACY_PUBLIC_STORE_FIELDS/);
    assert.match(source, /normalizeStoreLayoutSections/);
    assert.match(source, /normalizeStoreFooter/);
    assert.match(source, /normalizeStoreBackground/);
    assert.match(source, /normalizeStoreStyle/);
});

test('store settings use an organized four-step editor without an embedded preview', async () => {
    const source = await readFile(new URL('../src/app/dashboard/store/settings/page.tsx', import.meta.url), 'utf8');
    const layout = await readFile(new URL('../src/app/dashboard/store/layout.tsx', import.meta.url), 'utf8');

    assert.match(source, /store-setup-navigation/);
    assert.match(source, /id="store-identity"/);
    assert.match(source, /id="store-appearance"/);
    assert.match(source, /id="store-structure"/);
    assert.match(source, /id="store-footer"/);
    assert.match(source, /store-save-bar/);
    assert.match(source, /store_style_config/);
    assert.match(source, /Aceitar cartão de crédito/);
    assert.match(source, /StyleChoiceGroup/);
    assert.match(source, /Paleta personalizada/);
    assert.match(source, /Barra de benefícios/);
    assert.match(source, /Imagem no lugar da letra/);
    assert.match(source, /Selos acima da imagem/);
    assert.match(source, /Garantias abaixo dos botões/);
    assert.doesNotMatch(source, /StoreMiniPreview/);
    assert.doesNotMatch(source, /store-preview-column/);
    assert.match(layout, /Aparência e organização/);
    assert.match(layout, /Escolha o que será exibido/);
    assert.match(layout, /store-navigation-shell/);
    assert.match(layout, /Personalização/);
    assert.match(source, /store-builder-workspace/);
    assert.match(source, /store-setup-navigation-title/);
});

test('store catalog subpages share an organized visual hierarchy without replacing actions', async () => {
    const products = await readFile(new URL('../src/app/dashboard/store/products/page.tsx', import.meta.url), 'utf8');
    const categories = await readFile(new URL('../src/app/dashboard/store/categories/page.tsx', import.meta.url), 'utf8');

    assert.match(products, /store-products-intro/);
    assert.match(products, /store-products-panel/);
    assert.match(products, /toggleVisibility\(product\)/);
    assert.match(products, /changeCategory\(product\.id/);
    assert.match(categories, /store-subpage-intro/);
    assert.match(categories, /store-categories-list-panel/);
    assert.match(categories, /editCategory\(cat\)/);
    assert.match(categories, /handleDelete\(cat\.id\)/);
});

test('default storefront includes the renewed brand, discovery and trust structure', async () => {
    const source = await readFile(new URL('../src/app/store/[slug]/page.tsx', import.meta.url), 'utf8');
    assert.match(source, /store-main-header/);
    assert.match(source, /store-hero-grid/);
    assert.match(source, /store-trust-badges/);
    assert.match(source, /store-featured-categories/);
    assert.match(source, /store-benefit-strip/);
    assert.match(source, /StoreBannerCarousel/);
    assert.match(source, /buildRenderableStoreSections/);
    assert.match(source, /normalizeStoreStyle/);
    assert.match(source, /store-font-/);
    assert.match(source, /visual\.show_search/);
    assert.match(source, /visual\.show_categories/);
    assert.match(source, /heroContent\.logo_url/);
    assert.match(source, /topHeroBadges/);
    assert.match(source, /bottomHeroBadges/);
    assert.doesNotMatch(source, /className="featured-card"/);
});
