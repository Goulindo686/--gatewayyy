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

export type StoreStyleColors = {
    background: string;
    surface: string;
    surface_alt: string;
    text: string;
    muted: string;
    border: string;
    accent: string;
};

export type StoreHeroContentConfig = {
    logo_url: string;
    welcome_text: string;
    description: string;
    top_badges: {
        delivery: string;
        security: string;
        protected: string;
    };
    bottom_badges: {
        access: string;
        checkout: string;
        payment: string;
    };
};

export type StoreStyleConfig = {
    color_mode: 'theme' | 'custom';
    custom_colors: StoreStyleColors;
    font_style: 'modern' | 'editorial' | 'friendly' | 'bold';
    hero_style: 'classic' | 'compact' | 'centered';
    header_style: 'standard' | 'glass' | 'solid';
    button_style: 'soft' | 'pill' | 'square';
    card_style: 'standard' | 'elevated' | 'outlined' | 'minimal';
    corner_style: 'soft' | 'rounded' | 'sharp';
    catalog_density: 'compact' | 'comfortable' | 'spacious';
    image_ratio: 'square' | 'portrait' | 'landscape';
    animation_level: 'none' | 'subtle' | 'expressive';
    background_pattern: 'none' | 'dots' | 'grid';
    catalog_columns: 2 | 3 | 4;
    show_benefit_bar: boolean;
    show_categories: boolean;
    show_search: boolean;
    show_account: boolean;
    hero_content: StoreHeroContentConfig;
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
    color_mode: 'theme',
    custom_colors: {
        background: '#09090b',
        surface: '#141417',
        surface_alt: '#0f1117',
        text: '#ffffff',
        muted: '#94a3b8',
        border: '#24242a',
        accent: '#6c5ce7'
    },
    font_style: 'modern',
    hero_style: 'classic',
    header_style: 'standard',
    button_style: 'soft',
    card_style: 'standard',
    corner_style: 'soft',
    catalog_density: 'comfortable',
    image_ratio: 'landscape',
    animation_level: 'expressive',
    background_pattern: 'none',
    catalog_columns: 4,
    show_benefit_bar: true,
    show_categories: true,
    show_search: true,
    show_account: true,
    hero_content: {
        logo_url: '',
        welcome_text: 'Bem-vindo à',
        description: '',
        top_badges: {
            delivery: 'Entrega digital',
            security: 'Compra segura',
            protected: 'Loja protegida'
        },
        bottom_badges: {
            access: 'Acesso online',
            checkout: 'Checkout protegido',
            payment: 'PIX e cartão'
        }
    }
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

function enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T, label: string, strict = false): T {
    const normalized = text(value, 40) as T;
    if (allowed.includes(normalized)) return normalized;
    if (strict && normalized) throw new StoreBuilderValidationError(`${label} inválido.`);
    return fallback;
}

function booleanValue(value: unknown, fallback: boolean, label: string, strict = false): boolean {
    if (typeof value === 'boolean') return value;
    if (value == null) return fallback;
    if (strict) throw new StoreBuilderValidationError(`${label} inválido.`);
    return fallback;
}

