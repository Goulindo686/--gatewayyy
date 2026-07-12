'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { storeAPI } from '@/lib/api';
import { FiArrowRight, FiBookOpen, FiCheckCircle, FiChevronLeft, FiChevronRight, FiGrid, FiPackage, FiSearch, FiShield, FiShoppingBag, FiUser, FiZap } from 'react-icons/fi';
import { useCart } from '@/contexts/CartContext';
import toast from 'react-hot-toast';

type TemplateKey = 'creator' | 'academy' | 'studio';
const PRODUCTS_PER_PAGE = 4;

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
    const [productPage, setProductPage] = useState(1);
    const activeCategory = searchParams.get('category') || '';
    const [quickProduct, setQuickProduct] = useState<any>(null);
    const [quickPlan, setQuickPlan] = useState<any>(null);

    useEffect(() => {
        if (params.slug) loadStore(params.slug as string, activeCategory);
    }, [params.slug, activeCategory]);

    const loadStore = async (slug: string, category: string) => {
        try {
            setLoading(true);
            const { data } = await storeAPI.getStoreBySlug(slug, category);
            setStore(data.store);
            setCategories(data.categories || []);
            setProducts(data.products || []);
        } catch (err) {
            console.error(err);
            setStore(null);
        } finally {
            setLoading(false);
        }
    };

    const template = (store?.template || 'creator') as TemplateKey;
    const theme = templateStyles[template] || templateStyles.creator;
    const accent = store?.accent_color || '#6c5ce7';
    const slug = params.slug as string;
    const navLinks = [
        { label: 'Inicio', url: '#top' },
        { label: 'Loja', url: '#store-products' }
    ];

    const filteredProducts = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return products;
        return products.filter(p =>
            p.name?.toLowerCase().includes(term) ||
            p.description?.toLowerCase().includes(term)
        );
    }, [products, searchTerm]);

    useEffect(() => {
        setProductPage(1);
    }, [searchTerm, activeCategory, products.length]);

    const totalProductPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
    const safeProductPage = Math.min(productPage, totalProductPages);
    const paginatedProducts = filteredProducts.slice((safeProductPage - 1) * PRODUCTS_PER_PAGE, safeProductPage * PRODUCTS_PER_PAGE);
    const featuredProduct = filteredProducts[0];

    const handleCategoryClick = (catSlug: string) => {
        router.push(catSlug === activeCategory ? `/store/${slug}` : `/store/${slug}?category=${catSlug}`);
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

    return (
        <div id="top" style={{ minHeight: '100vh', background: theme.bg, color: theme.text, fontFamily: 'Inter, Outfit, sans-serif' }}>
            <header className="store-floating-header">
                <div
                    className="store-topbar"
                    style={{
                        color: theme.text,
                        background: template === 'academy' ? 'rgba(255,255,255,0.84)' : 'rgba(30,34,45,0.82)',
                        border: `1px solid ${template === 'academy' ? 'rgba(15,23,42,0.12)' : 'rgba(255,255,255,0.14)'}`,
                        boxShadow: template === 'academy' ? '0 18px 50px rgba(15,23,42,0.10)' : '0 18px 54px rgba(0,0,0,0.32)'
                    }}
                >
                    <button className="topbar-brand" onClick={() => router.push(`/store/${slug}`)} style={{ color: theme.text }}>
                        {store.name || slug}
                    </button>

                    <span className="topbar-divider" />

                    <nav className="topbar-nav" aria-label="Navegacao da loja">
                        {navLinks.map((link, index) => (
                            <button
                                key={`${link.label}-${index}`}
                                type="button"
                                onClick={() => handleNavClick(link.url)}
                                className="topbar-tab"
                                style={{
                                    color: theme.text,
                                    background: index === 0 ? (template === 'academy' ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.16)') : 'transparent'
                                }}
                            >
                                {link.label}
                            </button>
                        ))}
                    </nav>

                    <span className="topbar-divider optional-divider" />

                    <div className="store-search topbar-search">
                        <FiSearch size={15} style={{ color: theme.muted, flex: '0 0 auto' }} />
                        <input
                            placeholder="Buscar"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ color: theme.text }}
                        />
                    </div>

                    <button className="topbar-icon-action" onClick={() => router.push(`/store/${slug}/cart`)} style={{ background: accent, color: 'white' }} aria-label="Abrir carrinho">
                        <FiShoppingBag size={17} />
                        <span>{totalItems}</span>
                    </button>

                    <button className="store-login topbar-login" onClick={() => router.push('/login')} style={{ color: theme.text, background: template === 'academy' ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.12)' }}>
                        <FiUser size={16} /> Entrar
                    </button>
                </div>
            </header>

            <section style={{ background: heroBg, borderBottom: `1px solid ${theme.border}` }}>
                <div className={`store-shell hero-${template}`} style={{ maxWidth: 1240, margin: '0 auto', padding: template === 'studio' ? '84px 24px 56px' : '70px 24px 48px', display: 'grid', gridTemplateColumns: featuredProduct && template !== 'academy' ? '1.1fr 0.9fr' : '1fr', gap: 32, alignItems: 'end' }}>
                    <div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: accent, background: template === 'academy' ? `${accent}12` : 'rgba(255,255,255,0.08)', border: `1px solid ${template === 'academy' ? `${accent}24` : theme.border}`, borderRadius: 999, padding: '8px 12px', fontSize: 12, fontWeight: 900, marginBottom: 18 }}>
                            <FiZap size={14} /> {store.badge_text || 'Produtos digitais com acesso online'}
                        </div>
                        <h1 style={{ maxWidth: 760, fontSize: template === 'studio' ? 58 : 48, lineHeight: 1.02, letterSpacing: 0, fontWeight: 950, marginBottom: 16 }}>
                            {store.headline || store.name}
                        </h1>
                        <p style={{ maxWidth: 680, color: theme.muted, fontSize: 17, lineHeight: 1.7, marginBottom: 26 }}>
                            {store.description || 'Conheca os produtos digitais disponiveis nesta loja.'}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                            <button onClick={() => document.getElementById('store-products')?.scrollIntoView({ behavior: 'smooth' })} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, border: 'none', borderRadius: 14, background: accent, color: 'white', padding: '14px 20px', fontWeight: 900, cursor: 'pointer' }}>
                                {store.cta_text || 'Ver produtos'} <FiArrowRight size={16} />
                            </button>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: theme.muted, fontSize: 13, fontWeight: 700 }}>
                                <FiShield size={15} /> Pagamento seguro via GouPay
                            </span>
                        </div>
                    </div>

                    {featuredProduct && template !== 'academy' && (
                        <div className="featured-card" style={{ justifySelf: 'end', width: '100%', maxWidth: 430, borderRadius: 24, overflow: 'hidden', background: theme.surface, border: `1px solid ${theme.border}`, boxShadow: '0 24px 70px rgba(0,0,0,0.32)' }}>
                            <div style={{ height: 230, background: featuredProduct.image_url ? `url(${featuredProduct.image_url}) center/cover` : `linear-gradient(135deg, ${accent}, ${theme.surfaceAlt})` }} />
                            <div style={{ padding: 22 }}>
                                <div style={{ fontSize: 12, color: accent, fontWeight: 900, marginBottom: 8 }}>Produto em destaque</div>
                                <h3 style={{ fontSize: 22, fontWeight: 900, marginBottom: 10 }}>{featuredProduct.name}</h3>
                                <p style={{ color: theme.muted, fontSize: 13, lineHeight: 1.6, marginBottom: 18, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{featuredProduct.description || 'Produto digital disponivel para compra online.'}</p>
                                <button className="store-card-action" onClick={() => openQuick(featuredProduct)} style={{ width: '100%', border: 'none', borderRadius: 12, background: accent, color: 'white', padding: 13, fontWeight: 900, cursor: 'pointer' }}>
                                    Ver detalhes
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            <main id="store-products" className="store-shell" style={{ maxWidth: 1240, margin: '0 auto', padding: '34px 24px 70px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 18, marginBottom: 22 }} className="store-section-head">
                    <div>
                        <h2 style={{ fontSize: 28, fontWeight: 950, marginBottom: 6 }}>Produtos digitais</h2>
                        <p style={{ color: theme.muted, fontSize: 14 }}>{filteredProducts.length} produto{filteredProducts.length === 1 ? '' : 's'} disponiveis</p>
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
                    <div style={{ padding: 48, textAlign: 'center', borderRadius: 20, border: `1px dashed ${theme.border}`, background: theme.surface }}>
                        <FiPackage size={40} style={{ color: theme.muted, marginBottom: 12 }} />
                        <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 6 }}>Nenhum produto encontrado</h3>
                        <p style={{ color: theme.muted, fontSize: 14 }}>Tente buscar por outro termo ou categoria.</p>
                    </div>
                ) : (
                    <>
                        <div className={`products-grid template-${template}`} style={{ display: 'grid', gridTemplateColumns: template === 'academy' ? 'repeat(3, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))', gap: 18 }}>
                            {paginatedProducts.map(product => (
                                <article key={product.id} className="store-product-card" style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: template === 'studio' ? 8 : 18, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                                    <button className="store-product-media" onClick={() => openQuick(product)} style={{ height: template === 'academy' ? 150 : 178, border: 'none', padding: 0, cursor: 'pointer', background: product.image_url ? `url(${product.image_url}) center/cover` : `linear-gradient(135deg, ${accent}, ${theme.surfaceAlt})` }} aria-label={`Ver ${product.name}`} />
                                    <div className="store-product-body" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                                            <h3 className="store-product-title" style={{ fontSize: 17, fontWeight: 900, lineHeight: 1.25 }}>{product.name}</h3>
                                            <span className="store-online-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: accent, fontSize: 11, fontWeight: 900, whiteSpace: 'nowrap' }}>
                                                <FiBookOpen size={13} /> Online
                                            </span>
                                        </div>
                                        <p className="store-product-description" style={{ color: theme.muted, fontSize: 13, lineHeight: 1.5, minHeight: 38, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {product.description || 'Produto digital com compra segura e entrega online.'}
                                        </p>
                                        <div style={{ marginTop: 'auto', display: 'grid', gap: 10 }}>
                                            <div>
                                                <div className="store-price-label" style={{ color: theme.muted, fontSize: 12, fontWeight: 700 }}>{product.has_plans ? 'A partir de' : 'Preco'}</div>
                                                <div className="store-product-price" style={{ fontSize: 22, fontWeight: 950 }}>R$ {product.price_display}</div>
                                            </div>
                                            <button className="store-card-action" onClick={() => openQuick(product)} style={{ width: '100%', border: 'none', borderRadius: 12, background: accent, color: 'white', padding: 12, fontWeight: 900, cursor: 'pointer' }}>
                                                Ver produto
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>

                        {totalProductPages > 1 && (
                            <div className="product-pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    className="product-page-arrow"
                                    onClick={() => setProductPage(page => Math.max(1, page - 1))}
                                    disabled={safeProductPage === 1}
                                    style={{ ...paginationButtonStyle(false, accent, theme), opacity: safeProductPage === 1 ? 0.45 : 1 }}
                                    aria-label="Produtos anteriores"
                                >
                                    <FiChevronLeft size={16} />
                                </button>
                                {Array.from({ length: totalProductPages }, (_, index) => index + 1).map(page => (
                                    <button
                                        key={page}
                                        type="button"
                                        className="product-page-button"
                                        onClick={() => setProductPage(page)}
                                        style={paginationButtonStyle(page === safeProductPage, accent, theme)}
                                    >
                                        {page}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    className="product-page-arrow"
                                    onClick={() => setProductPage(page => Math.min(totalProductPages, page + 1))}
                                    disabled={safeProductPage === totalProductPages}
                                    style={{ ...paginationButtonStyle(false, accent, theme), opacity: safeProductPage === totalProductPages ? 0.45 : 1 }}
                                    aria-label="Proximos produtos"
                                >
                                    <FiChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </main>

            <section style={{ borderTop: `1px solid ${theme.border}`, background: theme.surfaceAlt }}>
                <div className="store-shell trust-row" style={{ maxWidth: 1240, margin: '0 auto', padding: '22px 24px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                    {[
                        { icon: <FiShield />, title: 'Pagamento seguro', desc: 'Compra processada pela GouPay.' },
                        { icon: <FiZap />, title: 'Entrega online', desc: 'Produtos digitais sem frete.' },
                        { icon: <FiCheckCircle />, title: 'Acesso organizado', desc: 'Pedidos e conteudos em um so lugar.' }
                    ].map(item => (
                        <div key={item.title} style={{ display: 'flex', gap: 12, alignItems: 'center', color: theme.text }}>
                            <span style={{ color: accent, fontSize: 20 }}>{item.icon}</span>
                            <span>
                                <strong style={{ display: 'block', fontSize: 13 }}>{item.title}</strong>
                                <small style={{ color: theme.muted }}>{item.desc}</small>
                            </span>
                        </div>
                    ))}
                </div>
            </section>

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

            <style jsx>{`
                .store-floating-header {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    z-index: 100;
                    padding: 16px 18px 0;
                    pointer-events: none;
                    background: transparent;
                }
                .store-topbar {
                    width: min(1120px, 100%);
                    min-height: 54px;
                    margin: 0 auto;
                    border-radius: 999px;
                    backdrop-filter: blur(18px);
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 7px 10px 7px 18px;
                    pointer-events: auto;
                    overflow: hidden;
                }
                .topbar-brand {
                    border: none;
                    background: transparent;
                    font-size: 17px;
                    font-weight: 950;
                    cursor: pointer;
                    white-space: nowrap;
                    max-width: 190px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    padding: 0;
                }
                .topbar-divider {
                    width: 1px;
                    height: 26px;
                    background: rgba(148,163,184,0.35);
                    flex: 0 0 auto;
                }
                .topbar-nav {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    min-width: 0;
                    overflow-x: auto;
                    scrollbar-width: none;
                }
                .topbar-nav::-webkit-scrollbar {
                    display: none;
                }
                .topbar-tab {
                    height: 36px;
                    border: none;
                    border-radius: 999px;
                    padding: 0 14px;
                    font-size: 13px;
                    font-weight: 850;
                    cursor: pointer;
                    white-space: nowrap;
                }
                .topbar-search {
                    margin-left: auto;
                    height: 38px;
                    min-width: 150px;
                    max-width: 210px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 0 12px;
                    border-radius: 999px;
                    background: rgba(255,255,255,0.10);
                    border: 1px solid rgba(148,163,184,0.24);
                }
                .topbar-search input {
                    width: 100%;
                    min-width: 0;
                    border: none;
                    outline: none;
                    background: transparent;
                    font-size: 13px;
                    font-weight: 750;
                }
                .topbar-search input::placeholder {
                    color: rgba(148,163,184,0.92);
                }
                .topbar-icon-action,
                .topbar-login {
                    height: 38px;
                    border: none;
                    border-radius: 999px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 7px;
                    font-weight: 900;
                    cursor: pointer;
                    flex: 0 0 auto;
                }
                .topbar-icon-action {
                    min-width: 58px;
                    padding: 0 12px;
                }
                .topbar-icon-action span {
                    min-width: 18px;
                    height: 18px;
                    border-radius: 999px;
                    display: grid;
                    place-items: center;
                    background: rgba(255,255,255,0.22);
                    font-size: 11px;
                    line-height: 1;
                }
                .topbar-login {
                    padding: 0 14px;
                }
                .store-product-card {
                    transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease;
                }
                .store-product-card:hover {
                    transform: translateY(-4px);
                    border-color: ${accent};
                    box-shadow: 0 18px 48px rgba(0,0,0,.22);
                }
                @media (max-width: 900px) {
                    .hero-creator,
                    .hero-studio,
                    .hero-academy {
                        grid-template-columns: 1fr !important;
                    }
                    .featured-card {
                        justify-self: stretch !important;
                        max-width: none !important;
                    }
                    .store-floating-header {
                        padding: 12px 12px 0;
                    }
                    .store-topbar {
                        border-radius: 24px;
                        flex-wrap: wrap;
                        padding: 9px;
                        gap: 8px;
                    }
                    .topbar-brand {
                        padding-left: 6px;
                        max-width: 150px;
                    }
                    .topbar-nav {
                        flex: 1;
                        order: 2;
                    }
                    .optional-divider {
                        display: none;
                    }
                    .store-search {
                        order: 5;
                        flex-basis: 100%;
                        max-width: none !important;
                    }
                    .store-section-head {
                        grid-template-columns: 1fr !important;
                    }
                    .trust-row {
                        grid-template-columns: 1fr !important;
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
                    .store-floating-header {
                        padding: max(10px, env(safe-area-inset-top)) 10px 0;
                    }
                    .store-topbar {
                        width: min(350px, calc(100vw - 20px));
                        min-height: 0;
                        border-radius: 18px;
                        padding: 8px;
                        gap: 7px;
                        align-items: center;
                        justify-content: center;
                    }
                    h1 {
                        font-size: 30px !important;
                        line-height: 1.08 !important;
                    }
                    .hero-creator,
                    .hero-studio,
                    .hero-academy {
                        padding-top: 148px !important;
                        padding-bottom: 26px !important;
                        gap: 18px !important;
                    }
                    .hero-creator p,
                    .hero-studio p,
                    .hero-academy p {
                        font-size: 15px !important;
                        line-height: 1.55 !important;
                        margin-bottom: 18px !important;
                    }
                    .hero-creator > div:first-child > div:first-child,
                    .hero-studio > div:first-child > div:first-child,
                    .hero-academy > div:first-child > div:first-child {
                        max-width: 100%;
                        font-size: 11px !important;
                        padding: 7px 10px !important;
                        margin-bottom: 14px !important;
                    }
                    .hero-creator > div:first-child button,
                    .hero-studio > div:first-child button,
                    .hero-academy > div:first-child button {
                        width: 100%;
                        justify-content: center;
                        padding: 13px 16px !important;
                        border-radius: 13px !important;
                    }
                    .hero-creator > div:first-child span,
                    .hero-studio > div:first-child span,
                    .hero-academy > div:first-child span {
                        font-size: 12px !important;
                    }
                    .store-login {
                        display: none !important;
                    }
                    .topbar-brand {
                        max-width: 88px;
                        font-size: 13px;
                        padding-left: 2px;
                    }
                    .topbar-divider:first-of-type {
                        display: none;
                    }
                    .topbar-nav {
                        flex: 0 0 auto;
                        order: 3;
                        gap: 3px;
                    }
                    .topbar-tab {
                        height: 32px;
                        padding: 0 10px;
                        font-size: 11px;
                    }
                    .topbar-icon-action {
                        order: 2;
                        min-width: 48px;
                        height: 32px;
                        padding: 0 9px;
                        gap: 5px;
                    }
                    .topbar-icon-action span {
                        min-width: 17px;
                        height: 17px;
                        font-size: 10px;
                    }
                    .topbar-search {
                        height: 36px;
                        min-width: 0;
                        flex-basis: 100%;
                        max-width: 100%;
                        padding: 0 11px;
                        order: 5;
                    }
                    .topbar-search input {
                        font-size: 12px;
                    }
                    .featured-card {
                        display: none !important;
                    }
                    .store-section-head {
                        gap: 14px !important;
                        margin-bottom: 16px !important;
                    }
                    .store-section-head h2 {
                        font-size: 22px !important;
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
                        height: 92px !important;
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
                    .product-pagination {
                        margin-top: 14px !important;
                    }
                    .product-page-button,
                    .product-page-arrow {
                        min-width: 34px !important;
                        height: 34px !important;
                        padding: 0 10px !important;
                    }
                    .trust-row {
                        padding-top: 16px !important;
                        padding-bottom: 16px !important;
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

function paginationButtonStyle(active: boolean, accent: string, theme: typeof templateStyles.creator): React.CSSProperties {
    return {
        minWidth: 40,
        height: 40,
        border: `1px solid ${active ? accent : theme.border}`,
        background: active ? accent : theme.surface,
        color: active ? 'white' : theme.text,
        borderRadius: 999,
        padding: '0 14px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 13,
        fontWeight: 900,
        cursor: 'pointer'
    };
}
