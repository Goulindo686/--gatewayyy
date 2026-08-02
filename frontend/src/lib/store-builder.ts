export const STORE_BUILDER_LIMITS = {
    sections: 24,
    productsPerSection: 4,
    heroProducts: 3,
    bannersPerSection: 8,
    featuresPerSection: 6,
    testimonialsPerSection: 6,
    faqPerSection: 10,
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

export type StoreContentSection = {
    id: string;
    type: 'content';
    eyebrow: string;
    title: string;
    description: string;
    image_url: string;
    image_position: 'left' | 'right';
    tone: 'surface' | 'accent' | 'transparent';
    button_text: string;
    button_url: string;
};

export type StoreFeatureItem = {
    id: string;
    title: string;
    description: string;
};

export type StoreFeaturesSection = {
    id: string;
    type: 'features';
    title: string;
    subtitle: string;
    items: StoreFeatureItem[];
};

export type StoreTestimonialItem = {
    id: string;
    quote: string;
    name: string;
    role: string;
};

export type StoreTestimonialsSection = {
    id: string;
    type: 'testimonials';
    title: string;
    subtitle: string;
    items: StoreTestimonialItem[];
};

export type StoreFaqItem = {
    id: string;
    question: string;
    answer: string;
};

export type StoreFaqSection = {
    id: string;
    type: 'faq';
    title: string;
    subtitle: string;
    items: StoreFaqItem[];
};

export type StoreLayoutSection =
    | StoreProductSection
    | StoreBannerSection
    | StoreContentSection
    | StoreFeaturesSection
    | StoreTestimonialsSection
    | StoreFaqSection;

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
    color_scheme: 'dark' | 'light';
    mode: 'theme' | 'color' | 'image';
    color: string;
    image_url: string;
    overlay: number;
    header_style: 'solid' | 'floating' | 'minimal';
    hero_layout: 'split' | 'centered' | 'compact';
    font_style: 'modern' | 'editorial' | 'friendly';
    content_width: 'compact' | 'standard' | 'wide';
    section_spacing: 'compact' | 'comfortable' | 'airy';
    card_style: 'elevated' | 'outlined' | 'minimal';
    card_radius: 'square' | 'soft' | 'rounded';
    product_image_ratio: 'landscape' | 'square' | 'portrait';
    hero_product_ids: string[];
    hero_info_title: string;
    hero_info_text: string;
    hero_promo_title: string;
    hero_promo_text: string;
    show_header_categories: boolean;
    show_header_search: boolean;
    show_categories: boolean;
    show_benefit_strip: boolean;
    show_closing_cta: boolean;
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
    description: 'Soluções, experiências e produtos selecionados para ajudar você a avançar.',
    contact_email: '',
    whatsapp: '',
    instagram: '',
    copyright_text: '',
    links: []
};

