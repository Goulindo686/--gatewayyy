'use client';

import {
    buildAutomaticProductSections,
    createStoreBuilderId,
    STORE_BUILDER_LIMITS,
    StoreBannerSection,
    StoreContentSection,
    StoreFaqSection,
    StoreFeaturesSection,
    StoreLayoutSection,
    StoreProductSection,
    StoreTestimonialsSection
} from '@/lib/store-builder';
import {
    FiAlignLeft,
    FiArrowDown,
    FiArrowUp,
    FiCheck,
    FiHelpCircle,
    FiImage,
    FiMessageSquare,
    FiPlus,
    FiStar,
    FiTrash2,
    FiUpload
} from 'react-icons/fi';

type StoreProduct = {
    id: string;
    name: string;
    image_url?: string | null;
    status?: string;
    show_in_store?: boolean;
};

type Props = {
    sections: StoreLayoutSection[];
    products: StoreProduct[];
    uploadingSlideId: string | null;
    onChange: (sections: StoreLayoutSection[]) => void;
    onUploadSlide: (sectionId: string, slideId: string, file: File) => Promise<void>;
    onUploadSectionImage: (sectionId: string, file: File) => Promise<void>;
};

function newProductSection(productIds: string[] = []): StoreProductSection {
    return {
        id: createStoreBuilderId('products'),
        type: 'products',
        title: 'Nova seleção de produtos',
        subtitle: '',
        product_ids: productIds.slice(0, STORE_BUILDER_LIMITS.productsPerSection)
    };
}

function newBannerSection(): StoreBannerSection {
    return {
        id: createStoreBuilderId('banners'),
        type: 'banner_carousel',
        title: 'Destaques da loja',
        slides: [{
            id: createStoreBuilderId('slide'),
            image_url: '',
            title: '',
            description: '',
            button_text: '',
            button_url: ''
        }]
    };
}

function newContentSection(): StoreContentSection {
    return {
        id: createStoreBuilderId('content'),
        type: 'content',
        eyebrow: 'SOBRE A MARCA',
        title: 'Conte a história por trás da sua oferta',
        description: 'Apresente sua proposta, seu método ou a transformação que seus clientes encontram aqui.',
        image_url: '',
        image_position: 'right',
        tone: 'surface',
        button_text: '',
        button_url: ''
    };
}

function newFeaturesSection(): StoreFeaturesSection {
    return {
        id: createStoreBuilderId('features'),
        type: 'features',
        title: 'Por que escolher esta loja',
        subtitle: 'Mostre os principais diferenciais da sua marca, produto ou serviço.',
        items: [
            { id: createStoreBuilderId('feature'), title: 'Experiência confiável', description: 'Explique o que torna sua oferta especial.' },
            { id: createStoreBuilderId('feature'), title: 'Compra simples', description: 'Mostre como é fácil começar.' },
            { id: createStoreBuilderId('feature'), title: 'Suporte próximo', description: 'Destaque o atendimento disponível.' }
        ]
    };
}

function newTestimonialsSection(): StoreTestimonialsSection {
    return {
        id: createStoreBuilderId('testimonials'),
        type: 'testimonials',
        title: 'Quem compra recomenda',
        subtitle: 'Use relatos reais para aumentar a confiança na sua marca.',
        items: [{ id: createStoreBuilderId('testimonial'), quote: '', name: '', role: '' }]
    };
}

function newFaqSection(): StoreFaqSection {
    return {
        id: createStoreBuilderId('faq'),
        type: 'faq',
        title: 'Perguntas frequentes',
        subtitle: 'Antecipe dúvidas importantes antes da compra.',
        items: [{ id: createStoreBuilderId('faq-item'), question: '', answer: '' }]
    };
}

function sectionLabel(section: StoreLayoutSection): [string, string] {
    switch (section.type) {
        case 'products': return ['LINHA DE PRODUTOS', `${section.product_ids.length} de ${STORE_BUILDER_LIMITS.productsPerSection} produtos`];
        case 'banner_carousel': return ['CARROSSEL DE BANNERS', `${section.slides.length} banner${section.slides.length === 1 ? '' : 's'}`];
        case 'content': return ['CONTEÚDO INSTITUCIONAL', section.title || 'Bloco de apresentação'];
        case 'features': return ['DIFERENCIAIS', `${section.items.length} item${section.items.length === 1 ? '' : 's'}`];
        case 'testimonials': return ['DEPOIMENTOS', `${section.items.length} relato${section.items.length === 1 ? '' : 's'}`];
        case 'faq': return ['PERGUNTAS FREQUENTES', `${section.items.length} pergunta${section.items.length === 1 ? '' : 's'}`];
    }
}

