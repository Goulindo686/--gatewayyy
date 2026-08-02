export const STORE_BUILDER_LIMITS = {
    sections: 24,
    productsPerSection: 4,
    bannersPerSection: 8,
    footerLinks: 6
} as const;

export type StoreProductSection = {
    id: string;
    type: 'products';
    title: string;
    subtitle: string;
    product_ids: string[];
};

export type StoreBannerSlide = {
    id: string;
    image_url: string;
    title: string;
    description: string;
    button_text: string;
    button_url: string;
};

export type StoreBannerSection = {
    id: string;
    type: 'banner_carousel';
    title: string;
    slides: StoreBannerSlide[];
};

export type StoreLayoutSection = StoreProductSection | StoreBannerSection;

export type StoreFooterLink = {
    id: string;
    label: string;
    url: string;
};

export type StoreFooterConfig = {
    enabled: boolean;
    description: string;
    contact_email: string;
    whatsapp: string;
    instagram: string;
    copyright_text: string;
    links: StoreFooterLink[];
};

export type StoreBackgroundConfig = {
    mode: 'theme' | 'color' | 'image';
    color: string;
    image_url: string;
    overlay: number;
};

export type StorePaletteKey = 'midnight' | 'graphite' | 'carbon' | 'ocean' | 'pearl';

export type StorePaletteColors = {
    bg: string;
    surface: string;
    soft: string;
    ink: string;
    muted: string;
    line: string;
    deep: string;
    accent: string;
    secondary: string;
    tertiary: string;
    glow: string;
};

export const STORE_COLOR_PALETTES: Record<StorePaletteKey, StorePaletteColors> = {
    midnight: {
        bg: '#070a12', surface: '#0f1420', soft: '#171e2e', ink: '#f5f7ff', muted: '#929caf',
        line: '#283249', deep: '#03050a', accent: '#7c5cff', secondary: '#22d3ee', tertiary: '#a78bfa', glow: '#ff5c8a'
    },
    graphite: {
        bg: '#0a0d0b', surface: '#131815', soft: '#1b231e', ink: '#f4f8f5', muted: '#93a098',
        line: '#2a362e', deep: '#040605', accent: '#a3e635', secondary: '#34d399', tertiary: '#facc15', glow: '#e9ff70'
    },
    carbon: {
        bg: '#080808', surface: '#131313', soft: '#1d1d1d', ink: '#fafafa', muted: '#999999',
        line: '#303030', deep: '#020202', accent: '#ff5a36', secondary: '#ffb800', tertiary: '#8b5cf6', glow: '#ff426d'
    },
    ocean: {
        bg: '#051019', surface: '#0b1924', soft: '#102533', ink: '#effbff', muted: '#8ca5b3',
        line: '#1f3b4a', deep: '#02080d', accent: '#00b8ff', secondary: '#00e5c3', tertiary: '#668cff', glow: '#22d3ee'
    },
    pearl: {
        bg: '#f3f5f8', surface: '#ffffff', soft: '#e8edf3', ink: '#111827', muted: '#667085',
        line: '#d5dce6', deep: '#111827', accent: '#5b46f6', secondary: '#0ea5e9', tertiary: '#8b5cf6', glow: '#ec4899'
    }
};

export type StoreStyleConfig = {
    visual_version: 2;
    color_mode: 'preset' | 'custom';
    palette_preset: StorePaletteKey;
    custom_colors: StorePaletteColors;
    font_style: 'modern' | 'editorial' | 'friendly' | 'bold';
    hero_layout: 'split' | 'centered' | 'immersive';
    hero_image_style: 'arched' | 'rounded' | 'framed';
    header_style: 'glass' | 'solid' | 'minimal';
    button_style: 'soft' | 'pill' | 'square';
    card_style: 'colorful' | 'elevated' | 'outlined' | 'minimal';
    corner_style: 'soft' | 'rounded' | 'sharp';
    catalog_density: 'compact' | 'comfortable' | 'spacious';
    image_ratio: 'square' | 'portrait' | 'landscape';
    animation_level: 'none' | 'subtle' | 'expressive';
    color_intensity: 'monochrome' | 'balanced' | 'vibrant';
    background_pattern: 'none' | 'dots' | 'grid' | 'waves';
    catalog_columns: 2 | 3 | 4;
    show_announcement: boolean;
    show_service_bar: boolean;
    show_marquee: boolean;
    show_categories: boolean;
    show_search: boolean;
    show_account: boolean;
};

