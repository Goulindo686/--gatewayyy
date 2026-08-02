'use client';

import { CSSProperties, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
    FiArrowRight,
    FiCheck,
    FiChevronRight,
    FiCreditCard,
    FiHeadphones,
    FiInstagram,
    FiLock,
    FiMail,
    FiPackage,
    FiSearch,
    FiShield,
    FiShoppingBag,
    FiUser,
    FiX
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { storeAPI } from '@/lib/api';
import { useCart } from '@/contexts/CartContext';
import StoreBannerCarousel from '@/components/store/StoreBannerCarousel';
import {
    buildAutomaticProductSections,
    buildRenderableStoreSections,
    normalizeStoreBackground,
    normalizeStoreFooter,
    normalizeStoreLayoutSections,
    normalizeStoreStyle,
    STORE_COLOR_PALETTES,
    StoreLayoutSection
} from '@/lib/store-builder';
import styles from './storefront-v3.module.css';

type ProductPlan = {
    id: string;
    name: string;
    price: number;
    price_display: string;
};

type StoreProduct = {
    id: string;
    name: string;
    description?: string | null;
    image_url?: string | null;
    price: number;
    price_display: string;
    has_plans?: boolean;
    plans?: ProductPlan[];
    store_category_id?: string | null;
};

type StoreCategory = {
    id: string;
    name: string;
    slug: string;
};

type StoreData = {
    slug: string;
    name: string;
    description?: string | null;
    banner_url?: string | null;
    template?: string;
    accent_color?: string | null;
    headline?: string | null;
    cta_text?: string | null;
    badge_text?: string | null;
    layout_sections?: unknown;
    footer?: unknown;
    background?: unknown;
    style?: unknown;
};

function getPlans(product: StoreProduct): ProductPlan[] {
    if (Array.isArray(product.plans) && product.plans.length > 0) return product.plans;
    return [{
        id: '__base__',
        name: 'Padrão',
        price: Math.round((product.price || 0) * 100),
        price_display: product.price_display
    }];
}

function hexToRgb(value: string): string {
    const normalized = value.replace('#', '');
    const number = Number.parseInt(normalized, 16);
    if (!Number.isFinite(number)) return '7,10,18';
    return `${(number >> 16) & 255},${(number >> 8) & 255},${number & 255}`;
}

function initials(value: string) {
    return value
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0]?.toUpperCase())
        .join('') || 'LO';
}

