'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { storeAPI } from '@/lib/api';
import { FiShoppingCart, FiSearch, FiPackage, FiFilter, FiUser, FiZap, FiShoppingBag, FiPlus, FiArrowRight } from 'react-icons/fi';
import { useCart } from '@/contexts/CartContext';
import toast from 'react-hot-toast';

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
    const [quickOpen, setQuickOpen] = useState(false);
    const [quickProduct, setQuickProduct] = useState<any>(null);
    const [quickQty, setQuickQty] = useState(1);

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
        } finally {
            setLoading(false);
        }
    };

    const handleCategoryClick = (catSlug: string) => {
        if (catSlug === activeCategory) {
            router.push(`/store/${params.slug}`);
        } else {
            router.push(`/store/${params.slug}?category=${catSlug}`);
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAddToCart = (product: any) => {
        addItem({
            id: product.id,
            name: product.name,
            price: product.price,
            price_display: product.price_display,
            image_url: product.image_url
        });
        toast.success(`${product.name} adicionado!`);
    };
    const openQuick = (product: any) => {
        setQuickProduct(product);
        setQuickQty(1);
        setQuickOpen(true);
    };
    const closeQuick = () => setQuickOpen(false);
    const quickAdd = () => {
        if (!quickProduct) return;
        for (let i = 0; i < quickQty; i++) {
            addItem({
                id: quickProduct.id,
                name: quickProduct.name,
                price: quickProduct.price,
                price_display: quickProduct.price_display,
                image_url: quickProduct.image_url
            });
        }
        toast.success(`${quickProduct.name} adicionado!`);
        setQuickOpen(false);
    };
    const quickBuyNow = () => {
        if (!quickProduct) return;
        for (let i = 0; i < quickQty; i++) {
            addItem({
                id: quickProduct.id,
                name: quickProduct.name,
                price: quickProduct.price,
                price_display: quickProduct.price_display,
                image_url: quickProduct.image_url
            });
        }
        router.push(`/store/${params.slug}/cart?overlay=1`);
    };

    if (loading && !store) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0c' }}>
                <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#6c5ce7', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!store) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0c', padding: 24 }}>
                <div style={{ padding: 48, textAlign: 'center', maxWidth: 400, background: '#141417', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <FiPackage size={48} style={{ opacity: 0.3, color: 'white', marginBottom: 16 }} />
                    <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: 'white' }}>Loja inexistente</h2>
                    <p style={{ color: '#94a3b8', fontSize: 14 }}>Esta vitrine não foi encontrada ou está temporariamente offline.</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a0c', color: '#e2e8f0', fontFamily: 'Outfit, Inter, sans-serif' }}>
            {/* Custom Header (Image 3 inspired) */}
            <header
                style={{
                position: 'sticky', top: 0, zIndex: 100,
                background: 'rgba(10, 10, 12, 0.8)', backdropFilter: 'blur(12px)',
                borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '16px 24px'
            }}
                className="storeHeader"
            >
                <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }} className="storeHeaderInner">
                    <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px', color: 'white', cursor: 'pointer' }} onClick={() => router.push(`/store/${params.slug}`)}>
                        {params.slug}
                    </div>

                    <div style={{ flex: 1, maxWidth: 600, position: 'relative' }} className="storeHeaderSearch">
                        <FiSearch size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                        <input
                            placeholder="Pesquisar produto"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%', background: '#141417', border: '1px solid rgba(255,255,255,0.05)',
                                borderRadius: 12, padding: '12px 16px 12px 48px', color: 'white', fontSize: 14, outline: 'none',
                                transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
                            onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.05)'}
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} className="storeHeaderActions">
                        <button
                            onClick={() => router.push(`/store/${params.slug}/cart`)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px',
                                background: 'white', color: '#0a0a0c', borderRadius: 12, border: 'none',
                                fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'transform 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <FiShoppingBag size={18} />
                            Carrinho
                            <span style={{
                                background: '#0a0a0c', color: 'white', padding: '1px 6px',
                                borderRadius: 6, fontSize: 11, fontWeight: 800
                            }}>{totalItems}</span>
                        </button>

                        <button
                            onClick={() => router.push('/login')}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px',
                                background: '#141417', color: 'white', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)',
                                fontWeight: 700, fontSize: 13, cursor: 'pointer'
                            }}
                        >
                            <FiUser size={18} /> Entrar
                        </button>
                    </div>
                </div>
            </header>

            {/* Banner Section */}
            <div style={{
                position: 'relative',
                height: 300,
                background: store.banner_url ? `url(${store.banner_url}) center/cover no-repeat` : 'linear-gradient(45deg, #0a0a0c, #1a1a20)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }} className="storeBanner">
                {store.banner_url && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #0a0a0c, transparent)' }} />}
                <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: 24 }} className="storeBannerText">
                    <h1 style={{ fontSize: 42, fontWeight: 900, color: 'white', marginBottom: 8, letterSpacing: '-1px' }} className="storeBannerTitle">{store.name}</h1>
                    <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', maxWidth: 600 }}>{store.description}</p>
                </div>
            </div>

            {/* Navigation & Products */}
            <main style={{ maxWidth: 1400, margin: '0 auto', padding: '40px 24px' }} className="storeMain">
                {/* Categorias Horizontal Scroll */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 40, overflowX: 'auto', paddingBottom: 10 }}>
                    <button
                        onClick={() => handleCategoryClick('')}
                        style={{
                            padding: '10px 24px', borderRadius: 100, fontSize: 14, fontWeight: 600, border: '1px solid',
                            background: !activeCategory ? 'white' : 'transparent',
                            color: !activeCategory ? '#0a0a0c' : '#94a3b8',
                            borderColor: !activeCategory ? 'white' : 'rgba(255,255,255,0.05)',
                            cursor: 'pointer', whiteSpace: 'nowrap'
                        }}
                    >
                        Todos
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => handleCategoryClick(cat.slug)}
                            style={{
                                padding: '10px 24px', borderRadius: 100, fontSize: 14, fontWeight: 600, border: '1px solid',
                                background: activeCategory === cat.slug ? 'white' : 'transparent',
                                color: activeCategory === cat.slug ? '#0a0a0c' : '#94a3b8',
                                borderColor: activeCategory === cat.slug ? 'white' : 'rgba(255,255,255,0.05)',
                                cursor: 'pointer', whiteSpace: 'nowrap'
                            }}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>

                {/* Grid (Image 1 Product Card inspired) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 30 }} className="storeProductsGrid">
                    {filteredProducts.map(product => (
                        <div key={product.id} className="product-card" style={{
                            background: '#141417', borderRadius: 24, overflow: 'hidden',
                            border: '1px solid rgba(255,255,255,0.03)', position: 'relative',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}>
                            {/* Bolt Badge */}
                            <div style={{
                                position: 'absolute', top: 215, right: 16, zIndex: 10,
                                background: 'rgba(0, 206, 201, 0.1)', color: '#00cec9',
                                width: 36, height: 36, borderRadius: 10,
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <FiZap size={18} />
                            </div>

                            {/* Image Container */}
                            <div style={{ height: 200, position: 'relative', overflow: 'hidden' }}>
                                {product.image_url ? (
                                    <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1e1e24, #0a0a0c)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <FiPackage size={48} style={{ color: 'rgba(255,255,255,0.05)' }} />
                                    </div>
                                )}
                                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent, #141417)' }} />
                            </div>

                            {/* Content */}
                            <div style={{ padding: '0 24px 24px' }}>
                                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 16 }}>{product.name}</h3>

                                <div style={{ marginBottom: 20 }}>
                                    <div style={{ fontSize: 24, fontWeight: 800, color: 'white', letterSpacing: '-0.5px' }}>R$ {product.price_display}</div>
                                    <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>À vista no PIX</div>
                                </div>

                                <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00cec9' }} />
                                </div>

                                <div style={{ display: 'flex', gap: 12 }}>
                                    <button
                                        onClick={() => openQuick(product)}
                                        style={{
                                            flex: 1, background: 'white', color: '#0a0a0c', border: 'none',
                                            padding: '12px', borderRadius: 12, fontWeight: 800, fontSize: 14,
                                            cursor: 'pointer', transition: 'filter 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(0.9)'}
                                        onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1)'}
                                    >
                                        Comprar
                                    </button>
                                    <button
                                        onClick={() => openQuick(product)}
                                        style={{
                                            width: 50, background: 'white', color: '#0a0a0c', border: 'none',
                                            borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer', transition: 'filter 0.2s'
                                        }}
                                        title="Adicionar ao Carrinho"
                                        onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(0.9)'}
                                        onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1)'}
                                    >
                                        <FiShoppingBag size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {quickOpen && (
                <div
                    className="quickModalOverlay"
                    onClick={closeQuick}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.85)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 20
                    }}
                >
                    <div
                        className="quickModalContent"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: '100%',
                            maxWidth: 940,
                            maxHeight: 'calc(100vh - 40px)',
                            overflowY: 'auto',
                            background: '#141417',
                            borderRadius: 28,
                            border: '1px solid rgba(255,255,255,0.06)',
                            overflow: 'hidden',
                            boxShadow: '0 30px 80px rgba(0,0,0,0.65)'
                        }}
                    >
                        <div className="quickModalHeader" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 22, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ fontSize: 18, fontWeight: 900, color: 'white' }}>{quickProduct?.name}</div>
                                <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#00cec9' }}>
                                        <FiZap size={14} /> À vista no Pix
                                    </span>
                                    <span style={{ opacity: 0.35 }}>•</span>
                                    <span style={{ color: '#64748b' }}>Compra segura</span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={closeQuick}
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 12,
                                    background: '#0a0a0c',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    fontWeight: 900
                                }}
                            >
                                ×
                            </button>
                        </div>

                        <div className="quickModalGrid" style={{ display: 'grid', gridTemplateColumns: '1.35fr 0.65fr', gap: 22, padding: 22 }}>
                            <div className="quickModalSubGrid" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 18, alignItems: 'start' }}>
                                <div style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: 22, overflow: 'hidden', background: '#0a0a0c', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    {quickProduct?.image_url ? (
                                        <img src={quickProduct.image_url} alt={quickProduct?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1e1e24, #0a0a0c)' }}>
                                            <FiPackage size={52} style={{ color: 'rgba(255,255,255,0.08)' }} />
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    <div style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, maxHeight: 210, overflow: 'auto', paddingRight: 6 }}>
                                        {quickProduct?.description || 'Sem descrição'}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00cec9' }} />
                                        <div style={{ marginLeft: 10, fontSize: 13, color: '#64748b', fontWeight: 600 }}>Pix</div>
                                    </div>
                                </div>
                            </div>

                            <div className="quickModalRightBox" style={{ background: '#0a0a0c', borderRadius: 22, border: '1px solid rgba(255,255,255,0.06)', padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, letterSpacing: 0.3 }}>Preço</div>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, color: 'white', fontWeight: 900, fontSize: 24, whiteSpace: 'nowrap' }}>
                                        <span style={{ fontSize: 16, opacity: 0.9 }}>R$</span>
                                        <span>{quickProduct?.price_display}</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                                    <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>Quantidade</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#141417', borderRadius: 12, padding: '8px 10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                        <button
                                            type="button"
                                            onClick={() => setQuickQty(Math.max(1, quickQty - 1))}
                                            style={{ width: 34, height: 34, borderRadius: 10, background: '#0a0a0c', border: '1px solid rgba(255,255,255,0.06)', color: '#94a3b8', cursor: 'pointer', fontWeight: 900 }}
                                        >
                                            −
                                        </button>
                                        <span style={{ minWidth: 28, textAlign: 'center', fontSize: 14, fontWeight: 900, color: 'white' }}>{quickQty}</span>
                                        <button
                                            type="button"
                                            onClick={() => setQuickQty(quickQty + 1)}
                                            style={{ width: 34, height: 34, borderRadius: 10, background: '#0a0a0c', border: '1px solid rgba(255,255,255,0.06)', color: '#94a3b8', cursor: 'pointer', fontWeight: 900 }}
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>

                                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

                                <button
                                    onClick={quickBuyNow}
                                    style={{
                                        width: '100%',
                                        padding: 14,
                                        borderRadius: 14,
                                        background: 'white',
                                        color: '#0a0a0c',
                                        border: 'none',
                                        fontWeight: 900,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Comprar agora
                                </button>
                                <button
                                    onClick={quickAdd}
                                    style={{
                                        width: '100%',
                                        padding: 14,
                                        borderRadius: 14,
                                        background: 'transparent',
                                        color: 'white',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        fontWeight: 900,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Adicionar ao carrinho
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .product-card:hover {
                    border-color: rgba(255,255,255,0.1);
                    transform: translateY(-5px);
                    box-shadow: 0 20px 40px rgba(0,0,0,0.4);
                }
                @media (max-width: 900px) {
                    .quickModalContent {
                        max-width: 92vw !important;
                    }
                    .quickModalGrid {
                        grid-template-columns: 1fr !important;
                    }
                }
                @media (max-width: 900px) {
                    .storeHeaderInner {
                        flex-wrap: wrap;
                    }
                    .storeHeaderSearch {
                        order: 3;
                        flex-basis: 100%;
                        max-width: none !important;
                    }
                }
                @media (max-width: 640px) {
                    .quickModalHeader {
                        padding: 16px !important;
                    }
                    .quickModalContent {
                        max-width: 92vw !important;
                        border-radius: 22px !important;
                    }
                    .quickModalGrid {
                        grid-template-columns: 1fr !important;
                        gap: 14px !important;
                        padding: 16px !important;
                    }
                    .quickModalSubGrid {
                        grid-template-columns: 1fr !important;
                        gap: 12px !important;
                    }
                    .quickModalRightBox {
                        border-radius: 18px !important;
                        padding: 14px !important;
                    }
                    .storeHeader {
                        padding: 12px 14px !important;
                    }
                    .storeHeaderInner {
                        gap: 12px !important;
                    }
                    .storeHeaderActions button {
                        padding: 9px 12px !important;
                        font-size: 12px !important;
                        gap: 8px !important;
                    }
                    .storeBanner {
                        height: 220px !important;
                    }
                    .storeBannerText {
                        padding: 18px !important;
                    }
                    .storeBannerTitle {
                        font-size: 28px !important;
                    }
                    .storeMain {
                        padding: 24px 14px !important;
                    }
                    .storeProductsGrid {
                        grid-template-columns: 1fr !important;
                        gap: 16px !important;
                    }
                }
            `}</style>
        </div>
    );
}

