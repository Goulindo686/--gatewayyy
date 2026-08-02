'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { storeAPI } from '@/lib/api';
import { FiArrowRight, FiAward, FiBookOpen, FiCheckCircle, FiChevronLeft, FiChevronRight, FiCreditCard, FiGrid, FiHeadphones, FiInstagram, FiLock, FiMail, FiMessageCircle, FiPackage, FiSearch, FiShield, FiShoppingBag, FiStar, FiTrendingUp, FiUser, FiZap } from 'react-icons/fi';
import { useCart } from '@/contexts/CartContext';
import toast from 'react-hot-toast';
import StoreBannerCarousel from '@/components/store/StoreBannerCarousel';
import {
    buildAutomaticProductSections,
    buildRenderableStoreSections,
    normalizeStoreBackground,
    normalizeStoreFooter,
    normalizeStoreLayoutSections,
    StoreLayoutSection
} from '@/lib/store-builder';

type TemplateKey = 'creator' | 'academy' | 'studio';

const templateStyles: Record<TemplateKey, {
    bg: string;
    surface: string;
    surfaceAlt: string;
    text: string;
    muted: string;
    border: string;
    heroMode: 'dark' | 'light' | 'editorial';
}> = {
    creator: {
        bg: '#09090b',
        surface: '#141417',
        surfaceAlt: '#0f1117',
        text: '#ffffff',
        muted: '#94a3b8',
        border: 'rgba(255,255,255,0.08)',
        heroMode: 'dark'
    },
    academy: {
        bg: '#f8fafc',
        surface: '#ffffff',
        surfaceAlt: '#eef2ff',
        text: '#0f172a',
        muted: '#64748b',
        border: 'rgba(15,23,42,0.10)',
        heroMode: 'light'
    },
    studio: {
        bg: '#11100f',
        surface: '#1b1917',
        surfaceAlt: '#241f1a',
        text: '#fffaf0',
        muted: '#c7b9a1',
        border: 'rgba(255,250,240,0.10)',
        heroMode: 'editorial'
    }
};

function getPlans(product: any) {
    return Array.isArray(product?.plans) && product.plans.length > 0
        ? product.plans
        : [{ id: '__base__', name: 'Padrao', price: Math.round((product?.price || 0) * 100), price_display: product?.price_display }];
}