export default function StorePage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { addItem, totalItems } = useCart();
    const [store, setStore] = useState<StoreData | null>(null);
    const [categories, setCategories] = useState<StoreCategory[]>([]);
    const [products, setProducts] = useState<StoreProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [quickProduct, setQuickProduct] = useState<StoreProduct | null>(null);
    const [quickPlan, setQuickPlan] = useState<ProductPlan | null>(null);
    const activeCategory = searchParams.get('category') || '';

    useEffect(() => {
        if (!params.slug) return;
        let cancelled = false;
        storeAPI.getStoreBySlug(params.slug as string, activeCategory)
            .then(({ data }) => {
                if (cancelled) return;
                setStore(data.store as StoreData);
                setCategories((data.categories || []) as StoreCategory[]);
                setProducts((data.products || []) as StoreProduct[]);
            })
            .catch(() => {
                if (!cancelled) setStore(null);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [activeCategory, params.slug]);

    useEffect(() => {
        if (!quickProduct) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setQuickProduct(null);
        };
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKeyDown);
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [quickProduct]);

    const filteredProducts = useMemo(() => {
        const term = searchTerm.trim().toLocaleLowerCase('pt-BR');
        if (!term) return products;
        return products.filter(product =>
            product.name.toLocaleLowerCase('pt-BR').includes(term)
            || product.description?.toLocaleLowerCase('pt-BR').includes(term)
        );
    }, [products, searchTerm]);

    const configuredSections = useMemo(
        () => normalizeStoreLayoutSections(store?.layout_sections),
        [store?.layout_sections]
    );
    const renderedSections = useMemo<StoreLayoutSection[]>(() => {
        const ids = filteredProducts.map(product => String(product.id));
        if (searchTerm.trim() || activeCategory) return buildAutomaticProductSections(ids);
        return buildRenderableStoreSections(configuredSections, ids);
    }, [activeCategory, configuredSections, filteredProducts, searchTerm]);
    const productsById = useMemo(
        () => new Map(filteredProducts.map(product => [String(product.id), product])),
        [filteredProducts]
    );

    if (loading && !store) return <StoreLoading />;
    if (!store) return <StoreUnavailable />;

    const slug = store.slug || String(params.slug);
    const storeHomePath = String(params.slug).includes('.') ? '/' : `/store/${slug}`;
    const storeInitials = initials(store.name || slug);
    const footer = normalizeStoreFooter(store.footer);
    const background = normalizeStoreBackground(store.background);
    const visual = normalizeStoreStyle(store.style);
    const palette = visual.color_mode === 'custom'
        ? visual.custom_colors
        : STORE_COLOR_PALETTES[visual.palette_preset];
    const accent = visual.color_mode === 'custom'
        ? palette.accent
        : store.accent_color || palette.accent;
    const supportUrl = footer.instagram
        ? `https://instagram.com/${footer.instagram}`
        : footer.whatsapp
            ? `https://wa.me/${footer.whatsapp.replace(/\D/g, '')}`
            : footer.contact_email
                ? `mailto:${footer.contact_email}`
                : '';
    const featuredProduct = products.find(product => product.image_url) || products[0];
    const heroImage = store.banner_url || featuredProduct?.image_url || '';
    const categoryStats = categories.map(category => ({
        ...category,
        productCount: products.filter(product => product.store_category_id === category.id).length
    }));
    const secondary = visual.color_intensity === 'monochrome'
        ? `color-mix(in srgb, ${accent} 28%, ${palette.bg})`
        : palette.secondary;
    const tertiary = visual.color_intensity === 'vibrant'
        ? palette.tertiary
        : `color-mix(in srgb, ${accent} 45%, ${palette.soft})`;
    const rootStyle = {
        '--store-bg': background.mode === 'color' ? background.color : palette.bg,
        '--store-surface': palette.surface,
        '--store-soft': palette.soft,
        '--store-ink': palette.ink,
        '--store-muted': palette.muted,
        '--store-line': palette.line,
        '--store-deep': palette.deep,
        '--store-accent': accent,
        '--store-secondary': secondary,
        '--store-tertiary': tertiary,
        '--store-glow': visual.color_intensity === 'monochrome' ? accent : palette.glow,
        '--catalog-columns': visual.catalog_columns,
        ...(background.mode === 'image' && background.image_url ? {
            backgroundImage: `linear-gradient(rgba(${hexToRgb(palette.bg)},${background.overlay / 100}),rgba(${hexToRgb(palette.bg)},${background.overlay / 100})),url("${background.image_url}")`
        } : {})
    } as CSSProperties;
    const rootClasses = [
        styles.storefront,
        styles[`font${visual.font_style[0].toUpperCase()}${visual.font_style.slice(1)}`],
        styles[`hero${visual.hero_layout[0].toUpperCase()}${visual.hero_layout.slice(1)}`],
        styles[`image${visual.hero_image_style[0].toUpperCase()}${visual.hero_image_style.slice(1)}`],
        styles[`header${visual.header_style[0].toUpperCase()}${visual.header_style.slice(1)}`],
        styles[`button${visual.button_style[0].toUpperCase()}${visual.button_style.slice(1)}`],
        styles[`cards${visual.card_style[0].toUpperCase()}${visual.card_style.slice(1)}`],
        styles[`corners${visual.corner_style[0].toUpperCase()}${visual.corner_style.slice(1)}`],
        styles[`density${visual.catalog_density[0].toUpperCase()}${visual.catalog_density.slice(1)}`],
        styles[`ratio${visual.image_ratio[0].toUpperCase()}${visual.image_ratio.slice(1)}`],
        styles[`motion${visual.animation_level[0].toUpperCase()}${visual.animation_level.slice(1)}`],
        styles[`pattern${visual.background_pattern[0].toUpperCase()}${visual.background_pattern.slice(1)}`],
        !visual.show_search && styles.noSearch,
        !visual.show_account && styles.noAccount
    ].filter(Boolean).join(' ');

    const handleCategoryClick = (categorySlug: string) => {
        router.push(categorySlug === activeCategory ? storeHomePath : `${storeHomePath}?category=${categorySlug}`);
    };

    const handleNavClick = (url: string) => {
        if (url.startsWith('#')) {
            document.querySelector(url)?.scrollIntoView({ behavior: 'smooth' });
            return;
        }
        if (url.startsWith('/')) {
            router.push(url);
            return;
        }
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const addProductToCart = (product: StoreProduct, plan?: ProductPlan | null) => {
        const selectedPlan = plan || getPlans(product)[0];
        addItem({
            id: product.id,
            name: product.name,
            price: selectedPlan.price / 100,
            price_display: selectedPlan.price_display,
            image_url: product.image_url || undefined,
            plan_id: selectedPlan.id === '__base__' ? undefined : selectedPlan.id,
            plan_name: selectedPlan.name
        });
        toast.success(`${product.name} foi adicionado ao carrinho.`);
    };

    const openQuickView = (product: StoreProduct) => {
        const plans = getPlans(product);
        setQuickProduct({ ...product, plans });
        setQuickPlan(plans[0]);
    };

    const buyNow = () => {
        if (!quickProduct) return;
        addProductToCart(quickProduct, quickPlan);
        router.push(`/store/${slug}/cart?overlay=1`);
    };

    return (
        <div className={rootClasses} style={rootStyle} id="inicio">
            {visual.show_announcement && <div className={styles.announcement}>
                <span>{store.badge_text || 'Uma seleção feita para você'}</span>
                <button type="button" onClick={() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })}>
                    Conhecer a loja <FiArrowRight />
                </button>
            </div>}

            <header className={styles.header}>
                <div className={styles.shell}>
                    <button className={styles.brand} onClick={() => router.push(storeHomePath)} aria-label={`Ir para o início da ${store.name}`}>
                        <span className={styles.brandMark}>{storeInitials}</span>
                        <span>{store.name || slug}</span>
                    </button>
                    <nav className={styles.desktopNav} aria-label="Navegação principal">
                        <button onClick={() => document.getElementById('inicio')?.scrollIntoView({ behavior: 'smooth' })}>Início</button>
                        {visual.show_categories && categories.length > 0 && <button onClick={() => document.getElementById('categorias')?.scrollIntoView({ behavior: 'smooth' })}>Categorias</button>}
                        <button onClick={() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })}>Catálogo</button>
                    </nav>
                    {visual.show_search && <label className={styles.headerSearch}>
                        <FiSearch />
                        <input
                            value={searchTerm}
                            onChange={event => setSearchTerm(event.target.value)}
                            placeholder="Buscar na loja"
                            aria-label="Buscar produtos"
                        />
                        {searchTerm && <button type="button" onClick={() => setSearchTerm('')} aria-label="Limpar busca"><FiX /></button>}
                    </label>}
                    <div className={styles.headerActions}>
                        {visual.show_account && <button type="button" onClick={() => router.push('/login')} aria-label="Minha conta"><FiUser /></button>}
                        <button type="button" className={styles.cartButton} onClick={() => router.push(`/store/${slug}/cart`)} aria-label="Abrir carrinho">
                            <FiShoppingBag />
                            {totalItems > 0 && <span>{totalItems}</span>}
                        </button>
                    </div>
                </div>
            </header>

            <main>
                <section className={`${styles.hero} ${styles.shell}`}>
                    <div className={styles.heroLead}>
                        <div className={styles.heroMeta}>
                            <span><i /> EDIÇÃO ATUAL</span>
                            <small>{String(products.length).padStart(2, '0')} PRODUTOS</small>
                        </div>
                        <div className={styles.heroCopy}>
                            <span className={styles.eyebrow}>SELEÇÃO DA {store.name || slug}</span>
                            <h1>{store.headline || `Uma vitrine feita para descobrir o seu próximo favorito.`}</h1>
                            <p>{store.description || 'Produtos escolhidos com personalidade, apresentados de um jeito direto e atual.'}</p>
                        </div>
                        <div className={styles.heroActions}>
                            <button className={styles.primaryButton} onClick={() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })}>
                                {store.cta_text || 'Explorar a coleção'} <FiArrowRight />
                            </button>
                            {supportUrl && (
                                <button className={styles.textButton} onClick={() => handleNavClick(supportUrl)}>
                                    Falar com a loja <FiChevronRight />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className={styles.heroVisual}>
                        <div
                            className={`${styles.heroImage} ${heroImage ? styles.hasImage : ''}`}
                            style={heroImage ? { backgroundImage: `url("${heroImage}")` } : undefined}
                            role="img"
                            aria-label={heroImage ? `Imagem de capa da ${store.name}` : `Identidade da ${store.name}`}
                        >
                            {!heroImage && <span>{storeInitials}</span>}
                        </div>
                        <div className={styles.heroVisualTop}>
                            <span>FEATURED / {new Date().getFullYear()}</span>
                            <i><FiArrowRight /></i>
                        </div>
                        <div className={styles.heroVisualBottom}>
                            <div><small>EM DESTAQUE</small><strong>{featuredProduct?.name || 'Nova seleção'}</strong></div>
                            {featuredProduct && <button onClick={() => openQuickView(featuredProduct)}>Descobrir <FiArrowRight /></button>}
                        </div>
                    </div>

                    <aside className={styles.heroRail}>
                        <button className={styles.heroRailPrimary} onClick={() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })}>
                            <span>NOVA<br />CURADORIA</span>
                            <FiArrowRight />
                            <small>Explore a seleção completa</small>
                        </button>
                        <div className={styles.heroRailBrand}>
                            <span>{storeInitials}</span>
                            <div><small>IDENTIDADE</small><strong>{store.name || slug}</strong></div>
                        </div>
                    </aside>
                </section>

                {visual.show_service_bar && <section className={`${styles.trustDock} ${styles.shell}`}>
                    <div><FiShield /><span><strong>Proteção</strong><small>Compra processada com segurança</small></span></div>
                    <div><FiCreditCard /><span><strong>Flexibilidade</strong><small>PIX e cartão para escolher</small></span></div>
                    <div><FiHeadphones /><span><strong>Presença</strong><small>Suporte direto com a loja</small></span></div>
                    <div className={styles.trustDockStatus}><i /> AMBIENTE SEGURO</div>
                </section>}

                {visual.show_marquee && <div className={styles.signalRail} aria-hidden="true">
                    <div>
                        {[0, 1].map(copy => (
                            <span key={copy}>
                                <b>NOVO AGORA</b><i />
                                <b>ESCOLHAS AUTORAIS</b><i />
                                <b>COMPRA SEGURA</b><i />
                                <b>FEITO PARA VOCÊ</b><i />
                            </span>
                        ))}
                    </div>
                </div>}

                {visual.show_categories && categories.length > 0 && !searchTerm && !activeCategory && (
                    <section className={`${styles.collectionDeck} ${styles.shell}`} id="categorias">
                        <div className={styles.sectionIntro}>
                            <div>
                                <span className={styles.eyebrow}>COLEÇÕES / {String(categories.length).padStart(2, '0')}</span>
                                <h2>Escolha uma direção.</h2>
                            </div>
                            <p>Navegue por universos diferentes e encontre mais rápido o que combina com você.</p>
                        </div>
                        <div className={styles.collectionGrid}>
                            {categoryStats.slice(0, 6).map((category, index) => (
                                <button
                                    key={category.id}
                                    className={[styles.collectionToneA, styles.collectionToneB, styles.collectionToneC][index % 3]}
                                    onClick={() => handleCategoryClick(category.slug)}
                                >
                                    <span className={styles.collectionIndex}>{String(index + 1).padStart(2, '0')}</span>
                                    <div><strong>{category.name}</strong><small>{category.productCount} {category.productCount === 1 ? 'item' : 'itens'}</small></div>
                                    <span className={styles.collectionArrow}><FiArrowRight /></span>
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                <section className={`${styles.catalog} ${styles.shell}`} id="catalogo">
                    <div className={styles.catalogHead}>
                        <div className={styles.catalogTitle}>
                            <span>SHOP / {String(filteredProducts.length).padStart(2, '0')}</span>
                            <h2>{activeCategory ? categories.find(category => category.slug === activeCategory)?.name || 'Sua seleção' : 'O que está em cena.'}</h2>
                            <p>{activeCategory ? 'Uma curadoria filtrada para você.' : 'Descubra produtos que merecem espaço na sua rotina.'}</p>
                        </div>
                        <div className={styles.catalogControls}>
                            <small>{filteredProducts.length} {filteredProducts.length === 1 ? 'RESULTADO' : 'RESULTADOS'}</small>
                            {visual.show_search && <label className={styles.catalogSearch}>
                                <FiSearch />
                                <input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Buscar produto" />
                                {searchTerm && <button type="button" onClick={() => setSearchTerm('')} aria-label="Limpar busca"><FiX /></button>}
                            </label>}
                        </div>
                    </div>

                    {visual.show_categories && <div className={styles.categoryPills} aria-label="Filtrar por categoria">
                        <button className={!activeCategory ? styles.active : ''} onClick={() => handleCategoryClick('')}>Todos</button>
                        {categories.map(category => (
                            <button
                                key={category.id}
                                className={activeCategory === category.slug ? styles.active : ''}
                                onClick={() => handleCategoryClick(category.slug)}
                            >
                                {category.name}
                            </button>
                        ))}
                    </div>}

                    {filteredProducts.length === 0 ? (
                        <div className={styles.emptyState}>
                            <FiPackage />
                            <h3>Nenhum produto por aqui</h3>
                            <p>Tente uma categoria diferente ou faça uma nova busca.</p>
                            <button onClick={() => { setSearchTerm(''); handleCategoryClick(''); }}>Ver todos os produtos</button>
                        </div>
                    ) : (
                        <div className={styles.storeSections}>
                            {renderedSections.map(section => section.type === 'banner_carousel' ? (
                                <StoreBannerCarousel
                                    key={section.id}
                                    section={section}
                                    accent={accent}
                                    surface={palette.surface}
                                    border={palette.line}
                                    onNavigate={handleNavClick}
                                />
                            ) : (
                                <section className={styles.productSection} key={section.id}>
                                    <div className={styles.productSectionHeading}>
                                        <div>
                                            <span>{section.title || 'Seleção em destaque'}</span>
                                            {section.subtitle && <p>{section.subtitle}</p>}
                                        </div>
                                        <small>EDIÇÃO {String(section.product_ids.length).padStart(2, '0')}</small>
                                    </div>
                                    <div className={styles.productGrid}>
                                        {section.product_ids
                                            .map(productId => productsById.get(productId))
                                            .filter((product): product is StoreProduct => Boolean(product))
                                            .map((product, productIndex) => (
                                                <article
                                                    className={`${styles.productCard} ${[styles.productToneA, styles.productToneB, styles.productToneC, styles.productToneD][productIndex % 4]}`}
                                                    key={product.id}
                                                >
                                                    <button
                                                        className={`${styles.productVisual} ${product.image_url ? styles.hasImage : ''}`}
                                                        style={product.image_url ? { backgroundImage: `url("${product.image_url}")` } : undefined}
                                                        onClick={() => openQuickView(product)}
                                                        aria-label={`Ver detalhes de ${product.name}`}
                                                    >
                                                        {!product.image_url && <span>{initials(product.name)}</span>}
                                                        <div className={styles.productFlags}>
                                                            <span>{product.has_plans ? 'COM OPÇÕES' : 'EM DESTAQUE'}</span>
                                                            <small>{String(productIndex + 1).padStart(2, '0')}</small>
                                                        </div>
                                                        <i className={styles.productQuick}>Abrir <FiArrowRight /></i>
                                                    </button>
                                                    <div className={styles.productInfo}>
                                                        <div className={styles.productNameRow}>
                                                            <h3>{product.name}</h3>
                                                            <button onClick={() => openQuickView(product)} aria-label={`Ver ${product.name}`}><FiArrowRight /></button>
                                                        </div>
                                                        <p>{product.description || 'Confira os detalhes desta escolha e encontre a opção ideal para você.'}</p>
                                                        <div className={styles.productPrice}>
                                                            <small>{product.has_plans ? 'A PARTIR DE' : 'VALOR'}</small>
                                                            <strong>R$ {product.price_display}</strong>
                                                        </div>
                                                    </div>
                                                </article>
                                            ))}
                                    </div>
                                </section>
                            ))}
                        </div>
                    )}
                </section>

                <section className={`${styles.brandStatement} ${styles.shell}`}>
                    <div className={styles.statementWord} aria-hidden="true">ESCOLHA</div>
                    <div className={styles.statementContent}>
                        <span className={styles.eyebrow}>UMA EXPERIÊNCIA DA {store.name || slug}</span>
                        <h2>Menos excesso.<br />Mais do que faz sentido.</h2>
                        <p>Explore no seu ritmo, veja cada detalhe e finalize sua compra em um ambiente protegido.</p>
                        <button className={styles.primaryButton} onClick={() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })}>
                            Rever a seleção <FiArrowRight />
                        </button>
                    </div>
                    <div className={styles.statementStats}>
                        <div><strong>{String(products.length).padStart(2, '0')}</strong><span>produtos escolhidos</span></div>
                        <div><strong>100%</strong><span>compra protegida</span></div>
                    </div>
                </section>
            </main>

            {footer.enabled && (
                <footer className={styles.footer}>
                    <div className={`${styles.footerMain} ${styles.shell}`}>
                        <div className={styles.footerBrand}>
                            <span className={styles.brandMark}>{storeInitials}</span>
                            <div><strong>{store.name || slug}</strong><p>{footer.description || 'Uma seleção feita para você escolher com confiança.'}</p></div>
                        </div>
                        <div className={styles.footerLinks}>
                            {footer.links.map(link => <button key={link.id} onClick={() => handleNavClick(link.url)}>{link.label}</button>)}
                            {footer.contact_email && <a href={`mailto:${footer.contact_email}`}><FiMail /> E-mail</a>}
                            {footer.whatsapp && <a href={`https://wa.me/${footer.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"><FiHeadphones /> WhatsApp</a>}
                            {footer.instagram && <a href={`https://instagram.com/${footer.instagram}`} target="_blank" rel="noreferrer"><FiInstagram /> Instagram</a>}
                        </div>
                    </div>
                    <div className={`${styles.footerBottom} ${styles.shell}`}>
                        <span>© {new Date().getFullYear()} {store.name || slug}. {footer.copyright_text || 'Todos os direitos reservados.'}</span>
                        <span><FiLock /> Pagamento seguro via GouPay</span>
                    </div>
                </footer>
            )}

            {quickProduct && quickPlan && (
                <div className={styles.modalBackdrop} onMouseDown={() => setQuickProduct(null)}>
                    <div className={styles.productModal} role="dialog" aria-modal="true" aria-labelledby="quick-product-title" onMouseDown={event => event.stopPropagation()}>
                        <button className={styles.modalClose} onClick={() => setQuickProduct(null)} aria-label="Fechar"><FiX /></button>
                        <div
                            className={`${styles.modalImage} ${quickProduct.image_url ? styles.hasImage : ''}`}
                            style={quickProduct.image_url ? { backgroundImage: `url("${quickProduct.image_url}")` } : undefined}
                        >
                            {!quickProduct.image_url && <span>{initials(quickProduct.name)}</span>}
                        </div>
                        <div className={styles.modalContent}>
                            <span className={styles.eyebrow}>DETALHES DO PRODUTO</span>
                            <h2 id="quick-product-title">{quickProduct.name}</h2>
                            <p>{quickProduct.description || 'Confira as opções disponíveis e escolha a que faz mais sentido para você.'}</p>
                            <div className={styles.planList}>
                                <strong>Escolha uma opção</strong>
                                {getPlans(quickProduct).map(plan => (
                                    <button key={plan.id} className={quickPlan.id === plan.id ? styles.selected : ''} onClick={() => setQuickPlan(plan)}>
                                        <span><i>{quickPlan.id === plan.id && <FiCheck />}</i>{plan.name}</span>
                                        <strong>R$ {plan.price_display}</strong>
                                    </button>
                                ))}
                            </div>
                            <div className={styles.modalPurchase}>
                                <div><small>Total</small><strong>R$ {quickPlan.price_display}</strong></div>
                                <button className={styles.primaryButton} onClick={buyNow}>Comprar agora <FiArrowRight /></button>
                                <button className={styles.addToCart} onClick={() => addProductToCart(quickProduct, quickPlan)}><FiShoppingBag /> Adicionar ao carrinho</button>
                            </div>
                            <div className={styles.modalSecurity}><FiShield /> Sua compra é processada em ambiente protegido.</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StoreLoading() {
    return (
        <div className={styles.loadingPage}>
            <span /><p>Preparando a loja...</p>
        </div>
    );
}

function StoreUnavailable() {
    return (
        <div className={styles.unavailablePage}>
            <div><FiPackage /><span>LOJA INDISPONÍVEL</span><h1>Esta vitrine não está aberta agora.</h1><p>Ela pode estar em manutenção ou o endereço informado não existe.</p></div>
        </div>
    );
}