function styleColor(value: unknown, fallback: string, label: string, strict = false): string {
    if (value == null || value === '') return fallback;
    const normalized = text(value, 20);
    if (/^#[0-9a-fA-F]{6}$/.test(normalized)) return normalized.toLowerCase();
    if (strict) throw new StoreBuilderValidationError(`${label} inválida.`);
    return fallback;
}

function normalizeStoreStyleColors(value: unknown, strict = false): StoreStyleColors {
    const source = isRecord(value) ? value : {};
    if (strict && value != null && !isRecord(value)) {
        throw new StoreBuilderValidationError('A paleta personalizada é inválida.');
    }
    const fallback = DEFAULT_STORE_STYLE.custom_colors;
    return {
        background: styleColor(source.background, fallback.background, 'Cor de fundo', strict),
        surface: styleColor(source.surface, fallback.surface, 'Cor dos cards', strict),
        surface_alt: styleColor(source.surface_alt, fallback.surface_alt, 'Cor da superfície auxiliar', strict),
        text: styleColor(source.text, fallback.text, 'Cor do texto', strict),
        muted: styleColor(source.muted, fallback.muted, 'Cor do texto secundário', strict),
        border: styleColor(source.border, fallback.border, 'Cor das bordas', strict),
        accent: styleColor(source.accent, fallback.accent, 'Cor de destaque', strict)
    };
}

function heroText(value: unknown, fallback: string, maxLength: number, label: string, strict = false): string {
    if (value == null) return fallback;
    if (typeof value !== 'string') {
        if (strict) throw new StoreBuilderValidationError(`${label} inválido.`);
        return fallback;
    }
    return value.trim().slice(0, maxLength);
}

function normalizeStoreHeroContent(value: unknown, strict = false): StoreHeroContentConfig {
    const source = isRecord(value) ? value : {};
    if (strict && value != null && !isRecord(value)) {
        throw new StoreBuilderValidationError('O conteúdo da capa é inválido.');
    }

    const topSource = isRecord(source.top_badges) ? source.top_badges : {};
    const bottomSource = isRecord(source.bottom_badges) ? source.bottom_badges : {};
    if (strict && source.top_badges != null && !isRecord(source.top_badges)) {
        throw new StoreBuilderValidationError('Os selos superiores da capa são inválidos.');
    }
    if (strict && source.bottom_badges != null && !isRecord(source.bottom_badges)) {
        throw new StoreBuilderValidationError('As garantias inferiores da capa são inválidas.');
    }

    const fallback = DEFAULT_STORE_STYLE.hero_content;
    return {
        logo_url: normalizeStoreUrl(source.logo_url, { strict: strict && Boolean(source.logo_url) }),
        welcome_text: heroText(source.welcome_text, fallback.welcome_text, 50, 'Texto de boas-vindas', strict),
        description: heroText(source.description, fallback.description, 240, 'Descrição da capa', strict),
        top_badges: {
            delivery: heroText(topSource.delivery, fallback.top_badges.delivery, 35, 'Primeiro selo superior', strict),
            security: heroText(topSource.security, fallback.top_badges.security, 35, 'Segundo selo superior', strict),
            protected: heroText(topSource.protected, fallback.top_badges.protected, 35, 'Terceiro selo superior', strict)
        },
        bottom_badges: {
            access: heroText(bottomSource.access, fallback.bottom_badges.access, 40, 'Primeira garantia inferior', strict),
            checkout: heroText(bottomSource.checkout, fallback.bottom_badges.checkout, 40, 'Segunda garantia inferior', strict),
            payment: heroText(bottomSource.payment, fallback.bottom_badges.payment, 40, 'Terceira garantia inferior', strict)
        }
    };
}

function cloneDefaultStoreStyle(): StoreStyleConfig {
    return {
        ...DEFAULT_STORE_STYLE,
        custom_colors: { ...DEFAULT_STORE_STYLE.custom_colors },
        hero_content: {
            ...DEFAULT_STORE_STYLE.hero_content,
            top_badges: { ...DEFAULT_STORE_STYLE.hero_content.top_badges },
            bottom_badges: { ...DEFAULT_STORE_STYLE.hero_content.bottom_badges }
        }
    };
}

export function normalizeStoreStyle(value: unknown, options: { strict?: boolean } = {}): StoreStyleConfig {
    if (value == null) return cloneDefaultStoreStyle();
    if (!isRecord(value)) {
        if (options.strict) throw new StoreBuilderValidationError('A configuração visual da loja é inválida.');
        return cloneDefaultStoreStyle();
    }

    const columns = Number(value.catalog_columns);
    if (options.strict && Number.isFinite(columns) && ![2, 3, 4].includes(columns)) {
        throw new StoreBuilderValidationError('A quantidade de colunas do catálogo é inválida.');
    }

    return {
        color_mode: enumValue(value.color_mode, ['theme', 'custom'] as const, DEFAULT_STORE_STYLE.color_mode, 'Modo de cores', options.strict),
        custom_colors: normalizeStoreStyleColors(value.custom_colors, options.strict),
        font_style: enumValue(value.font_style, ['modern', 'editorial', 'friendly', 'bold'] as const, DEFAULT_STORE_STYLE.font_style, 'Estilo de fonte', options.strict),
        hero_style: enumValue(value.hero_style, ['classic', 'compact', 'centered'] as const, DEFAULT_STORE_STYLE.hero_style, 'Estilo da capa', options.strict),
        header_style: enumValue(value.header_style, ['standard', 'glass', 'solid'] as const, DEFAULT_STORE_STYLE.header_style, 'Estilo do cabeçalho', options.strict),
        button_style: enumValue(value.button_style, ['soft', 'pill', 'square'] as const, DEFAULT_STORE_STYLE.button_style, 'Estilo dos botões', options.strict),
        card_style: enumValue(value.card_style, ['standard', 'elevated', 'outlined', 'minimal'] as const, DEFAULT_STORE_STYLE.card_style, 'Estilo dos produtos', options.strict),
        corner_style: enumValue(value.corner_style, ['soft', 'rounded', 'sharp'] as const, DEFAULT_STORE_STYLE.corner_style, 'Formato dos cantos', options.strict),
        catalog_density: enumValue(value.catalog_density, ['compact', 'comfortable', 'spacious'] as const, DEFAULT_STORE_STYLE.catalog_density, 'Espaçamento do catálogo', options.strict),
        image_ratio: enumValue(value.image_ratio, ['square', 'portrait', 'landscape'] as const, DEFAULT_STORE_STYLE.image_ratio, 'Proporção das imagens', options.strict),
        animation_level: enumValue(value.animation_level, ['none', 'subtle', 'expressive'] as const, DEFAULT_STORE_STYLE.animation_level, 'Intensidade das animações', options.strict),
        background_pattern: enumValue(value.background_pattern, ['none', 'dots', 'grid'] as const, DEFAULT_STORE_STYLE.background_pattern, 'Textura do fundo', options.strict),
        catalog_columns: ([2, 3, 4].includes(columns) ? columns : DEFAULT_STORE_STYLE.catalog_columns) as 2 | 3 | 4,
        show_benefit_bar: booleanValue(value.show_benefit_bar, DEFAULT_STORE_STYLE.show_benefit_bar, 'Visibilidade dos benefícios', options.strict),
        show_categories: booleanValue(value.show_categories, DEFAULT_STORE_STYLE.show_categories, 'Visibilidade das categorias', options.strict),
        show_search: booleanValue(value.show_search, DEFAULT_STORE_STYLE.show_search, 'Visibilidade da busca', options.strict),
        show_account: booleanValue(value.show_account, DEFAULT_STORE_STYLE.show_account, 'Visibilidade da conta', options.strict),
        hero_content: normalizeStoreHeroContent(value.hero_content, options.strict)
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
