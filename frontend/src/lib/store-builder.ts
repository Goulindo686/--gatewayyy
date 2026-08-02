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

export type StoreBuilderConfig = {
    sections: StoreLayoutSection[];
    footer: StoreFooterConfig;
    background: StoreBackgroundConfig;
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

export function normalizeStoreBuilder(
    value: Partial<StoreBuilderConfig> | null | undefined,
    options: { strict?: boolean } = {}
): StoreBuilderConfig {
    return {
        sections: normalizeStoreLayoutSections(value?.sections, options),
        footer: normalizeStoreFooter(value?.footer, options),
        background: normalizeStoreBackground(value?.background, options)
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