export default function StorePage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { addItem, totalItems } = useCart();

    const [store, setStore] = useState<any>(null);
    const [categories, setCategories] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const activeCategory = searchParams.get('category') || '';
    const [quickProduct, setQuickProduct] = useState<any>(null);
    const [quickPlan, setQuickPlan] = useState<any>(null);

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

    const background = normalizeStoreBackground(store?.background);
    const template = (store?.template || 'creator') as TemplateKey;
    const baseTheme = templateStyles[template] || templateStyles.creator;
    const isLightScheme = background.color_scheme === 'light';
    const theme = isLightScheme
        ? {
            ...baseTheme,
            bg: '#f5f6f8',
            surface: '#ffffff',
            surfaceAlt: '#eef1f5',
            text: '#171717',
            muted: '#6b7280',
            border: 'rgba(20,20,20,0.11)',
            heroMode: 'light' as const
        }
        : {
            ...baseTheme,
            bg: '#080809',
            surface: '#151517',
            surfaceAlt: '#202124',
            text: '#f8fafc',
            muted: '#9ca3af',
            border: 'rgba(255,255,255,0.10)',
            heroMode: 'dark' as const
        };
    const accent = store?.accent_color || '#6c5ce7';
    // A custom hostname is used only to resolve the store. Internal navigation
    // keeps the canonical slug so checkout/cart APIs remain fully compatible.
    const slug = store?.slug || (params.slug as string);
    const storeHomePath = String(params.slug).includes('.') ? '/' : `/store/${slug}`;
    const filteredProducts = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return products;
        return products.filter(p =>
            p.name?.toLowerCase().includes(term) ||
            p.description?.toLowerCase().includes(term)
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
    const catalogProductsById = useMemo(
        () => new Map(products.map(product => [String(product.id), product])),
        [products]
    );

    const handleCategoryClick = (catSlug: string) => {
        router.push(catSlug === activeCategory ? storeHomePath : `${storeHomePath}?category=${catSlug}`);
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

    const addProductToCart = (product: any, plan?: any) => {
        const chosenPlan = plan || getPlans(product)[0];
        const planId = chosenPlan?.id && chosenPlan.id !== '__base__' ? chosenPlan.id : undefined;
        addItem({
            id: product.id,
            name: product.name,
            price: chosenPlan ? (chosenPlan.price / 100) : product.price,
            price_display: chosenPlan ? chosenPlan.price_display : product.price_display,
            image_url: product.image_url,
            plan_id: planId,
            plan_name: chosenPlan ? chosenPlan.name : undefined
        } as any);
        toast.success(`${product.name} adicionado!`);
    };

    const openQuick = (product: any) => {
        const plans = getPlans(product);
        setQuickProduct({ ...product, plans });
        setQuickPlan(plans[0]);
    };

    const quickBuyNow = () => {
        if (!quickProduct) return;
        addProductToCart(quickProduct, quickPlan);
        router.push(`/store/${slug}/cart?overlay=1`);
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

    const isShowcaseHero = background.hero_layout === 'split';
    const heroBg = store.banner_url
        ? `linear-gradient(90deg, ${theme.heroMode === 'light' ? 'rgba(248,250,252,0.96)' : 'rgba(9,9,11,0.92)'} 0%, ${theme.heroMode === 'light' ? 'rgba(248,250,252,0.78)' : 'rgba(9,9,11,0.54)'} 52%, rgba(9,9,11,0.15) 100%), url(${store.banner_url}) center/cover`
        : `radial-gradient(circle at top right, ${accent}44, transparent 34%), linear-gradient(135deg, ${theme.bg}, ${theme.surfaceAlt})`;
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
    const selectedHeroProducts = background.hero_product_ids
        .map(productId => catalogProductsById.get(productId))
        .filter(Boolean);
    const heroProducts = (selectedHeroProducts.length > 0 ? selectedHeroProducts : products).slice(0, 3);
    const pageBackground = background.mode === 'image' && background.image_url
        ? `linear-gradient(rgba(9,9,11,${background.overlay / 100}), rgba(9,9,11,${background.overlay / 100})), url("${background.image_url}") center/cover fixed`
        : undefined;
    const pageBackgroundColor = background.mode === 'color'
        ? background.color
        : theme.bg;
    const shellWidth = background.content_width === 'compact'
        ? '1080px'
        : background.content_width === 'standard' ? '1240px' : '1380px';
    const fontFamily = background.font_style === 'editorial'
        ? 'Georgia, Cambria, serif'
        : background.font_style === 'friendly'
            ? 'Outfit, Inter, sans-serif'
            : 'Inter, Outfit, sans-serif';
    const cardRadius = background.card_radius === 'square'
        ? '8px'
        : background.card_radius === 'rounded' ? '28px' : '16px';
    const storefrontClass = [
        `store-hero-mode-${background.hero_layout}`,
        `store-font-${background.font_style}`,
        `store-header-${background.header_style}`,
        `store-spacing-${background.section_spacing}`,
        `store-cards-${background.card_style}`,
        `store-radius-${background.card_radius}`,
        `store-images-${background.product_image_ratio}`,
        `store-scheme-${background.color_scheme}`
    ].join(' ');

    const renderStoreSection = (section: StoreLayoutSection) => {
        if (section.type === 'banner_carousel') {
            return (
                <StoreBannerCarousel
                    key={section.id}
                    section={section}
                    accent={accent}
                    surface={theme.surface}
                    border={theme.border}
                    onNavigate={handleNavClick}
                />
            );
        }

        if (section.type === 'content') {
            const accentTone = section.tone === 'accent';
            const contentStyle = section.tone === 'transparent'
                ? { background: 'transparent', borderColor: 'transparent' }
                : accentTone
                    ? { background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, borderColor: `${accent}88`, color: '#fff' }
                    : { background: theme.surface, borderColor: theme.border };
            return (
                <section key={section.id} className={`store-content-block image-${section.image_position} tone-${section.tone}`} style={contentStyle}>
                    <div className="store-content-copy">
                        {section.eyebrow && <span style={{ color: accentTone ? '#fff' : accent }}>{section.eyebrow}</span>}
                        <h2>{section.title}</h2>
                        <p style={{ color: accentTone ? 'rgba(255,255,255,.78)' : theme.muted }}>{section.description}</p>
                        {section.button_text && section.button_url && (
                            <button onClick={() => handleNavClick(section.button_url)} style={{ background: accentTone ? '#fff' : accent, color: accentTone ? accent : '#fff' }}>
                                {section.button_text} <FiArrowRight />
                            </button>
                        )}
                    </div>
                    {section.image_url && <div className="store-content-media" style={{ backgroundImage: `url("${section.image_url}")` }} />}
                </section>
            );
        }

        if (section.type === 'features') {
            const icons = [<FiAward key="award" />, <FiTrendingUp key="trend" />, <FiShield key="shield" />, <FiStar key="star" />, <FiZap key="zap" />, <FiHeadphones key="support" />];
            return (
                <section key={section.id} className="store-rich-section">
                    <div className="store-rich-heading">
                        <span style={{ color: accent }}>DIFERENCIAIS</span>
                        <h2>{section.title}</h2>
                        {section.subtitle && <p style={{ color: theme.muted }}>{section.subtitle}</p>}
                    </div>
                    <div className="store-features-grid">
                        {section.items.map((item, index) => (
                            <article key={item.id} style={{ background: theme.surface, borderColor: theme.border }}>
                                <i style={{ color: accent, background: `${accent}14` }}>{icons[index % icons.length]}</i>
                                <h3>{item.title}</h3>
                                <p style={{ color: theme.muted }}>{item.description}</p>
                            </article>
                        ))}
                    </div>
                </section>
            );
        }

        if (section.type === 'testimonials') {
            return (
                <section key={section.id} className="store-rich-section">
                    <div className="store-rich-heading">
                        <span style={{ color: accent }}>EXPERIÊNCIAS REAIS</span>
                        <h2>{section.title}</h2>
                        {section.subtitle && <p style={{ color: theme.muted }}>{section.subtitle}</p>}
                    </div>
                    <div className="store-testimonials-grid">
                        {section.items.map(item => (
                            <article key={item.id} style={{ background: theme.surface, borderColor: theme.border }}>
                                <FiMessageCircle className="store-quote-icon" style={{ color: accent }} />
                                <div className="store-testimonial-stars" style={{ color: accent }}><FiStar /><FiStar /><FiStar /><FiStar /><FiStar /></div>
                                <blockquote>“{item.quote}”</blockquote>
                                <footer><strong>{item.name}</strong>{item.role && <small style={{ color: theme.muted }}>{item.role}</small>}</footer>
                            </article>
                        ))}
                    </div>
                </section>
            );
        }

        if (section.type === 'faq') {
            return (
                <section key={section.id} className="store-rich-section store-faq-section">
                    <div className="store-rich-heading">
                        <span style={{ color: accent }}>TIRE SUAS DÚVIDAS</span>
                        <h2>{section.title}</h2>
                        {section.subtitle && <p style={{ color: theme.muted }}>{section.subtitle}</p>}
                    </div>
                    <div className="store-faq-list">
                        {section.items.map(item => (
                            <details key={item.id} style={{ background: theme.surface, borderColor: theme.border }}>
                                <summary>{item.question}<span style={{ color: accent }}>+</span></summary>
                                <p style={{ color: theme.muted }}>{item.answer}</p>
                            </details>
                        ))}
                    </div>
                </section>
            );
        }

        return (
            <section className="store-product-section" key={section.id}>
                <div className="store-product-section-heading">
                    <div>
                        <span style={{ color: accent }}>SELEÇÃO DA LOJA</span>
                        <h2>{section.title || 'Produtos em destaque'}</h2>
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
                                onClick={() => openQuick(product)}
                                style={{
                                    background: product.image_url
                                        ? `url("${product.image_url}") center/cover`
                                        : `radial-gradient(circle at 80% 10%, rgba(255,255,255,.22), transparent 35%), linear-gradient(135deg, ${accent}, ${theme.surfaceAlt})`
                                }}
                                aria-label={`Ver ${product.name}`}
                            >
                                <span className="store-product-view">Ver detalhes</span>
                            </button>
                            <div className="store-product-body">
                                <div className="store-product-meta">
                                    <span style={{ color: accent }}><FiPackage size={12} /> Oferta da loja</span>
                                    <small style={{ color: theme.muted }}>{product.has_plans ? 'Opções disponíveis' : 'Compra online'}</small>
                                </div>
                                <h3 className="store-product-title">{product.name}</h3>
                                <p className="store-product-description" style={{ color: theme.muted }}>
                                    {product.description || 'Conheça os detalhes desta oferta e escolha a melhor opção para você.'}
                                </p>
                                <div className="store-product-purchase">
                                    <div>
                                        <small style={{ color: theme.muted }}>{product.has_plans ? 'A partir de' : 'Por apenas'}</small>
                                        <strong>R$ {product.price_display}</strong>
                                    </div>
                                    <button onClick={() => openQuick(product)} style={{ background: accent }}>Conhecer</button>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </section>
        );
    };

    return (
        <div
            id="top"
            className={storefrontClass}
            style={{
                minHeight: '100vh',
                background: pageBackground || pageBackgroundColor,
                color: theme.text,
                fontFamily,
                '--store-shell-width': shellWidth,
                '--store-card-radius': cardRadius
            } as React.CSSProperties}
        >
            <div className={isShowcaseHero ? 'store-showcase-stage' : ''}>
            <div className={`store-opening-shell ${isShowcaseHero ? 'is-showcase' : ''}`}>
            <header
                className="store-main-header"
                style={{
                    color: isShowcaseHero ? '#171717' : theme.text,
                    background: isShowcaseHero ? '#fbfbfa' : template === 'academy' ? 'rgba(255,255,255,.90)' : 'rgba(7,9,14,.88)',
                    borderColor: isShowcaseHero ? 'rgba(20,20,20,.08)' : theme.border
                }}
            >
                <div className="store-main-header-inner">
                    <button className="store-brand" onClick={() => router.push(storeHomePath)} style={{ color: isShowcaseHero ? '#171717' : theme.text }}>
                        <span className="store-brand-mark" style={{ background: `linear-gradient(145deg, ${accent}, ${accent}99)` }}>{storeInitials}</span>
                        <span className="store-brand-name">{store.name || slug}</span>
                        <FiCheckCircle className="store-brand-check" style={{ color: accent }} />
                    </button>

                    <div className="store-header-discovery">
                        {background.show_header_categories && categories.length > 0 && (
                            <nav className="store-header-category-nav" aria-label="Categorias da loja">
                                <button type="button" className={!activeCategory ? 'active' : ''} onClick={() => handleCategoryClick('')}>Início</button>
                                {categories.slice(0, 4).map(category => (
                                    <button type="button" key={category.id} className={activeCategory === category.slug ? 'active' : ''} onClick={() => handleCategoryClick(category.slug)}>
                                        {category.name}
                                    </button>
                                ))}
                            </nav>
                        )}
                        {background.show_header_search && (
                            <label className="store-header-search" style={{ background: isShowcaseHero ? '#f3f3f1' : theme.surface, borderColor: isShowcaseHero ? 'rgba(20,20,20,.10)' : theme.border }}>
                                <FiSearch size={17} style={{ color: isShowcaseHero ? '#6b6b6b' : theme.muted }} />
                                <input
                                    placeholder="Buscar na loja"
                                    value={searchTerm}
                                    onChange={event => setSearchTerm(event.target.value)}
                                    style={{ color: isShowcaseHero ? '#171717' : theme.text }}
                                />
                                {searchTerm && (
                                    <button type="button" onClick={() => setSearchTerm('')} style={{ color: isShowcaseHero ? '#6b6b6b' : theme.muted }} aria-label="Limpar busca">×</button>
                                )}
                            </label>
                        )}
                    </div>

                    <div className="store-header-actions">
                        {supportUrl && (
                            <button className="store-support-button" onClick={() => handleNavClick(supportUrl)} style={{ color: isShowcaseHero ? '#171717' : theme.text, borderColor: isShowcaseHero ? 'rgba(20,20,20,.10)' : theme.border, background: isShowcaseHero ? '#f5f5f3' : theme.surface }}>
                                <FiHeadphones /> <span>Atendimento</span>
                            </button>
                        )}
                        <button className="store-cart-button" onClick={() => router.push(`/store/${slug}/cart`)} style={{ color: isShowcaseHero ? '#171717' : theme.text, borderColor: isShowcaseHero ? 'rgba(20,20,20,.10)' : theme.border, background: isShowcaseHero ? '#f5f5f3' : theme.surface }} aria-label="Abrir carrinho">
                            <FiShoppingBag />
                            {totalItems > 0 && <span style={{ background: accent }}>{totalItems}</span>}
                        </button>
                        <button className="store-account-button" onClick={() => router.push('/login')} style={{ background: accent }}>
                            <FiUser /> <span>Minha conta</span>
                        </button>
                    </div>
                </div>
            </header>

            <section className={`store-hero hero-${template} hero-layout-${background.hero_layout}`} style={{ background: isShowcaseHero ? '#fbfbfa' : heroBg, borderBottomColor: isShowcaseHero ? 'transparent' : theme.border }}>
                <div className="store-hero-grid" style={{ opacity: template === 'academy' ? .18 : .32 }} />
                <div className="store-hero-orb store-hero-orb-one" style={{ background: accent }} />
                <div className="store-hero-orb store-hero-orb-two" style={{ background: accent }} />
                {isShowcaseHero && (
                    <div className="store-showcase-rail" aria-label="Atalhos da loja">
                        <button type="button" onClick={() => router.push('/login')} aria-label="Minha conta"><FiUser /></button>
                        <button type="button" onClick={() => document.getElementById('store-categories')?.scrollIntoView({ behavior: 'smooth' })} aria-label="Categorias"><FiGrid /></button>
                        {supportUrl && <button type="button" onClick={() => handleNavClick(supportUrl)} aria-label="Atendimento"><FiMessageCircle /></button>}
                    </div>
                )}
                {isShowcaseHero && (
                    <div className="store-premium-hero">
                        <div className="store-premium-copy">
                            <span className="store-premium-eyebrow" style={{ color: accent, background: `${accent}12` }}>
                                <FiStar /> {store.badge_text || 'Seleção especial da loja'}
                            </span>
                            <h1>{store.headline || `Encontre sua próxima escolha na ${store.name || slug}`}</h1>
                            <p>{store.description || 'Produtos escolhidos com cuidado, compra simples e uma experiência segura do início ao fim.'}</p>

                            <div className="store-premium-actions">
                                <button
                                    type="button"
                                    className="store-premium-primary"
                                    onClick={() => document.getElementById('store-products')?.scrollIntoView({ behavior: 'smooth' })}
                                    style={{ background: accent, boxShadow: `0 16px 34px ${accent}35` }}
                                >
                                    {store.cta_text || 'Explorar produtos'} <FiArrowRight />
                                </button>
                                {background.show_categories && categories.length > 0 && (
                                    <button
                                        type="button"
                                        className="store-premium-secondary"
                                        onClick={() => document.getElementById('store-categories')?.scrollIntoView({ behavior: 'smooth' })}
                                    >
                                        <FiGrid /> Ver categorias
                                    </button>
                                )}
                            </div>

                            <div className="store-premium-assurances">
                                <span><FiShield style={{ color: accent }} /><strong>Compra protegida</strong></span>
                                <span><FiZap style={{ color: accent }} /><strong>Finalização rápida</strong></span>
                                <span><FiHeadphones style={{ color: accent }} /><strong>Suporte da loja</strong></span>
                            </div>
                        </div>

                        <div className={`store-premium-gallery count-${heroProducts.length}`}>
                            <div className="store-premium-gallery-glow" style={{ background: accent }} />
                            <div className="store-premium-gallery-label">
                                <span style={{ color: accent }}>CURADORIA DA LOJA</span>
                                <strong>Escolhas em destaque</strong>
                            </div>
                            {heroProducts.length > 0 ? heroProducts.map((product, index) => (
                                <button
                                    type="button"
                                    key={product.id}
                                    className={`store-premium-product product-${index + 1}`}
                                    onClick={() => openQuick(product)}
                                    aria-label={`Conhecer ${product.name}`}
                                >
                                    <span
                                        className="store-premium-product-media"
                                        style={{ background: product.image_url ? '#ecebea' : `linear-gradient(145deg, ${accent}24, ${accent}08)` }}
                                    >
                                        {product.image_url
                                            ? <img src={product.image_url} alt="" draggable={false} />
                                            : <FiPackage />}
                                    </span>
                                    <span className="store-premium-product-copy">
                                        <small style={{ color: accent }}>{index === 0 ? 'MAIS PROCURADO' : 'RECOMENDADO'}</small>
                                        <strong>{product.name}</strong>
                                        <em>R$ {product.price_display}</em>
                                    </span>
                                    <span className="store-premium-product-arrow" style={{ color: accent }}><FiArrowRight /></span>
                                </button>
                            )) : (
                                <div className="store-premium-empty" style={{ color: accent, background: `${accent}12` }}>
                                    <FiPackage />
                                    <strong>Sua vitrine começa aqui</strong>
                                    <small>Adicione produtos em destaque para completar a apresentação.</small>
                                </div>
                            )}
                        </div>

                        <div className="store-premium-dock">
                            <div className="store-premium-categories">
                                <span className="store-premium-dock-title">Navegue por categorias</span>
                                <div>
                                    {(categoryStats.length > 0 ? categoryStats.slice(0, 3) : [{ id: 'all', name: 'Todos', slug: '', productCount: products.length }]).map(category => (
                                        <button type="button" key={category.id} onClick={() => handleCategoryClick(category.slug)}>
                                            <span>{String(category.name).slice(0, 1).toUpperCase()}</span>
                                            <small>{category.name}</small>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <label className="store-premium-search">
                                <FiSearch />
                                <input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="O que você procura?" />
                                <button type="button" onClick={() => document.getElementById('store-products')?.scrollIntoView({ behavior: 'smooth' })} style={{ background: accent }} aria-label="Buscar produtos">
                                    <FiArrowRight />
                                </button>
                            </label>

                            <div className="store-premium-summary">
                                <i style={{ color: accent, background: `${accent}20` }}><FiShield /></i>
                                <span>
                                    <strong>Compra segura</strong>
                                    <small>{products.length} produto{products.length === 1 ? '' : 's'} disponíveis</small>
                                </span>
                            </div>
                        </div>
                    </div>
                )}
                {!isShowcaseHero && <div className="store-shell store-hero-inner">
                    <div className="store-hero-copy">
                        <div className="store-trust-badges">
                            <span style={{ color: accent, borderColor: `${accent}55`, background: `${accent}10` }}><FiStar /> Experiência selecionada</span>
                            <span style={{ color: '#21c77a', borderColor: 'rgba(33,199,122,.30)', background: 'rgba(33,199,122,.08)' }}><FiShield /> Compra segura</span>
                            <span style={{ color: theme.text, borderColor: theme.border, background: theme.surface }}><FiCheckCircle /> Marca verificada</span>
                        </div>
                        <div className="store-welcome-label" style={{ color: theme.muted }}>
                            Bem-vindo à <strong style={{ color: accent }}>{store.name || slug}</strong>
                        </div>
                        <h1>{store.headline || store.name || `Encontre o que combina com o seu momento`}</h1>
                        <p style={{ color: isShowcaseHero ? '#737373' : theme.muted }}>
                            {store.description || 'Explore soluções, experiências e produtos reunidos em uma loja feita para facilitar sua escolha.'}
                        </p>
                        <div className="store-hero-actions">
                            <button className="store-hero-primary" onClick={() => document.getElementById('store-products')?.scrollIntoView({ behavior: 'smooth' })} style={{ background: accent, boxShadow: `0 14px 34px ${accent}42` }}>
                                {store.cta_text || 'Explorar a loja'} <FiArrowRight />
                            </button>
                            {background.show_categories && categories.length > 0 && (
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
                        <div className="store-hero-assurances" style={{ color: theme.muted }}>
                            <span><i style={{ color: accent, background: `${accent}18` }}><FiZap /></i> Compra simplificada</span>
                            <span className="assurance-divider" style={{ background: theme.border }} />
                            <span><i style={{ color: '#21c77a', background: 'rgba(33,199,122,.10)' }}><FiLock /></i> Checkout protegido</span>
                            <span className="assurance-divider" style={{ background: theme.border }} />
                            <span><i style={{ color: '#35b6ff', background: 'rgba(53,182,255,.10)' }}><FiCreditCard /></i> PIX e cartão</span>
                        </div>
                    </div>
                    {background.hero_layout === 'split' && heroProducts.length > 0 && (
                        <div className="store-hero-spotlight">
                            <aside className="store-spotlight-note" style={{ background: `${theme.surface}e8`, borderColor: theme.border }}>
                                <i style={{ color: accent, background: `${accent}14` }}><FiZap /></i>
                                <strong>{background.hero_info_title}</strong>
                                <p style={{ color: theme.muted }}>{background.hero_info_text}</p>
                                <div className="store-spotlight-secondary-note">
                                    <strong>Compra protegida</strong>
                                    <p>Pagamento seguro e entrega organizada pela loja.</p>
                                </div>
                            </aside>

                            <div className={`store-spotlight-products count-${heroProducts.length}`}>
                                {heroProducts.map((product, index) => (
                                    <button
                                        type="button"
                                        key={product.id}
                                        className={`store-spotlight-product product-${index + 1}`}
                                        onClick={() => openQuick(product)}
                                        style={{
                                            borderColor: theme.border,
                                            boxShadow: index === 0 ? `0 30px 70px ${accent}24` : '0 20px 45px rgba(0,0,0,.12)',
                                            '--spotlight-placeholder': `linear-gradient(145deg, ${accent}22, ${accent}08)`
                                        } as React.CSSProperties}
                                        aria-label={`Conhecer ${product.name}`}
                                    >
                                        <span className="store-spotlight-media">
                                            {product.image_url
                                                ? <img src={product.image_url} alt="" draggable={false} />
                                                : <FiPackage />}
                                        </span>
                                        {index > 0 && (
                                            <span className={`store-showcase-arrow ${index === 1 ? 'arrow-left' : 'arrow-right'}`}>
                                                {index === 1 ? <FiChevronLeft /> : <FiChevronRight />}
                                            </span>
                                        )}
                                        <span className="store-spotlight-product-copy">
                                            <small>{index === 0 ? 'DESTAQUE PRINCIPAL' : 'SELEÇÃO DA LOJA'}</small>
                                            <strong>{product.name}</strong>
                                            <em>R$ {product.price_display}</em>
                                        </span>
                                    </button>
                                ))}
                            </div>

                            <aside className="store-spotlight-note promo" style={{ background: `${theme.surface}e8`, borderColor: theme.border }}>
                                <span style={{ color: accent }}>{store.badge_text || 'DESTAQUE DA MARCA'}</span>
                                <strong>{background.hero_promo_title}</strong>
                                <p style={{ color: theme.muted }}>{background.hero_promo_text}</p>
                                <button type="button" onClick={() => openQuick(heroProducts[0])} style={{ background: accent }}>
                                    Descobrir <FiArrowRight />
                                </button>
                            </aside>
                        </div>
                    )}

                    {background.hero_layout === 'split' && (
                        <div className="store-hero-discovery-dock" style={{ background: theme.surface, borderColor: theme.border, boxShadow: `0 24px 70px ${accent}18` }}>
                            <div className="store-dock-categories">
                                {(categoryStats.length > 0 ? categoryStats.slice(0, 4) : [{ id: 'all', name: 'Catálogo', slug: '', productCount: products.length }]).map((category, index) => (
                                    <button type="button" key={category.id} onClick={() => handleCategoryClick(category.slug)} style={{ color: theme.text }}>
                                        <span style={{ background: `${accent}${index % 2 === 0 ? '22' : '10'}`, color: accent }}>{String(category.name).slice(0, 1).toUpperCase()}</span>
                                        <small>{category.name}</small>
                                    </button>
                                ))}
                            </div>
                            <label className="store-dock-search" style={{ background: theme.surfaceAlt, borderColor: theme.border }}>
                                <FiSearch style={{ color: accent }} />
                                <input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="O que você procura?" style={{ color: theme.text }} />
                            </label>
                            <div className="store-dock-summary">
                                <span style={{ color: accent }}>{products.length} produtos</span>
                                <strong>{store.name || slug}</strong>
                                <small style={{ color: theme.muted }}>Compra protegida pela GouPay</small>
                            </div>
                        </div>
                    )}
                </div>}
            </section>
            </div>
            </div>

            {background.show_benefit_strip && <section className="store-benefit-strip" style={{ background: theme.surfaceAlt, borderColor: theme.border }}>
                <div className="store-shell store-benefit-strip-inner">
                    {[
                        { icon: <FiShield />, title: 'Pagamento protegido', text: 'Ambiente seguro do início ao fim' },
                        { icon: <FiStar />, title: 'Escolhas organizadas', text: 'Navegação clara para diferentes interesses' },
                        { icon: <FiHeadphones />, title: 'Contato acessível', text: 'Canais da marca sempre visíveis' }
                    ].map(item => (
                        <div key={item.title}>
                            <i style={{ color: accent, background: `${accent}12` }}>{item.icon}</i>
                            <span><strong>{item.title}</strong><small style={{ color: theme.muted }}>{item.text}</small></span>
                        </div>
                    ))}
                </div>
            </section>}

            {background.show_categories && categories.length > 0 && !searchTerm && !activeCategory && (
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
                    <div className="store-category-cards">
                        {categoryStats.slice(0, 6).map((category, index) => (
                            <button
                                key={category.id}
                                onClick={() => handleCategoryClick(category.slug)}
                                style={{ color: theme.text, borderColor: theme.border, background: theme.surface }}
                            >
                                <span className="store-category-icon" style={{ color: accent, background: `${accent}${index % 2 === 0 ? '16' : '0d'}` }}>
                                    {index % 3 === 0 ? <FiGrid /> : index % 3 === 1 ? <FiBookOpen /> : <FiZap />}
                                </span>
                                <span className="store-category-copy">
                                    <strong>{category.name}</strong>
                                    <small style={{ color: theme.muted }}>{category.productCount} produto{category.productCount === 1 ? '' : 's'}</small>
                                </span>
                                <FiArrowRight className="store-category-arrow" style={{ color: theme.muted }} />
                            </button>
                        ))}
                    </div>
                </section>
            )}

            <main id="store-products" className="store-shell storefront-content" style={{ margin: '0 auto', padding: '38px 24px 76px' }}>
                <div className="store-catalog-toolbar" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
                    <div>
                        <span style={{ color: accent }}>CATÁLOGO</span>
                        <h2>Explore a loja</h2>
                        <p style={{ color: theme.muted }}>{filteredProducts.length} produto{filteredProducts.length === 1 ? '' : 's'} disponíve{filteredProducts.length === 1 ? 'l' : 'is'}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }} className="category-row">
                        <button className="category-button" onClick={() => handleCategoryClick('')} style={{ ...categoryButtonStyle(!activeCategory, accent, theme) }}>
                            <FiGrid size={14} /> Todos
                        </button>
                        {categories.map(cat => (
                            <button className="category-button" key={cat.id} onClick={() => handleCategoryClick(cat.slug)} style={{ ...categoryButtonStyle(activeCategory === cat.slug, accent, theme) }}>
                                {cat.name}
                            </button>
                        ))}
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
                        {renderedSections.map(renderStoreSection)}
                    </div>
                )}
            </main>

            {background.show_closing_cta && <section className="store-closing-section" style={{ borderColor: theme.border }}>
                <div className="store-shell store-closing-card" style={{ background: theme.surface, borderColor: theme.border }}>
                    <div className="store-closing-glow" style={{ background: accent }} />
                    <span style={{ color: accent }}><FiShield /> COMPRA TRANQUILA</span>
                    <h2>Encontre a escolha certa para o seu momento.</h2>
                    <p style={{ color: theme.muted }}>Explore as opções, confira todos os detalhes e finalize sua compra em um ambiente protegido.</p>
                    <div>
                        <button onClick={() => document.getElementById('store-products')?.scrollIntoView({ behavior: 'smooth' })} style={{ background: accent }}>
                            Explorar catálogo <FiArrowRight />
                        </button>
                        <button onClick={() => router.push(`/store/${slug}/cart`)} style={{ color: theme.text, borderColor: theme.border, background: theme.surfaceAlt }}>
                            <FiShoppingBag /> Ver carrinho
                        </button>
                    </div>
                </div>
            </section>}

            {footer.enabled && (
                <footer className="store-footer" style={{ background: theme.surface, borderTop: `1px solid ${theme.border}` }}>
                    <div className="store-shell store-footer-inner">
                        <div className="store-footer-brand">
                            <strong>{store.name || slug}</strong>
                            <p style={{ color: theme.muted }}>
                                {footer.description || 'Uma seleção de soluções e experiências para ajudar você a avançar.'}
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

            {quickProduct && (
                <div onClick={() => setQuickProduct(null)} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.72)', display: 'grid', placeItems: 'center', padding: 18, overflowY: 'auto' }}>
                    <div onClick={e => e.stopPropagation()} className="product-modal" style={{ width: 'min(980px, 96vw)', maxHeight: '92vh', overflowY: 'auto', background: theme.surface, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: 22, boxShadow: '0 30px 90px rgba(0,0,0,0.45)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '0.92fr 1.08fr', gap: 0 }} className="product-modal-grid">
                            <div style={{ minHeight: 420, background: quickProduct.image_url ? `url(${quickProduct.image_url}) center/cover` : `linear-gradient(135deg, ${accent}, ${theme.surfaceAlt})` }} />
                            <div style={{ padding: 30, display: 'flex', flexDirection: 'column', gap: 18 }}>
                                <button onClick={() => setQuickProduct(null)} style={{ alignSelf: 'flex-end', width: 34, height: 34, borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.surfaceAlt, color: theme.text, cursor: 'pointer', fontWeight: 900 }}>x</button>
                                <div>
                                    <span style={{ color: accent, fontSize: 12, fontWeight: 950, textTransform: 'uppercase' }}>Oferta da loja</span>
                                    <h2 style={{ fontSize: 32, lineHeight: 1.1, fontWeight: 950, marginTop: 8 }}>{quickProduct.name}</h2>
                                </div>
                                <p style={{ color: theme.muted, lineHeight: 1.75, fontSize: 14 }}>{quickProduct.description || 'Conheça os detalhes desta oferta disponível para compra online.'}</p>

                                <div style={{ display: 'grid', gap: 10 }}>
                                    <strong style={{ fontSize: 13 }}>Escolha o plano</strong>
                                    {quickProduct.plans.map((plan: any) => (
                                        <button key={plan.id} onClick={() => setQuickPlan(plan)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderRadius: 14, border: `1px solid ${quickPlan?.id === plan.id ? accent : theme.border}`, background: quickPlan?.id === plan.id ? `${accent}18` : theme.surfaceAlt, color: theme.text, padding: 14, cursor: 'pointer', textAlign: 'left' }}>
                                            <span style={{ fontWeight: 850 }}>{plan.name}</span>
                                            <span style={{ fontWeight: 950 }}>R$ {plan.price_display}</span>
                                        </button>
                                    ))}
                                </div>

                                <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 18, display: 'grid', gap: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16 }}>
                                        <span style={{ color: theme.muted, fontWeight: 800 }}>Total</span>
                                        <strong style={{ fontSize: 30 }}>R$ {quickPlan?.price_display || quickProduct.price_display}</strong>
                                    </div>
                                    <button onClick={quickBuyNow} style={{ border: 'none', borderRadius: 14, background: accent, color: 'white', padding: 15, fontWeight: 950, cursor: 'pointer' }}>
                                        Comprar agora
                                    </button>
                                    <button onClick={() => addProductToCart(quickProduct, quickPlan)} style={{ border: `1px solid ${theme.border}`, borderRadius: 14, background: 'transparent', color: theme.text, padding: 14, fontWeight: 900, cursor: 'pointer' }}>
                                        Adicionar ao carrinho
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .store-shell {
                    width: 100%;
                    max-width: var(--store-shell-width);
                    margin-left: auto;
                    margin-right: auto;
                }
                .store-main-header {
                    position: sticky;
                    top: 0;
                    z-index: 100;
                    min-height: 70px;
                    border-bottom: 1px solid;
                    backdrop-filter: blur(22px);
                }
                .store-main-header-inner {
                    width: min(var(--store-shell-width), calc(100% - 40px));
                    min-height: 70px;
                    margin: 0 auto;
                    display: grid;
                    grid-template-columns: minmax(190px, .8fr) minmax(280px, 1.4fr) minmax(280px, .9fr);
                    align-items: center;
                    gap: 24px;
                }
                .store-header-floating .store-main-header {
                    min-height: 86px;
                    padding: 8px 0;
                    border-bottom-color: transparent !important;
                    background: transparent !important;
                }
                .store-header-floating .store-main-header-inner {
                    min-height: 68px;
                    border: 1px solid ${theme.border};
                    border-radius: 20px;
                    padding: 0 14px;
                    background: ${theme.surface}ee;
                    box-shadow: 0 18px 50px rgba(0,0,0,.13);
                    backdrop-filter: blur(24px);
                }
                .store-header-minimal .store-main-header {
                    background: ${pageBackgroundColor}e8 !important;
                }
                .store-header-minimal .store-main-header-inner {
                    min-height: 62px;
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
                    color: white;
                    font-size: 12px;
                    font-weight: 950;
                    letter-spacing: -.02em;
                    box-shadow: inset 0 1px 0 rgba(255,255,255,.24);
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
                    max-width: var(--store-shell-width);
                    margin: 0 auto;
                    padding: 82px 24px 92px;
                    display: grid;
                    grid-template-columns: minmax(0, 1.18fr) minmax(320px, .72fr);
                    align-items: center;
                    gap: clamp(38px, 7vw, 96px);
                    text-align: left;
                }
                .store-hero-copy {
                    min-width: 0;
                }
                .hero-layout-centered .store-hero-inner,
                .hero-layout-compact .store-hero-inner {
                    grid-template-columns: minmax(0, 900px);
                    justify-content: center;
                    text-align: center;
                }
                .hero-layout-centered .store-hero-showcase,
                .hero-layout-compact .store-hero-showcase {
                    display: none;
                }
                .hero-layout-compact {
                    min-height: 470px;
                }
                .hero-layout-compact .store-hero-inner {
                    padding-top: 54px;
                    padding-bottom: 64px;
                }
                .store-trust-badges {
                    display: flex;
                    align-items: center;
                    justify-content: flex-start;
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
                    margin: 20px auto 22px;
                    transform: rotate(-3deg);
                }
                .store-hero-logo span {
                    width: 100%;
                    height: 100%;
                    border: 1px solid rgba(255,255,255,.18);
                    border-radius: 18px;
                    display: grid;
                    place-items: center;
                    color: white;
                    font-size: 23px;
                    font-weight: 950;
                    letter-spacing: -.05em;
                    background: rgba(4,6,12,.30);
                    transform: rotate(3deg);
                }
                .store-welcome-label {
                    font-size: 18px;
                    font-weight: 750;
                    margin-bottom: 9px;
                }
                .store-hero h1 {
                    max-width: 820px;
                    font-size: clamp(42px, 5.4vw, 72px);
                    line-height: .98;
                    letter-spacing: -.045em;
                    font-weight: 950;
                    text-wrap: balance;
                    margin-bottom: 20px;
                }
                .store-hero-copy > p {
                    max-width: 690px;
                    font-size: 16px;
                    line-height: 1.75;
                    text-wrap: balance;
                    margin-bottom: 28px;
                }
                .store-hero-actions {
                    display: flex;
                    justify-content: flex-start;
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
                    justify-content: flex-start;
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
                .hero-layout-centered .store-trust-badges,
                .hero-layout-compact .store-trust-badges,
                .hero-layout-centered .store-hero-actions,
                .hero-layout-compact .store-hero-actions,
                .hero-layout-centered .store-hero-assurances,
                .hero-layout-compact .store-hero-assurances {
                    justify-content: center;
                }
                .store-hero-showcase {
                    width: 100%;
                    max-width: 410px;
                    border: 1px solid;
                    border-radius: calc(var(--store-card-radius) + 8px);
                    padding: 28px;
                    justify-self: end;
                    text-align: center;
                    backdrop-filter: blur(20px);
                    transform: rotate(1.2deg);
                }
                .store-showcase-label {
                    display: inline-flex;
                    border: 1px solid currentColor;
                    border-radius: 999px;
                    padding: 6px 9px;
                    font-size: 9px;
                    font-weight: 950;
                    letter-spacing: .12em;
                }
                .store-hero-showcase > strong {
                    display: block;
                    font-size: 24px;
                    font-weight: 950;
                    margin-bottom: 8px;
                }
                .store-hero-showcase > p {
                    font-size: 12px;
                    line-height: 1.65;
                }
                .store-showcase-stats {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 7px;
                    margin-top: 22px;
                }
                .store-showcase-stats > span {
                    min-height: 70px;
                    border: 1px solid ${theme.border};
                    border-radius: 13px;
                    padding: 10px 6px;
                    display: grid;
                    place-items: center;
                    align-content: center;
                    gap: 3px;
                    background: ${theme.surfaceAlt};
                }
                .store-showcase-stats strong {
                    font-size: 18px;
                    line-height: 1;
                }
                .store-showcase-stats small {
                    font-size: 8px;
                    line-height: 1.2;
                }
                .store-benefit-strip {
                    border-bottom: 1px solid;
                }
                .store-benefit-strip-inner {
                    max-width: var(--store-shell-width);
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
                    max-width: var(--store-shell-width);
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
                .store-category-cards {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 11px;
                }
                .store-category-cards > button {
                    min-height: 88px;
                    border: 1px solid;
                    border-radius: 18px;
                    padding: 14px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    text-align: left;
                    cursor: pointer;
                    transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease;
                }
                .store-category-cards > button:hover {
                    transform: translateY(-3px);
                    border-color: ${accent};
                    box-shadow: 0 16px 38px rgba(0,0,0,.12);
                }
                .store-category-icon {
                    width: 46px;
                    height: 46px;
                    border-radius: 14px;
                    display: grid;
                    place-items: center;
                    flex: 0 0 auto;
                    font-size: 18px;
                }
                .store-category-copy {
                    min-width: 0;
                }
                .store-category-copy strong,
                .store-category-copy small {
                    display: block;
                }
                .store-category-copy strong {
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    font-size: 13px;
                    margin-bottom: 4px;
                }
                .store-category-copy small {
                    font-size: 10px;
                }
                .store-category-arrow {
                    margin-left: auto;
                    flex: 0 0 auto;
                    transition: transform .2s ease;
                }
                .store-category-cards > button:hover .store-category-arrow {
                    transform: translateX(3px);
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
                .store-catalog-toolbar > div:first-child > span,
                .store-product-section-heading > div:first-child > span {
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
                .store-spacing-compact .storefront-sections { gap: 30px; }
                .store-spacing-airy .storefront-sections { gap: 72px; }
                .store-product-section {
                    min-width: 0;
                }
                .store-content-block {
                    min-height: 390px;
                    border: 1px solid;
                    border-radius: calc(var(--store-card-radius) + 8px);
                    padding: clamp(24px, 5vw, 58px);
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) minmax(300px, .9fr);
                    align-items: center;
                    gap: clamp(28px, 6vw, 72px);
                    overflow: hidden;
                }
                .store-content-block.image-left .store-content-media { order: -1; }
                .store-content-block:not(:has(.store-content-media)) { grid-template-columns: minmax(0, 820px); }
                .store-content-copy > span,
                .store-rich-heading > span {
                    display: block;
                    font-size: 10px;
                    font-weight: 950;
                    letter-spacing: .13em;
                    margin-bottom: 8px;
                }
                .store-content-copy h2,
                .store-rich-heading h2 {
                    font-size: clamp(28px, 4vw, 44px);
                    line-height: 1.05;
                    letter-spacing: -.035em;
                    font-weight: 950;
                    text-wrap: balance;
                }
                .store-content-copy p {
                    max-width: 720px;
                    margin-top: 16px;
                    font-size: 14px;
                    line-height: 1.8;
                    white-space: pre-line;
                }
                .store-content-copy button {
                    min-height: 44px;
                    border: 0;
                    border-radius: 12px;
                    padding: 0 16px;
                    margin-top: 22px;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 12px;
                    font-weight: 900;
                    cursor: pointer;
                }
                .store-content-media {
                    min-height: 300px;
                    border-radius: var(--store-card-radius);
                    background-position: center;
                    background-size: cover;
                    box-shadow: 0 24px 60px rgba(0,0,0,.18);
                }
                .store-rich-section {
                    min-width: 0;
                }
                .store-rich-heading {
                    max-width: 760px;
                    margin-bottom: 22px;
                }
                .store-rich-heading p {
                    margin-top: 9px;
                    font-size: 13px;
                    line-height: 1.65;
                }
                .store-features-grid,
                .store-testimonials-grid {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 13px;
                }
                .store-features-grid article,
                .store-testimonials-grid article {
                    border: 1px solid;
                    border-radius: var(--store-card-radius);
                    padding: 24px;
                }
                .store-features-grid i {
                    width: 44px;
                    height: 44px;
                    border-radius: 13px;
                    display: grid;
                    place-items: center;
                    margin-bottom: 22px;
                    font-size: 19px;
                    font-style: normal;
                }
                .store-features-grid h3 {
                    font-size: 17px;
                    line-height: 1.2;
                    font-weight: 900;
                    margin-bottom: 8px;
                }
                .store-features-grid p {
                    font-size: 12px;
                    line-height: 1.65;
                }
                .store-testimonials-grid article {
                    min-height: 270px;
                    display: flex;
                    flex-direction: column;
                }
                .store-quote-icon {
                    font-size: 26px;
                    margin-bottom: 14px;
                }
                .store-testimonial-stars {
                    display: flex;
                    gap: 3px;
                    font-size: 11px;
                    margin-bottom: 16px;
                }
                .store-testimonials-grid blockquote {
                    font-size: 15px;
                    line-height: 1.7;
                    font-weight: 650;
                    flex: 1;
                }
                .store-testimonials-grid footer {
                    margin-top: 22px;
                }
                .store-testimonials-grid footer strong,
                .store-testimonials-grid footer small {
                    display: block;
                }
                .store-testimonials-grid footer strong { font-size: 13px; }
                .store-testimonials-grid footer small { margin-top: 3px; font-size: 10px; }
                .store-faq-section {
                    display: grid;
                    grid-template-columns: minmax(260px, .7fr) minmax(0, 1.3fr);
                    gap: clamp(28px, 6vw, 80px);
                    align-items: start;
                }
                .store-faq-list {
                    display: grid;
                    gap: 9px;
                }
                .store-faq-list details {
                    border: 1px solid;
                    border-radius: var(--store-card-radius);
                    padding: 0 18px;
                }
                .store-faq-list summary {
                    min-height: 60px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 18px;
                    list-style: none;
                    font-size: 13px;
                    font-weight: 850;
                    cursor: pointer;
                }
                .store-faq-list summary::-webkit-details-marker { display: none; }
                .store-faq-list summary span { font-size: 20px; transition: transform .2s; }
                .store-faq-list details[open] summary span { transform: rotate(45deg); }
                .store-faq-list details p {
                    padding: 0 0 18px;
                    font-size: 12px;
                    line-height: 1.7;
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
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                    gap: 15px;
                }
                .store-product-card {
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    min-width: 0;
                    transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease;
                }
                .store-cards-elevated .store-product-card,
                .store-cards-elevated .store-features-grid article,
                .store-cards-elevated .store-testimonials-grid article {
                    box-shadow: 0 14px 40px rgba(0,0,0,.12);
                }
                .store-cards-minimal .store-product-card,
                .store-cards-minimal .store-features-grid article,
                .store-cards-minimal .store-testimonials-grid article {
                    border-color: transparent !important;
                    box-shadow: none;
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
                .store-images-square .store-product-media { height: auto; aspect-ratio: 1; }
                .store-images-portrait .store-product-media { height: auto; aspect-ratio: 4 / 5; }
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
                    max-width: var(--store-shell-width);
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
                    max-width: var(--store-shell-width);
                    margin: 0 auto;
                    padding: 16px 24px 24px;
                    display: flex;
                    justify-content: space-between;
                    gap: 16px;
                    font-size: 10px;
                }
                .store-main-header-inner {
                    grid-template-columns: minmax(170px, .62fr) minmax(420px, 1.8fr) auto;
                }
                .store-header-discovery {
                    min-width: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 14px;
                }
                .store-header-category-nav {
                    min-width: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 4px;
                }
                .store-header-category-nav button {
                    min-height: 34px;
                    border: 0;
                    border-bottom: 2px solid transparent;
                    padding: 0 9px;
                    overflow: hidden;
                    color: ${theme.muted};
                    background: transparent;
                    font-size: 10px;
                    font-weight: 800;
                    white-space: nowrap;
                    text-overflow: ellipsis;
                    cursor: pointer;
                }
                .store-header-category-nav button:hover,
                .store-header-category-nav button.active {
                    border-bottom-color: ${accent};
                    color: ${theme.text};
                }
                .store-header-discovery .store-header-search {
                    width: min(290px, 38%);
                    min-width: 190px;
                    flex: 0 1 290px;
                }
                .store-hero {
                    min-height: 780px;
                    padding-bottom: 34px;
                }
                .store-hero-inner {
                    position: relative;
                    padding: 64px 24px 42px;
                    display: grid;
                    grid-template-columns: minmax(0, 1fr);
                    align-content: center;
                    gap: 34px;
                    text-align: center;
                }
                .store-hero-copy {
                    width: min(100%, 900px);
                    margin: 0 auto;
                }
                .store-hero.hero-layout-split .store-hero-inner {
                    padding-top: 36px;
                    gap: 18px;
                }
                .store-hero.hero-layout-split h1 {
                    max-width: 760px;
                    margin-bottom: 14px;
                    font-size: clamp(42px, 4.4vw, 58px);
                }
                .store-hero.hero-layout-split .store-hero-copy > p {
                    margin-bottom: 20px;
                    line-height: 1.6;
                }
                .store-hero.hero-layout-split .store-hero-assurances {
                    display: none;
                }
                .store-hero-copy > p {
                    margin-left: auto;
                    margin-right: auto;
                }
                .store-trust-badges,
                .store-hero-actions,
                .store-hero-assurances {
                    justify-content: center;
                }
                .store-hero-spotlight {
                    width: min(100%, 1240px);
                    min-height: 330px;
                    margin: -4px auto 0;
                    display: grid;
                    grid-template-columns: minmax(170px, .55fr) minmax(520px, 1.9fr) minmax(170px, .55fr);
                    align-items: center;
                    gap: 22px;
                }
                .store-spotlight-note {
                    min-height: 178px;
                    border: 1px solid;
                    border-radius: calc(var(--store-card-radius) + 4px);
                    padding: 22px;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    justify-content: center;
                    text-align: left;
                    backdrop-filter: blur(20px);
                }
                .store-spotlight-note > i {
                    width: 36px;
                    height: 36px;
                    border-radius: 12px;
                    display: grid;
                    place-items: center;
                    font-style: normal;
                    margin-bottom: 14px;
                }
                .store-spotlight-note > span {
                    font-size: 9px;
                    font-weight: 950;
                    letter-spacing: .11em;
                    margin-bottom: 8px;
                }
                .store-spotlight-note > strong {
                    font-size: 16px;
                    line-height: 1.25;
                    margin-bottom: 8px;
                }
                .store-spotlight-note > p {
                    font-size: 11px;
                    line-height: 1.55;
                }
                .store-spotlight-note > button {
                    min-height: 36px;
                    border: 0;
                    border-radius: 999px;
                    padding: 0 14px;
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                    color: white;
                    font-size: 10px;
                    font-weight: 900;
                    margin-top: 15px;
                    cursor: pointer;
                }
                .store-spotlight-products {
                    min-width: 0;
                    min-height: 330px;
                    display: flex;
                    align-items: flex-end;
                    justify-content: center;
                    gap: 0;
                    isolation: isolate;
                }
                .store-spotlight-product {
                    position: relative;
                    width: 190px;
                    height: 260px;
                    border: 1px solid;
                    border-radius: calc(var(--store-card-radius) + 9px);
                    padding: 0;
                    overflow: hidden;
                    flex: 0 0 auto;
                    color: white;
                    cursor: pointer;
                    transition: transform .25s ease, filter .25s ease;
                }
                .store-spotlight-product:hover {
                    filter: brightness(1.06);
                }
                .store-spotlight-product.product-1 {
                    width: 250px;
                    height: 330px;
                    z-index: 3;
                    order: 2;
                }
                .store-spotlight-product.product-2 {
                    z-index: 1;
                    order: 1;
                    margin-right: -24px;
                    transform: rotate(-4deg) translateY(-8px);
                }
                .store-spotlight-product.product-3 {
                    z-index: 1;
                    order: 3;
                    margin-left: -24px;
                    transform: rotate(4deg) translateY(-8px);
                }
                .store-spotlight-product.product-2:hover {
                    transform: rotate(-2deg) translateY(-14px);
                }
                .store-spotlight-product.product-3:hover {
                    transform: rotate(2deg) translateY(-14px);
                }
                .store-spotlight-shade {
                    position: absolute;
                    inset: 35% 0 0;
                    background: linear-gradient(transparent, rgba(4,6,12,.92));
                }
                .store-spotlight-product-copy {
                    position: absolute;
                    inset: auto 0 0;
                    z-index: 1;
                    padding: 18px;
                    display: grid;
                    gap: 5px;
                    text-align: left;
                }
                .store-spotlight-product-copy small {
                    font-size: 7px;
                    font-weight: 950;
                    letter-spacing: .1em;
                    opacity: .72;
                }
                .store-spotlight-product-copy strong {
                    overflow: hidden;
                    font-size: 14px;
                    line-height: 1.2;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                }
                .store-spotlight-product-copy em {
                    color: white;
                    font-size: 12px;
                    font-style: normal;
                    font-weight: 900;
                }
                .store-hero-discovery-dock {
                    width: min(100%, 1240px);
                    min-height: 100px;
                    border: 1px solid;
                    border-radius: calc(var(--store-card-radius) + 12px);
                    padding: 13px 18px;
                    display: grid;
                    grid-template-columns: minmax(260px, 1fr) minmax(260px, 1.15fr) minmax(190px, .7fr);
                    align-items: center;
                    gap: 22px;
                }
                .store-dock-categories {
                    min-width: 0;
                    display: flex;
                    align-items: flex-start;
                    gap: 13px;
                    overflow-x: auto;
                    scrollbar-width: none;
                }
                .store-dock-categories::-webkit-scrollbar { display: none; }
                .store-dock-categories button {
                    min-width: 52px;
                    border: 0;
                    padding: 0;
                    display: grid;
                    justify-items: center;
                    gap: 5px;
                    background: transparent;
                    cursor: pointer;
                }
                .store-dock-categories button > span {
                    width: 42px;
                    height: 42px;
                    border-radius: 999px;
                    display: grid;
                    place-items: center;
                    font-size: 12px;
                    font-weight: 950;
                }
                .store-dock-categories button > small {
                    width: 64px;
                    overflow: hidden;
                    font-size: 8px;
                    font-weight: 800;
                    white-space: nowrap;
                    text-overflow: ellipsis;
                }
                .store-dock-search {
                    height: 44px;
                    border: 1px solid;
                    border-radius: 999px;
                    padding: 0 14px;
                    display: flex;
                    align-items: center;
                    gap: 9px;
                }
                .store-dock-search input {
                    width: 100%;
                    min-width: 0;
                    border: 0;
                    outline: 0;
                    background: transparent;
                    font-size: 11px;
                    font-weight: 700;
                }
                .store-dock-summary {
                    min-width: 0;
                    display: grid;
                    justify-items: end;
                    text-align: right;
                }
                .store-dock-summary span {
                    font-size: 8px;
                    font-weight: 950;
                    letter-spacing: .08em;
                    text-transform: uppercase;
                }
                .store-dock-summary strong {
                    max-width: 100%;
                    overflow: hidden;
                    font-size: 13px;
                    white-space: nowrap;
                    text-overflow: ellipsis;
                    margin: 3px 0;
                }
                .store-dock-summary small {
                    font-size: 8px;
                }
                @media (max-width: 900px) {
                    .store-main-header-inner {
                        grid-template-columns: minmax(150px, .7fr) minmax(220px, 1.2fr) auto;
                        gap: 12px;
                    }
                    .store-header-category-nav {
                        display: none;
                    }
                    .store-header-discovery .store-header-search {
                        width: 100%;
                        min-width: 0;
                        flex-basis: auto;
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
                    .store-hero-inner {
                        grid-template-columns: minmax(0, 880px);
                        justify-content: center;
                        text-align: center;
                    }
                    .store-hero-showcase {
                        display: none;
                    }
                    .store-trust-badges,
                    .store-hero-actions,
                    .store-hero-assurances {
                        justify-content: center;
                    }
                    .store-hero h1 {
                        font-size: clamp(40px, 8vw, 62px);
                    }
                    .store-hero-spotlight {
                        grid-template-columns: minmax(0, 1fr);
                    }
                    .store-spotlight-note {
                        display: none;
                    }
                    .store-hero-discovery-dock {
                        grid-template-columns: minmax(220px, 1fr) minmax(240px, 1fr);
                    }
                    .store-dock-summary {
                        display: none;
                    }
                    .store-category-cards {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }
                    .store-catalog-toolbar {
                        align-items: flex-start;
                        flex-direction: column;
                    }
                    .products-grid {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }
                    .store-content-block {
                        grid-template-columns: 1fr;
                    }
                    .store-content-block.image-left .store-content-media { order: 0; }
                    .store-features-grid,
                    .store-testimonials-grid {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }
                    .store-faq-section {
                        grid-template-columns: 1fr;
                        gap: 20px;
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
                    .store-header-discovery {
                        grid-column: 1 / -1;
                        grid-row: 2;
                        width: 100%;
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
                        min-height: 0;
                        padding-bottom: 12px;
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
                    .store-hero-logo span {
                        border-radius: 15px;
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
                    .store-hero-copy > p {
                        font-size: 13px;
                        line-height: 1.65;
                        margin-bottom: 22px;
                    }
                    .store-hero-spotlight {
                        min-height: 245px;
                        margin-top: -8px;
                    }
                    .store-spotlight-products {
                        min-height: 245px;
                    }
                    .store-spotlight-product {
                        width: 118px;
                        height: 180px;
                    }
                    .store-spotlight-product.product-1 {
                        width: 158px;
                        height: 230px;
                    }
                    .store-spotlight-product.product-2 {
                        margin-right: -18px;
                    }
                    .store-spotlight-product.product-3 {
                        margin-left: -18px;
                    }
                    .store-spotlight-product-copy {
                        padding: 12px;
                    }
                    .store-spotlight-product-copy strong {
                        font-size: 11px;
                    }
                    .store-hero-discovery-dock {
                        grid-template-columns: 1fr;
                        gap: 11px;
                        padding: 12px;
                    }
                    .store-dock-categories {
                        justify-content: flex-start;
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
                    .store-category-cards {
                        grid-template-columns: 1fr;
                    }
                    .store-category-cards > button {
                        min-height: 76px;
                    }
                    .category-row {
                        margin-left: -2px;
                        padding-bottom: 8px !important;
                    }
                    .category-button {
                        padding: 8px 12px !important;
                        font-size: 12px !important;
                    }
                    .products-grid {
                        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                        gap: 10px !important;
                    }
                    .store-content-block {
                        min-height: 0;
                        padding: 24px 16px;
                    }
                    .store-content-media { min-height: 220px; }
                    .store-features-grid,
                    .store-testimonials-grid {
                        grid-template-columns: 1fr;
                    }
                    .store-features-grid article,
                    .store-testimonials-grid article {
                        padding: 18px;
                    }
                    .store-rich-heading h2,
                    .store-content-copy h2 {
                        font-size: 27px;
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

                /* Vitrine editorial: estrutura clara inspirada em catálogo de produto. */
                .store-opening-shell.is-showcase {
                    position: relative;
                    width: min(calc(100% - 36px), calc(var(--store-shell-width) + 72px));
                    margin: 22px auto 38px;
                    overflow: hidden;
                    color: #171717;
                    background: #fbfbfa;
                    border: 1px solid rgba(20,20,20,.08);
                    border-radius: 38px;
                    box-shadow: 0 22px 55px rgba(15,23,42,.24), 0 5px 0 rgba(15,23,42,.13);
                }
                .store-opening-shell.is-showcase .store-main-header {
                    position: relative;
                    top: auto;
                    min-height: 78px;
                    border-bottom: 0;
                    backdrop-filter: none;
                }
                .store-opening-shell.is-showcase .store-main-header-inner {
                    width: 100%;
                    min-height: 78px;
                    padding: 10px 30px;
                    background: #fbfbfa !important;
                    border-color: transparent !important;
                    box-shadow: none !important;
                }
                .store-opening-shell.is-showcase .store-brand-name,
                .store-opening-shell.is-showcase .store-header-category-nav button {
                    color: #171717;
                }
                .store-opening-shell.is-showcase .store-header-category-nav button {
                    opacity: .58;
                }
                .store-opening-shell.is-showcase .store-header-category-nav button:hover,
                .store-opening-shell.is-showcase .store-header-category-nav button.active {
                    color: #171717;
                    opacity: 1;
                }
                .store-opening-shell.is-showcase .store-header-discovery {
                    justify-content: center;
                }
                .store-opening-shell.is-showcase .store-header-search {
                    display: none;
                }
                .store-opening-shell.is-showcase .store-hero {
                    min-height: 590px;
                    overflow: visible;
                    padding: 0 0 18px;
                    color: #171717;
                    isolation: isolate;
                }
                .store-opening-shell.is-showcase .store-hero-grid,
                .store-opening-shell.is-showcase .store-hero-orb {
                    display: none;
                }
                .store-opening-shell.is-showcase .store-hero-inner {
                    width: 100%;
                    padding: 8px 26px 0;
                    gap: 0;
                }
                .store-opening-shell.is-showcase .store-hero-copy {
                    width: min(100%, 840px);
                    min-height: 76px;
                    display: grid;
                    place-items: center;
                }
                .store-opening-shell.is-showcase .store-hero-copy > :not(h1) {
                    display: none;
                }
                .store-opening-shell.is-showcase .store-hero-copy h1 {
                    max-width: 820px;
                    margin: 0;
                    color: #171717;
                    font-size: clamp(30px, 3.3vw, 46px);
                    line-height: 1.02;
                    font-weight: 900;
                    letter-spacing: .07em;
                    text-align: center;
                    text-transform: uppercase;
                }
                .store-opening-shell.is-showcase .store-hero-spotlight {
                    width: 100%;
                    min-height: 350px;
                    margin: -2px auto 0;
                    grid-template-columns: minmax(170px, .55fr) minmax(520px, 1.8fr) minmax(170px, .55fr);
                    gap: 14px;
                }
                .store-opening-shell.is-showcase .store-spotlight-note {
                    min-height: 230px;
                    padding: 22px 18px;
                    color: #272727;
                    background: transparent !important;
                    border: 0 !important;
                    border-radius: 0;
                    backdrop-filter: none;
                }
                .store-opening-shell.is-showcase .store-spotlight-note > i {
                    display: none;
                }
                .store-opening-shell.is-showcase .store-spotlight-note > strong {
                    max-width: 180px;
                    color: #292929;
                    font-size: 15px;
                }
                .store-opening-shell.is-showcase .store-spotlight-note > p {
                    max-width: 190px;
                    color: #929292 !important;
                    font-size: 10px;
                }
                .store-opening-shell.is-showcase .store-spotlight-secondary-note {
                    max-width: 190px;
                    margin-top: 30px;
                    padding-top: 22px;
                    border-top: 1px solid rgba(20,20,20,.08);
                }
                .store-opening-shell.is-showcase .store-spotlight-secondary-note strong {
                    display: block;
                    margin-bottom: 6px;
                    font-size: 13px;
                }
                .store-opening-shell.is-showcase .store-spotlight-secondary-note p {
                    color: #a0a0a0;
                    font-size: 9px;
                    line-height: 1.5;
                }
                .store-opening-shell.is-showcase .store-spotlight-note.promo {
                    align-items: flex-end;
                    text-align: right;
                }
                .store-opening-shell.is-showcase .store-spotlight-note.promo > strong,
                .store-opening-shell.is-showcase .store-spotlight-note.promo > p {
                    margin-left: auto;
                }
                .store-opening-shell.is-showcase .store-spotlight-products {
                    position: relative;
                    min-height: 350px;
                    align-items: center;
                    overflow: visible;
                }
                .store-opening-shell.is-showcase .store-spotlight-products::before {
                    content: '';
                    position: absolute;
                    inset: auto 8% 6px;
                    height: 116px;
                    z-index: -1;
                    background: #ffffff;
                    border: 1px solid rgba(20,20,20,.06);
                    border-radius: 0 0 90px 90px;
                    box-shadow: 0 18px 35px rgba(15,23,42,.10);
                }
                .store-opening-shell.is-showcase .store-spotlight-product {
                    width: 190px;
                    height: 284px;
                    overflow: visible;
                    color: #171717;
                    background: transparent;
                    border: 0 !important;
                    border-radius: 24px;
                    box-shadow: none !important;
                }
                .store-opening-shell.is-showcase .store-spotlight-product.product-1 {
                    width: 250px;
                    height: 342px;
                }
                .store-opening-shell.is-showcase .store-spotlight-product.product-2 {
                    margin-right: -22px;
                    transform: rotate(-2deg) translateY(10px);
                }
                .store-opening-shell.is-showcase .store-spotlight-product.product-3 {
                    margin-left: -22px;
                    transform: rotate(2deg) translateY(10px);
                }
                .store-opening-shell.is-showcase .store-spotlight-product.product-2:hover {
                    transform: rotate(-1deg) translateY(2px);
                }
                .store-opening-shell.is-showcase .store-spotlight-product.product-3:hover {
                    transform: rotate(1deg) translateY(2px);
                }
                .store-spotlight-media {
                    position: absolute;
                    inset: 0 0 54px;
                    overflow: hidden;
                    display: grid;
                    place-items: center;
                    background: var(--spotlight-placeholder, #f0f0ee);
                    border: 1px solid rgba(20,20,20,.06);
                    border-radius: 25px;
                }
                .store-spotlight-media img {
                    width: 100%;
                    height: 100%;
                    display: block;
                    object-fit: contain;
                }
                .store-spotlight-media > svg {
                    color: rgba(20,20,20,.22);
                    font-size: 52px;
                }
                .store-opening-shell.is-showcase .store-spotlight-product-copy {
                    inset: auto 9px 0;
                    padding: 9px 12px;
                    gap: 2px;
                    color: #171717;
                    background: rgba(255,255,255,.96);
                    border: 1px solid rgba(20,20,20,.07);
                    border-radius: 13px;
                    box-shadow: 0 10px 22px rgba(15,23,42,.08);
                }
                .store-opening-shell.is-showcase .store-spotlight-product-copy small {
                    color: #858585;
                    font-size: 6px;
                }
                .store-opening-shell.is-showcase .store-spotlight-product-copy strong {
                    color: #171717;
                    font-size: 11px;
                }
                .store-opening-shell.is-showcase .store-spotlight-product-copy em {
                    color: #171717;
                    font-size: 10px;
                }
                .store-opening-shell.is-showcase .store-hero-discovery-dock {
                    position: relative;
                    z-index: 6;
                    width: calc(100% - 28px);
                    min-height: 104px;
                    margin: -42px auto 0;
                    padding: 13px 22px;
                    color: #fff;
                    background: #272727 !important;
                    border: 0 !important;
                    border-radius: 28px;
                    box-shadow: 0 18px 35px rgba(15,23,42,.20) !important;
                }
                .store-opening-shell.is-showcase .store-dock-categories button {
                    color: #fff !important;
                }
                .store-opening-shell.is-showcase .store-dock-categories button > span {
                    color: #171717 !important;
                    background: #fff !important;
                }
                .store-opening-shell.is-showcase .store-dock-search {
                    color: #fff;
                    background: ${accent} !important;
                    border-color: transparent !important;
                }
                .store-opening-shell.is-showcase .store-dock-search svg,
                .store-opening-shell.is-showcase .store-dock-search input,
                .store-opening-shell.is-showcase .store-dock-search input::placeholder {
                    color: #fff !important;
                }
                .store-opening-shell.is-showcase .store-dock-summary strong {
                    color: #fff;
                }
                .store-opening-shell.is-showcase .store-dock-summary small {
                    color: #aaa !important;
                }
                .store-showcase-rail {
                    position: absolute;
                    top: 50%;
                    left: 0;
                    z-index: 8;
                    padding: 9px 7px;
                    display: grid;
                    gap: 5px;
                    color: #fff;
                    background: #292929;
                    border-radius: 0 16px 16px 0;
                    transform: translateY(-50%);
                    box-shadow: 0 12px 24px rgba(15,23,42,.16);
                }
                .store-showcase-rail button {
                    width: 28px;
                    height: 28px;
                    display: grid;
                    place-items: center;
                    color: inherit;
                    background: transparent;
                    border: 0;
                    border-radius: 8px;
                    cursor: pointer;
                }
                .store-showcase-rail button:hover {
                    background: rgba(255,255,255,.12);
                }
                @media (max-width: 900px) {
                    .store-opening-shell.is-showcase {
                        width: calc(100% - 20px);
                        border-radius: 28px;
                    }
                    .store-opening-shell.is-showcase .store-main-header-inner {
                        padding-left: 18px;
                        padding-right: 18px;
                    }
                    .store-opening-shell.is-showcase .store-hero {
                        min-height: 570px;
                    }
                    .store-opening-shell.is-showcase .store-hero-spotlight {
                        grid-template-columns: minmax(0, 1fr);
                    }
                    .store-opening-shell.is-showcase .store-spotlight-note,
                    .store-showcase-rail {
                        display: none;
                    }
                }
                @media (max-width: 620px) {
                    .store-opening-shell.is-showcase {
                        width: 100%;
                        margin: 0 0 26px;
                        border-width: 0;
                        border-radius: 0 0 28px 28px;
                    }
                    .store-opening-shell.is-showcase .store-main-header,
                    .store-opening-shell.is-showcase .store-main-header-inner {
                        min-height: 64px;
                    }
                    .store-opening-shell.is-showcase .store-main-header-inner {
                        grid-template-rows: 44px;
                        grid-template-columns: minmax(0, 1fr) auto;
                        padding: 8px 14px;
                    }
                    .store-opening-shell.is-showcase .store-header-discovery,
                    .store-opening-shell.is-showcase .store-support-button {
                        display: none;
                    }
                    .store-opening-shell.is-showcase .store-hero {
                        min-height: 540px;
                        padding-bottom: 12px;
                    }
                    .store-opening-shell.is-showcase .store-hero-inner {
                        padding: 10px 10px 0 !important;
                    }
                    .store-opening-shell.is-showcase .store-hero-copy {
                        min-height: 62px;
                    }
                    .store-opening-shell.is-showcase .store-hero-copy h1 {
                        font-size: 27px !important;
                        letter-spacing: .035em;
                    }
                    .store-opening-shell.is-showcase .store-hero-spotlight,
                    .store-opening-shell.is-showcase .store-spotlight-products {
                        min-height: 298px;
                    }
                    .store-opening-shell.is-showcase .store-spotlight-product {
                        width: 108px;
                        height: 205px;
                    }
                    .store-opening-shell.is-showcase .store-spotlight-product.product-1 {
                        width: 154px;
                        height: 270px;
                    }
                    .store-opening-shell.is-showcase .store-spotlight-product.product-2 {
                        margin-right: -16px;
                    }
                    .store-opening-shell.is-showcase .store-spotlight-product.product-3 {
                        margin-left: -16px;
                    }
                    .store-opening-shell.is-showcase .store-spotlight-product-copy {
                        inset: auto 3px 0;
                        padding: 7px;
                    }
                    .store-opening-shell.is-showcase .store-hero-discovery-dock {
                        width: calc(100% - 18px);
                        margin-top: -32px;
                        border-radius: 22px;
                    }
                    .store-opening-shell.is-showcase .store-dock-summary {
                        display: none;
                    }
                }

                /* Contained 16:9 showcase based on the storefront reference. */
                .store-showcase-stage {
                    padding: 1px 0;
                    background: #e8e8e8;
                }
                .store-opening-shell.is-showcase {
                    width: min(1600px, calc(100% - 48px), calc(177.777dvh - 85.333px));
                    aspect-ratio: 16 / 9;
                    min-height: 0;
                    margin: 24px auto;
                    overflow: hidden;
                    color: #171717;
                    background: #fbfbfa;
                    border: 1px solid rgba(20,20,20,.08);
                    border-radius: clamp(30px, 2.6vw, 42px);
                    box-shadow: 0 24px 48px rgba(15,23,42,.24), 0 6px 0 rgba(15,23,42,.12);
                    isolation: isolate;
                }
                .store-opening-shell.is-showcase .store-main-header {
                    position: relative;
                    min-height: clamp(62px, 5vw, 76px);
                    color: #171717;
                    background: #fbfbfa !important;
                    border: 0;
                }
                .store-opening-shell.is-showcase .store-main-header-inner {
                    width: 100%;
                    min-height: clamp(62px, 5vw, 76px);
                    padding: 0;
                    padding-left: clamp(24px, 3vw, 48px);
                    padding-right: clamp(24px, 3vw, 48px);
                    grid-template-columns: minmax(150px, .8fr) minmax(300px, 1.35fr) minmax(230px, .8fr);
                    gap: clamp(10px, 1.6vw, 24px);
                    background: transparent !important;
                    border: 0 !important;
                    border-radius: 0;
                    box-shadow: none !important;
                }
                .store-opening-shell.is-showcase .store-brand-mark {
                    width: 28px;
                    height: 28px;
                    border-radius: 999px;
                    font-size: 9px;
                    box-shadow: 0 8px 18px rgba(0,0,0,.12);
                }
                .store-opening-shell.is-showcase .store-brand-name {
                    color: #151515;
                    font-size: 12px;
                    font-weight: 900;
                }
                .store-opening-shell.is-showcase .store-brand::before {
                    content: '';
                    width: 10px;
                    height: 10px;
                    border-radius: 999px;
                    background: #262626;
                    flex: 0 0 auto;
                }
                .store-opening-shell.is-showcase .store-header-category-nav {
                    gap: clamp(18px, 3.2vw, 58px);
                }
                .store-opening-shell.is-showcase .store-header-category-nav button {
                    min-height: 36px;
                    padding: 0;
                    color: #9b9b9b;
                    border-bottom: 2px solid transparent;
                    font-size: 12px;
                    font-weight: 800;
                    opacity: 1;
                }
                .store-opening-shell.is-showcase .store-header-category-nav button:hover,
                .store-opening-shell.is-showcase .store-header-category-nav button.active {
                    color: #151515;
                    border-bottom-color: #151515;
                }
                .store-opening-shell.is-showcase .store-support-button,
                .store-opening-shell.is-showcase .store-cart-button,
                .store-opening-shell.is-showcase .store-account-button {
                    height: 30px;
                    border-radius: 999px;
                    color: #fff !important;
                    background: #252525 !important;
                    border-color: transparent !important;
                    box-shadow: 0 8px 18px rgba(0,0,0,.22);
                    font-size: 10px;
                }
                .store-opening-shell.is-showcase .store-support-button {
                    padding: 0 16px;
                }
                .store-opening-shell.is-showcase .store-cart-button {
                    width: 30px;
                }
                .store-opening-shell.is-showcase .store-account-button {
                    padding: 0 18px;
                }
                .store-opening-shell.is-showcase .store-header-search {
                    display: none;
                }
                .store-opening-shell.is-showcase .store-hero {
                    height: calc(100% - clamp(62px, 5vw, 76px));
                    min-height: 0;
                    padding: 0;
                    overflow: hidden;
                    color: #171717;
                    background: #fbfbfa !important;
                    border: 0;
                }
                .store-opening-shell.is-showcase .store-hero::after,
                .store-opening-shell.is-showcase .store-hero-grid,
                .store-opening-shell.is-showcase .store-hero-orb {
                    display: none;
                }
                .store-opening-shell.is-showcase .store-hero-inner {
                    position: relative;
                    width: 100%;
                    max-width: none;
                    height: 100%;
                    min-height: 0;
                    padding: 0 clamp(22px, 3vw, 48px) clamp(118px, 15%, 150px);
                    display: block;
                    overflow: hidden;
                }
                .store-opening-shell.is-showcase .store-hero-copy {
                    width: min(100%, 760px);
                    min-height: clamp(88px, 13%, 112px);
                    margin: 0 auto;
                    display: grid;
                    place-items: center;
                    text-align: center;
                }
                .store-opening-shell.is-showcase .store-hero-copy > :not(h1) {
                    display: none !important;
                }
                .store-opening-shell.is-showcase .store-hero-copy h1 {
                    max-width: 760px;
                    margin: 0;
                    color: #1b1b1b;
                    display: -webkit-box;
                    overflow: hidden;
                    font-size: clamp(30px, 3.1vw, 50px);
                    line-height: 1.03;
                    letter-spacing: .045em;
                    text-align: center;
                    text-transform: uppercase;
                    font-weight: 900;
                    text-wrap: balance;
                    -webkit-box-orient: vertical;
                    -webkit-line-clamp: 2;
                }
                .store-opening-shell.is-showcase .store-hero-spotlight {
                    position: absolute;
                    left: clamp(26px, 3vw, 48px);
                    right: clamp(26px, 3vw, 48px);
                    top: clamp(88px, 13%, 112px);
                    bottom: clamp(72px, 10%, 102px);
                    z-index: 5;
                    width: auto;
                    min-height: 0;
                    margin: 0;
                    display: grid;
                    grid-template-columns: minmax(150px, .56fr) minmax(330px, 1.55fr) minmax(150px, .56fr);
                    align-items: center;
                    gap: clamp(14px, 2vw, 34px);
                }
                .store-opening-shell.is-showcase .store-spotlight-note {
                    display: flex;
                    min-height: 0;
                    padding: 14px 10px;
                    color: #272727;
                    background: transparent !important;
                    border: 0 !important;
                    border-radius: 0;
                    box-shadow: none;
                    backdrop-filter: none;
                }
                .store-opening-shell.is-showcase .store-spotlight-note > i {
                    display: none;
                }
                .store-opening-shell.is-showcase .store-spotlight-note > strong {
                    max-width: 190px;
                    color: #333;
                    font-size: clamp(12px, 1vw, 15px);
                    line-height: 1.35;
                    font-weight: 800;
                }
                .store-opening-shell.is-showcase .store-spotlight-note > p {
                    max-width: 200px;
                    color: #b4b4b4 !important;
                    font-size: clamp(9px, .72vw, 11px);
                    line-height: 1.5;
                }
                .store-opening-shell.is-showcase .store-spotlight-secondary-note {
                    max-width: 200px;
                    margin-top: clamp(22px, 3vh, 34px);
                    padding-top: 18px;
                    border-top: 1px solid rgba(20,20,20,.08);
                }
                .store-opening-shell.is-showcase .store-spotlight-secondary-note strong {
                    display: block;
                    margin-bottom: 7px;
                    color: #333;
                    font-size: 14px;
                }
                .store-opening-shell.is-showcase .store-spotlight-secondary-note p {
                    color: #b4b4b4;
                    font-size: 10px;
                    line-height: 1.48;
                }
                .store-opening-shell.is-showcase .store-spotlight-note.promo {
                    align-items: flex-end;
                    text-align: right;
                }
                .store-opening-shell.is-showcase .store-spotlight-note.promo > span {
                    color: #333 !important;
                    font-size: 10px;
                    letter-spacing: 0;
                    text-transform: none;
                }
                .store-opening-shell.is-showcase .store-spotlight-note.promo > button {
                    min-height: 28px;
                    min-width: 132px;
                    padding: 0 18px;
                    border-radius: 999px;
                    background: ${accent} !important;
                    box-shadow: inset -22px 0 0 rgba(0,0,0,.18);
                }
                .store-opening-shell.is-showcase .store-spotlight-products {
                    position: relative;
                    z-index: 6;
                    height: 100%;
                    min-height: 0;
                    align-items: flex-end;
                    justify-content: center;
                    overflow: visible;
                }
                .store-opening-shell.is-showcase .store-spotlight-products::before {
                    display: none;
                }
                .store-opening-shell.is-showcase .store-spotlight-product {
                    width: clamp(150px, 15vw, 220px);
                    height: min(60%, 300px);
                    overflow: visible;
                    color: #171717;
                    background: transparent !important;
                    border: 0 !important;
                    border-radius: 0;
                    box-shadow: none !important;
                    transform-origin: bottom center;
                }
                .store-opening-shell.is-showcase .store-spotlight-product.product-1 {
                    width: clamp(238px, 22vw, 330px);
                    height: min(90%, 445px);
                    z-index: 7;
                    transform: translateY(14px);
                }
                .store-opening-shell.is-showcase .store-spotlight-product.product-2 {
                    z-index: 4;
                    margin-right: clamp(-48px, -3.6vw, -24px);
                    transform: rotate(-2deg) translateY(-14px);
                }
                .store-opening-shell.is-showcase .store-spotlight-product.product-3 {
                    z-index: 4;
                    margin-left: clamp(-48px, -3.6vw, -24px);
                    transform: rotate(2deg) translateY(-14px);
                }
                .store-opening-shell.is-showcase .store-spotlight-product.product-2:hover {
                    transform: rotate(-1deg) translateY(-22px);
                }
                .store-opening-shell.is-showcase .store-spotlight-product.product-3:hover {
                    transform: rotate(1deg) translateY(-22px);
                }
                .store-opening-shell.is-showcase .store-spotlight-product.product-1:hover {
                    transform: translateY(6px);
                }
                .store-opening-shell.is-showcase .store-spotlight-media {
                    inset: 0;
                    overflow: visible;
                    background: transparent !important;
                    border: 0 !important;
                    border-radius: 0;
                }
                .store-opening-shell.is-showcase .store-spotlight-media img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                    object-position: center bottom;
                    filter: drop-shadow(0 22px 26px rgba(0,0,0,.23));
                    user-select: none;
                }
                .store-opening-shell.is-showcase .store-spotlight-media > svg {
                    width: 42%;
                    height: 42%;
                    color: #1f2937;
                    filter: drop-shadow(0 18px 22px rgba(0,0,0,.16));
                }
                .store-opening-shell.is-showcase .store-spotlight-product-copy {
                    display: none;
                }
                .store-showcase-arrow {
                    display: none;
                }
                .store-opening-shell.is-showcase .store-showcase-arrow {
                    position: absolute;
                    top: 58%;
                    z-index: 9;
                    width: clamp(36px, 3vw, 46px);
                    height: clamp(36px, 3vw, 46px);
                    border-radius: 999px;
                    display: grid;
                    place-items: center;
                    color: ${accent};
                    background: #fff;
                    box-shadow: 0 14px 28px rgba(0,0,0,.16);
                    pointer-events: none;
                }
                .store-opening-shell.is-showcase .store-showcase-arrow svg {
                    width: 23px;
                    height: 23px;
                }
                .store-opening-shell.is-showcase .store-showcase-arrow.arrow-left {
                    right: -18px;
                }
                .store-opening-shell.is-showcase .store-showcase-arrow.arrow-right {
                    left: -18px;
                }
                .store-opening-shell.is-showcase .store-hero-discovery-dock {
                    position: absolute;
                    left: clamp(14px, 2vw, 28px);
                    right: clamp(14px, 2vw, 28px);
                    bottom: clamp(12px, 1.6vw, 22px);
                    z-index: 4;
                    width: auto;
                    min-height: clamp(102px, 16%, 146px);
                    margin: 0;
                    padding: clamp(16px, 2vw, 26px) clamp(20px, 2.7vw, 38px);
                    display: grid;
                    grid-template-columns: minmax(240px, .95fr) minmax(250px, .75fr) minmax(220px, .85fr);
                    align-items: end;
                    gap: clamp(18px, 3vw, 46px);
                    color: #fff;
                    background: #282828 !important;
                    border: 0 !important;
                    border-radius: clamp(25px, 2.4vw, 36px);
                    box-shadow: 0 20px 38px rgba(0,0,0,.22) !important;
                    overflow: visible;
                }
                .store-opening-shell.is-showcase .store-hero-discovery-dock::before {
                    content: '';
                    position: absolute;
                    left: 50%;
                    top: -1px;
                    z-index: 0;
                    width: clamp(260px, 28vw, 420px);
                    height: clamp(92px, 10vw, 142px);
                    transform: translateX(-50%);
                    background: #fbfbfa;
                    border-radius: 0 0 999px 999px;
                    pointer-events: none;
                }
                .store-opening-shell.is-showcase .store-hero-discovery-dock > * {
                    position: relative;
                    z-index: 1;
                }
                .store-opening-shell.is-showcase .store-dock-categories {
                    align-items: center;
                    gap: 14px;
                    max-width: 280px;
                    flex-wrap: wrap;
                    overflow: visible;
                }
                .store-opening-shell.is-showcase .store-dock-categories::before {
                    content: 'Categorias';
                    flex: 0 0 100%;
                    min-width: 0;
                    color: rgba(255,255,255,.84);
                    font-size: 11px;
                    font-weight: 800;
                }
                .store-opening-shell.is-showcase .store-dock-categories button {
                    color: #fff !important;
                }
                .store-opening-shell.is-showcase .store-dock-categories button > span {
                    width: clamp(34px, 3vw, 44px);
                    height: clamp(34px, 3vw, 44px);
                    color: #262626 !important;
                    background: #fff !important;
                    box-shadow: inset 0 0 0 1px rgba(0,0,0,.05);
                }
                .store-opening-shell.is-showcase .store-dock-categories button > small {
                    display: none;
                }
                .store-opening-shell.is-showcase .store-dock-search {
                    align-self: end;
                    justify-self: center;
                    width: min(clamp(160px, 18vw, 280px), 100%);
                    height: clamp(28px, 2.3vw, 36px);
                    color: #fff;
                    background: ${accent} !important;
                    border: 0 !important;
                    border-radius: 999px;
                    box-shadow: 0 12px 24px ${accent}33;
                }
                .store-opening-shell.is-showcase .store-dock-search::after {
                    content: 'GO';
                    width: 34px;
                    height: 22px;
                    border-radius: 999px;
                    display: grid;
                    place-items: center;
                    color: #272727;
                    background: #fff;
                    font-size: 8px;
                    font-weight: 950;
                }
                .store-opening-shell.is-showcase .store-dock-search svg,
                .store-opening-shell.is-showcase .store-dock-search input,
                .store-opening-shell.is-showcase .store-dock-search input::placeholder {
                    color: #fff !important;
                }
                .store-opening-shell.is-showcase .store-dock-summary {
                    align-self: center;
                    justify-items: end;
                    color: #fff;
                }
                .store-opening-shell.is-showcase .store-dock-summary span {
                    color: rgba(255,255,255,.78) !important;
                    letter-spacing: 0;
                    text-transform: none;
                }
                .store-opening-shell.is-showcase .store-dock-summary strong {
                    color: #fff;
                    font-size: 13px;
                }
                .store-opening-shell.is-showcase .store-dock-summary small {
                    color: rgba(255,255,255,.62) !important;
                }
                .store-opening-shell.is-showcase .store-showcase-rail {
                    left: 0;
                    width: 38px;
                    padding: 11px 6px;
                    display: grid;
                    background: #282828;
                    border-radius: 0 16px 16px 0;
                }
                .store-scheme-light .store-benefit-strip,
                .store-scheme-light .store-footer {
                    color: #171717;
                }
                @media (max-width: 820px) {
                    .store-opening-shell.is-showcase {
                        width: calc(100% - 20px);
                        height: min(720px, calc(100dvh - 20px));
                        min-height: 580px;
                        aspect-ratio: auto;
                        margin: 10px auto 20px;
                        border-radius: 28px;
                    }
                    .store-opening-shell.is-showcase .store-main-header-inner {
                        width: calc(100% - 34px);
                        grid-template-columns: minmax(140px, .8fr) minmax(220px, 1fr) auto;
                        gap: 14px;
                    }
                    .store-opening-shell.is-showcase .store-header-category-nav {
                        gap: 18px;
                    }
                    .store-opening-shell.is-showcase .store-hero-inner {
                        padding-left: 18px;
                        padding-right: 18px;
                    }
                    .store-opening-shell.is-showcase .store-hero-spotlight {
                        grid-template-columns: minmax(0, 1fr);
                        top: 92px;
                        bottom: 112px;
                    }
                    .store-opening-shell.is-showcase .store-spotlight-note,
                    .store-opening-shell.is-showcase .store-showcase-rail {
                        display: none;
                    }
                    .store-opening-shell.is-showcase .store-spotlight-product {
                        width: 136px;
                        height: min(58%, 270px);
                    }
                    .store-opening-shell.is-showcase .store-spotlight-product.product-1 {
                        width: 218px;
                        height: min(88%, 360px);
                    }
                    .store-opening-shell.is-showcase .store-hero-discovery-dock {
                        grid-template-columns: minmax(220px, 1fr) minmax(220px, 1fr);
                    }
                    .store-opening-shell.is-showcase .store-dock-summary {
                        display: none;
                    }
                }
                @media (max-width: 640px) {
                    .store-showcase-stage {
                        padding: 0;
                    }
                    .store-opening-shell.is-showcase {
                        width: 100%;
                        height: auto;
                        min-height: 100dvh;
                        margin: 0 0 30px;
                        border: 0;
                        border-radius: 0 0 28px 28px;
                        box-shadow: none;
                    }
                    .store-opening-shell.is-showcase .store-main-header {
                        min-height: 64px;
                    }
                    .store-opening-shell.is-showcase .store-main-header-inner {
                        width: calc(100% - 24px);
                        min-height: 64px;
                        grid-template-columns: minmax(0, 1fr) auto;
                        grid-template-rows: 44px;
                        padding: 0;
                    }
                    .store-opening-shell.is-showcase .store-header-discovery,
                    .store-opening-shell.is-showcase .store-support-button {
                        display: none;
                    }
                    .store-opening-shell.is-showcase .store-hero {
                        height: auto;
                        min-height: calc(100dvh - 64px);
                    }
                    .store-opening-shell.is-showcase .store-hero-inner {
                        min-height: calc(100dvh - 64px);
                        padding: 6px 10px 142px !important;
                    }
                    .store-opening-shell.is-showcase .store-hero-copy {
                        min-height: 86px;
                    }
                    .store-opening-shell.is-showcase .store-hero-copy h1 {
                        font-size: clamp(31px, 11vw, 44px) !important;
                    }
                    .store-opening-shell.is-showcase .store-hero-spotlight {
                        left: 0;
                        right: 0;
                        top: 88px;
                        bottom: 126px;
                    }
                    .store-opening-shell.is-showcase .store-spotlight-products {
                        min-height: 0;
                    }
                    .store-opening-shell.is-showcase .store-spotlight-product {
                        width: 112px;
                        height: min(58%, 220px);
                    }
                    .store-opening-shell.is-showcase .store-spotlight-product.product-1 {
                        width: 174px;
                        height: min(88%, 300px);
                        transform: translateY(14px);
                    }
                    .store-opening-shell.is-showcase .store-spotlight-product.product-2 {
                        margin-right: -30px;
                        transform: rotate(-3deg) translateY(-12px);
                    }
                    .store-opening-shell.is-showcase .store-spotlight-product.product-3 {
                        margin-left: -30px;
                        transform: rotate(3deg) translateY(-12px);
                    }
                    .store-opening-shell.is-showcase .store-showcase-arrow {
                        width: 36px;
                        height: 36px;
                    }
                    .store-opening-shell.is-showcase .store-hero-discovery-dock {
                        left: 10px;
                        right: 10px;
                        bottom: 12px;
                        min-height: 118px;
                        grid-template-columns: 1fr;
                        align-items: center;
                        padding: 16px;
                        border-radius: 26px;
                    }
                    .store-opening-shell.is-showcase .store-hero-discovery-dock::before {
                        width: 210px;
                        height: 92px;
                    }
                    .store-opening-shell.is-showcase .store-dock-categories {
                        justify-content: center;
                    }
                    .store-opening-shell.is-showcase .store-dock-categories::before {
                        display: none;
                    }
                    .store-opening-shell.is-showcase .store-dock-search {
                        width: min(240px, 100%);
                    }
                }

                /* Premium storefront hero: optimized for real product photography. */
                .store-showcase-stage {
                    padding: clamp(16px, 2.2vw, 28px);
                    background:
                        radial-gradient(circle at 18% 10%, rgba(255,255,255,.88), transparent 28%),
                        #e9e9e7;
                }
                .store-opening-shell.is-showcase {
                    width: min(1480px, 100%);
                    height: min(820px, calc(100dvh - 40px));
                    min-height: 680px;
                    aspect-ratio: auto;
                    margin: 0 auto;
                    overflow: hidden;
                    background: #fbfaf8;
                    border: 1px solid rgba(20,20,20,.07);
                    border-radius: 38px;
                    box-shadow: 0 28px 60px rgba(15,23,42,.20), 0 6px 0 rgba(15,23,42,.10);
                }
                .store-opening-shell.is-showcase .store-main-header,
                .store-opening-shell.is-showcase .store-main-header-inner {
                    min-height: 76px;
                }
                .store-opening-shell.is-showcase .store-main-header {
                    position: relative;
                    background: #fbfaf8 !important;
                    border: 0;
                }
                .store-opening-shell.is-showcase .store-main-header-inner {
                    width: 100%;
                    padding: 0 clamp(28px, 3.4vw, 52px);
                    grid-template-columns: minmax(190px, .82fr) minmax(340px, 1.25fr) minmax(270px, .85fr);
                    gap: clamp(14px, 2vw, 30px);
                }
                .store-opening-shell.is-showcase .store-brand-mark {
                    width: 32px;
                    height: 32px;
                }
                .store-opening-shell.is-showcase .store-brand-name {
                    font-size: 13px;
                }
                .store-opening-shell.is-showcase .store-header-category-nav {
                    gap: clamp(22px, 3vw, 48px);
                }
                .store-opening-shell.is-showcase .store-header-category-nav button {
                    font-size: 11px;
                }
                .store-opening-shell.is-showcase .store-support-button,
                .store-opening-shell.is-showcase .store-cart-button,
                .store-opening-shell.is-showcase .store-account-button {
                    height: 34px;
                    font-size: 10px;
                }
                .store-opening-shell.is-showcase .store-cart-button {
                    width: 34px;
                }
                .store-opening-shell.is-showcase .store-hero {
                    position: relative;
                    height: calc(100% - 76px);
                    min-height: 0;
                    overflow: hidden;
                    background:
                        radial-gradient(circle at 82% 24%, rgba(255,255,255,.98), transparent 25%),
                        linear-gradient(135deg, #fbfaf8 0%, #f5f3ee 100%) !important;
                }
                .store-opening-shell.is-showcase .store-hero-inner {
                    display: none !important;
                }
                .store-opening-shell.is-showcase .store-showcase-rail {
                    top: 51%;
                    left: 0;
                    z-index: 30;
                    width: 38px;
                    padding: 10px 6px;
                    display: grid;
                    background: #242424;
                    border-radius: 0 15px 15px 0;
                    box-shadow: 0 14px 28px rgba(0,0,0,.16);
                }
                .store-premium-hero {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    padding: clamp(42px, 5vh, 60px) clamp(42px, 4.4vw, 66px) 154px;
                    display: grid;
                    grid-template-columns: minmax(0, .88fr) minmax(500px, 1.12fr);
                    align-items: center;
                    gap: clamp(40px, 5vw, 80px);
                }
                .store-premium-copy {
                    position: relative;
                    z-index: 8;
                    min-width: 0;
                    padding-left: clamp(8px, 1.2vw, 18px);
                }
                .store-premium-eyebrow {
                    max-width: 100%;
                    min-height: 30px;
                    border-radius: 999px;
                    padding: 0 12px;
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                    overflow: hidden;
                    font-size: 9px;
                    font-weight: 900;
                    letter-spacing: .08em;
                    text-transform: uppercase;
                    white-space: nowrap;
                    text-overflow: ellipsis;
                }
                .store-premium-copy h1 {
                    max-width: 650px;
                    margin: 20px 0 18px;
                    display: -webkit-box;
                    overflow: hidden;
                    color: #181818;
                    font-size: clamp(44px, 4.4vw, 68px);
                    line-height: .99;
                    letter-spacing: -.052em;
                    font-weight: 920;
                    text-transform: none;
                    text-wrap: balance;
                    -webkit-box-orient: vertical;
                    -webkit-line-clamp: 3;
                }
                .store-premium-copy > p {
                    max-width: 560px;
                    margin: 0;
                    color: #777672;
                    font-size: 14px;
                    line-height: 1.7;
                    text-wrap: balance;
                }
                .store-premium-actions {
                    margin-top: 28px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    flex-wrap: wrap;
                }
                .store-premium-actions button {
                    min-height: 46px;
                    border-radius: 14px;
                    padding: 0 18px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 9px;
                    font-size: 11px;
                    font-weight: 900;
                    cursor: pointer;
                    transition: transform .2s ease, box-shadow .2s ease;
                }
                .store-premium-actions button:hover {
                    transform: translateY(-2px);
                }
                .store-premium-primary {
                    color: #fff;
                    border: 0;
                }
                .store-premium-secondary {
                    color: #252525;
                    background: rgba(255,255,255,.72);
                    border: 1px solid rgba(20,20,20,.10);
                    backdrop-filter: blur(12px);
                }
                .store-premium-assurances {
                    margin-top: 28px;
                    display: flex;
                    align-items: center;
                    gap: 18px;
                    flex-wrap: wrap;
                }
                .store-premium-assurances > span {
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                    color: #777672;
                    font-size: 9px;
                }
                .store-premium-assurances svg {
                    width: 14px;
                    height: 14px;
                }
                .store-premium-assurances strong {
                    color: #555451;
                    font-weight: 800;
                }
                .store-premium-gallery {
                    position: relative;
                    z-index: 7;
                    width: 100%;
                    height: min(500px, 100%);
                    min-height: 430px;
                    isolation: isolate;
                }
                .store-premium-gallery-glow {
                    position: absolute;
                    right: 5%;
                    top: 7%;
                    width: 62%;
                    aspect-ratio: 1;
                    z-index: -2;
                    border-radius: 999px;
                    opacity: .13;
                    filter: blur(70px);
                }
                .store-premium-gallery::before {
                    content: '';
                    position: absolute;
                    right: 1%;
                    top: 8%;
                    width: 63%;
                    height: 78%;
                    z-index: -1;
                    border: 1px solid rgba(20,20,20,.06);
                    border-radius: 44% 56% 48% 52% / 48% 43% 57% 52%;
                    background: rgba(255,255,255,.56);
                    transform: rotate(-5deg);
                }
                .store-premium-gallery-label {
                    position: absolute;
                    top: 0;
                    left: 2%;
                    z-index: 8;
                    display: grid;
                    gap: 4px;
                }
                .store-premium-gallery-label span {
                    font-size: 8px;
                    font-weight: 950;
                    letter-spacing: .12em;
                }
                .store-premium-gallery-label strong {
                    color: #292929;
                    font-size: 15px;
                }
                .store-premium-product {
                    position: absolute;
                    padding: 0;
                    overflow: hidden;
                    color: #171717;
                    background: #fff;
                    border: 1px solid rgba(20,20,20,.08);
                    border-radius: 24px;
                    box-shadow: 0 24px 55px rgba(15,23,42,.14);
                    cursor: pointer;
                    text-align: left;
                    transition: transform .25s ease, box-shadow .25s ease;
                }
                .store-premium-product:hover {
                    box-shadow: 0 30px 65px rgba(15,23,42,.19);
                }
                .store-premium-product.product-1 {
                    right: 2%;
                    top: 7%;
                    z-index: 5;
                    width: 56%;
                    height: 84%;
                    transform: rotate(1.2deg);
                }
                .store-premium-product.product-1:hover {
                    transform: rotate(.3deg) translateY(-6px);
                }
                .store-premium-product.product-2 {
                    left: 1%;
                    top: 20%;
                    z-index: 4;
                    width: 38%;
                    height: 39%;
                    transform: rotate(-4deg);
                }
                .store-premium-product.product-2:hover {
                    transform: rotate(-2deg) translateY(-5px);
                }
                .store-premium-product.product-3 {
                    left: 12%;
                    bottom: 2%;
                    z-index: 6;
                    width: 39%;
                    height: 35%;
                    transform: rotate(3deg);
                }
                .store-premium-product.product-3:hover {
                    transform: rotate(1deg) translateY(-5px);
                }
                .store-premium-product-media {
                    position: absolute;
                    inset: 0 0 86px;
                    display: grid;
                    place-items: center;
                    overflow: hidden;
                }
                .store-premium-product-media img {
                    width: 100%;
                    height: 100%;
                    display: block;
                    object-fit: cover;
                    transition: transform .35s ease;
                }
                .store-premium-product:hover .store-premium-product-media img {
                    transform: scale(1.035);
                }
                .store-premium-product-media > svg {
                    width: 44px;
                    height: 44px;
                    opacity: .36;
                }
                .store-premium-product-copy {
                    position: absolute;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    min-height: 86px;
                    padding: 13px 48px 13px 16px;
                    display: grid;
                    align-content: center;
                    gap: 3px;
                    background: rgba(255,255,255,.97);
                }
                .store-premium-product-copy small {
                    font-size: 7px;
                    font-weight: 950;
                    letter-spacing: .1em;
                }
                .store-premium-product-copy strong {
                    overflow: hidden;
                    color: #242424;
                    font-size: 13px;
                    line-height: 1.2;
                    white-space: nowrap;
                    text-overflow: ellipsis;
                }
                .store-premium-product-copy em {
                    color: #65645f;
                    font-size: 11px;
                    font-style: normal;
                    font-weight: 850;
                }
                .store-premium-product-arrow {
                    position: absolute;
                    right: 14px;
                    bottom: 23px;
                    z-index: 4;
                    width: 30px;
                    height: 30px;
                    border-radius: 999px;
                    display: grid;
                    place-items: center;
                    background: #f4f3f0;
                }
                .store-premium-product.product-2 .store-premium-product-media,
                .store-premium-product.product-3 .store-premium-product-media {
                    inset: 0 0 66px;
                }
                .store-premium-product.product-2 .store-premium-product-copy,
                .store-premium-product.product-3 .store-premium-product-copy {
                    min-height: 66px;
                    padding-top: 9px;
                    padding-bottom: 9px;
                }
                .store-premium-product.product-2 .store-premium-product-copy small,
                .store-premium-product.product-3 .store-premium-product-copy small,
                .store-premium-product.product-2 .store-premium-product-copy em,
                .store-premium-product.product-3 .store-premium-product-copy em,
                .store-premium-product.product-2 .store-premium-product-arrow,
                .store-premium-product.product-3 .store-premium-product-arrow {
                    display: none;
                }
                .store-premium-gallery.count-1 .store-premium-product.product-1 {
                    right: 9%;
                    width: 68%;
                }
                .store-premium-gallery.count-2 .store-premium-product.product-1 {
                    right: 2%;
                    width: 61%;
                }
                .store-premium-gallery.count-2 .store-premium-product.product-2 {
                    top: 28%;
                    width: 42%;
                    height: 43%;
                }
                .store-premium-empty {
                    position: absolute;
                    inset: 13% 8% 8% 16%;
                    border: 1px dashed currentColor;
                    border-radius: 28px;
                    display: grid;
                    place-items: center;
                    align-content: center;
                    gap: 10px;
                    text-align: center;
                }
                .store-premium-empty svg {
                    width: 48px;
                    height: 48px;
                }
                .store-premium-empty small {
                    max-width: 270px;
                    color: #74736f;
                    line-height: 1.5;
                }
                .store-premium-dock {
                    position: absolute;
                    left: clamp(22px, 2.6vw, 38px);
                    right: clamp(22px, 2.6vw, 38px);
                    bottom: 24px;
                    z-index: 20;
                    min-height: 104px;
                    padding: 16px clamp(20px, 2.4vw, 34px);
                    display: grid;
                    grid-template-columns: minmax(270px, .95fr) minmax(300px, 1.2fr) minmax(200px, .7fr);
                    align-items: center;
                    gap: clamp(22px, 3vw, 48px);
                    color: #fff;
                    background: #242424;
                    border: 1px solid rgba(255,255,255,.05);
                    border-radius: 26px;
                    box-shadow: 0 20px 40px rgba(0,0,0,.24);
                }
                .store-premium-dock-title {
                    display: block;
                    margin-bottom: 9px;
                    color: rgba(255,255,255,.58);
                    font-size: 8px;
                    font-weight: 900;
                    letter-spacing: .08em;
                    text-transform: uppercase;
                }
                .store-premium-categories > div {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .store-premium-categories button {
                    min-width: 0;
                    padding: 0;
                    display: flex;
                    align-items: center;
                    gap: 7px;
                    color: #fff;
                    background: transparent;
                    border: 0;
                    cursor: pointer;
                }
                .store-premium-categories button > span {
                    width: 34px;
                    height: 34px;
                    border-radius: 999px;
                    display: grid;
                    place-items: center;
                    flex: 0 0 auto;
                    color: #222;
                    background: #fff;
                    font-size: 10px;
                    font-weight: 950;
                }
                .store-premium-categories button > small {
                    max-width: 64px;
                    overflow: hidden;
                    font-size: 8px;
                    font-weight: 750;
                    white-space: nowrap;
                    text-overflow: ellipsis;
                }
                .store-premium-search {
                    height: 42px;
                    padding: 0 7px 0 14px;
                    display: flex;
                    align-items: center;
                    gap: 9px;
                    background: rgba(255,255,255,.10);
                    border: 1px solid rgba(255,255,255,.09);
                    border-radius: 999px;
                    transition: border-color .2s ease, background .2s ease;
                }
                .store-premium-search:focus-within {
                    background: rgba(255,255,255,.14);
                    border-color: rgba(255,255,255,.25);
                }
                .store-premium-search > svg {
                    flex: 0 0 auto;
                    color: rgba(255,255,255,.70);
                }
                .store-premium-search input {
                    width: 100%;
                    min-width: 0;
                    color: #fff;
                    background: transparent;
                    border: 0;
                    outline: 0;
                    font-size: 10px;
                    font-weight: 700;
                }
                .store-premium-search input::placeholder {
                    color: rgba(255,255,255,.52);
                }
                .store-premium-search button {
                    width: 30px;
                    height: 30px;
                    border-radius: 999px;
                    display: grid;
                    place-items: center;
                    flex: 0 0 auto;
                    color: #fff;
                    border: 0;
                    cursor: pointer;
                }
                .store-premium-summary {
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    gap: 10px;
                }
                .store-premium-summary i {
                    width: 38px;
                    height: 38px;
                    border-radius: 12px;
                    display: grid;
                    place-items: center;
                    flex: 0 0 auto;
                    font-style: normal;
                }
                .store-premium-summary > span {
                    display: grid;
                    gap: 3px;
                }
                .store-premium-summary strong {
                    font-size: 10px;
                }
                .store-premium-summary small {
                    color: rgba(255,255,255,.54);
                    font-size: 8px;
                }
                @media (max-width: 1120px) {
                    .store-opening-shell.is-showcase .store-main-header-inner {
                        grid-template-columns: minmax(160px, .75fr) minmax(280px, 1fr) minmax(230px, .75fr);
                    }
                    .store-premium-hero {
                        grid-template-columns: minmax(0, .82fr) minmax(450px, 1.18fr);
                        gap: 30px;
                        padding-left: 42px;
                        padding-right: 42px;
                    }
                    .store-premium-copy h1 {
                        font-size: clamp(40px, 4.7vw, 58px);
                    }
                    .store-premium-dock {
                        grid-template-columns: minmax(230px, .85fr) minmax(270px, 1.15fr);
                    }
                    .store-premium-summary {
                        display: none;
                    }
                }
                @media (max-width: 900px) {
                    .store-showcase-stage {
                        padding: 10px;
                    }
                    .store-opening-shell.is-showcase {
                        width: 100%;
                        height: min(760px, calc(100dvh - 20px));
                        min-height: 690px;
                        border-radius: 28px;
                    }
                    .store-opening-shell.is-showcase .store-main-header-inner {
                        grid-template-columns: minmax(0, 1fr) auto;
                        padding-left: 24px;
                        padding-right: 24px;
                    }
                    .store-opening-shell.is-showcase .store-header-discovery {
                        display: none;
                    }
                    .store-premium-hero {
                        grid-template-columns: minmax(0, .9fr) minmax(380px, 1.1fr);
                        gap: 20px;
                        padding: 36px 30px 140px;
                    }
                    .store-premium-copy h1 {
                        margin-top: 16px;
                        font-size: clamp(36px, 5.4vw, 48px);
                    }
                    .store-premium-copy > p {
                        font-size: 12px;
                    }
                    .store-premium-assurances > span:last-child {
                        display: none;
                    }
                    .store-premium-gallery {
                        min-height: 400px;
                    }
                    .store-premium-dock {
                        left: 18px;
                        right: 18px;
                        bottom: 18px;
                        min-height: 100px;
                        grid-template-columns: minmax(210px, .8fr) minmax(260px, 1.2fr);
                    }
                }
                @media (max-width: 720px) {
                    .store-showcase-stage {
                        padding: 0;
                    }
                    .store-opening-shell.is-showcase {
                        height: auto;
                        min-height: 920px;
                        border: 0;
                        border-radius: 0 0 28px 28px;
                        box-shadow: none;
                    }
                    .store-opening-shell.is-showcase .store-main-header,
                    .store-opening-shell.is-showcase .store-main-header-inner {
                        min-height: 64px;
                    }
                    .store-opening-shell.is-showcase .store-main-header-inner {
                        padding-left: 16px;
                        padding-right: 16px;
                    }
                    .store-opening-shell.is-showcase .store-support-button {
                        display: none;
                    }
                    .store-opening-shell.is-showcase .store-hero {
                        height: auto;
                        min-height: 856px;
                    }
                    .store-opening-shell.is-showcase .store-showcase-rail {
                        display: none;
                    }
                    .store-premium-hero {
                        min-height: 856px;
                        padding: 32px 18px 174px;
                        grid-template-columns: minmax(0, 1fr);
                        grid-template-rows: auto 390px;
                        align-content: start;
                        gap: 22px;
                    }
                    .store-premium-copy {
                        padding: 0 6px;
                        text-align: center;
                    }
                    .store-premium-eyebrow {
                        max-width: min(100%, 300px);
                    }
                    .store-premium-copy h1 {
                        max-width: 540px;
                        margin: 16px auto 14px;
                        font-size: clamp(35px, 10vw, 48px);
                    }
                    .store-premium-copy > p {
                        max-width: 500px;
                        margin: 0 auto;
                    }
                    .store-premium-actions,
                    .store-premium-assurances {
                        justify-content: center;
                    }
                    .store-premium-actions {
                        margin-top: 20px;
                    }
                    .store-premium-assurances {
                        margin-top: 18px;
                    }
                    .store-premium-gallery {
                        width: min(520px, 100%);
                        height: 390px;
                        min-height: 0;
                        margin: 0 auto;
                    }
                    .store-premium-gallery-label {
                        left: 4%;
                    }
                    .store-premium-dock {
                        left: 10px;
                        right: 10px;
                        bottom: 12px;
                        min-height: 144px;
                        padding: 16px;
                        grid-template-columns: minmax(0, 1fr);
                        gap: 12px;
                        border-radius: 22px;
                    }
                    .store-premium-categories {
                        display: none;
                    }
                    .store-premium-summary {
                        display: flex;
                        justify-content: center;
                    }
                    .store-premium-search {
                        width: min(420px, 100%);
                        margin: 0 auto;
                    }
                }
                @media (max-width: 460px) {
                    .store-opening-shell.is-showcase {
                        min-height: 880px;
                    }
                    .store-opening-shell.is-showcase .store-account-button span,
                    .store-opening-shell.is-showcase .store-brand-check {
                        display: none;
                    }
                    .store-opening-shell.is-showcase .store-account-button {
                        width: 34px;
                        padding: 0;
                    }
                    .store-opening-shell.is-showcase .store-hero,
                    .store-premium-hero {
                        min-height: 816px;
                    }
                    .store-premium-hero {
                        padding-top: 26px;
                        grid-template-rows: auto 330px;
                    }
                    .store-premium-copy h1 {
                        font-size: clamp(32px, 10.5vw, 42px);
                    }
                    .store-premium-copy > p {
                        display: -webkit-box;
                        overflow: hidden;
                        -webkit-box-orient: vertical;
                        -webkit-line-clamp: 3;
                    }
                    .store-premium-actions button {
                        min-height: 42px;
                    }
                    .store-premium-assurances {
                        gap: 12px;
                    }
                    .store-premium-assurances > span:last-child {
                        display: none;
                    }
                    .store-premium-gallery {
                        height: 330px;
                    }
                    .store-premium-gallery-label {
                        display: none;
                    }
                    .store-premium-product.product-1 {
                        width: 61%;
                    }
                    .store-premium-product.product-2 {
                        width: 42%;
                    }
                    .store-premium-product.product-3 {
                        left: 8%;
                        width: 43%;
                    }
                    .store-premium-product-copy strong {
                        font-size: 11px;
                    }
                }

            `}</style>
        </div>
    );
}

function categoryButtonStyle(active: boolean, accent: string, theme: typeof templateStyles.creator): React.CSSProperties {
    return {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        border: `1px solid ${active ? accent : theme.border}`,
        background: active ? accent : theme.surface,
        color: active ? 'white' : theme.text,
        borderRadius: 999,
        padding: '10px 16px',
        fontSize: 13,
        fontWeight: 850,
        whiteSpace: 'nowrap',
        cursor: 'pointer'
    };
}