export const DEFAULT_STORE_BACKGROUND: StoreBackgroundConfig = {
    color_scheme: 'dark',
    mode: 'theme',
    color: '#09090b',
    image_url: '',
    overlay: 82,
    header_style: 'floating',
    hero_layout: 'split',
    font_style: 'modern',
    content_width: 'wide',
    section_spacing: 'comfortable',
    card_style: 'elevated',
    card_radius: 'soft',
    product_image_ratio: 'landscape',
    hero_product_ids: [],
    hero_info_title: 'Compra simples e segura',
    hero_info_text: 'Escolha sua oferta e finalize a compra em poucos passos.',
    hero_promo_title: 'Seleção da loja',
    hero_promo_text: 'Descubra os produtos escolhidos para receber mais destaque.',
    show_header_categories: true,
    show_header_search: true,
    show_categories: true,
    show_benefit_strip: true,
    show_closing_cta: true
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

function choice<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
    const normalized = text(value, 30) as T;
    return allowed.includes(normalized) ? normalized : fallback;
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

        if (raw.type === 'content') {
            sections.push({
                id: requiredId(raw.id, 'content', sectionIndex),
                type: 'content',
                eyebrow: text(raw.eyebrow, 60),
                title: text(raw.title, 140),
                description: text(raw.description, 1600),
                image_url: normalizeStoreUrl(raw.image_url, { strict: options.strict && Boolean(raw.image_url) }),
                image_position: choice(raw.image_position, ['left', 'right'] as const, 'right'),
                tone: choice(raw.tone, ['surface', 'accent', 'transparent'] as const, 'surface'),
                button_text: text(raw.button_text, 40),
                button_url: normalizeStoreUrl(raw.button_url, { allowRelative: true, strict: options.strict && Boolean(raw.button_url) })
            });
            continue;
        }

        if (raw.type === 'features') {
            if (!Array.isArray(raw.items)) {
                if (options.strict) throw new StoreBuilderValidationError('A lista de diferenciais é inválida.');
                continue;
            }
            if (options.strict && raw.items.length > STORE_BUILDER_LIMITS.featuresPerSection) {
                throw new StoreBuilderValidationError(`Cada seção pode ter no máximo ${STORE_BUILDER_LIMITS.featuresPerSection} diferenciais.`);
            }
            const items = raw.items.slice(0, STORE_BUILDER_LIMITS.featuresPerSection)
                .filter(isRecord)
                .map((item, itemIndex) => ({
                    id: requiredId(item.id, `feature-${sectionIndex + 1}`, itemIndex),
                    title: text(item.title, 90),
                    description: text(item.description, 280)
                }))
                .filter(item => item.title || item.description);
            sections.push({
                id: requiredId(raw.id, 'features', sectionIndex),
                type: 'features',
                title: text(raw.title, 120),
                subtitle: text(raw.subtitle, 320),
                items
            });
            continue;
        }

        if (raw.type === 'testimonials') {
            if (!Array.isArray(raw.items)) {
                if (options.strict) throw new StoreBuilderValidationError('A lista de depoimentos é inválida.');
                continue;
            }
            if (options.strict && raw.items.length > STORE_BUILDER_LIMITS.testimonialsPerSection) {
                throw new StoreBuilderValidationError(`Cada seção pode ter no máximo ${STORE_BUILDER_LIMITS.testimonialsPerSection} depoimentos.`);
            }
            const items = raw.items.slice(0, STORE_BUILDER_LIMITS.testimonialsPerSection)
                .filter(isRecord)
                .map((item, itemIndex) => ({
                    id: requiredId(item.id, `testimonial-${sectionIndex + 1}`, itemIndex),
                    quote: text(item.quote, 700),
                    name: text(item.name, 90),
                    role: text(item.role, 120)
                }))
                .filter(item => item.quote || item.name);
            sections.push({
                id: requiredId(raw.id, 'testimonials', sectionIndex),
                type: 'testimonials',
                title: text(raw.title, 120),
                subtitle: text(raw.subtitle, 320),
                items
            });
            continue;
        }

        if (raw.type === 'faq') {
            if (!Array.isArray(raw.items)) {
                if (options.strict) throw new StoreBuilderValidationError('A lista de perguntas é inválida.');
                continue;
            }
            if (options.strict && raw.items.length > STORE_BUILDER_LIMITS.faqPerSection) {
                throw new StoreBuilderValidationError(`Cada seção pode ter no máximo ${STORE_BUILDER_LIMITS.faqPerSection} perguntas.`);
            }
            const items = raw.items.slice(0, STORE_BUILDER_LIMITS.faqPerSection)
                .filter(isRecord)
                .map((item, itemIndex) => ({
                    id: requiredId(item.id, `faq-${sectionIndex + 1}`, itemIndex),
                    question: text(item.question, 180),
                    answer: text(item.answer, 1000)
                }))
                .filter(item => item.question || item.answer);
            sections.push({
                id: requiredId(raw.id, 'faq', sectionIndex),
                type: 'faq',
                title: text(raw.title, 120),
                subtitle: text(raw.subtitle, 320),
                items
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
    const rawHeroProductIds = value.hero_product_ids;
    if (options.strict && rawHeroProductIds != null && !Array.isArray(rawHeroProductIds)) {
        throw new StoreBuilderValidationError('A seleção de produtos da abertura é inválida.');
    }
    if (options.strict && Array.isArray(rawHeroProductIds) && rawHeroProductIds.length > STORE_BUILDER_LIMITS.heroProducts) {
        throw new StoreBuilderValidationError(`A abertura pode destacar no máximo ${STORE_BUILDER_LIMITS.heroProducts} produtos.`);
    }
    const heroProductIds = Array.isArray(rawHeroProductIds)
        ? Array.from(new Set(rawHeroProductIds.map(productId => text(productId, 100)).filter(Boolean)))
            .slice(0, STORE_BUILDER_LIMITS.heroProducts)
        : [];

    return {
        mode,
        color_scheme: choice(value.color_scheme, ['dark', 'light'] as const, DEFAULT_STORE_BACKGROUND.color_scheme),
        color: normalizeHexColor(value.color, DEFAULT_STORE_BACKGROUND.color),
        image_url: normalizeStoreUrl(value.image_url, { strict: options.strict && mode === 'image' }),
        overlay: Number.isFinite(overlayNumber) ? Math.min(95, Math.max(20, Math.round(overlayNumber))) : DEFAULT_STORE_BACKGROUND.overlay,
        header_style: choice(value.header_style, ['solid', 'floating', 'minimal'] as const, DEFAULT_STORE_BACKGROUND.header_style),
        hero_layout: choice(value.hero_layout, ['split', 'centered', 'compact'] as const, DEFAULT_STORE_BACKGROUND.hero_layout),
        font_style: choice(value.font_style, ['modern', 'editorial', 'friendly'] as const, DEFAULT_STORE_BACKGROUND.font_style),
        content_width: choice(value.content_width, ['compact', 'standard', 'wide'] as const, DEFAULT_STORE_BACKGROUND.content_width),
        section_spacing: choice(value.section_spacing, ['compact', 'comfortable', 'airy'] as const, DEFAULT_STORE_BACKGROUND.section_spacing),
        card_style: choice(value.card_style, ['elevated', 'outlined', 'minimal'] as const, DEFAULT_STORE_BACKGROUND.card_style),
        card_radius: choice(value.card_radius, ['square', 'soft', 'rounded'] as const, DEFAULT_STORE_BACKGROUND.card_radius),
        product_image_ratio: choice(value.product_image_ratio, ['landscape', 'square', 'portrait'] as const, DEFAULT_STORE_BACKGROUND.product_image_ratio),
        hero_product_ids: heroProductIds,
        hero_info_title: text(value.hero_info_title, 80) || DEFAULT_STORE_BACKGROUND.hero_info_title,
        hero_info_text: text(value.hero_info_text, 240) || DEFAULT_STORE_BACKGROUND.hero_info_text,
        hero_promo_title: text(value.hero_promo_title, 80) || DEFAULT_STORE_BACKGROUND.hero_promo_title,
        hero_promo_text: text(value.hero_promo_text, 240) || DEFAULT_STORE_BACKGROUND.hero_promo_text,
        show_header_categories: value.show_header_categories !== false,
        show_header_search: value.show_header_search !== false,
        show_categories: value.show_categories !== false,
        show_benefit_strip: value.show_benefit_strip !== false,
        show_closing_cta: value.show_closing_cta !== false
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

        if (section.type !== 'products') {
            rendered.push(section);
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
