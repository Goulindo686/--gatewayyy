'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { storeAPI } from '@/lib/api';
import { FiArrowRight, FiBookOpen, FiCheckCircle, FiChevronLeft, FiChevronRight, FiCreditCard, FiGrid, FiHeadphones, FiInstagram, FiLock, FiMail, FiPackage, FiSearch, FiShield, FiShoppingBag, FiUser, FiZap } from 'react-icons/fi';
import { useCart } from '@/contexts/CartContext';
import StoreBannerCarousel from '@/components/store/StoreBannerCarousel';
import StoreCartDrawer from '@/components/store/StoreCartDrawer';
import {
    buildAutomaticProductSections,
    buildRenderableStoreSections,
    normalizeStoreBackground,
    normalizeStoreFooter,
    normalizeStoreLayoutSections,
    normalizeStoreStyle,
    StoreLayoutSection,
    StoreStyleConfig
} from '@/lib/store-builder';

type TemplateKey = 'creator' | 'academy' | 'studio';
type StoreThemeMode = 'light' | 'dark';

const storeThemePresets: Record<StoreThemeMode, {
    bg: string;
    surface: string;
    surfaceAlt: string;
    text: string;
    muted: string;
    border: string;
    heroMode: 'dark' | 'light';
}> = {
    light: {
        bg: '#f4f7fb',
        surface: '#ffffff',
        surfaceAlt: '#edf3fc',
        text: '#0e1526',
        muted: '#5a6577',
        border: '#d3dbe8',
        heroMode: 'light'
    },
    dark: {
        bg: '#080d18',
        surface: '#111827',
        surfaceAlt: '#172033',
        text: '#f8fafc',
        muted: '#94a3b8',
        border: '#29354a',
        heroMode: 'dark'
    }
};

