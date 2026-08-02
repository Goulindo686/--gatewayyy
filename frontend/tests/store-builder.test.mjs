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

test('store builder API requires authentication and validates product ownership', async () => {
    const source = await readFile(new URL('../src/app/api/store-builder/route.ts', import.meta.url), 'utf8');
    assert.match(source, /getAuthUser\(req\)/);
    assert.match(source, /\.eq\('user_id', auth\.user\.id\)/);
    assert.match(source, /não pertencem à sua conta/);
    assert.doesNotMatch(source, /SUPABASE_SERVICE_KEY.*jsonSuccess/s);
});

test('public store API keeps builder and legacy fallbacks until migrations are applied', async () => {
    const source = await readFile(new URL('../src/app/api/store/[slug]/route.ts', import.meta.url), 'utf8');
    assert.match(source, /LEGACY_PUBLIC_STORE_FIELDS/);
    assert.match(source, /BUILDER_PUBLIC_STORE_FIELDS/);
    assert.match(source, /normalizeStoreLayoutSections/);
    assert.match(source, /normalizeStoreFooter/);
    assert.match(source, /normalizeStoreBackground/);
    assert.match(source, /normalizeStoreStyle/);
});

test('store settings use an organized six-part editor with visual controls and a live preview', async () => {
    const source = await readFile(new URL('../src/app/dashboard/store/settings/page.tsx', import.meta.url), 'utf8');
    const layout = await readFile(new URL('../src/app/dashboard/store/layout.tsx', import.meta.url), 'utf8');

    assert.match(source, /store-setup-navigation/);
    assert.match(source, /activeEditor === 'identity'/);
    assert.match(source, /activeEditor === 'appearance'/);
    assert.match(source, /activeEditor === 'layout'/);
    assert.match(source, /activeEditor === 'experience'/);
    assert.match(source, /activeEditor === 'structure'/);
    assert.match(source, /activeEditor === 'footer'/);
    assert.match(source, /store-save-bar/);
    assert.match(source, /StoreLivePreview/);
    assert.match(source, /store-live-preview-column/);
    assert.match(source, /StyleChoiceGroup/);
    assert.match(source, /VisibilityToggle/);
    assert.match(source, /store_style_config/);
    assert.match(source, /COLOR_PALETTE_OPTIONS/);
    assert.match(source, /CUSTOM_COLOR_FIELDS/);
    assert.match(source, /Minha paleta/);
    assert.match(layout, /Personalização/);
    assert.match(layout, /Marca, visual e estrutura/);
    assert.match(layout, /Organizar/);
    assert.match(layout, /Publicar/);
});

test('store style persists a broad visual profile and rejects invalid choices', () => {
    const style = normalizeStoreStyle({
        visual_version: 2,
        color_mode: 'custom',
        palette_preset: 'ocean',
        custom_colors: { bg: '#01040a', surface: '#10151f', accent: '#00b8ff' },
        font_style: 'friendly',
        hero_layout: 'immersive',
        card_style: 'outlined',
        catalog_columns: 2,
        animation_level: 'subtle',
        background_pattern: 'waves',
        show_marquee: false,
        show_search: false
    }, { strict: true });

    assert.equal(style.font_style, 'friendly');
    assert.equal(style.color_mode, 'custom');
    assert.equal(style.palette_preset, 'ocean');
    assert.equal(style.custom_colors.bg, '#01040a');
    assert.equal(style.custom_colors.accent, '#00b8ff');
    assert.equal(style.hero_layout, 'immersive');
    assert.equal(style.card_style, 'outlined');
    assert.equal(style.catalog_columns, 2);
    assert.equal(style.show_marquee, false);
    assert.equal(style.show_search, false);
    assert.throws(
        () => normalizeStoreStyle({ hero_layout: 'impossible' }, { strict: true }),
        StoreBuilderValidationError
    );
    assert.throws(
        () => normalizeStoreStyle({ visual_version: 2, color_mode: 'custom', custom_colors: { bg: 'red' } }, { strict: true }),
        StoreBuilderValidationError
    );
});

test('store style modernizes the previous default while preserving intentional choices', () => {
    const modernDefault = normalizeStoreStyle(null);
    assert.equal(modernDefault.palette_preset, 'midnight');
    assert.equal(modernDefault.font_style, 'modern');
    assert.equal(modernDefault.card_style, 'elevated');

    const migrated = normalizeStoreStyle({
        font_style: 'editorial',
        hero_image_style: 'arched',
        button_style: 'soft',
        card_style: 'colorful',
        corner_style: 'soft',
        background_pattern: 'none'
    });
    assert.equal(migrated.visual_version, 2);
    assert.equal(migrated.font_style, 'modern');
    assert.equal(migrated.hero_image_style, 'rounded');
    assert.equal(migrated.button_style, 'pill');
    assert.equal(migrated.card_style, 'elevated');
    assert.equal(migrated.corner_style, 'rounded');
    assert.equal(migrated.background_pattern, 'grid');

    const intentional = normalizeStoreStyle({ font_style: 'bold', card_style: 'minimal' });
    assert.equal(intentional.font_style, 'bold');
    assert.equal(intentional.card_style, 'minimal');
});

test('default storefront uses the new bento commerce architecture and keeps customization modes', async () => {
    const source = await readFile(new URL('../src/app/store/[slug]/page.tsx', import.meta.url), 'utf8');
    const css = await readFile(new URL('../src/app/store/[slug]/storefront-v3.module.css', import.meta.url), 'utf8');
    assert.match(source, /styles\.header/);
    assert.match(source, /styles\.heroLead/);
    assert.match(source, /styles\.heroVisual/);
    assert.match(source, /styles\.heroRail/);
    assert.match(source, /styles\.collectionDeck/);
    assert.match(source, /styles\.trustDock/);
    assert.match(source, /styles\.brandStatement/);
    assert.match(source, /styles\.productVisual/);
    assert.match(source, /StoreBannerCarousel/);
    assert.match(source, /buildRenderableStoreSections/);
    assert.match(source, /normalizeStoreStyle/);
    assert.match(source, /STORE_COLOR_PALETTES/);
    assert.match(source, /visual\.show_announcement/);
    assert.match(source, /visual\.show_search/);
    assert.match(css, /\.heroImmersive/);
    assert.match(css, /\.cardsMinimal/);
    assert.match(css, /\.patternWaves/);
    assert.match(css, /\.headerGlass/);
    assert.match(css, /\.fontModern/);
    assert.match(css, /\.collectionGrid > button:first-child/);
    assert.match(css, /\.statementWord/);
    assert.doesNotMatch(source, /styles\.heroComposition/);
    assert.doesNotMatch(source, /styles\.heroFloatingNote/);
    assert.doesNotMatch(source, /styles\.motionMarquee/);
});
