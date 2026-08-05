'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
    FiArrowLeft,
    FiArrowRight,
    FiCheck,
    FiChevronRight,
    FiCreditCard,
    FiHeadphones,
    FiMinus,
    FiPackage,
    FiPlus,
    FiShield,
    FiShoppingBag,
    FiZap,
} from 'react-icons/fi';
import { storeAPI } from '@/lib/api';
import { useCart } from '@/contexts/CartContext';
import { normalizeStoreStyle } from '@/lib/store-builder';

const themes = {
    light: {
        bg: '#f3f7fd',
        surface: '#ffffff',
        surfaceAlt: '#f5f8fd',
        text: '#111827',
        muted: '#64748b',
        border: '#cfdaea',
        shadow: '0 18px 50px rgba(32, 73, 125, .10)',
    },
    dark: {
        bg: '#080d18',
        surface: '#111827',
        surfaceAlt: '#172033',
        text: '#f8fafc',
        muted: '#94a3b8',
        border: '#29354a',
        shadow: '0 18px 55px rgba(0, 0, 0, .28)',
    },
};

function productPlans(product: any) {
    if (Array.isArray(product?.plans) && product.plans.length > 0) return product.plans;
    return [{
        id: '__base__',
        name: 'Padrão',
        price: Math.round(Number(product?.price || 0) * 100),
        price_display: product?.price_display || Number(product?.price || 0).toFixed(2),
    }];
}