export type StoreBuilderConfig = {
    sections: StoreLayoutSection[];
    footer: StoreFooterConfig;
    background: StoreBackgroundConfig;
    style: StoreStyleConfig;
};

export class StoreBuilderValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'StoreBuilderValidationError';
    }
}

export const DEFAULT_STORE_FOOTER: StoreFooterConfig = {
    enabled: true,
    description: 'Produtos digitais selecionados para ajudar você a avançar.',
    contact_email: '',
    whatsapp: '',
    instagram: '',
    copyright_text: '',
    links: []
};

export const DEFAULT_STORE_BACKGROUND: StoreBackgroundConfig = {
    mode: 'theme',
    color: '#09090b',
    image_url: '',
    overlay: 82
};

export const DEFAULT_STORE_STYLE: StoreStyleConfig = {
    visual_version: 2,
    color_mode: 'preset',
    palette_preset: 'midnight',
    custom_colors: { ...STORE_COLOR_PALETTES.midnight },
    font_style: 'modern',
    hero_layout: 'split',
    hero_image_style: 'rounded',
    header_style: 'glass',
    button_style: 'pill',
    card_style: 'elevated',
    corner_style: 'rounded',
    catalog_density: 'comfortable',
    image_ratio: 'landscape',
    animation_level: 'expressive',
    color_intensity: 'vibrant',
    background_pattern: 'grid',
    catalog_columns: 4,
    show_announcement: true,
    show_service_bar: true,
    show_marquee: true,
    show_categories: true,
    show_search: true,
    show_account: true
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown, maxLength: number): string {
    return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function requiredId(value: unknown, fallbackPrefix: string, index: number): string {
    const normalized = text(value, 100).replace(/[^a-zA-Z0-9_-]/g, '');
    return normalized || `${fallbackPrefix}-${index + 1}`;
}

function normalizeHexColor(value: unknown, fallback: string): string {
    const normalized = text(value, 20);
    return /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized.toLowerCase() : fallback;
}

export function normalizeStoreUrl(value: unknown, options: { allowRelative?: boolean; strict?: boolean } = {}): string {
    const normalized = text(value, 1000);
    if (!normalized) return '';

    if (options.allowRelative && normalized.startsWith('/') && !normalized.startsWith('//')) {
        return normalized;
    }

    try {
        const parsed = new URL(normalized);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.toString();
    } catch {
        // The strict branch below returns a useful validation error.
    }

    if (options.strict) {
        throw new StoreBuilderValidationError('Use apenas links completos iniciados por http:// ou https://.');
    }
    return '';
}

export function normalizeStoreLayoutSections(
    value: unknown,
    options: { strict?: boolean } = {}
): StoreLayoutSection[] {
    if (value == null) return [];
    if (!Array.isArray(value)) {
        if (options.strict) throw new StoreBuilderValidationError('A estrutura da loja é inválida.');
        return [];
    }
    if (options.strict && value.length > STORE_BUILDER_LIMITS.sections) {
        throw new StoreBuilderValidationError(`A loja pode ter no máximo ${STORE_BUILDER_LIMITS.sections} seções.`);
    }

    const sections: StoreLayoutSection[] = [];
    for (const [sectionIndex, raw] of value.slice(0, STORE_BUILDER_LIMITS.sections).entries()) {
        if (!isRecord(raw)) {
            if (options.strict) throw new StoreBuilderValidationError('Existe uma seção inválida na estrutura da loja.');
            continue;
        }

        if (raw.type === 'products') {
            if (!Array.isArray(raw.product_ids)) {
                if (options.strict) throw new StoreBuilderValidationError('A lista de produtos de uma seção é inválida.');
                continue;
            }
            if (options.strict && raw.product_ids.length > STORE_BUILDER_LIMITS.productsPerSection) {
                throw new StoreBuilderValidationError(`Cada linha pode ter no máximo ${STORE_BUILDER_LIMITS.productsPerSection} produtos.`);
            }

            const productIds = Array.from(new Set(
                raw.product_ids
                    .map(productId => text(productId, 100))
                    .filter(Boolean)
            )).slice(0, STORE_BUILDER_LIMITS.productsPerSection);

            sections.push({
                id: requiredId(raw.id, 'products', sectionIndex),
                type: 'products',
                title: text(raw.title, 100),
                subtitle: text(raw.subtitle, 220),
                product_ids: productIds
            });
            continue;
        }

        if (raw.type === 'banner_carousel') {
            if (!Array.isArray(raw.slides)) {
                if (options.strict) throw new StoreBuilderValidationError('A lista de banners de um carrossel é inválida.');
                continue;
            }
            if (options.strict && raw.slides.length > STORE_BUILDER_LIMITS.bannersPerSection) {
                throw new StoreBuilderValidationError(`Cada carrossel pode ter no máximo ${STORE_BUILDER_LIMITS.bannersPerSection} banners.`);
            }

            const slides: StoreBannerSlide[] = [];
            for (const [slideIndex, slideRaw] of raw.slides.slice(0, STORE_BUILDER_LIMITS.bannersPerSection).entries()) {
                if (!isRecord(slideRaw)) {
                    if (options.strict) throw new StoreBuilderValidationError('Existe um banner inválido no carrossel.');
                    continue;
                }
                slides.push({
                    id: requiredId(slideRaw.id, `slide-${sectionIndex + 1}`, slideIndex),
                    image_url: normalizeStoreUrl(slideRaw.image_url, { strict: options.strict }),
                    title: text(slideRaw.title, 100),
                    description: text(slideRaw.description, 240),
                    button_text: text(slideRaw.button_text, 40),
                    button_url: normalizeStoreUrl(slideRaw.button_url, { allowRelative: true, strict: options.strict })
                });
            }

            sections.push({
                id: requiredId(raw.id, 'banners', sectionIndex),
                type: 'banner_carousel',
                title: text(raw.title, 100),
                slides
            });
            continue;
        }

        if (options.strict) throw new StoreBuilderValidationError('Tipo de seção não permitido.');
    }

    return sections;
}

export function normalizeStoreFooter(value: unknown, options: { strict?: boolean } = {}): StoreFooterConfig {
    if (value == null) return { ...DEFAULT_STORE_FOOTER, links: [] };
    if (!isRecord(value)) {
        if (options.strict) throw new StoreBuilderValidationError('A configuração do rodapé é inválida.');
        return { ...DEFAULT_STORE_FOOTER, links: [] };
    }

    const rawLinks = value.links;
    if (options.strict && rawLinks != null && !Array.isArray(rawLinks)) {
        throw new StoreBuilderValidationError('A lista de links do rodapé é inválida.');
    }
    if (options.strict && Array.isArray(rawLinks) && rawLinks.length > STORE_BUILDER_LIMITS.footerLinks) {
        throw new StoreBuilderValidationError(`O rodapé pode ter no máximo ${STORE_BUILDER_LIMITS.footerLinks} links.`);
    }

    const links: StoreFooterLink[] = [];
    if (Array.isArray(rawLinks)) {
        for (const [index, rawLink] of rawLinks.slice(0, STORE_BUILDER_LIMITS.footerLinks).entries()) {
            if (!isRecord(rawLink)) {
                if (options.strict) throw new StoreBuilderValidationError('Existe um link inválido no rodapé.');
                continue;
            }
            const label = text(rawLink.label, 40);
            const url = normalizeStoreUrl(rawLink.url, { allowRelative: true, strict: options.strict && Boolean(label || rawLink.url) });
            if (label && url) {
                links.push({ id: requiredId(rawLink.id, 'footer-link', index), label, url });
            } else if (options.strict && (label || url)) {
                throw new StoreBuilderValidationError('Preencha o nome e o endereço de cada link do rodapé.');
            }
        }
    }

    const email = text(value.contact_email, 160);
    if (options.strict && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new StoreBuilderValidationError('Informe um e-mail válido no rodapé.');
    }

    return {
        enabled: value.enabled !== false,
        description: text(value.description, 300),
        contact_email: email,
        whatsapp: text(value.whatsapp, 30).replace(/[^\d+]/g, ''),
        instagram: text(value.instagram, 80).replace(/^@/, '').replace(/[^a-zA-Z0-9._]/g, ''),
        copyright_text: text(value.copyright_text, 160),
        links
    };
}

export function normalizeStoreBackground(value: unknown, options: { strict?: boolean } = {}): StoreBackgroundConfig {
    if (value == null) return { ...DEFAULT_STORE_BACKGROUND };
    if (!isRecord(value)) {
        if (options.strict) throw new StoreBuilderValidationError('A configuração de fundo é inválida.');
        return { ...DEFAULT_STORE_BACKGROUND };
    }

    const allowedModes = new Set(['theme', 'color', 'image']);
    const rawMode = text(value.mode, 20);
    if (options.strict && rawMode && !allowedModes.has(rawMode)) {
        throw new StoreBuilderValidationError('Tipo de fundo não permitido.');
    }
    const mode = (allowedModes.has(rawMode) ? rawMode : 'theme') as StoreBackgroundConfig['mode'];
    const overlayNumber = Number(value.overlay);

    return {
        mode,
        color: normalizeHexColor(value.color, DEFAULT_STORE_BACKGROUND.color),
        image_url: normalizeStoreUrl(value.image_url, { strict: options.strict && mode === 'image' }),
        overlay: Number.isFinite(overlayNumber) ? Math.min(95, Math.max(20, Math.round(overlayNumber))) : DEFAULT_STORE_BACKGROUND.overlay
    };
}

function enumValue<T extends string>(
    value: unknown,
    allowed: readonly T[],
    fallback: T,
    fieldLabel: string,
    strict = false
): T {
    const normalized = text(value, 40) as T;
    if (allowed.includes(normalized)) return normalized;
    if (strict && normalized) throw new StoreBuilderValidationError(`${fieldLabel} inválido.`);
    return fallback;
}

function booleanValue(value: unknown, fallback: boolean, fieldLabel: string, strict = false): boolean {
    if (typeof value === 'boolean') return value;
    if (value == null) return fallback;
    if (strict) throw new StoreBuilderValidationError(`${fieldLabel} inválido.`);
    return fallback;
}

function paletteColor(value: unknown, fallback: string, fieldLabel: string, strict = false): string {
    if (value == null || value === '') return fallback;
    const normalized = text(value, 20);
    if (/^#[0-9a-fA-F]{6}$/.test(normalized)) return normalized.toLowerCase();
    if (strict) throw new StoreBuilderValidationError(`${fieldLabel} inválida.`);
    return fallback;
}

function normalizePaletteColors(value: unknown, strict = false): StorePaletteColors {
    const source = isRecord(value) ? value : {};
    const fallback = DEFAULT_STORE_STYLE.custom_colors;
    if (strict && value != null && !isRecord(value)) {
        throw new StoreBuilderValidationError('A paleta personalizada é inválida.');
    }
    return {
        bg: paletteColor(source.bg, fallback.bg, 'Cor de fundo', strict),
        surface: paletteColor(source.surface, fallback.surface, 'Cor das superfícies', strict),
        soft: paletteColor(source.soft, fallback.soft, 'Cor das superfícies secundárias', strict),
        ink: paletteColor(source.ink, fallback.ink, 'Cor do texto', strict),
        muted: paletteColor(source.muted, fallback.muted, 'Cor do texto secundário', strict),
        line: paletteColor(source.line, fallback.line, 'Cor das bordas', strict),
        deep: paletteColor(source.deep, fallback.deep, 'Cor profunda', strict),
        accent: paletteColor(source.accent, fallback.accent, 'Cor de destaque', strict),
        secondary: paletteColor(source.secondary, fallback.secondary, 'Cor auxiliar', strict),
        tertiary: paletteColor(source.tertiary, fallback.tertiary, 'Terceira cor', strict),
        glow: paletteColor(source.glow, fallback.glow, 'Cor de brilho', strict)
    };
}

export function normalizeStoreStyle(value: unknown, options: { strict?: boolean } = {}): StoreStyleConfig {
    if (value == null) return { ...DEFAULT_STORE_STYLE };
    if (!isRecord(value)) {
        if (options.strict) throw new StoreBuilderValidationError('A configuração visual da loja é inválida.');
        return { ...DEFAULT_STORE_STYLE };
    }

    const columns = Number(value.catalog_columns);
    const isLegacyVisual = Number(value.visual_version) !== 2;
    const modernizeLegacyDefault = (raw: unknown, oldDefault: string, newDefault: string) => (
        isLegacyVisual && raw === oldDefault ? newDefault : raw
    );
    if (options.strict && Number.isFinite(columns) && ![2, 3, 4].includes(columns)) {
        throw new StoreBuilderValidationError('A quantidade de colunas do catálogo é inválida.');
    }

    return {
        visual_version: 2,
        color_mode: enumValue(value.color_mode, ['preset', 'custom'] as const, DEFAULT_STORE_STYLE.color_mode, 'Modo de cores', options.strict),
        palette_preset: enumValue(value.palette_preset, ['midnight', 'graphite', 'carbon', 'ocean', 'pearl'] as const, DEFAULT_STORE_STYLE.palette_preset, 'Paleta', options.strict),
        custom_colors: normalizePaletteColors(value.custom_colors, options.strict),
        font_style: enumValue(modernizeLegacyDefault(value.font_style, 'editorial', 'modern'), ['modern', 'editorial', 'friendly', 'bold'] as const, DEFAULT_STORE_STYLE.font_style, 'Estilo de fonte', options.strict),
        hero_layout: enumValue(value.hero_layout, ['split', 'centered', 'immersive'] as const, DEFAULT_STORE_STYLE.hero_layout, 'Formato da capa', options.strict),
        hero_image_style: enumValue(modernizeLegacyDefault(value.hero_image_style, 'arched', 'rounded'), ['arched', 'rounded', 'framed'] as const, DEFAULT_STORE_STYLE.hero_image_style, 'Estilo da imagem principal', options.strict),
        header_style: enumValue(value.header_style, ['glass', 'solid', 'minimal'] as const, DEFAULT_STORE_STYLE.header_style, 'Estilo do cabeçalho', options.strict),
        button_style: enumValue(modernizeLegacyDefault(value.button_style, 'soft', 'pill'), ['soft', 'pill', 'square'] as const, DEFAULT_STORE_STYLE.button_style, 'Estilo dos botões', options.strict),
        card_style: enumValue(modernizeLegacyDefault(value.card_style, 'colorful', 'elevated'), ['colorful', 'elevated', 'outlined', 'minimal'] as const, DEFAULT_STORE_STYLE.card_style, 'Estilo dos produtos', options.strict),
        corner_style: enumValue(modernizeLegacyDefault(value.corner_style, 'soft', 'rounded'), ['soft', 'rounded', 'sharp'] as const, DEFAULT_STORE_STYLE.corner_style, 'Formato dos cantos', options.strict),
        catalog_density: enumValue(value.catalog_density, ['compact', 'comfortable', 'spacious'] as const, DEFAULT_STORE_STYLE.catalog_density, 'Espaçamento do catálogo', options.strict),
        image_ratio: enumValue(value.image_ratio, ['square', 'portrait', 'landscape'] as const, DEFAULT_STORE_STYLE.image_ratio, 'Proporção das imagens', options.strict),
        animation_level: enumValue(value.animation_level, ['none', 'subtle', 'expressive'] as const, DEFAULT_STORE_STYLE.animation_level, 'Intensidade das animações', options.strict),
        color_intensity: enumValue(value.color_intensity, ['monochrome', 'balanced', 'vibrant'] as const, DEFAULT_STORE_STYLE.color_intensity, 'Intensidade das cores', options.strict),
        background_pattern: enumValue(modernizeLegacyDefault(value.background_pattern, 'none', 'grid'), ['none', 'dots', 'grid', 'waves'] as const, DEFAULT_STORE_STYLE.background_pattern, 'Textura de fundo', options.strict),
        catalog_columns: ([2, 3, 4].includes(columns) ? columns : DEFAULT_STORE_STYLE.catalog_columns) as 2 | 3 | 4,
        show_announcement: booleanValue(value.show_announcement, DEFAULT_STORE_STYLE.show_announcement, 'Visibilidade do aviso', options.strict),
        show_service_bar: booleanValue(value.show_service_bar, DEFAULT_STORE_STYLE.show_service_bar, 'Visibilidade dos benefícios', options.strict),
        show_marquee: booleanValue(value.show_marquee, DEFAULT_STORE_STYLE.show_marquee, 'Visibilidade da faixa animada', options.strict),
        show_categories: booleanValue(value.show_categories, DEFAULT_STORE_STYLE.show_categories, 'Visibilidade das categorias', options.strict),
        show_search: booleanValue(value.show_search, DEFAULT_STORE_STYLE.show_search, 'Visibilidade da busca', options.strict),
        show_account: booleanValue(value.show_account, DEFAULT_STORE_STYLE.show_account, 'Visibilidade da conta', options.strict)
    };
}

export function normalizeStoreBuilder(
    value: Partial<StoreBuilderConfig> | null | undefined,
    options: { strict?: boolean } = {}
): StoreBuilderConfig {
    return {
        sections: normalizeStoreLayoutSections(value?.sections, options),
        footer: normalizeStoreFooter(value?.footer, options),
        background: normalizeStoreBackground(value?.background, options),
        style: normalizeStoreStyle(value?.style, options)
    };
}

export function collectStoreProductIds(sections: StoreLayoutSection[]): string[] {
    return Array.from(new Set(
        sections.flatMap(section => section.type === 'products' ? section.product_ids : [])
    ));
}

export function createStoreBuilderId(prefix: string): string {
    const random = typeof globalThis.crypto?.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `${prefix}-${random}`;
}

export function buildAutomaticProductSections(productIds: string[]): StoreProductSection[] {
    const uniqueIds = Array.from(new Set(productIds.filter(Boolean)));
    const sections: StoreProductSection[] = [];
    for (let index = 0; index < uniqueIds.length; index += STORE_BUILDER_LIMITS.productsPerSection) {
        const row = Math.floor(index / STORE_BUILDER_LIMITS.productsPerSection);
        sections.push({
            id: createStoreBuilderId('products'),
            type: 'products',
            title: row === 0 ? 'Produtos em destaque' : 'Mais produtos para você',
            subtitle: row === 0 ? 'Escolha o produto ideal e compre com segurança.' : '',
            product_ids: uniqueIds.slice(index, index + STORE_BUILDER_LIMITS.productsPerSection)
        });
    }
    return sections;
}

export function buildRenderableStoreSections(
    configuredSections: StoreLayoutSection[],
    availableProductIds: string[]
): StoreLayoutSection[] {
    const available = new Set(availableProductIds);
    const used = new Set<string>();
    const rendered: StoreLayoutSection[] = [];

    for (const section of configuredSections) {
        if (section.type === 'banner_carousel') {
            const slides = section.slides.filter(slide => Boolean(slide.image_url));
            if (slides.length > 0) rendered.push({ ...section, slides });
            continue;
        }

        const productIds = section.product_ids.filter(id => available.has(id) && !used.has(id));
        productIds.forEach(id => used.add(id));
        if (productIds.length > 0) rendered.push({ ...section, product_ids: productIds });
    }

    const remainingIds = availableProductIds.filter(id => !used.has(id));
    const automaticSections = buildAutomaticProductSections(remainingIds).map((section, index) => ({
        ...section,
        title: rendered.some(item => item.type === 'products') || index > 0
            ? 'Mais produtos para você'
            : section.title
    }));

    return [...rendered, ...automaticSections];
}