export default function StoreBuilderEditor({
    sections,
    products,
    uploadingSlideId,
    onChange,
    onUploadSlide,
    onUploadSectionImage
}: Props) {
    const visibleProducts = products.filter(product => product.status === 'active' && product.show_in_store);

    const replaceSection = (sectionId: string, next: StoreLayoutSection) => {
        onChange(sections.map(section => section.id === sectionId ? next : section));
    };

    const removeSection = (sectionId: string) => {
        onChange(sections.filter(section => section.id !== sectionId));
    };

    const moveSection = (index: number, direction: -1 | 1) => {
        const target = index + direction;
        if (target < 0 || target >= sections.length) return;
        const next = [...sections];
        [next[index], next[target]] = [next[target], next[index]];
        onChange(next);
    };

    const addProductSection = () => {
        const selected = new Set(
            sections.flatMap(section => section.type === 'products' ? section.product_ids : [])
        );
        const suggestedIds = visibleProducts
            .filter(product => !selected.has(product.id))
            .slice(0, STORE_BUILDER_LIMITS.productsPerSection)
            .map(product => product.id);
        onChange([...sections, newProductSection(suggestedIds)]);
    };

    const buildAutomatically = () => {
        const customSections = sections.filter(section => section.type !== 'products');
        onChange([...buildAutomaticProductSections(visibleProducts.map(product => product.id)), ...customSections]);
    };

    return (
        <section className="glass-card" style={{ padding: 24 }}>
            <div className="builder-heading">
                <div>
                    <span className="builder-kicker">ETAPA 3</span>
                    <h3 className="builder-title">Estrutura da vitrine</h3>
                    <p className="builder-description">
                        Combine produtos, banners, conteúdo, diferenciais, depoimentos e perguntas em qualquer ordem.
                    </p>
                </div>
                {visibleProducts.length > 0 && (
                    <button type="button" className="btn-secondary" onClick={buildAutomatically}>
                        Organizar produtos automaticamente
                    </button>
                )}
            </div>

            {sections.length === 0 ? (
                <div className="builder-empty">
                    <div className="builder-empty-icon"><FiPlus size={24} /></div>
                    <strong>Comece a montar sua página</strong>
                    <p>
                        Enquanto nenhuma seção for criada, a loja continua mostrando automaticamente todos os produtos visíveis.
                    </p>
                </div>
            ) : (
                <div className="builder-section-list">
                    {sections.map((section, index) => {
                        const [label, summary] = sectionLabel(section);
                        return (
                        <article className="builder-section-card" key={section.id}>
                            <div className="builder-section-toolbar">
                                <div className="builder-section-number">{String(index + 1).padStart(2, '0')}</div>
                                <div style={{ minWidth: 0 }}>
                                    <span className="builder-section-type">
                                        {label}
                                    </span>
                                    <div className="builder-section-summary">
                                        {summary}
                                    </div>
                                </div>
                                <div className="builder-section-actions">
                                    <button type="button" onClick={() => moveSection(index, -1)} disabled={index === 0} aria-label="Mover seção para cima"><FiArrowUp /></button>
                                    <button type="button" onClick={() => moveSection(index, 1)} disabled={index === sections.length - 1} aria-label="Mover seção para baixo"><FiArrowDown /></button>
                                    <button type="button" className="danger" onClick={() => removeSection(section.id)} aria-label="Excluir seção"><FiTrash2 /></button>
                                </div>
                            </div>

                            {section.type === 'products' ? (
                                <ProductSectionEditor
                                    section={section}
                                    products={visibleProducts}
                                    onChange={next => replaceSection(section.id, next)}
                                />
                            ) : section.type === 'banner_carousel' ? (
                                <BannerSectionEditor
                                    section={section}
                                    uploadingSlideId={uploadingSlideId}
                                    onChange={next => replaceSection(section.id, next)}
                                    onUpload={(slideId, file) => onUploadSlide(section.id, slideId, file)}
                                />
                            ) : section.type === 'content' ? (
                                <ContentSectionEditor
                                    section={section}
                                    uploading={uploadingSlideId === section.id}
                                    onChange={next => replaceSection(section.id, next)}
                                    onUpload={file => onUploadSectionImage(section.id, file)}
                                />
                            ) : section.type === 'features' ? (
                                <FeaturesSectionEditor section={section} onChange={next => replaceSection(section.id, next)} />
                            ) : section.type === 'testimonials' ? (
                                <TestimonialsSectionEditor section={section} onChange={next => replaceSection(section.id, next)} />
                            ) : (
                                <FaqSectionEditor section={section} onChange={next => replaceSection(section.id, next)} />
                            )}
                        </article>
                    );})}
                </div>
            )}

            <div className="builder-add-row">
                <button
                    type="button"
                    onClick={addProductSection}
                    disabled={sections.length >= STORE_BUILDER_LIMITS.sections}
                >
                    <span><FiPlus /></span>
                    <strong>Adicionar linha de produtos</strong>
                    <small>Escolha até 4 produtos</small>
                </button>
                <button
                    type="button"
                    onClick={() => onChange([...sections, newBannerSection()])}
                    disabled={sections.length >= STORE_BUILDER_LIMITS.sections}
                >
                    <span><FiImage /></span>
                    <strong>Adicionar carrossel</strong>
                    <small>Use vários banners</small>
                </button>
                <button type="button" onClick={() => onChange([...sections, newContentSection()])} disabled={sections.length >= STORE_BUILDER_LIMITS.sections}>
                    <span><FiAlignLeft /></span>
                    <strong>Adicionar conteúdo</strong>
                    <small>Texto, imagem e chamada</small>
                </button>
                <button type="button" onClick={() => onChange([...sections, newFeaturesSection()])} disabled={sections.length >= STORE_BUILDER_LIMITS.sections}>
                    <span><FiStar /></span>
                    <strong>Adicionar diferenciais</strong>
                    <small>Benefícios da sua oferta</small>
                </button>
                <button type="button" onClick={() => onChange([...sections, newTestimonialsSection()])} disabled={sections.length >= STORE_BUILDER_LIMITS.sections}>
                    <span><FiMessageSquare /></span>
                    <strong>Adicionar depoimentos</strong>
                    <small>Prova social da marca</small>
                </button>
                <button type="button" onClick={() => onChange([...sections, newFaqSection()])} disabled={sections.length >= STORE_BUILDER_LIMITS.sections}>
                    <span><FiHelpCircle /></span>
                    <strong>Adicionar perguntas</strong>
                    <small>Respostas antes da compra</small>
                </button>
            </div>

            <style jsx global>{`
                .builder-heading {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 20px;
                    margin-bottom: 22px;
                }
                .builder-kicker {
                    display: block;
                    color: var(--accent-primary);
                    font-size: 11px;
                    font-weight: 900;
                    letter-spacing: .12em;
                    margin-bottom: 7px;
                }
                .builder-title {
                    font-size: 21px;
                    font-weight: 850;
                    margin-bottom: 7px;
                }
                .builder-description {
                    max-width: 650px;
                    color: var(--text-secondary);
                    font-size: 13px;
                    line-height: 1.55;
                }
                .builder-empty {
                    border: 1px dashed var(--border-color);
                    border-radius: 18px;
                    padding: 38px 20px;
                    display: grid;
                    justify-items: center;
                    text-align: center;
                    background: var(--bg-secondary);
                }
                .builder-empty-icon {
                    width: 50px;
                    height: 50px;
                    border-radius: 16px;
                    display: grid;
                    place-items: center;
                    color: var(--accent-primary);
                    background: rgba(108,92,231,.12);
                    margin-bottom: 13px;
                }
                .builder-empty p {
                    color: var(--text-secondary);
                    font-size: 13px;
                    line-height: 1.5;
                    max-width: 520px;
                    margin-top: 6px;
                }
                .builder-section-list {
                    display: grid;
                    gap: 14px;
                }
                .builder-section-card {
                    border: 1px solid var(--border-color);
                    border-radius: 18px;
                    background: var(--bg-secondary);
                    overflow: hidden;
                }
                .builder-section-toolbar {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 14px 16px;
                    border-bottom: 1px solid var(--border-color);
                    background: rgba(108,92,231,.035);
                }
                .builder-section-number {
                    width: 38px;
                    height: 38px;
                    border-radius: 12px;
                    display: grid;
                    place-items: center;
                    flex: 0 0 auto;
                    background: rgba(108,92,231,.12);
                    color: var(--accent-primary);
                    font-size: 12px;
                    font-weight: 900;
                }
                .builder-section-type {
                    display: block;
                    color: var(--text-primary);
                    font-size: 11px;
                    font-weight: 900;
                    letter-spacing: .08em;
                }
                .builder-section-summary {
                    color: var(--text-secondary);
                    font-size: 12px;
                    margin-top: 3px;
                }
                .builder-section-actions {
                    display: flex;
                    gap: 6px;
                    margin-left: auto;
                }
                .builder-section-actions button {
                    width: 34px;
                    height: 34px;
                    border: 1px solid var(--border-color);
                    border-radius: 10px;
                    display: grid;
                    place-items: center;
                    color: var(--text-secondary);
                    background: var(--bg-card);
                    cursor: pointer;
                }
                .builder-section-actions button:disabled {
                    opacity: .35;
                    cursor: not-allowed;
                }
                .builder-section-actions button.danger {
                    color: var(--danger);
                }
                .builder-section-body {
                    padding: 17px;
                    display: grid;
                    gap: 15px;
                }
                .builder-fields-two {
                    display: grid;
                    grid-template-columns: 1fr 1.25fr;
                    gap: 12px;
                }
                .builder-field-label {
                    display: block;
                    color: var(--text-secondary);
                    font-size: 12px;
                    font-weight: 750;
                    margin-bottom: 6px;
                }
                .builder-products {
                    display: grid;
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                    gap: 9px;
                }
                .builder-product-option {
                    position: relative;
                    min-height: 112px;
                    border: 1px solid var(--border-color);
                    border-radius: 13px;
                    overflow: hidden;
                    padding: 0;
                    text-align: left;
                    background: var(--bg-card);
                    color: var(--text-primary);
                    cursor: pointer;
                }
                .builder-product-option.selected {
                    border-color: var(--accent-primary);
                    box-shadow: 0 0 0 2px rgba(108,92,231,.12);
                }
                .builder-product-option:disabled {
                    opacity: .45;
                    cursor: not-allowed;
                }
                .builder-product-media {
                    height: 66px;
                    background: linear-gradient(135deg, rgba(108,92,231,.8), rgba(30,41,59,.8));
                    background-size: cover;
                    background-position: center;
                }
                .builder-product-option strong {
                    display: block;
                    padding: 9px 10px;
                    font-size: 11px;
                    line-height: 1.25;
                    overflow: hidden;
                    white-space: nowrap;
                    text-overflow: ellipsis;
                }
                .builder-product-check {
                    position: absolute;
                    top: 7px;
                    right: 7px;
                    width: 22px;
                    height: 22px;
                    border-radius: 999px;
                    display: grid;
                    place-items: center;
                    color: white;
                    background: var(--accent-primary);
                }
                .builder-no-products {
                    border: 1px dashed var(--border-color);
                    border-radius: 13px;
                    padding: 18px;
                    color: var(--text-secondary);
                    text-align: center;
                    font-size: 13px;
                }
                .builder-slides {
                    display: grid;
                    gap: 12px;
                }
                .builder-slide {
                    border: 1px solid var(--border-color);
                    border-radius: 14px;
                    padding: 13px;
                    display: grid;
                    grid-template-columns: 180px 1fr;
                    gap: 14px;
                    background: var(--bg-card);
                }
                .builder-slide-upload {
                    min-height: 145px;
                    border: 1px dashed var(--border-color);
                    border-radius: 12px;
                    display: grid;
                    place-items: center;
                    overflow: hidden;
                    background: var(--bg-secondary);
                    cursor: pointer;
                }
                .builder-slide-upload img {
                    width: 100%;
                    height: 145px;
                    object-fit: cover;
                }
                .builder-slide-upload span {
                    display: grid;
                    justify-items: center;
                    gap: 8px;
                    color: var(--text-secondary);
                    font-size: 12px;
                    font-weight: 750;
                }
                .builder-slide-fields {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                }
                .builder-slide-fields .wide {
                    grid-column: 1 / -1;
                }
                .builder-slide-delete {
                    justify-self: end;
                    border: none;
                    background: transparent;
                    color: var(--danger);
                    font-size: 12px;
                    font-weight: 800;
                    cursor: pointer;
                }
                .builder-add-slide {
                    min-height: 44px;
                    border: 1px dashed var(--border-color);
                    border-radius: 12px;
                    background: transparent;
                    color: var(--text-secondary);
                    font-weight: 800;
                    cursor: pointer;
                }
                .builder-add-row {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 12px;
                    margin-top: 16px;
                }
                .builder-add-row > button {
                    min-height: 78px;
                    border: 1px dashed var(--border-color);
                    border-radius: 15px;
                    background: transparent;
                    color: var(--text-primary);
                    padding: 13px;
                    display: grid;
                    grid-template-columns: 38px 1fr;
                    grid-template-rows: auto auto;
                    column-gap: 11px;
                    text-align: left;
                    cursor: pointer;
                }
                .builder-add-row > button > span {
                    grid-row: 1 / 3;
                    width: 38px;
                    height: 38px;
                    border-radius: 12px;
                    display: grid;
                    place-items: center;
                    color: var(--accent-primary);
                    background: rgba(108,92,231,.12);
                }
                .builder-add-row > button strong {
                    font-size: 13px;
                    align-self: end;
                }
                .builder-add-row > button small {
                    color: var(--text-secondary);
                    align-self: start;
                }
                .builder-content-layout {
                    display: grid;
                    grid-template-columns: minmax(220px, .8fr) 1.2fr;
                    gap: 14px;
                    align-items: start;
                }
                .builder-content-image {
                    min-height: 210px;
                    border: 1px dashed var(--border-color);
                    border-radius: 14px;
                    display: grid;
                    place-items: center;
                    overflow: hidden;
                    color: var(--text-secondary);
                    background: var(--bg-card);
                    cursor: pointer;
                }
                .builder-content-image img {
                    width: 100%;
                    height: 210px;
                    object-fit: cover;
                }
                .builder-content-image span {
                    display: grid;
                    justify-items: center;
                    gap: 8px;
                    font-size: 12px;
                    font-weight: 800;
                }
                .builder-inline-remove {
                    border: 0;
                    background: transparent;
                    color: var(--danger);
                    justify-self: start;
                    font-size: 12px;
                    font-weight: 800;
                    cursor: pointer;
                }
                .builder-repeat-list {
                    display: grid;
                    gap: 10px;
                }
                .builder-repeat-item {
                    border: 1px solid var(--border-color);
                    border-radius: 14px;
                    padding: 12px;
                    display: grid;
                    grid-template-columns: 34px .8fr 1.2fr 34px;
                    gap: 9px;
                    align-items: center;
                    background: var(--bg-card);
                }
                .builder-repeat-item.testimonial {
                    grid-template-columns: 34px 1fr 1fr 34px;
                }
                .builder-repeat-item.faq {
                    grid-template-columns: 34px .8fr 1.2fr 34px;
                }
                .builder-repeat-item > span {
                    width: 30px;
                    height: 30px;
                    border-radius: 9px;
                    display: grid;
                    place-items: center;
                    color: var(--accent-primary);
                    background: rgba(108,92,231,.10);
                    font-size: 10px;
                    font-weight: 900;
                }
                .builder-repeat-item > button {
                    width: 34px;
                    height: 34px;
                    border: 1px solid var(--border-color);
                    border-radius: 10px;
                    display: grid;
                    place-items: center;
                    color: var(--danger);
                    background: var(--bg-secondary);
                    cursor: pointer;
                }
                .builder-repeat-item .wide {
                    grid-column: 2 / 4;
                }
                @media (max-width: 900px) {
                    .builder-add-row {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }
                    .builder-products {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }
                    .builder-slide {
                        grid-template-columns: 1fr;
                    }
                    .builder-slide-upload {
                        min-height: 170px;
                    }
                    .builder-slide-upload img {
                        height: 170px;
                    }
                    .builder-content-layout {
                        grid-template-columns: 1fr;
                    }
                    .builder-repeat-item,
                    .builder-repeat-item.testimonial,
                    .builder-repeat-item.faq {
                        grid-template-columns: 30px 1fr 34px;
                    }
                    .builder-repeat-item > :not(span):not(button),
                    .builder-repeat-item .wide {
                        grid-column: 2;
                    }
                    .builder-repeat-item > button {
                        grid-column: 3;
                        grid-row: 1;
                    }
                }
                @media (max-width: 640px) {
                    .builder-heading {
                        display: grid;
                    }
                    .builder-fields-two,
                    .builder-add-row,
                    .builder-slide-fields {
                        grid-template-columns: 1fr;
                    }
                    .builder-slide-fields .wide {
                        grid-column: auto;
                    }
                    .builder-add-row {
                        grid-template-columns: 1fr;
                    }
                    .builder-section-toolbar {
                        align-items: flex-start;
                    }
                    .builder-section-number {
                        display: none;
                    }
                    .builder-section-actions {
                        gap: 4px;
                    }
                    .builder-section-actions button {
                        width: 31px;
                        height: 31px;
                    }
                }
            `}</style>
        </section>
    );
}