export default function StoreProductPage() {
    const params = useParams<{ slug: string; product: string }>();
    const router = useRouter();
    const { addItem, totalItems } = useCart();
    const [store, setStore] = useState<any>(null);
    const [products, setProducts] = useState<any[]>([]);
    const [currentProduct, setCurrentProduct] = useState<any>(null);
    const [selectedPlanId, setSelectedPlanId] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        storeAPI.getStoreBySlug(params.slug)
            .then(({ data }) => {
                if (cancelled) return;
                const list = data.products || [];
                const identifier = decodeURIComponent(params.product);
                const found = list.find((item: any) => (
                    item.store_product_slug === identifier || item.id === identifier
                ));
                setStore(data.store);
                setProducts(list);
                setCurrentProduct(found || null);
                const plans = productPlans(found);
                setSelectedPlanId(plans[0]?.id || '__base__');
            })
            .catch(error => {
                console.error('Store product load error:', error);
                if (!cancelled) {
                    setStore(null);
                    setCurrentProduct(null);
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [params.product, params.slug]);

    const visual = normalizeStoreStyle(store?.style);
    const baseTheme = store?.theme === 'dark' ? themes.dark : themes.light;
    const theme = visual.color_mode === 'custom' ? {
        bg: visual.custom_colors.background,
        surface: visual.custom_colors.surface,
        surfaceAlt: visual.custom_colors.surface_alt,
        text: visual.custom_colors.text,
        muted: visual.custom_colors.muted,
        border: visual.custom_colors.border,
        shadow: baseTheme.shadow,
    } : baseTheme;
    const accent = visual.color_mode === 'custom'
        ? visual.custom_colors.accent
        : (store?.accent_color || '#0667ef');
    const canonicalSlug = store?.slug || params.slug;
    const plans = useMemo(() => productPlans(currentProduct), [currentProduct]);
    const selectedPlan = plans.find((plan: any) => String(plan.id) === selectedPlanId) || plans[0];
    const recommendations = useMemo(
        () => products.filter(product => product.id !== currentProduct?.id).slice(0, 4),
        [currentProduct?.id, products],
    );

    const openProduct = (product: any) => {
        router.push(`/store/${encodeURIComponent(canonicalSlug)}/product/${encodeURIComponent(product.store_product_slug || product.id)}`);
    };

    const addSelectedToCart = (redirect = false) => {
        if (!currentProduct || !selectedPlan) return;
        const item = {
            id: currentProduct.id,
            name: currentProduct.name,
            price: Number(selectedPlan.price) / 100,
            price_display: selectedPlan.price_display,
            image_url: currentProduct.image_url,
            plan_id: selectedPlan.id === '__base__' ? undefined : selectedPlan.id,
            plan_name: selectedPlan.name,
        };
        for (let index = 0; index < quantity; index += 1) addItem(item);
        toast.success(quantity === 1
            ? 'Produto adicionado ao carrinho'
            : `${quantity} unidades adicionadas ao carrinho`);
        if (redirect) router.push(`/store/${encodeURIComponent(canonicalSlug)}/cart?overlay=1`);
    };

    if (loading) {
        return (
            <div className="product-loading">
                <span />
                <p>Carregando produto...</p>
                <style jsx>{`
                    .product-loading { min-height: 100vh; display: grid; place-content: center; justify-items: center; gap: 14px; color: #64748b; background: #f3f7fd; }
                    .product-loading span { width: 42px; height: 42px; border: 3px solid #dbe5f2; border-top-color: #0667ef; border-radius: 50%; animation: spin .8s linear infinite; }
                    .product-loading p { font-size: 13px; font-weight: 700; }
                    @keyframes spin { to { transform: rotate(360deg); } }
                `}</style>
            </div>
        );
    }

    if (!store || !currentProduct) {
        return (
            <div className="product-unavailable">
                <FiPackage />
                <h1>Produto indisponível</h1>
                <p>Este produto não foi encontrado ou não está mais publicado.</p>
                <button onClick={() => router.push(`/store/${encodeURIComponent(params.slug)}`)}><FiArrowLeft /> Voltar para a loja</button>
                <style jsx>{`
                    .product-unavailable { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; text-align: center; color: #111827; background: #f3f7fd; }
                    .product-unavailable > :global(svg) { font-size: 46px; color: #94a3b8; }
                    .product-unavailable h1 { margin: 18px 0 6px; font-size: 28px; }
                    .product-unavailable p { color: #64748b; }
                    .product-unavailable button { margin-top: 22px; border: 0; border-radius: 12px; padding: 13px 18px; display: flex; gap: 8px; color: white; background: #0667ef; font-weight: 800; cursor: pointer; }
                `}</style>
            </div>
        );
    }

    const descriptionIsHtml = currentProduct.store_description_format === 'html';
    const initials = String(store.name || canonicalSlug)
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part: string) => part[0]?.toUpperCase())
        .join('') || 'LO';

    return (
        <div
            className="product-page"
            style={{
                '--page-bg': theme.bg,
                '--surface': theme.surface,
                '--surface-alt': theme.surfaceAlt,
                '--ink': theme.text,
                '--muted': theme.muted,
                '--line': theme.border,
                '--accent': accent,
                '--page-shadow': theme.shadow,
            } as React.CSSProperties}
        >
            <header className="product-header">
                <div className="product-header-main">
                    <button className="product-brand" onClick={() => router.push(`/store/${encodeURIComponent(canonicalSlug)}`)}>
                        <span>{initials}</span>
                        <strong>{store.name || canonicalSlug}<small>LOJA OFICIAL</small></strong>
                    </button>
                    <button className="product-header-search" onClick={() => router.push(`/store/${encodeURIComponent(canonicalSlug)}`)}>
                        <span>Buscar em {store.name || canonicalSlug}</span><FiChevronRight />
                    </button>
                    <button className="product-cart-button" onClick={() => router.push(`/store/${encodeURIComponent(canonicalSlug)}/cart`)}>
                        <FiShoppingBag /><span>Carrinho</span>{totalItems > 0 && <b>{totalItems}</b>}
                    </button>
                </div>
                <nav className="product-nav">
                    <button onClick={() => router.push(`/store/${encodeURIComponent(canonicalSlug)}`)}>Início</button>
                    <button onClick={() => router.push(`/store/${encodeURIComponent(canonicalSlug)}#store-products`)}>Produtos</button>
                    <span><FiShield /> Compra protegida</span>
                    <span><FiZap /> Entrega digital</span>
                </nav>
            </header>

            <main className="product-shell">
                <button className="product-back" onClick={() => router.push(`/store/${encodeURIComponent(canonicalSlug)}`)}>
                    <FiArrowLeft /> Voltar para a loja
                </button>

                <div className="product-layout">
                    <div className="product-main-column">
                        <section className="product-media-card">
                            {currentProduct.image_url ? (
                                <img src={currentProduct.image_url} alt={currentProduct.name} />
                            ) : (
                                <div className="product-media-fallback"><FiPackage /><strong>{currentProduct.name}</strong></div>
                            )}
                            <span>Digital</span>
                        </section>

                        <section className="product-description-card">
                            <div className="section-label"><i><FiZap /></i><span>SOBRE O PRODUTO</span></div>
                            {currentProduct.description ? (
                                descriptionIsHtml ? (
                                    <div
                                        className="product-rich-description"
                                        dangerouslySetInnerHTML={{ __html: currentProduct.description }}
                                    />
                                ) : (
                                    <div className="product-plain-description">{currentProduct.description}</div>
                                )
                            ) : (
                                <div className="product-description-empty">Consulte os detalhes do plano ao lado e fale com a loja se precisar de ajuda.</div>
                            )}
                        </section>

                        <section className="purchase-information">
                            <div className="purchase-info-card">
                                <i><FiZap /></i>
                                <div><strong>Entrega digital</strong><p>O acesso é disponibilizado conforme as instruções do vendedor após a aprovação do pagamento.</p></div>
                            </div>
                            <div className="purchase-info-card">
                                <i><FiShield /></i>
                                <div><strong>Compra segura</strong><p>O preço e os itens são validados novamente no servidor antes da cobrança.</p></div>
                            </div>
                            <div className="purchase-info-card">
                                <i><FiHeadphones /></i>
                                <div><strong>Suporte da loja</strong><p>Confira a descrição completa e, em caso de dúvida, use os canais de contato da loja.</p></div>
                            </div>
                        </section>
                    </div>

                    <aside className="product-buy-card">
                        <div className="product-buy-badges"><span><FiZap /> Entrega digital</span><span><FiCreditCard /> {visual.show_credit_card ? 'Pix e cartão' : 'Pagamento via Pix'}</span></div>
                        <h1>{currentProduct.name}</h1>
                        <div className="product-current-price">R$ {selectedPlan?.price_display || currentProduct.price_display}</div>
                        <p className="product-payment-copy">Valor do plano selecionado</p>

                        <div className="product-divider" />
                        <div className="product-plan-label">ESCOLHA UMA OPÇÃO</div>
                        <div className="product-plans">
                            {plans.map((plan: any, index: number) => {
                                const selected = String(plan.id) === String(selectedPlan?.id);
                                return (
                                    <button key={plan.id} className={selected ? 'selected' : ''} onClick={() => setSelectedPlanId(String(plan.id))}>
                                        <i>{selected && <FiCheck />}</i>
                                        <span><strong>{plan.name}</strong><small>{index === 0 ? 'Opção padrão' : 'Plano disponível'}</small></span>
                                        <b>R$ {plan.price_display}</b>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="product-divider" />
                        <div className="product-quantity-row">
                            <div><strong>QUANTIDADE</strong><small>Escolha entre 1 e 99</small></div>
                            <div className="product-quantity">
                                <button onClick={() => setQuantity(value => Math.max(1, value - 1))} aria-label="Diminuir quantidade"><FiMinus /></button>
                                <span>{quantity}</span>
                                <button onClick={() => setQuantity(value => Math.min(99, value + 1))} aria-label="Aumentar quantidade"><FiPlus /></button>
                            </div>
                        </div>

                        <div className="product-actions">
                            <button className="add" onClick={() => addSelectedToCart(false)}><FiShoppingBag /> Adicionar ao carrinho</button>
                            <button className="buy" onClick={() => addSelectedToCart(true)}>Comprar agora <FiArrowRight /></button>
                        </div>
                        <div className="product-safe-note"><FiShield /><span>Compra protegida. A cobrança usa os dados atuais registrados no sistema.</span></div>
                    </aside>
                </div>

                {recommendations.length > 0 && (
                    <section className="product-recommendations">
                        <div className="recommendations-heading">
                            <div><span>RECOMENDADOS</span><h2>Veja também</h2></div>
                            <button onClick={() => router.push(`/store/${encodeURIComponent(canonicalSlug)}`)}>Ver todos <FiArrowRight /></button>
                        </div>
                        <div className="recommendation-grid">
                            {recommendations.map(product => (
                                <button key={product.id} className="recommendation-card" onClick={() => openProduct(product)}>
                                    <div>{product.image_url ? <img src={product.image_url} alt="" /> : <FiPackage />}</div>
                                    <span><strong>{product.name}</strong><small>R$ {product.price_display}</small></span>
                                </button>
                            ))}
                        </div>
                    </section>
                )}
            </main>

            <footer className="product-footer"><strong>{store.name || canonicalSlug}</strong><span>Pagamento seguro via GouPay</span></footer>

            <style jsx global>{`
                .product-page { min-height: 100vh; color: var(--ink); background-color: var(--page-bg); background-image: radial-gradient(circle at 8% 10%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 26%), radial-gradient(circle at 92% 48%, color-mix(in srgb, var(--accent) 8%, transparent), transparent 28%), repeating-radial-gradient(ellipse at 50% 22%, transparent 0 130px, color-mix(in srgb, var(--accent) 5%, transparent) 132px 133px); }
                .product-page * { box-sizing: border-box; }
                .product-header { position: sticky; top: 0; z-index: 100; border-bottom: 1px solid var(--line); background: color-mix(in srgb, var(--surface) 94%, transparent); backdrop-filter: blur(18px); box-shadow: 0 8px 28px rgba(15,23,42,.05); }
                .product-header-main { width: min(1240px, calc(100% - 40px)); height: 72px; margin: 0 auto; display: grid; grid-template-columns: 250px minmax(280px, 1fr) 180px; align-items: center; gap: 28px; }
                .product-brand { border: 0; display: flex; align-items: center; gap: 10px; color: var(--ink); background: transparent; text-align: left; cursor: pointer; }
                .product-brand > span { width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center; flex: 0 0 auto; color: white; background: var(--accent); font-size: 12px; font-weight: 950; }
                .product-brand strong { min-width: 0; overflow: hidden; font-size: 16px; font-weight: 950; text-overflow: ellipsis; white-space: nowrap; }
                .product-brand small { display: block; margin-top: 2px; color: var(--accent); font-size: 7px; letter-spacing: .15em; }
                .product-header-search { height: 43px; border: 1px solid var(--line); border-radius: 13px; padding: 0 14px 0 17px; display: flex; align-items: center; justify-content: space-between; color: var(--muted); background: var(--surface-alt); font-size: 12px; cursor: pointer; }
                .product-cart-button { height: 43px; border: 0; border-radius: 13px; padding: 0 16px; position: relative; display: flex; align-items: center; justify-content: center; gap: 8px; color: white; background: var(--accent); font-size: 11px; font-weight: 850; cursor: pointer; box-shadow: 0 10px 26px color-mix(in srgb, var(--accent) 25%, transparent); }
                .product-cart-button b { min-width: 20px; height: 20px; border-radius: 10px; padding: 0 5px; position: absolute; top: -7px; right: -7px; display: grid; place-items: center; color: var(--accent); background: white; font-size: 9px; box-shadow: 0 3px 12px rgba(0,0,0,.13); }
                .product-nav { width: min(1240px, calc(100% - 40px)); height: 38px; margin: 0 auto; display: flex; align-items: center; gap: 25px; }
                .product-nav button { border: 0; color: var(--ink); background: transparent; font-size: 10px; font-weight: 800; cursor: pointer; }
                .product-nav span { display: flex; align-items: center; gap: 5px; color: var(--muted); font-size: 9px; font-weight: 700; }
                .product-nav span:first-of-type { margin-left: auto; }
                .product-nav :global(svg) { color: var(--accent); }
                .product-shell { width: min(1240px, calc(100% - 40px)); margin: 0 auto; padding: 40px 0 74px; }
                .product-back { margin: 0 0 20px; border: 0; display: inline-flex; align-items: center; gap: 7px; color: var(--muted); background: transparent; font-size: 11px; font-weight: 750; cursor: pointer; }
                .product-layout { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(340px, .78fr); align-items: start; gap: 30px; }
                .product-main-column { min-width: 0; display: grid; gap: 20px; }
                .product-media-card { min-height: 450px; border: 1px solid var(--line); border-radius: 19px; position: relative; overflow: hidden; display: grid; place-items: center; background: var(--surface); box-shadow: var(--page-shadow); }
                .product-media-card > img { width: 100%; height: 100%; min-height: 450px; max-height: 610px; display: block; object-fit: cover; }
                .product-media-card > span { border-radius: 999px; padding: 7px 12px; position: absolute; top: 16px; left: 16px; color: white; background: var(--accent); font-size: 9px; font-weight: 900; text-transform: uppercase; }
                .product-media-fallback { min-height: 450px; padding: 40px; display: grid; place-content: center; justify-items: center; gap: 14px; text-align: center; color: var(--muted); background: radial-gradient(circle at 70% 20%, color-mix(in srgb, var(--accent) 26%, transparent), transparent 32%), var(--surface-alt); }
                .product-media-fallback :global(svg) { font-size: 56px; }
                .product-media-fallback strong { max-width: 520px; color: var(--ink); font-size: 24px; }
                .product-description-card { min-height: 210px; border: 1px solid var(--line); border-radius: 18px; padding: 26px 28px 30px; background: var(--surface); box-shadow: var(--page-shadow); }
                .section-label { margin-bottom: 22px; display: flex; align-items: center; gap: 10px; color: var(--accent); }
                .section-label i { width: 34px; height: 34px; border: 1px solid color-mix(in srgb, var(--accent) 25%, var(--line)); border-radius: 10px; display: grid; place-items: center; background: color-mix(in srgb, var(--accent) 9%, var(--surface)); }
                .section-label span { font-size: 9px; font-weight: 950; letter-spacing: .03em; }
                .product-plain-description, .product-description-empty { color: var(--muted); font-size: 14px; line-height: 1.8; white-space: pre-wrap; overflow-wrap: anywhere; }
                .product-rich-description { color: var(--muted); font-size: 14px; line-height: 1.78; overflow-wrap: anywhere; }
                .product-rich-description h2, .product-rich-description h3, .product-rich-description h4 { margin: 22px 0 10px; color: var(--ink); line-height: 1.25; }
                .product-rich-description h2:first-child, .product-rich-description h3:first-child { margin-top: 0; }
                .product-rich-description p { margin: 0 0 14px; }
                .product-rich-description ul, .product-rich-description ol { margin: 12px 0; padding-left: 24px; }
                .product-rich-description li { margin: 6px 0; }
                .product-rich-description a { color: var(--accent); font-weight: 750; }
                .product-rich-description blockquote { margin: 16px 0; border-left: 3px solid var(--accent); padding: 12px 16px; background: var(--surface-alt); }
                .product-rich-description pre, .product-rich-description code { border-radius: 7px; padding: 2px 5px; background: var(--surface-alt); font-family: Consolas, monospace; }
                .product-rich-description pre { padding: 14px; overflow-x: auto; }
                .product-rich-description table { width: 100%; margin: 16px 0; border-collapse: collapse; }
                .product-rich-description th, .product-rich-description td { border: 1px solid var(--line); padding: 9px 11px; text-align: left; }
                .purchase-information { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
                .purchase-info-card { border: 1px solid var(--line); border-radius: 15px; padding: 17px; display: flex; align-items: flex-start; gap: 11px; background: var(--surface); }
                .purchase-info-card > i { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; flex: 0 0 auto; color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, var(--surface)); }
                .purchase-info-card strong { display: block; margin: 1px 0 5px; font-size: 11px; }
                .purchase-info-card p { color: var(--muted); font-size: 9px; line-height: 1.5; }
                .product-buy-card { border: 1px solid var(--line); border-radius: 19px; padding: 25px; position: sticky; top: 126px; background: var(--surface); box-shadow: var(--page-shadow); }
                .product-buy-badges { display: flex; flex-wrap: wrap; gap: 7px; }
                .product-buy-badges span { border: 1px solid color-mix(in srgb, var(--accent) 22%, var(--line)); border-radius: 999px; padding: 6px 9px; display: flex; align-items: center; gap: 5px; color: var(--accent); background: color-mix(in srgb, var(--accent) 7%, var(--surface)); font-size: 8px; font-weight: 850; }
                .product-buy-card h1 { margin: 15px 0 13px; font-size: clamp(24px, 2.2vw, 34px); line-height: 1.08; font-weight: 950; letter-spacing: -.035em; }
                .product-current-price { font-size: 34px; font-weight: 950; letter-spacing: -.03em; }
                .product-payment-copy { margin-top: 3px; color: var(--muted); font-size: 9px; }
                .product-divider { height: 1px; margin: 20px 0; background: var(--line); }
                .product-plan-label { margin-bottom: 9px; color: var(--accent); font-size: 9px; font-weight: 950; }
                .product-plans { display: grid; gap: 8px; }
                .product-plans button { width: 100%; min-height: 61px; border: 1px solid var(--line); border-radius: 13px; padding: 10px 11px; display: grid; grid-template-columns: 20px minmax(0,1fr) auto; align-items: center; gap: 9px; color: var(--ink); background: var(--surface-alt); text-align: left; cursor: pointer; }
                .product-plans button.selected { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 9%, var(--surface)); box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent); }
                .product-plans button > i { width: 17px; height: 17px; border: 1px solid var(--line); border-radius: 50%; display: grid; place-items: center; color: white; font-size: 10px; }
                .product-plans button.selected > i { border-color: var(--accent); background: var(--accent); }
                .product-plans button span { min-width: 0; }
                .product-plans button strong, .product-plans button small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .product-plans button strong { font-size: 10px; }
                .product-plans button small { margin-top: 3px; color: var(--muted); font-size: 8px; }
                .product-plans button b { font-size: 12px; white-space: nowrap; }
                .product-quantity-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
                .product-quantity-row > div:first-child strong, .product-quantity-row > div:first-child small { display: block; }
                .product-quantity-row > div:first-child strong { color: var(--accent); font-size: 9px; }
                .product-quantity-row > div:first-child small { margin-top: 4px; color: var(--muted); font-size: 8px; }
                .product-quantity { height: 39px; border: 1px solid var(--line); border-radius: 10px; display: grid; grid-template-columns: 35px 34px 35px; align-items: center; overflow: hidden; background: var(--surface-alt); }
                .product-quantity button { height: 100%; border: 0; display: grid; place-items: center; color: var(--accent); background: transparent; cursor: pointer; }
                .product-quantity span { text-align: center; font-size: 11px; font-weight: 850; }
                .product-actions { margin-top: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
                .product-actions button { min-height: 46px; border-radius: 11px; display: flex; align-items: center; justify-content: center; gap: 7px; font-size: 10px; font-weight: 900; cursor: pointer; }
                .product-actions .add { border: 1px solid var(--accent); color: var(--accent); background: transparent; }
                .product-actions .buy { border: 1px solid var(--accent); color: white; background: var(--accent); box-shadow: 0 10px 24px color-mix(in srgb, var(--accent) 25%, transparent); }
                .product-safe-note { margin-top: 13px; border: 1px solid var(--line); border-radius: 11px; padding: 10px 11px; display: flex; align-items: center; gap: 8px; color: var(--muted); background: var(--surface-alt); font-size: 8px; line-height: 1.45; }
                .product-safe-note :global(svg) { flex: 0 0 auto; color: #10b981; font-size: 15px; }
                .product-recommendations { margin-top: 56px; }
                .recommendations-heading { margin-bottom: 16px; display: flex; align-items: flex-end; justify-content: space-between; }
                .recommendations-heading span { color: var(--accent); font-size: 8px; font-weight: 950; letter-spacing: .15em; }
                .recommendations-heading h2 { margin-top: 5px; font-size: 23px; }
                .recommendations-heading button { border: 0; display: flex; align-items: center; gap: 6px; color: var(--accent); background: transparent; font-size: 9px; font-weight: 850; cursor: pointer; }
                .recommendation-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
                .recommendation-card { border: 1px solid var(--line); border-radius: 15px; padding: 0; overflow: hidden; color: var(--ink); background: var(--surface); text-align: left; cursor: pointer; box-shadow: 0 10px 30px rgba(32,73,125,.06); transition: transform .2s ease, box-shadow .2s ease; }
                .recommendation-card:hover { transform: translateY(-3px); box-shadow: var(--page-shadow); }
                .recommendation-card > div { aspect-ratio: 1.75; display: grid; place-items: center; color: var(--muted); background: var(--surface-alt); }
                .recommendation-card img { width: 100%; height: 100%; object-fit: cover; }
                .recommendation-card > span { min-height: 80px; padding: 12px; display: flex; flex-direction: column; justify-content: space-between; }
                .recommendation-card strong { font-size: 10px; line-height: 1.35; }
                .recommendation-card small { margin-top: 12px; font-size: 13px; font-weight: 900; }
                .product-footer { min-height: 90px; border-top: 1px solid var(--line); padding: 0 max(20px, calc((100% - 1240px) / 2)); display: flex; align-items: center; justify-content: space-between; color: var(--muted); background: var(--surface); font-size: 10px; }
                .product-footer strong { color: var(--ink); }
                @media (max-width: 980px) {
                    .product-header-main { grid-template-columns: minmax(0, 1fr) auto; }
                    .product-header-search { display: none; }
                    .product-layout { grid-template-columns: 1fr; }
                    .product-buy-card { position: static; grid-row: 1; }
                    .purchase-information { grid-template-columns: 1fr; }
                    .recommendation-grid { grid-template-columns: repeat(2, 1fr); }
                }
                @media (max-width: 640px) {
                    .product-header-main, .product-nav, .product-shell { width: min(100% - 24px, 1240px); }
                    .product-header-main { height: 64px; gap: 12px; }
                    .product-brand > span { width: 34px; height: 34px; }
                    .product-brand strong { max-width: 150px; font-size: 13px; }
                    .product-cart-button { width: 42px; padding: 0; }
                    .product-cart-button > span { display: none; }
                    .product-nav { height: 35px; gap: 15px; overflow: hidden; }
                    .product-nav span { display: none; }
                    .product-nav button { font-size: 9px; }
                    .product-shell { padding: 24px 0 52px; }
                    .product-layout { gap: 14px; }
                    .product-buy-card { padding: 20px 17px; border-radius: 16px; }
                    .product-media-card, .product-media-card > img, .product-media-fallback { min-height: 260px; }
                    .product-media-card > img { max-height: 420px; }
                    .product-description-card { padding: 20px 17px 24px; }
                    .product-actions { grid-template-columns: 1fr; }
                    .product-actions .buy { grid-row: 1; }
                    .product-recommendations { margin-top: 38px; }
                    .recommendation-grid { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 10px; }
                    .recommendation-card { min-width: 242px; scroll-snap-align: start; }
                    .product-footer { padding: 24px 16px; flex-direction: column; justify-content: center; gap: 8px; }
                }
            `}</style>
        </div>
    );
}
