'use client';

import {
    buildAutomaticProductSections,
    createStoreBuilderId,
    STORE_BUILDER_LIMITS,
    StoreBannerSection,
    StoreLayoutSection,
    StoreProductSection
} from '@/lib/store-builder';
import {
    FiArrowDown,
    FiArrowUp,
    FiCheck,
    FiImage,
    FiPlus,
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

export default function StoreBuilderEditor({
    sections,
    products,
    uploadingSlideId,
    onChange,
    onUploadSlide
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
        const banners = sections.filter(section => section.type === 'banner_carousel');
        onChange([...buildAutomaticProductSections(visibleProducts.map(product => product.id)), ...banners]);
    };

    return (
        <section className="glass-card" style={{ padding: 24 }}>
            <div className="builder-heading">
                <div>
                    <span className="builder-kicker">ESTRUTURA DA PÁGINA</span>
                    <h3 className="builder-title">Monte a vitrine na ordem que quiser</h3>
                    <p className="builder-description">
                        Cada linha aceita até quatro produtos. Intercale linhas e carrosséis de banners quantas vezes precisar.
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
                    {sections.map((section, index) => (
                        <article className="builder-section-card" key={section.id}>
                            <div className="builder-section-toolbar">
                                <div className="builder-section-number">{String(index + 1).padStart(2, '0')}</div>
                                <div style={{ minWidth: 0 }}>
                                    <span className="builder-section-type">
                                        {section.type === 'products' ? 'LINHA DE PRODUTOS' : 'CARROSSEL DE BANNERS'}
                                    </span>
                                    <div className="builder-section-summary">
                                        {section.type === 'products'
                                            ? `${section.product_ids.length} de ${STORE_BUILDER_LIMITS.productsPerSection} produtos`
                                            : `${section.slides.length} banner${section.slides.length === 1 ? '' : 's'}`}
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
                            ) : (
                                <BannerSectionEditor
                                    section={section}
                                    uploadingSlideId={uploadingSlideId}
                                    onChange={next => replaceSection(section.id, next)}
                                    onUpload={(slideId, file) => onUploadSlide(section.id, slideId, file)}
                                />
                            )}
                        </article>
                    ))}
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
                    grid-template-columns: 1fr 1fr;
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
                @media (max-width: 900px) {
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