function ProductSectionEditor({
    section,
    products,
    onChange
}: {
    section: StoreProductSection;
    products: StoreProduct[];
    onChange: (section: StoreProductSection) => void;
}) {
    const toggleProduct = (productId: string) => {
        const selected = section.product_ids.includes(productId);
        if (selected) {
            onChange({ ...section, product_ids: section.product_ids.filter(id => id !== productId) });
            return;
        }
        if (section.product_ids.length >= STORE_BUILDER_LIMITS.productsPerSection) return;
        onChange({ ...section, product_ids: [...section.product_ids, productId] });
    };

    return (
        <div className="builder-section-body">
            <div className="builder-fields-two">
                <div>
                    <label className="builder-field-label">Título da linha</label>
                    <input className="input-field" maxLength={100} value={section.title} onChange={event => onChange({ ...section, title: event.target.value })} placeholder="Ex: Mais vendidos" />
                </div>
                <div>
                    <label className="builder-field-label">Texto de apoio</label>
                    <input className="input-field" maxLength={220} value={section.subtitle} onChange={event => onChange({ ...section, subtitle: event.target.value })} placeholder="Uma frase curta para esta seleção" />
                </div>
            </div>

            <div>
                <label className="builder-field-label">
                    Produtos selecionados ({section.product_ids.length}/{STORE_BUILDER_LIMITS.productsPerSection})
                </label>
                {products.length === 0 ? (
                    <div className="builder-no-products">Ative produtos na aba “Produtos da Loja” para adicioná-los aqui.</div>
                ) : (
                    <div className="builder-products">
                        {products.map(product => {
                            const selected = section.product_ids.includes(product.id);
                            const limitReached = !selected && section.product_ids.length >= STORE_BUILDER_LIMITS.productsPerSection;
                            return (
                                <button
                                    type="button"
                                    key={product.id}
                                    className={`builder-product-option ${selected ? 'selected' : ''}`}
                                    disabled={limitReached}
                                    onClick={() => toggleProduct(product.id)}
                                >
                                    <div
                                        className="builder-product-media"
                                        style={product.image_url ? { backgroundImage: `url("${product.image_url}")` } : undefined}
                                    />
                                    <strong>{product.name}</strong>
                                    {selected && <span className="builder-product-check"><FiCheck size={12} /></span>}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

function BannerSectionEditor({
    section,
    uploadingSlideId,
    onChange,
    onUpload
}: {
    section: StoreBannerSection;
    uploadingSlideId: string | null;
    onChange: (section: StoreBannerSection) => void;
    onUpload: (slideId: string, file: File) => Promise<void>;
}) {
    const replaceSlide = (slideId: string, values: Partial<StoreBannerSection['slides'][number]>) => {
        onChange({
            ...section,
            slides: section.slides.map(slide => slide.id === slideId ? { ...slide, ...values } : slide)
        });
    };

    const addSlide = () => {
        if (section.slides.length >= STORE_BUILDER_LIMITS.bannersPerSection) return;
        onChange({
            ...section,
            slides: [...section.slides, {
                id: createStoreBuilderId('slide'),
                image_url: '',
                title: '',
                description: '',
                button_text: '',
                button_url: ''
            }]
        });
    };

    return (
        <div className="builder-section-body">
            <div>
                <label className="builder-field-label">Nome interno da seção</label>
                <input className="input-field" maxLength={100} value={section.title} onChange={event => onChange({ ...section, title: event.target.value })} placeholder="Ex: Promoções da semana" />
            </div>
            <div className="builder-slides">
                {section.slides.map((slide, index) => (
                    <div className="builder-slide" key={slide.id}>
                        <label className="builder-slide-upload">
                            {slide.image_url ? (
                                <img src={slide.image_url} alt={`Banner ${index + 1}`} />
                            ) : (
                                <span><FiUpload size={20} /> {uploadingSlideId === slide.id ? 'Enviando...' : 'Enviar banner'}</span>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                hidden
                                disabled={uploadingSlideId === slide.id}
                                onChange={async event => {
                                    const file = event.target.files?.[0];
                                    if (file) await onUpload(slide.id, file);
                                    event.target.value = '';
                                }}
                            />
                        </label>
                        <div className="builder-slide-fields">
                            <div>
                                <label className="builder-field-label">Título</label>
                                <input className="input-field" maxLength={100} value={slide.title} onChange={event => replaceSlide(slide.id, { title: event.target.value })} />
                            </div>
                            <div>
                                <label className="builder-field-label">Texto do botão</label>
                                <input className="input-field" maxLength={40} value={slide.button_text} onChange={event => replaceSlide(slide.id, { button_text: event.target.value })} placeholder="Saiba mais" />
                            </div>
                            <div className="wide">
                                <label className="builder-field-label">Descrição</label>
                                <input className="input-field" maxLength={240} value={slide.description} onChange={event => replaceSlide(slide.id, { description: event.target.value })} />
                            </div>
                            <div className="wide">
                                <label className="builder-field-label">Link do botão</label>
                                <input className="input-field" maxLength={1000} value={slide.button_url} onChange={event => replaceSlide(slide.id, { button_url: event.target.value })} placeholder="https://... ou /pagina" />
                            </div>
                            {section.slides.length > 1 && (
                                <button
                                    type="button"
                                    className="builder-slide-delete wide"
                                    onClick={() => onChange({ ...section, slides: section.slides.filter(item => item.id !== slide.id) })}
                                >
                                    Remover este banner
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                {section.slides.length < STORE_BUILDER_LIMITS.bannersPerSection && (
                    <button type="button" className="builder-add-slide" onClick={addSlide}>
                        + Adicionar outro banner ao carrossel
                    </button>
                )}
            </div>
        </div>
    );
}

function ContentSectionEditor({
    section,
    uploading,
    onChange,
    onUpload
}: {
    section: StoreContentSection;
    uploading: boolean;
    onChange: (section: StoreContentSection) => void;
    onUpload: (file: File) => Promise<void>;
}) {
    return (
        <div className="builder-section-body">
            <div className="builder-fields-two">
                <div>
                    <label className="builder-field-label">Texto pequeno</label>
                    <input className="input-field" maxLength={60} value={section.eyebrow} onChange={event => onChange({ ...section, eyebrow: event.target.value })} placeholder="Ex: Sobre a marca" />
                </div>
                <div>
                    <label className="builder-field-label">Título</label>
                    <input className="input-field" maxLength={140} value={section.title} onChange={event => onChange({ ...section, title: event.target.value })} />
                </div>
            </div>
            <div>
                <label className="builder-field-label">Descrição</label>
                <textarea className="input-field" rows={5} maxLength={1600} value={section.description} onChange={event => onChange({ ...section, description: event.target.value })} />
            </div>
            <div className="builder-content-layout">
                <label className="builder-content-image">
                    {section.image_url ? <img src={section.image_url} alt="Imagem do bloco" /> : <span><FiUpload /> {uploading ? 'Enviando...' : 'Enviar imagem opcional'}</span>}
                    <input type="file" accept="image/*" hidden disabled={uploading} onChange={async event => {
                        const file = event.target.files?.[0];
                        if (file) await onUpload(file);
                        event.target.value = '';
                    }} />
                </label>
                <div className="builder-fields-two">
                    <div>
                        <label className="builder-field-label">Posição da imagem</label>
                        <select className="input-field" value={section.image_position} onChange={event => onChange({ ...section, image_position: event.target.value as StoreContentSection['image_position'] })}>
                            <option value="right">À direita</option>
                            <option value="left">À esquerda</option>
                        </select>
                    </div>
                    <div>
                        <label className="builder-field-label">Estilo do bloco</label>
                        <select className="input-field" value={section.tone} onChange={event => onChange({ ...section, tone: event.target.value as StoreContentSection['tone'] })}>
                            <option value="surface">Card destacado</option>
                            <option value="accent">Cor da marca</option>
                            <option value="transparent">Fundo transparente</option>
                        </select>
                    </div>
                    <div>
                        <label className="builder-field-label">Texto do botão</label>
                        <input className="input-field" maxLength={40} value={section.button_text} onChange={event => onChange({ ...section, button_text: event.target.value })} placeholder="Saiba mais" />
                    </div>
                    <div>
                        <label className="builder-field-label">Link do botão</label>
                        <input className="input-field" maxLength={1000} value={section.button_url} onChange={event => onChange({ ...section, button_url: event.target.value })} placeholder="https://... ou /pagina" />
                    </div>
                    {section.image_url && <button type="button" className="builder-inline-remove" onClick={() => onChange({ ...section, image_url: '' })}>Remover imagem</button>}
                </div>
            </div>
        </div>
    );
}

function SectionTitleFields({
    title,
    subtitle,
    onTitle,
    onSubtitle
}: {
    title: string;
    subtitle: string;
    onTitle: (value: string) => void;
    onSubtitle: (value: string) => void;
}) {
    return (
        <div className="builder-fields-two">
            <div>
                <label className="builder-field-label">Título da seção</label>
                <input className="input-field" maxLength={120} value={title} onChange={event => onTitle(event.target.value)} />
            </div>
            <div>
                <label className="builder-field-label">Texto de apoio</label>
                <input className="input-field" maxLength={320} value={subtitle} onChange={event => onSubtitle(event.target.value)} />
            </div>
        </div>
    );
}

function FeaturesSectionEditor({ section, onChange }: { section: StoreFeaturesSection; onChange: (section: StoreFeaturesSection) => void }) {
    return (
        <div className="builder-section-body">
            <SectionTitleFields title={section.title} subtitle={section.subtitle} onTitle={title => onChange({ ...section, title })} onSubtitle={subtitle => onChange({ ...section, subtitle })} />
            <div className="builder-repeat-list">
                {section.items.map((item, index) => (
                    <div className="builder-repeat-item" key={item.id}>
                        <span>{String(index + 1).padStart(2, '0')}</span>
                        <input className="input-field" maxLength={90} value={item.title} onChange={event => onChange({ ...section, items: section.items.map(value => value.id === item.id ? { ...value, title: event.target.value } : value) })} placeholder="Nome do diferencial" />
                        <textarea className="input-field" rows={2} maxLength={280} value={item.description} onChange={event => onChange({ ...section, items: section.items.map(value => value.id === item.id ? { ...value, description: event.target.value } : value) })} placeholder="Explique este benefício" />
                        <button type="button" onClick={() => onChange({ ...section, items: section.items.filter(value => value.id !== item.id) })} aria-label="Remover diferencial"><FiTrash2 /></button>
                    </div>
                ))}
            </div>
            {section.items.length < STORE_BUILDER_LIMITS.featuresPerSection && <button type="button" className="builder-add-slide" onClick={() => onChange({ ...section, items: [...section.items, { id: createStoreBuilderId('feature'), title: '', description: '' }] })}>+ Adicionar diferencial</button>}
        </div>
    );
}

function TestimonialsSectionEditor({ section, onChange }: { section: StoreTestimonialsSection; onChange: (section: StoreTestimonialsSection) => void }) {
    return (
        <div className="builder-section-body">
            <SectionTitleFields title={section.title} subtitle={section.subtitle} onTitle={title => onChange({ ...section, title })} onSubtitle={subtitle => onChange({ ...section, subtitle })} />
            <div className="builder-repeat-list">
                {section.items.map((item, index) => (
                    <div className="builder-repeat-item testimonial" key={item.id}>
                        <span>{String(index + 1).padStart(2, '0')}</span>
                        <textarea className="input-field wide" rows={3} maxLength={700} value={item.quote} onChange={event => onChange({ ...section, items: section.items.map(value => value.id === item.id ? { ...value, quote: event.target.value } : value) })} placeholder="Escreva o depoimento real" />
                        <input className="input-field" maxLength={90} value={item.name} onChange={event => onChange({ ...section, items: section.items.map(value => value.id === item.id ? { ...value, name: event.target.value } : value) })} placeholder="Nome da pessoa" />
                        <input className="input-field" maxLength={120} value={item.role} onChange={event => onChange({ ...section, items: section.items.map(value => value.id === item.id ? { ...value, role: event.target.value } : value) })} placeholder="Profissão, empresa ou contexto" />
                        <button type="button" onClick={() => onChange({ ...section, items: section.items.filter(value => value.id !== item.id) })} aria-label="Remover depoimento"><FiTrash2 /></button>
                    </div>
                ))}
            </div>
            {section.items.length < STORE_BUILDER_LIMITS.testimonialsPerSection && <button type="button" className="builder-add-slide" onClick={() => onChange({ ...section, items: [...section.items, { id: createStoreBuilderId('testimonial'), quote: '', name: '', role: '' }] })}>+ Adicionar depoimento</button>}
        </div>
    );
}

function FaqSectionEditor({ section, onChange }: { section: StoreFaqSection; onChange: (section: StoreFaqSection) => void }) {
    return (
        <div className="builder-section-body">
            <SectionTitleFields title={section.title} subtitle={section.subtitle} onTitle={title => onChange({ ...section, title })} onSubtitle={subtitle => onChange({ ...section, subtitle })} />
            <div className="builder-repeat-list">
                {section.items.map((item, index) => (
                    <div className="builder-repeat-item faq" key={item.id}>
                        <span>{String(index + 1).padStart(2, '0')}</span>
                        <input className="input-field" maxLength={180} value={item.question} onChange={event => onChange({ ...section, items: section.items.map(value => value.id === item.id ? { ...value, question: event.target.value } : value) })} placeholder="Pergunta" />
                        <textarea className="input-field" rows={3} maxLength={1000} value={item.answer} onChange={event => onChange({ ...section, items: section.items.map(value => value.id === item.id ? { ...value, answer: event.target.value } : value) })} placeholder="Resposta" />
                        <button type="button" onClick={() => onChange({ ...section, items: section.items.filter(value => value.id !== item.id) })} aria-label="Remover pergunta"><FiTrash2 /></button>
                    </div>
                ))}
            </div>
            {section.items.length < STORE_BUILDER_LIMITS.faqPerSection && <button type="button" className="builder-add-slide" onClick={() => onChange({ ...section, items: [...section.items, { id: createStoreBuilderId('faq-item'), question: '', answer: '' }] })}>+ Adicionar pergunta</button>}
        </div>
    );
}