export default function StorePage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { totalItems } = useCart();
    const categoryRailRef = useRef<HTMLDivElement | null>(null);

    const [store, setStore] = useState<any>(null);
    const [categories, setCategories] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [cartOpen, setCartOpen] = useState(false);
    const activeCategory = searchParams.get('category') || '';

    useEffect(() => {
        if (!params.slug) return;
        let cancelled = false;
        storeAPI.getStoreBySlug(params.slug as string, activeCategory)
            .then(({ data }) => {
                if (cancelled) return;
                setStore(data.store);
                setCategories(data.categories || []);
                setProducts(data.products || []);
            })
            .catch(error => {
                if (cancelled) return;
                console.error(error);
                setStore(null);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [params.slug, activeCategory]);

    const template = (store?.template || 'creator') as TemplateKey;
    const themeMode: StoreThemeMode = store?.theme === 'dark' ? 'dark' : 'light';
    const presetTheme = storeThemePresets[themeMode];
    const visual = normalizeStoreStyle(store?.style);
    const heroContent = visual.hero_content;
    const theme = visual.color_mode === 'custom'
        ? {
            bg: visual.custom_colors.background,
            surface: visual.custom_colors.surface,
            surfaceAlt: visual.custom_colors.surface_alt,
            text: visual.custom_colors.text,
            muted: visual.custom_colors.muted,
            border: visual.custom_colors.border,
            heroMode: presetTheme.heroMode
        }
        : presetTheme;
    const accent = visual.color_mode === 'custom' ? visual.custom_colors.accent : (store?.accent_color || '#6c5ce7');
    // A custom hostname is used only to resolve the store. Internal navigation
    // keeps the canonical slug so checkout/cart APIs remain fully compatible.
    const slug = store?.slug || (params.slug as string);
    const storeHomePath = String(params.slug).includes('.') ? '/' : `/store/${slug}`;
    const filteredProducts = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return products;
        return products.filter(p =>
            p.name?.toLowerCase().includes(term) ||
            p.description_text?.toLowerCase().includes(term)
        );
    }, [products, searchTerm]);

    const configuredSections = useMemo(
        () => normalizeStoreLayoutSections(store?.layout_sections),
        [store?.layout_sections]
    );
    const renderedSections = useMemo<StoreLayoutSection[]>(() => {
        const availableIds = filteredProducts.map(product => String(product.id));
        if (searchTerm.trim() || activeCategory) return buildAutomaticProductSections(availableIds);
        return buildRenderableStoreSections(configuredSections, availableIds);
    }, [activeCategory, configuredSections, filteredProducts, searchTerm]);
    const productsById = useMemo(
        () => new Map(filteredProducts.map(product => [String(product.id), product])),
        [filteredProducts]
    );

    const handleCategoryClick = (catSlug: string) => {
        router.push(catSlug === activeCategory ? storeHomePath : `${storeHomePath}?category=${catSlug}`);
    };

    const scrollCategoryRail = (direction: -1 | 1) => {
        const rail = categoryRailRef.current;
        if (!rail) return;
        const amount = Math.max(rail.clientWidth * 0.78, 320);
        rail.scrollBy({ left: amount * direction, behavior: 'smooth' });
    };

    const handleNavClick = (url: string) => {
        if (url.startsWith('#')) {
            if (url.length > 1) {
                document.querySelector(url)?.scrollIntoView({ behavior: 'smooth' });
            }
            return;
        }

        if (url.startsWith('/')) {
            router.push(url);
            return;
        }

        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const openProduct = (product: any) => {
        const identifier = product.store_product_slug || product.id;
        router.push(`/store/${encodeURIComponent(slug)}/product/${encodeURIComponent(identifier)}`);
    };

    if (loading && !store) {
        return (
            <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#09090b' }}>
                <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.12)', borderTopColor: '#6c5ce7', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!store) {
        return (
            <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#09090b', padding: 24 }}>
                <div style={{ padding: 44, textAlign: 'center', maxWidth: 420, background: '#141417', borderRadius: 18, border: '1px solid rgba(255,255,255,0.08)' }}>
                    <FiPackage size={44} style={{ opacity: 0.35, color: 'white', marginBottom: 16 }} />
                    <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: 'white' }}>Loja indisponivel</h2>
                    <p style={{ color: '#94a3b8', fontSize: 14 }}>Esta loja nao foi encontrada ou esta temporariamente offline.</p>
                </div>
            </div>
        );
    }

    const heroBg = store.banner_url
        ? `linear-gradient(90deg, ${theme.heroMode === 'light' ? 'rgba(248,250,252,0.96)' : 'rgba(9,9,11,0.92)'} 0%, ${theme.heroMode === 'light' ? 'rgba(248,250,252,0.78)' : 'rgba(9,9,11,0.54)'} 52%, rgba(9,9,11,0.15) 100%), url(${store.banner_url}) center/cover`
        : `radial-gradient(circle at top right, ${accent}44, transparent 34%), linear-gradient(135deg, ${theme.bg}, ${theme.surfaceAlt})`;
    const background = normalizeStoreBackground(store.background);
    const footer = normalizeStoreFooter(store.footer);
    const storeInitials = String(store.name || slug)
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part: string) => part[0]?.toUpperCase())
        .join('') || 'LO';
    const supportUrl = footer.instagram
        ? `https://instagram.com/${footer.instagram}`
        : footer.whatsapp
            ? `https://wa.me/${footer.whatsapp.replace(/\D/g, '')}`
            : footer.contact_email
                ? `mailto:${footer.contact_email}`
                : '';
    const categoryStats = categories.map(category => ({
        ...category,
        productCount: products.filter(product => product.store_category_id === category.id).length
    }));
    const backgroundOverlay = themeMode === 'dark' ? '8,13,24' : '244,247,251';
    const pageBackground = background.mode === 'image' && background.image_url
        ? `linear-gradient(rgba(${backgroundOverlay},${background.overlay / 100}), rgba(${backgroundOverlay},${background.overlay / 100})), url("${background.image_url}") center/cover fixed`
        : undefined;
    // A previously customized dark background must not survive a switch back
    // to the light theme. Custom palettes can still opt into a custom color.
    const pageBackgroundColor = background.mode === 'color' && visual.color_mode === 'custom'
        ? background.color
        : theme.bg;
    const backgroundPattern = visual.background_pattern === 'dots'
        ? `radial-gradient(${theme.muted}22 1px, transparent 1px)`
        : visual.background_pattern === 'grid'
            ? `linear-gradient(${theme.muted}14 1px, transparent 1px), linear-gradient(90deg, ${theme.muted}14 1px, transparent 1px)`
            : '';
    const resolvedPageBackground = backgroundPattern
        ? `${backgroundPattern}, ${pageBackground || pageBackgroundColor}`
        : (pageBackground || pageBackgroundColor);
    const resolvedBackgroundSize = visual.background_pattern === 'dots'
        ? (pageBackground ? '22px 22px, auto, cover' : '22px 22px, auto')
        : visual.background_pattern === 'grid'
            ? (pageBackground ? '22px 22px, 22px 22px, auto, cover' : '22px 22px, 22px 22px, auto')
            : undefined;
    const fontFamilies: Record<StoreStyleConfig['font_style'], string> = {
        modern: 'Inter, Outfit, sans-serif',
        editorial: 'Georgia, Times New Roman, serif',
        friendly: 'Nunito, Inter, sans-serif',
        bold: 'Outfit, Arial Black, sans-serif'
    };
    const visualClasses = [
        `store-theme-${themeMode}`,
        `store-font-${visual.font_style}`,
        `store-hero-style-${visual.hero_style}`,
        `store-header-style-${visual.header_style}`,
        `store-button-style-${visual.button_style}`,
        `store-card-style-${visual.card_style}`,
        `store-corner-style-${visual.corner_style}`,
        `store-density-${visual.catalog_density}`,
        `store-image-${visual.image_ratio}`,
        `store-animation-${visual.animation_level}`,
        visual.show_search ? '' : 'store-search-hidden'
    ].filter(Boolean).join(' ');
    const cardRadius = visual.corner_style === 'sharp' ? 0 : visual.corner_style === 'rounded' ? 28 : (template === 'studio' ? 10 : 18);
    const topHeroBadges = [
        { key: 'delivery', text: heroContent.top_badges.delivery, icon: <FiZap />, color: accent, border: `${accent}55`, background: `${accent}10` },
        { key: 'security', text: heroContent.top_badges.security, icon: <FiShield />, color: '#21c77a', border: 'rgba(33,199,122,.30)', background: 'rgba(33,199,122,.08)' },
        { key: 'protected', text: heroContent.top_badges.protected, icon: <FiCheckCircle />, color: theme.text, border: theme.border, background: theme.surface }
    ].filter(item => item.text);
    const bottomHeroBadges = [
        { key: 'access', text: heroContent.bottom_badges.access, icon: <FiZap />, color: accent, background: `${accent}18` },
        { key: 'checkout', text: heroContent.bottom_badges.checkout, icon: <FiLock />, color: '#21c77a', background: 'rgba(33,199,122,.10)' },
        { key: 'payment', text: heroContent.bottom_badges.payment, icon: <FiCreditCard />, color: '#35b6ff', background: 'rgba(53,182,255,.10)' }
    ].filter(item => item.text);

    return (
        <div
            id="top"
            className={visualClasses}
            style={{
                minHeight: '100vh',
                background: resolvedPageBackground,
                backgroundSize: resolvedBackgroundSize,
                color: theme.text,
                fontFamily: fontFamilies[visual.font_style],
                '--store-columns': visual.catalog_columns,
                '--store-bg': theme.bg,
                '--store-surface': theme.surface,
                '--store-surface-alt': theme.surfaceAlt,
                '--store-text': theme.text,
                '--store-muted': theme.muted,
                '--store-border': theme.border,
                '--store-accent': accent
            } as CSSProperties}
        >
            <header
                className="store-main-header"
                style={{
                    color: theme.text,
                    background: themeMode === 'light' ? 'rgba(255,255,255,.88)' : 'rgba(8,13,24,.90)',
                    borderColor: theme.border
                }}
            >
                <div className="store-main-header-inner">
                    <button className="store-brand" onClick={() => router.push(storeHomePath)} style={{ color: theme.text }}>
                        <span className="store-brand-mark" style={{ background: `linear-gradient(145deg, ${accent}, ${accent}99)` }}>
                            {heroContent.logo_url
                                ? <img src={heroContent.logo_url} alt="" />
                                : storeInitials}
                        </span>
                        <span className="store-brand-name">{store.name || slug}</span>
                        <FiCheckCircle className="store-brand-check" style={{ color: accent }} />
                    </button>

                    {visual.show_search && <label className="store-header-search" style={{ background: theme.surface, borderColor: theme.border }}>
                        <FiSearch size={18} style={{ color: theme.muted }} />
                        <input
                            placeholder="Encontre o produto ideal para você"
                            value={searchTerm}
                            onChange={event => setSearchTerm(event.target.value)}
                            style={{ color: theme.text }}
                        />
                        {searchTerm && (
                            <button type="button" onClick={() => setSearchTerm('')} style={{ color: theme.muted }} aria-label="Limpar busca">×</button>
                        )}
                    </label>}

                    <div className="store-header-actions">
                        {supportUrl && (
                            <button className="store-support-button" onClick={() => handleNavClick(supportUrl)} style={{ color: theme.text, borderColor: theme.border, background: theme.surface }}>
                                <FiHeadphones /> <span>Atendimento</span>
                            </button>
                        )}
                        <button className="store-cart-button" onClick={() => setCartOpen(true)} style={{ color: theme.text, borderColor: theme.border, background: theme.surface }} aria-label="Abrir carrinho">
                            <FiShoppingBag />
                            {totalItems > 0 && <span style={{ background: accent }}>{totalItems}</span>}
                        </button>
                        {visual.show_account && <button className="store-account-button" onClick={() => router.push('/login')} style={{ background: accent }}>
                            <FiUser /> <span>Minha conta</span>
                        </button>}
                    </div>
                </div>
                <nav className="store-main-nav" aria-label="Navegação da loja" style={{ borderColor: theme.border }}>
                    <div className="store-main-nav-inner">
                        {visual.show_categories && categories.length > 0 && (
                            <button type="button" onClick={() => document.getElementById('store-categories')?.scrollIntoView({ behavior: 'smooth' })}>
                                <FiGrid /> Todas as categorias
                            </button>
                        )}
                        <button type="button" onClick={() => router.push(storeHomePath)}><FiPackage /> Início</button>
                        <button type="button" onClick={() => document.getElementById('store-products')?.scrollIntoView({ behavior: 'smooth' })}><FiShoppingBag /> Produtos</button>
                        <button type="button" onClick={() => document.getElementById('store-products')?.scrollIntoView({ behavior: 'smooth' })}><FiZap /> Em destaque</button>
                        {supportUrl && (
                            <button type="button" className="store-nav-support" onClick={() => handleNavClick(supportUrl)}><FiHeadphones /> Suporte</button>
                        )}
                    </div>
                </nav>
            </header>

            <section className={`store-hero hero-${template}`} style={{ background: heroBg, borderBottomColor: theme.border }}>
                <div className="store-hero-grid" style={{ opacity: template === 'academy' ? .18 : .32 }} />
                <div className="store-hero-orb store-hero-orb-one" style={{ background: accent }} />
                <div className="store-hero-orb store-hero-orb-two" style={{ background: accent }} />
                <div className="store-shell store-hero-inner">
                    {topHeroBadges.length > 0 && <div className="store-trust-badges">
                        {topHeroBadges.map(item => (
                            <span key={item.key} style={{ color: item.color, borderColor: item.border, background: item.background }}>{item.icon} {item.text}</span>
                        ))}
                    </div>}

                    <div className="store-hero-logo" style={{ borderColor: `${accent}55`, background: `linear-gradient(145deg, ${accent}, ${theme.surfaceAlt})`, boxShadow: `0 20px 55px ${accent}35` }}>
                        {heroContent.logo_url
                            ? <img src={heroContent.logo_url} alt={`Logo da ${store.name || slug}`} />
                            : <span>{storeInitials}</span>}
                    </div>

                    {heroContent.welcome_text && <div className="store-welcome-label" style={{ color: theme.muted }}>
                        {heroContent.welcome_text} <strong style={{ color: accent }}>{store.name || slug}</strong>
                    </div>}
                    <h1>{store.headline || `Descubra o melhor da ${store.name || 'nossa loja'}`}</h1>
                    <p style={{ color: theme.muted }}>
                        {heroContent.description || store.description || 'Produtos digitais selecionados, compra protegida e acesso online em poucos passos.'}
                    </p>

                    <div className="store-hero-actions">
                        <button className="store-hero-primary" onClick={() => document.getElementById('store-products')?.scrollIntoView({ behavior: 'smooth' })} style={{ background: accent, boxShadow: `0 14px 34px ${accent}42` }}>
                            {store.cta_text || 'Ver produtos'} <FiArrowRight />
                        </button>
                        {visual.show_categories && categories.length > 0 && (
                            <button className="store-hero-secondary" onClick={() => document.getElementById('store-categories')?.scrollIntoView({ behavior: 'smooth' })} style={{ color: theme.text, borderColor: theme.border, background: theme.surface }}>
                                <FiGrid /> Ver categorias
                            </button>
                        )}
                        {supportUrl && (
                            <button className="store-hero-secondary store-hero-support" onClick={() => handleNavClick(supportUrl)} style={{ color: theme.text, borderColor: theme.border, background: theme.surface }}>
                                <FiHeadphones /> Falar com a loja
                            </button>
                        )}
                    </div>

                    {bottomHeroBadges.length > 0 && <div className="store-hero-assurances" style={{ color: theme.muted }}>
                        {bottomHeroBadges.map((item, index) => (
                            <span className="store-hero-assurance-item" key={item.key}>
                                {index > 0 && <span className="assurance-divider" style={{ background: theme.border }} />}
                                <span><i style={{ color: item.color, background: item.background }}>{item.icon}</i> {item.text}</span>
                            </span>
                        ))}
                    </div>}
                </div>
            </section>

            {visual.show_benefit_bar && <section className="store-benefit-strip" style={{ background: theme.surfaceAlt, borderColor: theme.border }}>
                <div className="store-shell store-benefit-strip-inner">
                    {[
                        { icon: <FiShield />, title: 'Pagamento protegido', text: 'Ambiente seguro do início ao fim' },
                        { icon: <FiZap />, title: 'Entrega digital', text: 'Acesso rápido após a aprovação' },
                        { icon: <FiHeadphones />, title: 'Suporte da loja', text: 'Canais de contato sempre visíveis' }
                    ].map(item => (
                        <div key={item.title}>
                            <i style={{ color: accent, background: `${accent}12` }}>{item.icon}</i>
                            <span><strong>{item.title}</strong><small style={{ color: theme.muted }}>{item.text}</small></span>
                        </div>
                    ))}
                </div>
            </section>}

            {visual.show_categories && categories.length > 0 && !searchTerm && !activeCategory && (
                <section id="store-categories" className="store-shell store-featured-categories">
                    <div className="store-categories-heading">
                        <div>
                            <span style={{ color: accent }}>NAVEGUE DO SEU JEITO</span>
                            <h2>Categorias em destaque</h2>
                            <p style={{ color: theme.muted }}>Encontre mais rápido o tipo de produto que você procura.</p>
                        </div>
                        <button onClick={() => document.getElementById('store-products')?.scrollIntoView({ behavior: 'smooth' })} style={{ color: theme.text, borderColor: theme.border, background: theme.surface }}>
                            Ver catálogo completo <FiArrowRight />
                        </button>
                    </div>
                    <div className="store-category-carousel">
                        {categoryStats.length > 4 && (
                            <button
                                type="button"
                                className="store-category-nav previous"
                                onClick={() => scrollCategoryRail(-1)}
                                aria-label="Ver categorias anteriores"
                                style={{ color: theme.text, borderColor: theme.border, background: theme.surface }}
                            >
                                <FiChevronLeft />
                            </button>
                        )}
                        <div className="store-category-cards" ref={categoryRailRef}>
                            {categoryStats.map((category, index) => (
                                <button
                                    key={category.id}
                                    onClick={() => handleCategoryClick(category.slug)}
                                    style={{ color: theme.text, borderColor: theme.border, background: theme.surface }}
                                >
                                    <span className="store-category-visual">
                                        {category.image_url ? (
                                            <img src={category.image_url} alt="" />
                                        ) : (
                                            <span className="store-category-fallback" style={{ background: `linear-gradient(145deg, ${accent}cc, ${theme.surfaceAlt})` }}>
                                                {index % 3 === 0 ? <FiGrid /> : index % 3 === 1 ? <FiBookOpen /> : <FiZap />}
                                            </span>
                                        )}
                                        <span className="store-category-shade" />
                                    </span>
                                    <span className="store-category-copy">
                                        <strong>{category.name}</strong>
                                        <small style={{ color: theme.muted }}>{category.productCount} produto{category.productCount === 1 ? '' : 's'}</small>
                                    </span>
                                    <FiArrowRight className="store-category-arrow" />
                                </button>
                            ))}
                        </div>
                        {categoryStats.length > 4 && (
                            <button
                                type="button"
                                className="store-category-nav next"
                                onClick={() => scrollCategoryRail(1)}
                                aria-label="Ver proximas categorias"
                                style={{ color: theme.text, borderColor: theme.border, background: theme.surface }}
                            >
                                <FiChevronRight />
                            </button>
                        )}
                    </div>
                </section>
            )}

            <main id="store-products" className="store-shell storefront-content" style={{ maxWidth: 1240, margin: '0 auto', padding: '38px 24px 76px' }}>
                <div className="store-catalog-toolbar" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
                    <div>
                        <span style={{ color: accent }}>CATÁLOGO</span>
                        <h2>Explore a loja</h2>
                        <p style={{ color: theme.muted }}>{filteredProducts.length} produto{filteredProducts.length === 1 ? '' : 's'} disponíve{filteredProducts.length === 1 ? 'l' : 'is'}</p>
                    </div>
                </div>

                {filteredProducts.length === 0 ? (
                    <div style={{ padding: 54, textAlign: 'center', borderRadius: 24, border: `1px dashed ${theme.border}`, background: theme.surface }}>
                        <FiPackage size={40} style={{ color: theme.muted, marginBottom: 12 }} />
                        <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 6 }}>Nenhum produto encontrado</h3>
                        <p style={{ color: theme.muted, fontSize: 14 }}>Tente buscar por outro termo ou categoria.</p>
                    </div>
                ) : (
                    <div className="storefront-sections">
                        {renderedSections.map(section => section.type === 'banner_carousel' ? (
                            <StoreBannerCarousel
                                key={section.id}
                                section={section}
                                accent={accent}
                                surface={theme.surface}
                                border={theme.border}
                                onNavigate={handleNavClick}
                            />
                        ) : (
                            <section className="store-product-section" key={section.id}>
                                <div className="store-product-section-heading">
                                    <div className="store-section-heading-copy">
                                        <span className="store-section-kicker" style={{ color: accent, borderColor: `${accent}30`, background: `${accent}0b` }}>
                                            <FiShoppingBag /> Categoria
                                        </span>
                                        <div className="store-section-title-line">
                                            <i className="store-section-title-icon" style={{ color: accent, borderColor: `${accent}25`, background: theme.surface }}>
                                                <FiShoppingBag />
                                            </i>
                                            <h2>{section.title || 'Produtos em destaque'}</h2>
                                        </div>
                                        <span className="store-section-accent-line" style={{ background: accent }} />
                                        {section.subtitle && <p style={{ color: theme.muted }}>{section.subtitle}</p>}
                                    </div>
                                    <div className="store-section-count" style={{ color: theme.muted, borderColor: theme.border }}>
                                        {section.product_ids.length} produto{section.product_ids.length === 1 ? '' : 's'}
                                    </div>
                                </div>
                                <div className={`products-grid template-${template}`}>
                                    {section.product_ids.map(productId => productsById.get(productId)).filter(Boolean).map(product => (
                                        <article key={product.id} className="store-product-card" style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: cardRadius }}>
                                            <button
                                                className="store-product-media"
                                                onClick={() => openProduct(product)}
                                                style={{
                                                    background: product.image_url
                                                        ? `url("${product.image_url}") center/cover`
                                                        : `radial-gradient(circle at 80% 10%, rgba(255,255,255,.22), transparent 35%), linear-gradient(135deg, ${accent}, ${theme.surfaceAlt})`
                                                }}
                                                aria-label={`Ver ${product.name}`}
                                            >
                                                <span className="store-product-badge" style={{ background: accent }}>Digital</span>
                                                <span className="store-product-view">Ver detalhes</span>
                                            </button>
                                            <div className="store-product-body">
                                                <div className="store-product-meta">
                                                    <span style={{ color: accent }}><FiZap size={12} /> Entrega digital</span>
                                                    <small style={{ color: theme.muted }}>{product.has_plans ? 'Planos disponíveis' : 'Acesso online'}</small>
                                                </div>
                                                <h3 className="store-product-title">{product.name}</h3>
                                                <p className="store-product-description" style={{ color: theme.muted }}>
                                                    {product.description_text || 'Produto digital com compra segura e entrega online.'}
                                                </p>
                                                <div className="store-product-purchase">
                                                    <div className="store-product-price-block">
                                                        <small style={{ color: theme.muted }}>{product.has_plans ? 'A partir de' : 'Por apenas'}</small>
                                                        <strong>R$ {product.price_display}</strong>
                                                        <span style={{ color: theme.muted }}>à vista no Pix</span>
                                                    </div>
                                                    <button onClick={() => openProduct(product)} style={{ background: accent }}><FiShoppingBag /> Eu quero</button>
                                                </div>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </main>

            <section className="store-closing-section" style={{ borderColor: theme.border }}>
                <div className="store-shell store-closing-card" style={{ background: theme.surface, borderColor: theme.border }}>
                    <div className="store-closing-glow" style={{ background: accent }} />
                    <span style={{ color: accent }}><FiShield /> COMPRA TRANQUILA</span>
                    <h2>Escolha seu próximo produto com segurança.</h2>
                    <p style={{ color: theme.muted }}>Navegue pelo catálogo, confira os detalhes e finalize sua compra em um ambiente protegido.</p>
                    <div>
                        <button onClick={() => document.getElementById('store-products')?.scrollIntoView({ behavior: 'smooth' })} style={{ background: accent }}>
                            Explorar catálogo <FiArrowRight />
                        </button>
                        <button onClick={() => setCartOpen(true)} style={{ color: theme.text, borderColor: theme.border, background: theme.surfaceAlt }}>
                            <FiShoppingBag /> Ver carrinho
                        </button>
                    </div>
                </div>
            </section>

            {footer.enabled && (
                <footer className="store-footer" style={{ background: theme.surface, borderTop: `1px solid ${theme.border}` }}>
                    <div className="store-shell store-footer-inner">
                        <div className="store-footer-brand">
                            <strong>{store.name || slug}</strong>
                            <p style={{ color: theme.muted }}>
                                {footer.description || 'Produtos digitais selecionados para ajudar você a avançar.'}
                            </p>
                        </div>
                        <div className="store-footer-links">
                            {footer.links.map(link => (
                                <button key={link.id} onClick={() => handleNavClick(link.url)} style={{ color: theme.text }}>{link.label}</button>
                            ))}
                            {footer.contact_email && (
                                <a href={`mailto:${footer.contact_email}`} style={{ color: theme.text }}><FiMail /> {footer.contact_email}</a>
                            )}
                            {footer.whatsapp && (
                                <a href={`https://wa.me/${footer.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ color: theme.text }}>WhatsApp</a>
                            )}
                            {footer.instagram && (
                                <a href={`https://instagram.com/${footer.instagram}`} target="_blank" rel="noopener noreferrer" style={{ color: theme.text }}><FiInstagram /> @{footer.instagram}</a>
                            )}
                        </div>
                    </div>
                    <div className="store-shell store-footer-bottom" style={{ borderTop: `1px solid ${theme.border}`, color: theme.muted }}>
                        <span>© {new Date().getFullYear()} {store.name || slug}. {footer.copyright_text || 'Todos os direitos reservados.'}</span>
                        <span>Pagamento seguro via GouPay</span>
                    </div>
                </footer>
            )}

            <StoreCartDrawer
                open={cartOpen}
                onClose={() => setCartOpen(false)}
                storeSlug={slug}
                accent={accent}
                theme={theme}
            />

            <style jsx global>{`
                .store-main-header {
                    position: sticky;
                    top: 0;
                    z-index: 100;
                    min-height: 70px;
                    border-bottom: 1px solid;
                    backdrop-filter: blur(22px);
                }
                .store-main-header-inner {
                    width: min(1340px, calc(100% - 40px));
                    min-height: 70px;
                    margin: 0 auto;
                    display: grid;
                    grid-template-columns: minmax(190px, .8fr) minmax(280px, 1.4fr) minmax(280px, .9fr);
                    align-items: center;
                    gap: 24px;
                }
                .store-brand {
                    min-width: 0;
                    border: none;
                    padding: 0;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    background: transparent;
                    cursor: pointer;
                    text-align: left;
                }
                .store-brand-mark {
                    width: 38px;
                    height: 38px;
                    border-radius: 12px;
                    display: grid;
                    place-items: center;
                    flex: 0 0 auto;
                    overflow: hidden;
                    color: white;
                    font-size: 12px;
                    font-weight: 950;
                    letter-spacing: -.02em;
                    box-shadow: inset 0 1px 0 rgba(255,255,255,.24);
                }
                .store-brand-mark img {
                    width: 100%;
                    height: 100%;
                    display: block;
                    object-fit: cover;
                }
                .store-brand-name {
                    min-width: 0;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    font-size: 15px;
                    font-weight: 950;
                }
                .store-brand-check {
                    flex: 0 0 auto;
                    font-size: 14px;
                }
                .store-header-search {
                    width: 100%;
                    height: 42px;
                    border: 1px solid;
                    border-radius: 999px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 0 14px;
                    transition: border-color .2s ease, box-shadow .2s ease;
                }
                .store-header-search:focus-within {
                    border-color: ${accent};
                    box-shadow: 0 0 0 3px ${accent}15;
                }
                .store-header-search input {
                    width: 100%;
                    min-width: 0;
                    border: none;
                    outline: none;
                    background: transparent;
                    font-size: 12px;
                    font-weight: 650;
                }
                .store-header-search input::placeholder {
                    color: ${theme.muted};
                }
                .store-header-search button {
                    border: none;
                    background: transparent;
                    font-size: 20px;
                    cursor: pointer;
                }
                .store-header-actions {
                    display: flex;
                    justify-content: flex-end;
                    align-items: center;
                    gap: 8px;
                }
                .store-support-button,
                .store-cart-button,
                .store-account-button {
                    height: 42px;
                    border-radius: 999px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 7px;
                    cursor: pointer;
                    white-space: nowrap;
                    font-size: 11px;
                    font-weight: 850;
                }
                .store-support-button,
                .store-cart-button {
                    border: 1px solid;
                }
                .store-support-button {
                    padding: 0 14px;
                }
                .store-cart-button {
                    position: relative;
                    width: 42px;
                    padding: 0;
                }
                .store-cart-button > span {
                    position: absolute;
                    top: -4px;
                    right: -4px;
                    min-width: 17px;
                    height: 17px;
                    border-radius: 999px;
                    display: grid;
                    place-items: center;
                    color: white;
                    font-size: 9px;
                    box-shadow: 0 0 0 2px ${theme.bg};
                }
                .store-account-button {
                    border: none;
                    color: white;
                    padding: 0 17px;
                    box-shadow: 0 10px 26px ${accent}2c;
                }
                .store-hero {
                    position: relative;
                    min-height: 650px;
                    border-bottom: 1px solid;
                    display: grid;
                    overflow: hidden;
                    isolation: isolate;
                }
                .store-hero::after {
                    content: '';
                    position: absolute;
                    inset: auto 0 0;
                    height: 170px;
                    z-index: -1;
                    background: linear-gradient(transparent, ${pageBackgroundColor});
                    pointer-events: none;
                }
                .store-hero-grid {
                    position: absolute;
                    inset: 0;
                    z-index: -2;
                    background-image:
                        linear-gradient(rgba(148,163,184,.10) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(148,163,184,.10) 1px, transparent 1px);
                    background-size: 64px 64px;
                    mask-image: radial-gradient(ellipse 70% 70% at 50% 40%, black 20%, transparent 82%);
                    pointer-events: none;
                }
                .store-hero-orb {
                    position: absolute;
                    width: 320px;
                    height: 320px;
                    border-radius: 999px;
                    filter: blur(120px);
                    opacity: .14;
                    z-index: -1;
                    pointer-events: none;
                }
                .store-hero-orb-one {
                    top: 30px;
                    left: 8%;
                }
                .store-hero-orb-two {
                    right: 5%;
                    bottom: 20px;
                }
                .store-hero-inner {
                    width: 100%;
                    max-width: 1040px;
                    margin: 0 auto;
                    padding: 76px 24px 82px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                }
                .store-trust-badges {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 7px;
                    flex-wrap: wrap;
                    margin-bottom: 24px;
                }
                .store-trust-badges span {
                    min-height: 28px;
                    border: 1px solid;
                    border-radius: 999px;
                    padding: 0 10px;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 10px;
                    font-weight: 850;
                    backdrop-filter: blur(8px);
                }
                .store-hero-logo {
                    width: 82px;
                    height: 82px;
                    border: 1px solid;
                    border-radius: 24px;
                    padding: 6px;
                    display: grid;
                    place-items: center;
                    margin-bottom: 22px;
                    transform: rotate(-3deg);
                }
                .store-hero-logo span,
                .store-hero-logo img {
                    width: 100%;
                    height: 100%;
                    border: 1px solid rgba(255,255,255,.18);
                    border-radius: 18px;
                }
                .store-hero-logo span {
                    display: grid;
                    place-items: center;
                    color: white;
                    font-size: 23px;
                    font-weight: 950;
                    letter-spacing: -.05em;
                    background: rgba(4,6,12,.30);
                    transform: rotate(3deg);
                }
                .store-hero-logo img {
                    display: block;
                    object-fit: cover;
                    background: rgba(4,6,12,.30);
                    transform: rotate(3deg);
                }
                .store-welcome-label {
                    font-size: 18px;
                    font-weight: 750;
                    margin-bottom: 9px;
                }
                .store-hero h1 {
                    max-width: 900px;
                    font-size: clamp(42px, 6vw, 72px);
                    line-height: .98;
                    letter-spacing: -.045em;
                    font-weight: 950;
                    text-wrap: balance;
                    margin-bottom: 20px;
                }
                .store-hero-inner > p {
                    max-width: 690px;
                    font-size: 16px;
                    line-height: 1.75;
                    text-wrap: balance;
                    margin-bottom: 28px;
                }
                .store-hero-actions {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 10px;
                    flex-wrap: wrap;
                }
                .store-hero-actions button {
                    min-height: 48px;
                    border-radius: 14px;
                    padding: 0 18px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 9px;
                    font-size: 12px;
                    font-weight: 900;
                    cursor: pointer;
                }
                .store-hero-primary {
                    border: none;
                    color: white;
                }
                .store-hero-secondary {
                    border: 1px solid;
                    backdrop-filter: blur(10px);
                }
                .store-hero-assurances {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 16px;
                    margin-top: 28px;
                    font-size: 10px;
                    font-weight: 750;
                }
                .store-hero-assurances > span:not(.assurance-divider) {
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                }
                .store-hero-assurance-item {
                    gap: 16px !important;
                }
                .store-hero-assurance-item > span:last-child {
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                }
                .store-hero-assurances i {
                    width: 28px;
                    height: 28px;
                    border-radius: 999px;
                    display: grid;
                    place-items: center;
                    font-style: normal;
                }
                .assurance-divider {
                    width: 1px;
                    height: 22px;
                }
                .store-benefit-strip {
                    border-bottom: 1px solid;
                }
                .store-benefit-strip-inner {
                    max-width: 1240px;
                    margin: 0 auto;
                    padding: 17px 24px;
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                }
                .store-benefit-strip-inner > div {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    padding: 0 22px;
                    border-right: 1px solid ${theme.border};
                }
                .store-benefit-strip-inner > div:last-child {
                    border-right: none;
                }
                .store-benefit-strip i {
                    width: 34px;
                    height: 34px;
                    border-radius: 11px;
                    display: grid;
                    place-items: center;
                    font-style: normal;
                    flex: 0 0 auto;
                }
                .store-benefit-strip strong,
                .store-benefit-strip small {
                    display: block;
                }
                .store-benefit-strip strong {
                    font-size: 11px;
                    margin-bottom: 2px;
                }
                .store-benefit-strip small {
                    font-size: 9px;
                }
                .store-featured-categories {
                    max-width: 1240px;
                    margin: 0 auto;
                    padding: 64px 24px 16px;
                }
                .store-categories-heading {
                    display: flex;
                    align-items: end;
                    justify-content: space-between;
                    gap: 24px;
                    margin-bottom: 22px;
                }
                .store-categories-heading > div > span {
                    display: block;
                    font-size: 10px;
                    font-weight: 950;
                    letter-spacing: .13em;
                    margin-bottom: 6px;
                }
                .store-categories-heading h2 {
                    font-size: 28px;
                    line-height: 1.1;
                    font-weight: 950;
                    margin-bottom: 6px;
                }
                .store-categories-heading p {
                    font-size: 13px;
                }
                .store-categories-heading > button {
                    min-height: 40px;
                    border: 1px solid;
                    border-radius: 12px;
                    padding: 0 14px;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 11px;
                    font-weight: 850;
                    cursor: pointer;
                }
                .store-category-carousel {
                    position: relative;
                }
                .store-category-cards {
                    display: flex;
                    gap: 16px;
                    overflow-x: auto;
                    scroll-behavior: smooth;
                    scroll-snap-type: x mandatory;
                    scrollbar-width: none;
                    padding: 2px 2px 12px;
                }
                .store-category-cards::-webkit-scrollbar {
                    display: none;
                }
                .store-category-cards > button {
                    position: relative;
                    flex: 0 0 160px;
                    aspect-ratio: 5 / 7;
                    min-height: 0;
                    border: 1px solid;
                    border-radius: 14px;
                    padding: 18px 12px;
                    display: grid;
                    place-items: end center;
                    overflow: hidden;
                    text-align: center;
                    cursor: pointer;
                    transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease;
                    scroll-snap-align: start;
                }
                .store-category-cards > button:hover {
                    transform: translateY(-3px);
                    border-color: ${accent};
                    box-shadow: 0 16px 38px rgba(0,0,0,.12);
                }
                .store-category-visual {
                    position: absolute;
                    inset: 0;
                    display: grid;
                    place-items: center;
                    overflow: hidden;
                    background: var(--store-surface-alt);
                }
                .store-category-visual img,
                .store-category-fallback {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: transform .28s ease;
                }
                .store-category-fallback {
                    display: grid;
                    place-items: center;
                    color: rgba(255,255,255,.92);
                    font-size: 46px;
                }
                .store-category-shade {
                    position: absolute;
                    inset: 0;
                    background:
                        radial-gradient(circle at 50% 38%, rgba(255,255,255,.10), transparent 28%),
                        linear-gradient(180deg, rgba(0,0,0,.05) 0%, rgba(0,0,0,.30) 42%, rgba(0,0,0,.78) 100%);
                }
                .store-category-cards > button:hover .store-category-visual img,
                .store-category-cards > button:hover .store-category-fallback {
                    transform: scale(1.06);
                }
                .store-category-copy {
                    position: relative;
                    z-index: 1;
                    min-width: 0;
                    width: 100%;
                }
                .store-category-copy strong,
                .store-category-copy small {
                    display: block;
                }
                .store-category-copy strong {
                    color: #fff;
                    font-size: 20px;
                    font-weight: 950;
                    line-height: .95;
                    text-transform: uppercase;
                    text-shadow: 0 2px 14px rgba(0,0,0,.55);
                    word-break: break-word;
                }
                .store-category-copy small {
                    position: absolute;
                    width: 1px;
                    height: 1px;
                    padding: 0;
                    margin: -1px;
                    overflow: hidden;
                    clip: rect(0, 0, 0, 0);
                    white-space: nowrap;
                    border: 0;
                }
                .store-category-arrow {
                    position: absolute;
                    z-index: 1;
                    top: 10px;
                    right: 10px;
                    width: 28px;
                    height: 28px;
                    padding: 7px;
                    border-radius: 999px;
                    color: #fff;
                    background: rgba(0,0,0,.34);
                    opacity: 0;
                    transition: transform .2s ease;
                }
                .store-category-cards > button:hover .store-category-arrow {
                    opacity: 1;
                    transform: translate(2px, -2px);
                }
                .store-category-nav {
                    position: absolute;
                    top: 50%;
                    z-index: 3;
                    width: 42px;
                    height: 42px;
                    border: 1px solid;
                    border-radius: 999px;
                    display: grid;
                    place-items: center;
                    cursor: pointer;
                    transform: translateY(-50%);
                    box-shadow: 0 14px 32px rgba(0,0,0,.18);
                    backdrop-filter: blur(12px);
                    transition: transform .2s ease, border-color .2s ease;
                }
                .store-category-nav:hover {
                    border-color: ${accent};
                    transform: translateY(-50%) scale(1.04);
                }
                .store-category-nav.previous {
                    left: -20px;
                }
                .store-category-nav.next {
                    right: -20px;
                }
                .store-catalog-toolbar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 20px;
                    border-radius: 22px;
                    padding: 18px 20px;
                    margin-bottom: 38px;
                    backdrop-filter: blur(16px);
                }
                .store-catalog-toolbar > div:first-child > span {
                    display: block;
                    font-size: 10px;
                    font-weight: 950;
                    letter-spacing: .13em;
                    margin-bottom: 4px;
                }
                .store-catalog-toolbar h2 {
                    font-size: 22px;
                    font-weight: 950;
                    margin-bottom: 3px;
                }
                .store-catalog-toolbar p {
                    font-size: 12px;
                }
                .storefront-sections {
                    display: grid;
                    gap: 48px;
                }
                .store-product-section {
                    min-width: 0;
                }
                .store-product-section-heading {
                    display: flex;
                    align-items: end;
                    justify-content: space-between;
                    gap: 18px;
                    margin-bottom: 18px;
                }
                .store-product-section-heading h2 {
                    font-size: 27px;
                    line-height: 1.1;
                    font-weight: 950;
                    margin-bottom: 5px;
                }
                .store-product-section-heading p {
                    font-size: 13px;
                }
                .store-section-count {
                    border: 1px solid;
                    border-radius: 999px;
                    padding: 7px 11px;
                    font-size: 11px;
                    font-weight: 800;
                    white-space: nowrap;
                }
                .products-grid {
                    display: grid;
                    grid-template-columns: repeat(var(--store-columns, 4), minmax(0, 1fr));
                    gap: 15px;
                }
                .store-product-card {
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    min-width: 0;
                    transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease;
                }
                .store-product-card:hover {
                    transform: translateY(-4px);
                    border-color: ${accent};
                    box-shadow: 0 18px 48px rgba(0,0,0,.22);
                }
                .store-product-media {
                    position: relative;
                    height: 180px;
                    border: none;
                    padding: 0;
                    cursor: pointer;
                    overflow: hidden;
                }
                .store-product-view {
                    position: absolute;
                    right: 10px;
                    bottom: 10px;
                    border-radius: 999px;
                    padding: 7px 10px;
                    color: white;
                    background: rgba(9,9,11,.72);
                    backdrop-filter: blur(8px);
                    font-size: 10px;
                    font-weight: 900;
                    opacity: 0;
                    transform: translateY(4px);
                    transition: .2s ease;
                }
                .store-product-card:hover .store-product-view {
                    opacity: 1;
                    transform: translateY(0);
                }
                .store-product-body {
                    padding: 15px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    flex: 1;
                }
                .store-product-meta {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    font-size: 9px;
                    font-weight: 850;
                }
                .store-product-meta > span {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                }
                .store-product-title {
                    font-size: 16px;
                    line-height: 1.25;
                    font-weight: 950;
                }
                .store-product-description {
                    font-size: 12px;
                    line-height: 1.5;
                    min-height: 36px;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                .store-product-purchase {
                    margin-top: auto;
                    padding-top: 11px;
                    border-top: 1px solid rgba(148,163,184,.14);
                    display: flex;
                    align-items: end;
                    justify-content: space-between;
                    gap: 9px;
                }
                .store-product-purchase small {
                    display: block;
                    font-size: 9px;
                    margin-bottom: 2px;
                }
                .store-product-purchase strong {
                    display: block;
                    font-size: 18px;
                    white-space: nowrap;
                }
                .store-product-purchase button {
                    min-height: 34px;
                    border: none;
                    border-radius: 10px;
                    padding: 0 12px;
                    color: white;
                    font-size: 11px;
                    font-weight: 900;
                    cursor: pointer;
                }
                .store-closing-section {
                    border-top: 1px solid;
                    padding: 18px 24px 64px;
                }
                .store-closing-card {
                    position: relative;
                    max-width: 1192px;
                    min-height: 300px;
                    margin: 0 auto;
                    border: 1px solid;
                    border-radius: 28px;
                    padding: 48px 24px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    overflow: hidden;
                    isolation: isolate;
                }
                .store-closing-glow {
                    position: absolute;
                    width: 440px;
                    height: 250px;
                    border-radius: 999px;
                    filter: blur(110px);
                    opacity: .13;
                    z-index: -1;
                }
                .store-closing-card > span {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 10px;
                    font-weight: 950;
                    letter-spacing: .12em;
                    margin-bottom: 10px;
                }
                .store-closing-card h2 {
                    max-width: 650px;
                    font-size: clamp(28px, 4vw, 42px);
                    line-height: 1.05;
                    letter-spacing: -.03em;
                    font-weight: 950;
                    text-wrap: balance;
                    margin-bottom: 12px;
                }
                .store-closing-card p {
                    max-width: 590px;
                    font-size: 13px;
                    line-height: 1.65;
                    text-wrap: balance;
                }
                .store-closing-card > div:last-child {
                    display: flex;
                    gap: 9px;
                    margin-top: 22px;
                }
                .store-closing-card button {
                    min-height: 43px;
                    border: 1px solid transparent;
                    border-radius: 12px;
                    padding: 0 15px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    color: white;
                    font-size: 11px;
                    font-weight: 900;
                    cursor: pointer;
                }
                .store-footer-inner {
                    max-width: 1240px;
                    margin: 0 auto;
                    padding: 42px 24px 30px;
                    display: grid;
                    grid-template-columns: 1fr 1.5fr;
                    gap: 40px;
                }
                .store-footer-brand strong {
                    display: block;
                    font-size: 20px;
                    font-weight: 950;
                    margin-bottom: 9px;
                }
                .store-footer-brand p {
                    max-width: 440px;
                    font-size: 13px;
                    line-height: 1.65;
                }
                .store-footer-links {
                    display: flex;
                    justify-content: flex-end;
                    align-content: flex-start;
                    gap: 9px 18px;
                    flex-wrap: wrap;
                }
                .store-footer-links button,
                .store-footer-links a {
                    border: none;
                    background: transparent;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 0;
                    text-decoration: none;
                    font-size: 12px;
                    font-weight: 750;
                    cursor: pointer;
                }
                .store-footer-bottom {
                    max-width: 1240px;
                    margin: 0 auto;
                    padding: 16px 24px 24px;
                    display: flex;
                    justify-content: space-between;
                    gap: 16px;
                    font-size: 10px;
                }
                .store-search-hidden .store-main-header-inner {
                    grid-template-columns: minmax(190px, 1fr) auto;
                }
                .store-header-style-glass .store-main-header {
                    background: color-mix(in srgb, ${theme.surface} 68%, transparent) !important;
                    backdrop-filter: blur(28px) saturate(1.35);
                }
                .store-header-style-solid .store-main-header {
                    background: ${theme.surface} !important;
                    backdrop-filter: none;
                }
                .store-hero-style-compact .store-hero {
                    min-height: 470px;
                }
                .store-hero-style-compact .store-hero-inner {
                    padding-top: 52px;
                    padding-bottom: 58px;
                }
                .store-hero-style-compact .store-trust-badges,
                .store-hero-style-compact .store-hero-logo,
                .store-hero-style-compact .store-hero-assurances {
                    display: none;
                }
                .store-hero-style-compact .store-hero h1 {
                    max-width: 760px;
                    font-size: clamp(36px, 5vw, 58px);
                }
                .store-hero-style-centered .store-hero-inner {
                    max-width: 860px;
                }
                .store-hero-style-centered .store-hero-logo {
                    width: 96px;
                    height: 96px;
                }
                .store-font-editorial h1,
                .store-font-editorial h2,
                .store-font-editorial h3,
                .store-font-editorial .store-brand-name {
                    font-family: Georgia, 'Times New Roman', serif;
                    letter-spacing: -.025em;
                }
                .store-font-friendly h1,
                .store-font-friendly h2,
                .store-font-friendly h3 {
                    letter-spacing: -.025em;
                }
                .store-font-bold h1,
                .store-font-bold h2,
                .store-font-bold h3,
                .store-font-bold .store-brand-name {
                    font-family: Outfit, 'Arial Black', sans-serif;
                    letter-spacing: -.055em;
                    font-weight: 950;
                }
                .store-button-style-pill .store-hero-actions button,
                .store-button-style-pill .store-categories-heading > button,
                .store-button-style-pill .store-product-purchase button,
                .store-button-style-pill .store-closing-card button,
                .store-button-style-pill .product-modal button {
                    border-radius: 999px !important;
                }
                .store-button-style-square .store-hero-actions button,
                .store-button-style-square .store-support-button,
                .store-button-style-square .store-cart-button,
                .store-button-style-square .store-account-button,
                .store-button-style-square .store-categories-heading > button,
                .store-button-style-square .store-product-purchase button,
                .store-button-style-square .store-closing-card button,
                .store-button-style-square .product-modal button {
                    border-radius: 4px !important;
                }
                .store-card-style-elevated .store-product-card {
                    border-color: transparent !important;
                    box-shadow: 0 18px 46px rgba(0,0,0,.22);
                }
                .store-card-style-outlined .store-product-card {
                    border-width: 2px !important;
                    box-shadow: none !important;
                }
                .store-card-style-minimal .store-product-card {
                    border-color: transparent !important;
                    background: transparent !important;
                    box-shadow: none !important;
                }
                .store-card-style-minimal .store-product-card:hover {
                    transform: translateY(-2px);
                }
                .store-corner-style-rounded .store-brand-mark,
                .store-corner-style-rounded .store-hero-logo,
                .store-corner-style-rounded .store-hero-logo span,
                .store-corner-style-rounded .store-hero-logo img,
                .store-corner-style-rounded .store-category-cards > button,
                .store-corner-style-rounded .store-catalog-toolbar,
                .store-corner-style-rounded .store-closing-card,
                .store-corner-style-rounded .product-modal {
                    border-radius: 28px !important;
                }
                .store-corner-style-sharp .store-brand-mark,
                .store-corner-style-sharp .store-hero-logo,
                .store-corner-style-sharp .store-hero-logo span,
                .store-corner-style-sharp .store-hero-logo img,
                .store-corner-style-sharp .store-category-cards > button,
                .store-corner-style-sharp .store-catalog-toolbar,
                .store-corner-style-sharp .store-closing-card,
                .store-corner-style-sharp .product-modal {
                    border-radius: 0 !important;
                }
                .store-density-compact .storefront-content {
                    padding-top: 24px !important;
                    padding-bottom: 52px !important;
                }
                .store-density-compact .products-grid {
                    gap: 9px;
                }
                .store-density-compact .storefront-sections {
                    gap: 32px;
                }
                .store-density-compact .store-product-body {
                    padding: 11px;
                    gap: 7px;
                }
                .store-density-spacious .storefront-content {
                    padding-top: 54px !important;
                    padding-bottom: 96px !important;
                }
                .store-density-spacious .products-grid {
                    gap: 26px;
                }
                .store-density-spacious .storefront-sections {
                    gap: 68px;
                }
                .store-density-spacious .store-product-body {
                    padding: 21px;
                    gap: 14px;
                }
                .store-image-square .store-product-media {
                    height: auto;
                    aspect-ratio: 1 / 1;
                }
                .store-image-portrait .store-product-media {
                    height: auto;
                    aspect-ratio: 4 / 5;
                }
                .store-animation-none *,
                .store-animation-none *::before,
                .store-animation-none *::after {
                    scroll-behavior: auto !important;
                    animation: none !important;
                    transition: none !important;
                }
                .store-animation-none .store-product-card:hover,
                .store-animation-none .store-category-cards > button:hover {
                    transform: none;
                }
                .store-animation-subtle .store-hero-orb,
                .store-animation-subtle .store-hero-grid {
                    opacity: .07 !important;
                }
                .store-animation-subtle .store-product-card:hover,
                .store-animation-subtle .store-category-cards > button:hover {
                    transform: translateY(-2px);
                }
                @media (max-width: 900px) {
                    .store-main-header-inner {
                        grid-template-columns: minmax(150px, .7fr) minmax(220px, 1.2fr) auto;
                        gap: 12px;
                    }
                    .store-support-button span {
                        display: none;
                    }
                    .store-support-button {
                        width: 42px;
                        padding: 0;
                    }
                    .store-hero {
                        min-height: 610px;
                    }
                    .store-hero h1 {
                        font-size: clamp(40px, 8vw, 62px);
                    }
                    .store-catalog-toolbar {
                        align-items: flex-start;
                        flex-direction: column;
                    }
                    .products-grid {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }
                    .store-footer-inner {
                        grid-template-columns: 1fr;
                        gap: 22px;
                    }
                    .store-footer-links {
                        justify-content: flex-start;
                    }
                    .product-modal-grid {
                        grid-template-columns: 1fr !important;
                    }
                    .product-modal-grid > div:first-child {
                        min-height: 260px !important;
                    }
                }
                @media (max-width: 620px) {
                    .store-shell {
                        padding-left: 12px !important;
                        padding-right: 12px !important;
                    }
                    .store-main-header {
                        min-height: 104px;
                    }
                    .store-main-header-inner {
                        width: calc(100% - 20px);
                        min-height: 104px;
                        padding: 8px 0;
                        grid-template-columns: minmax(0, 1fr) auto;
                        grid-template-rows: 38px 38px;
                        gap: 7px 8px;
                    }
                    .store-brand-mark {
                        width: 34px;
                        height: 34px;
                        border-radius: 10px;
                        font-size: 10px;
                    }
                    .store-brand-name {
                        max-width: 118px;
                        font-size: 13px;
                    }
                    .store-header-search {
                        grid-column: 1 / -1;
                        grid-row: 2;
                        height: 38px;
                    }
                    .store-header-search input {
                        font-size: 11px;
                    }
                    .store-header-actions {
                        grid-column: 2;
                        grid-row: 1;
                    }
                    .store-support-button {
                        display: none;
                    }
                    .store-cart-button,
                    .store-account-button {
                        width: 36px;
                        height: 36px;
                        padding: 0;
                    }
                    .store-account-button span {
                        display: none;
                    }
                    .store-hero {
                        min-height: 600px;
                    }
                    .store-hero-inner {
                        padding-top: 54px !important;
                        padding-bottom: 58px !important;
                    }
                    .store-trust-badges {
                        margin-bottom: 19px;
                    }
                    .store-trust-badges span {
                        min-height: 25px;
                        padding: 0 8px;
                        font-size: 8px;
                    }
                    .store-hero-logo {
                        width: 68px;
                        height: 68px;
                        border-radius: 20px;
                        margin-bottom: 18px;
                    }
                    .store-hero-logo span,
                    .store-hero-logo img {
                        border-radius: 15px;
                    }
                    .store-hero-logo span {
                        font-size: 19px;
                    }
                    .store-welcome-label {
                        font-size: 14px;
                    }
                    .store-hero h1 {
                        font-size: 36px !important;
                        line-height: 1.02 !important;
                        margin-bottom: 16px;
                    }
                    .store-hero-inner > p {
                        font-size: 13px;
                        line-height: 1.65;
                        margin-bottom: 22px;
                    }
                    .store-hero-actions {
                        width: 100%;
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                    }
                    .store-hero-actions button {
                        width: 100%;
                        min-height: 44px;
                        padding: 0 11px;
                        font-size: 10px;
                    }
                    .store-hero-primary {
                        grid-column: 1 / -1;
                    }
                    .store-hero-support {
                        grid-column: auto;
                    }
                    .store-hero-assurances {
                        gap: 9px 13px;
                        flex-wrap: wrap;
                        margin-top: 22px;
                        font-size: 8px;
                    }
                    .store-hero-assurances i {
                        width: 24px;
                        height: 24px;
                    }
                    .assurance-divider {
                        display: none;
                    }
                    .store-benefit-strip-inner {
                        grid-template-columns: 1fr;
                        gap: 0;
                        padding-top: 8px !important;
                        padding-bottom: 8px !important;
                    }
                    .store-benefit-strip-inner > div {
                        justify-content: flex-start;
                        border-right: none;
                        border-bottom: 1px solid ${theme.border};
                        padding: 10px 2px;
                    }
                    .store-benefit-strip-inner > div:last-child {
                        border-bottom: none;
                    }
                    .store-featured-categories {
                        padding-top: 42px !important;
                    }
                    .store-categories-heading {
                        align-items: stretch;
                        flex-direction: column;
                        gap: 15px;
                    }
                    .store-categories-heading h2 {
                        font-size: 23px;
                    }
                    .store-categories-heading > button {
                        align-self: flex-start;
                    }
                    .store-category-cards > button {
                        aspect-ratio: 5 / 7;
                    }
                    .products-grid {
                        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                        gap: 10px !important;
                    }
                    .store-product-card {
                        border-radius: 12px !important;
                    }
                    .store-product-card:hover {
                        transform: none;
                        box-shadow: none;
                    }
                    .store-product-media {
                        height: 112px !important;
                    }
                    .store-product-body {
                        padding: 10px !important;
                        gap: 8px !important;
                    }
                    .store-product-title {
                        font-size: 13px !important;
                        line-height: 1.2 !important;
                        display: -webkit-box;
                        -webkit-line-clamp: 2;
                        -webkit-box-orient: vertical;
                        overflow: hidden;
                    }
                    .store-online-badge {
                        font-size: 0 !important;
                        gap: 0 !important;
                    }
                    .store-product-description {
                        font-size: 10px !important;
                        line-height: 1.35 !important;
                        min-height: 0 !important;
                    }
                    .store-price-label {
                        font-size: 10px !important;
                    }
                    .store-product-price {
                        font-size: 16px !important;
                    }
                    .store-card-action {
                        min-height: 34px;
                        padding: 8px 9px !important;
                        border-radius: 9px !important;
                        font-size: 12px !important;
                    }
                    .store-product-meta small {
                        display: none;
                    }
                    .store-product-purchase {
                        align-items: stretch;
                        flex-direction: column;
                    }
                    .store-product-purchase button {
                        width: 100%;
                    }
                    .store-product-section-heading {
                        align-items: flex-start;
                    }
                    .store-product-section-heading h2 {
                        font-size: 21px;
                    }
                    .store-section-count {
                        display: none;
                    }
                    .store-closing-section {
                        padding: 8px 12px 38px;
                    }
                    .store-closing-card {
                        min-height: 280px;
                        border-radius: 20px;
                        padding: 36px 16px;
                    }
                    .store-closing-card h2 {
                        font-size: 27px;
                    }
                    .store-closing-card > div:last-child {
                        width: 100%;
                        display: grid;
                    }
                    .store-closing-card button {
                        width: 100%;
                    }
                    .store-footer-inner {
                        padding-top: 30px !important;
                        padding-bottom: 22px !important;
                    }
                    .store-footer-bottom {
                        align-items: flex-start;
                        flex-direction: column;
                    }
                    .product-pagination {
                        margin-top: 14px !important;
                    }
                    .product-page-button,
                    .product-page-arrow {
                        min-width: 34px !important;
                        height: 34px !important;
                        padding: 0 10px !important;
                    }
                    .product-modal {
                        width: calc(100vw - 20px) !important;
                        border-radius: 16px !important;
                    }
                    .product-modal-grid > div:first-child {
                        min-height: 190px !important;
                    }
                }

                /* Marketplace storefront: compact navigation, commercial cards and responsive rails. */
                #top {
                    position: relative;
                    isolation: isolate;
                    overflow-x: clip;
                }
                #top::before {
                    content: '';
                    position: fixed;
                    z-index: -1;
                    inset: 112px 0 0;
                    pointer-events: none;
                    opacity: ${themeMode === 'light' ? '.72' : '.28'};
                    background:
                        radial-gradient(circle at 18% 18%, ${accent}12, transparent 27%),
                        radial-gradient(circle at 84% 42%, ${accent}0d, transparent 30%),
                        repeating-radial-gradient(ellipse at 72% 32%, transparent 0 62px, ${accent}0a 64px 65px, transparent 67px 102px);
                }
                .store-main-header {
                    min-height: 112px;
                    border-bottom: 1px solid var(--store-border);
                    box-shadow: 0 12px 30px rgba(38, 55, 82, ${themeMode === 'light' ? '.10' : '.24'});
                    backdrop-filter: blur(20px);
                }
                .store-main-header-inner {
                    width: min(1192px, calc(100% - 40px));
                    min-height: 72px;
                    grid-template-columns: minmax(200px, .72fr) minmax(360px, 1.55fr) minmax(270px, .9fr);
                    gap: 28px;
                }
                .store-brand-mark {
                    width: 36px;
                    height: 36px;
                    border-radius: 11px;
                    box-shadow: 0 8px 22px ${accent}35;
                }
                .store-brand-name {
                    font-size: 18px;
                    letter-spacing: -.035em;
                }
                .store-header-search {
                    height: 44px;
                    border-radius: 14px;
                    background: var(--store-surface-alt) !important;
                    box-shadow: inset 0 1px 0 rgba(255,255,255,.45);
                }
                .store-account-button {
                    min-width: 126px;
                    border-radius: 13px;
                    text-transform: uppercase;
                    letter-spacing: .10em;
                    box-shadow: 0 9px 22px ${accent}35;
                }
                .store-main-nav {
                    min-height: 40px;
                    border-top: 1px solid;
                }
                .store-main-nav-inner {
                    width: min(1192px, calc(100% - 40px));
                    min-height: 39px;
                    margin: 0 auto;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .store-main-nav button {
                    min-height: 32px;
                    border: 0;
                    border-radius: 9px;
                    padding: 0 12px;
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                    background: transparent;
                    color: var(--store-muted);
                    cursor: pointer;
                    font-size: 11px;
                    font-weight: 800;
                    white-space: nowrap;
                    transition: color .2s ease, background .2s ease;
                }
                .store-main-nav button:hover {
                    color: var(--store-accent);
                    background: ${accent}0d;
                }
                .store-main-nav .store-nav-support {
                    margin-left: auto;
                    color: var(--store-accent);
                }
                .store-hero {
                    min-height: 520px;
                    border-bottom: 1px solid var(--store-border);
                }
                .store-hero-inner {
                    width: min(1192px, calc(100% - 40px));
                    padding-top: 82px !important;
                    padding-bottom: 82px !important;
                }
                .store-hero h1 {
                    max-width: 820px;
                    font-size: clamp(42px, 5vw, 68px);
                    letter-spacing: -.055em;
                }
                .store-hero-inner > p {
                    max-width: 690px;
                    font-size: 15px;
                }
                .store-hero-actions button {
                    min-height: 46px;
                    border-radius: 13px;
                    text-transform: uppercase;
                    letter-spacing: .055em;
                    font-size: 11px;
                }
                .store-benefit-strip {
                    border-bottom: 1px solid var(--store-border);
                }
                .store-featured-categories,
                .storefront-content {
                    width: min(1192px, calc(100% - 40px));
                    max-width: 1192px !important;
                }
                .store-featured-categories {
                    padding-top: 62px !important;
                    padding-bottom: 10px !important;
                }
                .store-categories-heading h2,
                .store-catalog-toolbar h2,
                .store-product-section-heading h2 {
                    color: var(--store-text);
                    letter-spacing: -.035em;
                }
                .store-categories-heading h2,
                .store-product-section-heading h2 {
                    text-transform: uppercase;
                }
                .store-categories-heading > div > span,
                .store-catalog-toolbar > div > span,
                .store-product-section-heading > div > span {
                    display: inline-flex;
                    align-items: center;
                    min-height: 25px;
                    border: 1px solid ${accent}35;
                    border-radius: 999px;
                    padding: 0 10px;
                    background: ${accent}0d;
                    letter-spacing: .10em;
                }
                .store-category-cards {
                    gap: 17px;
                }
                .store-category-cards > button {
                    min-height: 0;
                    border-radius: 14px;
                    padding: 18px 12px;
                    box-shadow: 0 8px 24px rgba(39, 57, 86, ${themeMode === 'light' ? '.05' : '.16'});
                }
                .store-category-copy strong {
                    font-size: 20px;
                }
                .storefront-content {
                    padding: 42px 0 78px !important;
                }
                .store-catalog-toolbar {
                    margin-bottom: 28px;
                    border: 0 !important;
                    border-radius: 0;
                    padding: 0 0 20px;
                    background: transparent !important;
                    border-bottom: 1px solid var(--store-border) !important;
                }
                .storefront-sections {
                    gap: 34px;
                }
                .store-product-section {
                    border: 1px solid var(--store-border);
                    border-radius: 30px;
                    padding: 30px;
                    background: color-mix(in srgb, var(--store-surface) 80%, transparent);
                    box-shadow: 0 20px 60px rgba(39,57,86,${themeMode === 'light' ? '.07' : '.18'});
                }
                .store-product-section-heading {
                    margin-bottom: 26px;
                    align-items: flex-start;
                }
                .store-section-heading-copy {
                    min-width: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                }
                .store-product-section-heading .store-section-kicker {
                    min-height: 25px;
                    border: 1px solid;
                    border-radius: 999px;
                    padding: 0 11px;
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                    font-size: 9px;
                    font-weight: 900;
                    line-height: 1;
                    letter-spacing: .10em;
                    text-transform: uppercase;
                }
                .store-section-kicker svg {
                    width: 12px;
                    height: 12px;
                    stroke-width: 2.4;
                }
                .store-section-title-line {
                    margin-top: 11px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .store-section-title-icon {
                    width: 40px;
                    height: 40px;
                    border: 1px solid;
                    border-radius: 13px;
                    display: grid;
                    place-items: center;
                    flex: 0 0 auto;
                    font-style: normal;
                    box-shadow: 0 7px 20px rgba(39,57,86,${themeMode === 'light' ? '.08' : '.22'});
                }
                .store-section-title-icon svg {
                    width: 18px;
                    height: 18px;
                    stroke-width: 2.1;
                }
                .store-product-section-heading .store-section-title-line h2 {
                    font-size: clamp(24px, 3vw, 31px);
                    margin: 0;
                    line-height: 1.08;
                }
                .store-product-section-heading .store-section-accent-line {
                    width: 48px;
                    height: 4px;
                    min-height: 4px;
                    margin-top: 11px;
                    border: 0;
                    border-radius: 999px;
                    padding: 0;
                    display: block;
                }
                .store-section-heading-copy > p {
                    margin-top: 10px;
                }
                .store-theme-light .store-product-section {
                    border-color: transparent;
                    padding: 6px 0 12px;
                    background: transparent;
                    box-shadow: none;
                }
                .products-grid {
                    gap: 22px;
                }
                .store-product-card {
                    border-radius: 18px !important;
                    background: var(--store-surface) !important;
                    box-shadow: 0 8px 26px rgba(39,57,86,${themeMode === 'light' ? '.06' : '.22'});
                }
                .store-product-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 18px 42px ${accent}1d;
                }
                .store-product-media {
                    height: auto;
                    aspect-ratio: 16 / 9;
                    background-color: var(--store-surface-alt) !important;
                }
                .store-product-badge {
                    position: absolute;
                    left: 11px;
                    top: 11px;
                    z-index: 2;
                    min-height: 22px;
                    border-radius: 999px;
                    padding: 0 9px;
                    display: inline-flex;
                    align-items: center;
                    color: #fff;
                    font-size: 8px;
                    font-weight: 950;
                    text-transform: uppercase;
                    letter-spacing: .07em;
                    box-shadow: 0 5px 14px rgba(0,0,0,.16);
                }
                .store-product-body {
                    padding: 16px;
                    gap: 10px;
                }
                .store-product-meta {
                    min-height: 22px;
                    padding-bottom: 8px;
                    border-bottom: 1px solid var(--store-border);
                }
                .store-product-meta > span {
                    min-height: 22px;
                    border-radius: 999px;
                    padding: 0 8px;
                    background: ${accent}0d;
                }
                .store-product-title {
                    min-height: 40px;
                    font-size: 15px;
                    line-height: 1.3;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                .store-product-description {
                    display: none;
                }
                .store-product-purchase {
                    padding-top: 10px;
                    align-items: stretch;
                    flex-direction: column;
                    gap: 12px;
                }
                .store-product-price-block small {
                    font-size: 9px;
                    font-weight: 850;
                    text-transform: uppercase;
                    letter-spacing: .05em;
                }
                .store-product-price-block strong {
                    font-size: 23px;
                    letter-spacing: -.035em;
                }
                .store-product-price-block > span {
                    display: block;
                    margin-top: 2px;
                    font-size: 9px;
                }
                .store-product-purchase button {
                    width: 100%;
                    min-height: 40px;
                    border-radius: 12px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 7px;
                    text-transform: uppercase;
                    letter-spacing: .04em;
                    box-shadow: 0 7px 18px ${accent}32;
                }
                .store-closing-card {
                    border-radius: 30px;
                    box-shadow: 0 18px 55px rgba(39,57,86,${themeMode === 'light' ? '.08' : '.22'});
                }

                @media (max-width: 980px) {
                    .store-main-header-inner {
                        grid-template-columns: minmax(170px, .65fr) minmax(260px, 1.35fr) auto;
                        gap: 16px;
                    }
                    .store-support-button span,
                    .store-account-button span {
                        display: none;
                    }
                    .store-account-button {
                        min-width: 42px;
                        width: 42px;
                        padding: 0;
                    }
                    .store-main-nav button {
                        padding-inline: 9px;
                    }
                    .store-product-section {
                        padding: 24px;
                    }
                }

                @media (max-width: 720px) {
                    #top::before {
                        inset: 65px 0 0;
                    }
                    .store-main-header {
                        min-height: 65px;
                    }
                    .store-main-header-inner {
                        width: calc(100% - 24px);
                        min-height: 65px;
                        grid-template-columns: auto minmax(120px, 1fr) auto;
                        gap: 10px;
                    }
                    .store-main-nav {
                        display: none;
                    }
                    .store-brand-name,
                    .store-brand-check {
                        display: none;
                    }
                    .store-brand-mark {
                        width: 36px;
                        height: 36px;
                    }
                    .store-header-search {
                        grid-column: auto;
                        grid-row: auto;
                        height: 36px;
                        padding: 0 10px;
                        border-radius: 999px;
                    }
                    .store-header-search svg {
                        width: 15px;
                    }
                    .store-header-search input {
                        font-size: 10px;
                    }
                    .store-support-button,
                    .store-account-button {
                        display: none;
                    }
                    .store-cart-button {
                        width: 36px;
                        height: 36px;
                    }
                    .store-hero {
                        min-height: 0;
                    }
                    .store-hero-inner {
                        width: calc(100% - 28px);
                        padding: 52px 0 48px !important;
                    }
                    .store-hero h1 {
                        font-size: 38px !important;
                    }
                    .store-benefit-strip-inner {
                        display: flex;
                        overflow-x: auto;
                        scroll-snap-type: x mandatory;
                    }
                    .store-benefit-strip-inner > div {
                        min-width: 82%;
                        scroll-snap-align: center;
                        border-bottom: 0;
                        border-right: 1px solid var(--store-border);
                    }
                    .store-featured-categories,
                    .storefront-content {
                        width: calc(100% - 28px);
                    }
                    .store-category-cards {
                        margin-inline: -14px;
                        padding: 0 14px 10px;
                        display: flex;
                        gap: 14px;
                        overflow-x: auto;
                        scroll-snap-type: x mandatory;
                        scrollbar-width: none;
                    }
                    .store-category-cards::-webkit-scrollbar,
                    .products-grid::-webkit-scrollbar {
                        display: none;
                    }
                    .store-category-cards > button {
                        flex: 0 0 150px;
                        aspect-ratio: 5 / 7;
                        scroll-snap-align: center;
                    }
                    .store-category-nav {
                        width: 36px;
                        height: 36px;
                    }
                    .store-category-nav.previous {
                        left: 2px;
                    }
                    .store-category-nav.next {
                        right: 2px;
                    }
                    .storefront-content {
                        padding-top: 34px !important;
                    }
                    .store-catalog-toolbar {
                        align-items: flex-start;
                        flex-direction: column;
                    }
                    .store-product-section {
                        margin-inline: -7px;
                        border-radius: 24px;
                        padding: 22px 14px;
                    }
                    .store-product-section-heading {
                        padding-inline: 4px;
                    }
                    .store-section-title-line {
                        gap: 10px;
                    }
                    .store-section-title-icon {
                        width: 36px;
                        height: 36px;
                        border-radius: 12px;
                    }
                    .store-theme-light .store-product-section {
                        margin-inline: 0;
                        padding: 6px 0 12px;
                    }
                    .products-grid {
                        display: flex !important;
                        grid-template-columns: none !important;
                        gap: 14px !important;
                        overflow-x: auto;
                        scroll-snap-type: x mandatory;
                        scrollbar-width: none;
                        padding: 2px 4px 10px;
                    }
                    .store-product-card {
                        flex: 0 0 min(78vw, 292px);
                        scroll-snap-align: center;
                        border-radius: 18px !important;
                    }
                    .store-product-media {
                        height: auto !important;
                        aspect-ratio: 16 / 9;
                    }
                    .store-product-body {
                        padding: 14px !important;
                    }
                    .store-product-title {
                        font-size: 14px !important;
                    }
                    .store-product-description {
                        display: none !important;
                    }
                    .store-product-purchase {
                        flex-direction: column;
                    }
                    .store-product-purchase button {
                        min-height: 40px;
                    }
                }
            `}</style>
        </div>
    );
}
