'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { storeAPI } from '@/lib/api';
import { FiArrowRight, FiBookOpen, FiCheckCircle, FiCreditCard, FiGrid, FiHeadphones, FiInstagram, FiLock, FiMail, FiPackage, FiSearch, FiShield, FiShoppingBag, FiUser, FiZap } from 'react-icons/fi';
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

    const template = (store?.template || 'creator') as TemplateKey;
    const theme = templateStyles[template] || templateStyles.creator;
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
    const pageBackground = background.mode === 'image' && background.image_url
        ? `linear-gradient(rgba(9,9,11,${background.overlay / 100}), rgba(9,9,11,${background.overlay / 100})), url("${background.image_url}") center/cover fixed`
        : undefined;
    const pageBackgroundColor = background.mode === 'color' ? background.color : theme.bg;

    return (
        <div id="top" style={{ minHeight: '100vh', background: pageBackground || pageBackgroundColor, color: theme.text, fontFamily: 'Inter, Outfit, sans-serif' }}>
            <header
                className="store-main-header"
                style={{
                    color: theme.text,
                    background: template === 'academy' ? 'rgba(255,255,255,.90)' : 'rgba(7,9,14,.88)',
                    borderColor: theme.border
                }}
            >
                <div className="store-main-header-inner">
                    <button className="store-brand" onClick={() => router.push(storeHomePath)} style={{ color: theme.text }}>
                        <span className="store-brand-mark" style={{ background: `linear-gradient(145deg, ${accent}, ${accent}99)` }}>{storeInitials}</span>
                        <span className="store-brand-name">{store.name || slug}</span>
                        <FiCheckCircle className="store-brand-check" style={{ color: accent }} />
                    </button>

                    <label className="store-header-search" style={{ background: theme.surface, borderColor: theme.border }}>
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
                    </label>

                    <div className="store-header-actions">
                        {supportUrl && (
                            <button className="store-support-button" onClick={() => handleNavClick(supportUrl)} style={{ color: theme.text, borderColor: theme.border, background: theme.surface }}>
                                <FiHeadphones /> <span>Atendimento</span>
                            </button>
                        )}
                        <button className="store-cart-button" onClick={() => router.push(`/store/${slug}/cart`)} style={{ color: theme.text, borderColor: theme.border, background: theme.surface }} aria-label="Abrir carrinho">
                            <FiShoppingBag />
                            {totalItems > 0 && <span style={{ background: accent }}>{totalItems}</span>}
                        </button>
                        <button className="store-account-button" onClick={() => router.push('/login')} style={{ background: accent }}>
                            <FiUser /> <span>Minha conta</span>
                        </button>
                    </div>
                </div>
            </header>

            <section className={`store-hero hero-${template}`} style={{ background: heroBg, borderBottomColor: theme.border }}>
                <div className="store-hero-grid" style={{ opacity: template === 'academy' ? .18 : .32 }} />
                <div className="store-hero-orb store-hero-orb-one" style={{ background: accent }} />
                <div className="store-hero-orb store-hero-orb-two" style={{ background: accent }} />
                <div className="store-shell store-hero-inner">
                    <div className="store-trust-badges">
                        <span style={{ color: accent, borderColor: `${accent}55`, background: `${accent}10` }}><FiZap /> Entrega digital</span>
                        <span style={{ color: '#21c77a', borderColor: 'rgba(33,199,122,.30)', background: 'rgba(33,199,122,.08)' }}><FiShield /> Compra segura</span>
                        <span style={{ color: theme.text, borderColor: theme.border, background: theme.surface }}><FiCheckCircle /> Loja protegida</span>
                    </div>

                    <div className="store-hero-logo" style={{ borderColor: `${accent}55`, background: `linear-gradient(145deg, ${accent}, ${theme.surfaceAlt})`, boxShadow: `0 20px 55px ${accent}35` }}>
                        <span>{storeInitials}</span>
                    </div>

                    <div className="store-welcome-label" style={{ color: theme.muted }}>
                        Bem-vindo à <strong style={{ color: accent }}>{store.name || slug}</strong>
                    </div>
                    <h1>{store.headline || `Descubra o melhor da ${store.name || 'nossa loja'}`}</h1>
                    <p style={{ color: theme.muted }}>
                        {store.description || 'Produtos digitais selecionados, compra protegida e acesso online em poucos passos.'}
                    </p>

                    <div className="store-hero-actions">
                        <button className="store-hero-primary" onClick={() => document.getElementById('store-products')?.scrollIntoView({ behavior: 'smooth' })} style={{ background: accent, boxShadow: `0 14px 34px ${accent}42` }}>
                            {store.cta_text || 'Ver produtos'} <FiArrowRight />
                        </button>
                        {categories.length > 0 && (
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
                        <span><i style={{ color: accent, background: `${accent}18` }}><FiZap /></i> Acesso online</span>
                        <span className="assurance-divider" style={{ background: theme.border }} />
                        <span><i style={{ color: '#21c77a', background: 'rgba(33,199,122,.10)' }}><FiLock /></i> Checkout protegido</span>
                        <span className="assurance-divider" style={{ background: theme.border }} />
                        <span><i style={{ color: '#35b6ff', background: 'rgba(53,182,255,.10)' }}><FiCreditCard /></i> PIX e cartão</span>
                    </div>
                </div>
            </section>

            <section className="store-benefit-strip" style={{ background: theme.surfaceAlt, borderColor: theme.border }}>
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
            </section>

            {categories.length > 0 && !searchTerm && !activeCategory && (
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

            <main id="store-products" className="store-shell storefront-content" style={{ maxWidth: 1240, margin: '0 auto', padding: '38px 24px 76px' }}>
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
                                        <article key={product.id} className="store-product-card" style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: template === 'studio' ? 10 : 18 }}>
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
                                                    <span style={{ color: accent }}><FiBookOpen size={12} /> Produto digital</span>
                                                    <small style={{ color: theme.muted }}>{product.has_plans ? 'Planos disponíveis' : 'Acesso online'}</small>
                                                </div>
                                                <h3 className="store-product-title">{product.name}</h3>
                                                <p className="store-product-description" style={{ color: theme.muted }}>
                                                    {product.description || 'Produto digital com compra segura e entrega online.'}
                                                </p>
                                                <div className="store-product-purchase">
                                                    <div>
                                                        <small style={{ color: theme.muted }}>{product.has_plans ? 'A partir de' : 'Por apenas'}</small>
                                                        <strong>R$ {product.price_display}</strong>
                                                    </div>
                                                    <button onClick={() => openQuick(product)} style={{ background: accent }}>Comprar</button>
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
                        <button onClick={() => router.push(`/store/${slug}/cart`)} style={{ color: theme.text, borderColor: theme.border, background: theme.surfaceAlt }}>
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

            {quickProduct && (
                <div onClick={() => setQuickProduct(null)} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.72)', display: 'grid', placeItems: 'center', padding: 18, overflowY: 'auto' }}>
                    <div onClick={e => e.stopPropagation()} className="product-modal" style={{ width: 'min(980px, 96vw)', maxHeight: '92vh', overflowY: 'auto', background: theme.surface, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: 22, boxShadow: '0 30px 90px rgba(0,0,0,0.45)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '0.92fr 1.08fr', gap: 0 }} className="product-modal-grid">
                            <div style={{ minHeight: 420, background: quickProduct.image_url ? `url(${quickProduct.image_url}) center/cover` : `linear-gradient(135deg, ${accent}, ${theme.surfaceAlt})` }} />
                            <div style={{ padding: 30, display: 'flex', flexDirection: 'column', gap: 18 }}>
                                <button onClick={() => setQuickProduct(null)} style={{ alignSelf: 'flex-end', width: 34, height: 34, borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.surfaceAlt, color: theme.text, cursor: 'pointer', fontWeight: 900 }}>x</button>
                                <div>
                                    <span style={{ color: accent, fontSize: 12, fontWeight: 950, textTransform: 'uppercase' }}>Produto digital</span>
                                    <h2 style={{ fontSize: 32, lineHeight: 1.1, fontWeight: 950, marginTop: 8 }}>{quickProduct.name}</h2>
                                </div>
                                <p style={{ color: theme.muted, lineHeight: 1.75, fontSize: 14 }}>{quickProduct.description || 'Produto digital disponivel para compra online.'}</p>

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
