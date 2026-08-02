'use client';

import { CSSProperties, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
    FiCheck,
    FiExternalLink,
    FiEye,
    FiImage,
    FiInstagram,
    FiLayout,
    FiLayers,
    FiLink,
    FiMail,
    FiPackage,
    FiPlus,
    FiPower,
    FiSave,
    FiSliders,
    FiTrash2,
    FiType,
    FiUpload
} from 'react-icons/fi';
import StoreBuilderEditor from '@/components/store/StoreBuilderEditor';
import {
    createStoreBuilderId,
    DEFAULT_STORE_BACKGROUND,
    DEFAULT_STORE_FOOTER,
    StoreBackgroundConfig,
    StoreFooterConfig,
    StoreLayoutSection
} from '@/lib/store-builder';

const STORE_TEMPLATES = [
    {
        key: 'creator',
        name: 'Essencial',
        description: 'Leve, claro e versátil para diferentes tipos de catálogo.',
        preview: 'Uma base equilibrada que valoriza produto e marca.',
        gradient: 'linear-gradient(135deg,#f5f2ec 0 48%,#252826 48% 68%,#c45c3e 68%)'
    },
    {
        key: 'academy',
        name: 'Editorial',
        description: 'Mais respiro, tipografia marcante e sensação de curadoria.',
        preview: 'Apresentação refinada sem perder simplicidade.',
        gradient: 'linear-gradient(135deg,#f3f7f5 0 52%,#193b34 52% 72%,#d0a86e 72%)'
    },
    {
        key: 'studio',
        name: 'Boutique',
        description: 'Imagens em primeiro plano e acabamento mais expressivo.',
        preview: 'Personalidade forte, mantendo o catálogo acolhedor.',
        gradient: 'linear-gradient(135deg,#f4efe8 0 45%,#4c3526 45% 70%,#b1842f 70%)'
    }
];

const ACCENT_COLORS = ['#c45c3e', '#1f6b5c', '#3658a7', '#7c4d79', '#b1842f', '#252826'];

type StoreProduct = {
    id: string;
    name: string;
    image_url?: string | null;
    status?: string;
    show_in_store?: boolean;
};

type StoreForm = {
    store_active: boolean;
    store_name: string;
    store_slug: string;
    store_description: string;
    store_theme: string;
    store_banner_url: string;
    store_template: string;
    store_accent_color: string;
    store_headline: string;
    store_cta_text: string;
    store_badge_text: string;
    store_layout_sections: StoreLayoutSection[];
    store_footer_config: StoreFooterConfig;
    store_background_config: StoreBackgroundConfig;
};

const initialForm: StoreForm = {
    store_active: false,
    store_name: '',
    store_slug: '',
    store_description: '',
    store_theme: 'light',
    store_banner_url: '',
    store_template: 'creator',
    store_accent_color: '#c45c3e',
    store_headline: '',
    store_cta_text: 'Ver produtos',
    store_badge_text: 'Uma seleção feita para você',
    store_layout_sections: [],
    store_footer_config: { ...DEFAULT_STORE_FOOTER, links: [] },
    store_background_config: { ...DEFAULT_STORE_BACKGROUND }
};

function slugify(value: string) {
    return value.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function errorMessage(error: unknown, fallback: string) {
    return error instanceof Error && error.message ? error.message : fallback;
}

export default function StoreSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [migrationRequired, setMigrationRequired] = useState(false);
    const [uploading, setUploading] = useState<string | null>(null);
    const [form, setForm] = useState<StoreForm>(initialForm);
    const [products, setProducts] = useState<StoreProduct[]>([]);
    const [activeEditor, setActiveEditor] = useState<'identity' | 'appearance' | 'structure' | 'footer'>('identity');

    const headers = () => ({
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`
    });

    useEffect(() => {
        const run = async () => {
            try {
                const response = await fetch('/api/store-builder', {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
                    cache: 'no-store'
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Erro ao carregar a loja');

                const store = data.store || {};
                setMigrationRequired(Boolean(store.migration_required));
                setProducts(data.products || []);
                setForm({
                    ...initialForm,
                    ...store,
                    store_layout_sections: Array.isArray(store.store_layout_sections) ? store.store_layout_sections : [],
                    store_footer_config: { ...DEFAULT_STORE_FOOTER, ...(store.store_footer_config || {}), links: store.store_footer_config?.links || [] },
                    store_background_config: { ...DEFAULT_STORE_BACKGROUND, ...(store.store_background_config || {}) }
                });
            } catch (error: unknown) {
                toast.error(errorMessage(error, 'Erro ao carregar configurações da loja'));
            } finally {
                setLoading(false);
            }
        };
        void run();
    }, []);

    const update = <K extends keyof StoreForm>(field: K, value: StoreForm[K]) => {
        setForm(previous => ({ ...previous, [field]: value }));
    };

    const uploadImage = async (file: File): Promise<string> => {
        const data = new FormData();
        data.append('file', file);
        const response = await fetch('/api/upload', {
            method: 'POST',
            headers: headers(),
            body: data
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Erro ao enviar imagem');
        return result.url;
    };

    const handleSimpleUpload = async (target: 'hero' | 'background', file: File) => {
        setUploading(target);
        const loadingToast = toast.loading('Enviando imagem...');
        try {
            const url = await uploadImage(file);
            if (target === 'hero') {
                update('store_banner_url', url);
            } else {
                update('store_background_config', { ...form.store_background_config, mode: 'image', image_url: url });
            }
            toast.success('Imagem enviada!', { id: loadingToast });
        } catch (error: unknown) {
            toast.error(errorMessage(error, 'Erro ao enviar imagem'), { id: loadingToast });
        } finally {
            setUploading(null);
        }
    };

    const handleSlideUpload = async (sectionId: string, slideId: string, file: File) => {
        setUploading(slideId);
        const loadingToast = toast.loading('Enviando banner...');
        try {
            const url = await uploadImage(file);
            setForm(previous => ({
                ...previous,
                store_layout_sections: previous.store_layout_sections.map(section => {
                    if (section.id !== sectionId || section.type !== 'banner_carousel') return section;
                    return {
                        ...section,
                        slides: section.slides.map(slide => slide.id === slideId ? { ...slide, image_url: url } : slide)
                    };
                })
            }));
            toast.success('Banner adicionado!', { id: loadingToast });
        } catch (error: unknown) {
            toast.error(errorMessage(error, 'Erro ao enviar banner'), { id: loadingToast });
        } finally {
            setUploading(null);
        }
    };

    const handleSave = async () => {
        if (!form.store_name.trim()) return toast.error('Informe o nome da loja');
        if (!form.store_slug.trim()) return toast.error('Informe o link da loja');
        if (migrationRequired) {
            return toast.error('Execute primeiro a migration 029 no Supabase.');
        }

        setSaving(true);
        try {
            const response = await fetch('/api/store-builder', {
                method: 'PUT',
                headers: { ...headers(), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    store_slug: slugify(form.store_slug),
                    store_headline: form.store_headline.trim() || form.store_name.trim()
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Erro ao salvar loja');

            setForm(previous => ({ ...previous, ...data.store }));
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                try {
                    localStorage.setItem('user', JSON.stringify({ ...JSON.parse(storedUser), ...data.store }));
                } catch {
                    // A malformed local cache should not prevent saving the store.
                }
            }
            toast.success('Loja publicada com sucesso!');
        } catch (error: unknown) {
            toast.error(errorMessage(error, 'Erro ao salvar loja'));
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: 50 }}>Carregando sua loja...</div>;

    const publicUrl = form.store_slug ? `/store/${form.store_slug}` : '';
    const visibleProducts = products.filter(product => product.status === 'active' && product.show_in_store);
    const sectionCount = form.store_layout_sections.length;

    return (
        <div className="store-builder-page">
            {migrationRequired && (
                <div className="store-migration-alert">
                    <strong>Uma atualização do banco está pendente.</strong>
                    <span>Execute o arquivo <code>029_add_storefront_builder.sql</code> no Supabase para ativar e salvar o novo construtor.</span>
                </div>
            )}

            <section className="glass-card store-publish-card">
                <div className="store-publish-intro">
                    <div className="store-publish-icon"><FiLayout /></div>
                    <div>
                        <span className="store-builder-eyebrow">PAINEL DA LOJA</span>
                        <h2>{form.store_name || 'Configure sua loja'}</h2>
                        <p>Complete as quatro etapas abaixo e publique quando estiver tudo pronto.</p>
                        <div className="store-publish-metrics">
                            <span><FiPackage /> {visibleProducts.length} produto{visibleProducts.length === 1 ? '' : 's'} visível{visibleProducts.length === 1 ? '' : 'is'}</span>
                            <span><FiLayers /> {sectionCount} seç{sectionCount === 1 ? 'ão' : 'ões'} configurada{sectionCount === 1 ? '' : 's'}</span>
                        </div>
                    </div>
                </div>
                <div className="store-publish-actions">
                    {publicUrl && (
                        <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                            Abrir loja <FiExternalLink />
                        </a>
                    )}
                    <button
                        type="button"
                        className={`store-status-button ${form.store_active ? 'active' : ''}`}
                        onClick={() => update('store_active', !form.store_active)}
                    >
                        <FiPower /> {form.store_active ? 'Loja ativa' : 'Loja offline'}
                    </button>
                </div>
            </section>

            <div className="store-customizer-layout">
                <div className="store-builder-main">
                    <nav className="store-setup-navigation" aria-label="Etapas de personalização">
                        {[
                            { key: 'identity', step: '01', label: 'Marca', description: 'Nome, textos e capa', icon: <FiType /> },
                            { key: 'appearance', step: '02', label: 'Estilo', description: 'Tema, cores e fundo', icon: <FiSliders /> },
                            { key: 'structure', step: '03', label: 'Página', description: 'Seções e destaques', icon: <FiLayers /> },
                            { key: 'footer', step: '04', label: 'Contatos', description: 'Rodapé e canais', icon: <FiLink /> }
                        ].map(item => (
                            <button
                                key={item.key}
                                type="button"
                                className={activeEditor === item.key ? 'active' : ''}
                                onClick={() => setActiveEditor(item.key as typeof activeEditor)}
                            >
                                <span>{item.icon}</span>
                                <div><small>{item.step}</small><strong>{item.label}</strong><p>{item.description}</p></div>
                            </button>
                        ))}
                    </nav>

                    {activeEditor === 'identity' && (
                        <section className="glass-card store-editor-section">
                            <SectionHeader
                                icon={<FiType />}
                                kicker="MARCA E CONTEÚDO"
                                title="O começo da sua história"
                                description="Defina como sua marca se apresenta e o que o cliente entende logo ao chegar."
                            />
                            <div className="store-form-group">
                                <div className="store-form-group-heading">
                                    <strong>Informações básicas</strong>
                                    <span>Nome público e endereço da sua loja.</span>
                                </div>
                                <div className="store-form-grid two">
                                    <Field label="Nome da loja">
                                        <input className="input-field" maxLength={100} value={form.store_name} onChange={event => update('store_name', event.target.value)} placeholder="Ex: Casa Aurora" />
                                    </Field>
                                    <Field label="Link público">
                                        <div className="store-slug-field">
                                            <span>/store/</span>
                                            <input value={form.store_slug} maxLength={64} onChange={event => update('store_slug', slugify(event.target.value))} placeholder="casa-aurora" />
                                        </div>
                                    </Field>
                                </div>
                            </div>
                            <div className="store-form-group">
                                <div className="store-form-group-heading">
                                    <strong>Primeira impressão</strong>
                                    <span>Textos e imagem que recebem o cliente.</span>
                                </div>
                                <div className="store-form-grid two">
                                    <Field label="Chamada principal">
                                        <input className="input-field" maxLength={140} value={form.store_headline} onChange={event => update('store_headline', event.target.value)} placeholder="Produtos que fazem sentido para você" />
                                    </Field>
                                    <Field label="Texto do botão principal">
                                        <input className="input-field" maxLength={40} value={form.store_cta_text} onChange={event => update('store_cta_text', event.target.value)} placeholder="Conhecer a coleção" />
                                    </Field>
                                    <Field label="Descrição" wide>
                                        <textarea className="input-field" rows={4} maxLength={600} value={form.store_description} onChange={event => update('store_description', event.target.value)} placeholder="Conte em poucas linhas o que torna sua seleção especial." />
                                    </Field>
                                    <Field label="Mensagem curta no topo">
                                        <input className="input-field" maxLength={60} value={form.store_badge_text} onChange={event => update('store_badge_text', event.target.value)} placeholder="Uma seleção feita para você" />
                                    </Field>
                                    <Field label="Imagem de capa">
                                        <ImageUploader
                                            imageUrl={form.store_banner_url}
                                            uploading={uploading === 'hero'}
                                            onFile={file => handleSimpleUpload('hero', file)}
                                            onRemove={() => update('store_banner_url', '')}
                                        />
                                    </Field>
                                </div>
                            </div>
                        </section>
                    )}

                    {activeEditor === 'appearance' && (
                        <section className="glass-card store-editor-section">
                            <SectionHeader
                                icon={<FiSliders />}
                                kicker="DIREÇÃO VISUAL"
                                title="Um estilo com a sua cara"
                                description="Comece por uma direção visual e ajuste a cor para chegar à identidade da sua marca."
                            />
                            <div className="store-form-group">
                                <div className="store-form-group-heading">
                                    <strong>Estilo principal</strong>
                                    <span>Todos funcionam para catálogos de diferentes nichos.</span>
                                </div>
                                <div className="store-template-grid">
                                    {STORE_TEMPLATES.map(template => {
                                        const selected = form.store_template === template.key;
                                        return (
                                            <button key={template.key} type="button" className={selected ? 'selected' : ''} onClick={() => update('store_template', template.key)}>
                                                <div className="store-template-swatch" style={{ background: template.gradient }}>
                                                    {selected && <span><FiCheck /></span>}
                                                </div>
                                                <strong>{template.name}</strong>
                                                <p>{template.description}</p>
                                                <small>{template.preview}</small>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="store-form-group">
                                <div className="store-form-group-heading">
                                    <strong>Paleta e atmosfera</strong>
                                    <span>Escolha a cor de destaque e o acabamento de fundo.</span>
                                </div>
                                <div className="store-visual-grid">
                                    <div>
                                        <label className="store-field-label">Cor da marca</label>
                                        <div className="store-color-row">
                                            {ACCENT_COLORS.map(color => (
                                                <button
                                                    key={color}
                                                    type="button"
                                                    className={form.store_accent_color === color ? 'selected' : ''}
                                                    style={{ background: color }}
                                                    onClick={() => update('store_accent_color', color)}
                                                    aria-label={`Usar cor ${color}`}
                                                />
                                            ))}
                                            <input type="color" value={form.store_accent_color} onChange={event => update('store_accent_color', event.target.value)} aria-label="Escolher cor personalizada" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="store-field-label">Plano de fundo</label>
                                        <div className="store-background-modes">
                                            {[
                                                { value: 'theme', label: 'Do estilo' },
                                                { value: 'color', label: 'Cor sólida' },
                                                { value: 'image', label: 'Imagem' }
                                            ].map(option => (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    className={form.store_background_config.mode === option.value ? 'selected' : ''}
                                                    onClick={() => update('store_background_config', { ...form.store_background_config, mode: option.value as StoreBackgroundConfig['mode'] })}
                                                >
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {form.store_background_config.mode === 'color' && (
                                        <Field label="Cor do fundo">
                                            <div className="store-color-input">
                                                <input type="color" value={form.store_background_config.color} onChange={event => update('store_background_config', { ...form.store_background_config, color: event.target.value })} />
                                                <input className="input-field" value={form.store_background_config.color} onChange={event => update('store_background_config', { ...form.store_background_config, color: event.target.value })} />
                                            </div>
                                        </Field>
                                    )}
                                    {form.store_background_config.mode === 'image' && (
                                        <>
                                            <Field label="Imagem de fundo">
                                                <ImageUploader
                                                    imageUrl={form.store_background_config.image_url}
                                                    uploading={uploading === 'background'}
                                                    onFile={file => handleSimpleUpload('background', file)}
                                                    onRemove={() => update('store_background_config', { ...form.store_background_config, image_url: '' })}
                                                />
                                            </Field>
                                            <Field label={`Contraste sobre a imagem: ${form.store_background_config.overlay}%`}>
                                                <input
                                                    type="range"
                                                    min={20}
                                                    max={95}
                                                    value={form.store_background_config.overlay}
                                                    onChange={event => update('store_background_config', { ...form.store_background_config, overlay: Number(event.target.value) })}
                                                    style={{ width: '100%', accentColor: form.store_accent_color }}
                                                />
                                            </Field>
                                        </>
                                    )}
                                </div>
                            </div>
                        </section>
                    )}

                    {activeEditor === 'structure' && (
                        <StoreBuilderEditor
                            sections={form.store_layout_sections}
                            products={products}
                            uploadingSlideId={uploading}
                            onChange={sections => update('store_layout_sections', sections)}
                            onUploadSlide={handleSlideUpload}
                        />
                    )}

                    {activeEditor === 'footer' && (
                        <FooterEditor
                            value={form.store_footer_config}
                            onChange={footer => update('store_footer_config', footer)}
                        />
                    )}

                    <div className="store-save-bar">
                        <div>
                            <strong>Suas alterações estão prontas?</strong>
                            <span>Revise na prévia e publique quando quiser.</span>
                        </div>
                        <button type="button" onClick={handleSave} disabled={saving || migrationRequired} className="btn-primary store-save-button">
                            <FiSave /> {saving ? 'Salvando...' : 'Salvar e publicar'}
                        </button>
                    </div>
                </div>

                <aside className="store-live-preview-column">
                    <div className="store-live-preview-heading">
                        <span><FiEye /> PRÉVIA AO VIVO</span>
                        <small>Atualiza enquanto você edita</small>
                    </div>
                    <StoreLivePreview form={form} products={visibleProducts} />
                    {publicUrl && (
                        <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="store-preview-open">
                            Abrir prévia em tela cheia <FiExternalLink />
                        </a>
                    )}
                </aside>
            </div>

            <style jsx global>{`
                .store-builder-page {
                    display: grid;
                    gap: 18px;
                }
                .store-builder-main {
                    display: grid;
                    gap: 18px;
                    min-width: 0;
                }
                .store-customizer-layout {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) 330px;
                    align-items: start;
                    gap: 18px;
                }
                .store-migration-alert {
                    border: 1px solid rgba(245,158,11,.34);
                    border-radius: 14px;
                    background: rgba(245,158,11,.10);
                    color: var(--text-primary);
                    padding: 14px 17px;
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                    font-size: 13px;
                }
                .store-publish-card {
                    padding: 22px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 20px;
                    background:
                        radial-gradient(circle at 92% 8%, rgba(108,92,231,.16), transparent 32%),
                        var(--bg-card);
                }
                .store-publish-intro {
                    min-width: 0;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }
                .store-publish-icon {
                    width: 52px;
                    height: 52px;
                    border-radius: 16px;
                    display: grid;
                    place-items: center;
                    flex: 0 0 auto;
                    color: white;
                    background: linear-gradient(135deg, var(--accent-primary), #8b5cf6);
                    box-shadow: 0 10px 24px rgba(108,92,231,.24);
                    font-size: 21px;
                }
                .store-builder-eyebrow {
                    color: var(--accent-primary);
                    font-size: 11px;
                    font-weight: 900;
                    letter-spacing: .12em;
                }
                .store-publish-card h2 {
                    font-size: 24px;
                    font-weight: 850;
                    margin: 5px 0;
                }
                .store-publish-card p {
                    color: var(--text-secondary);
                    font-size: 13px;
                }
                .store-publish-metrics {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex-wrap: wrap;
                    margin-top: 10px;
                }
                .store-publish-metrics span {
                    min-height: 26px;
                    border: 1px solid var(--border-color);
                    border-radius: 999px;
                    padding: 0 9px;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    color: var(--text-secondary);
                    background: var(--bg-secondary);
                    font-size: 10px;
                    font-weight: 750;
                }
                .store-publish-actions {
                    display: flex;
                    gap: 9px;
                    align-items: center;
                    flex: 0 0 auto;
                }
                .store-publish-actions a {
                    display: inline-flex;
                    gap: 7px;
                    align-items: center;
                    text-decoration: none;
                }
                .store-status-button {
                    height: 42px;
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 0 14px;
                    background: var(--bg-secondary);
                    color: var(--text-secondary);
                    font-weight: 800;
                    cursor: pointer;
                }
                .store-status-button.active {
                    border-color: rgba(0,184,148,.35);
                    background: rgba(0,184,148,.11);
                    color: #00b894;
                }
                .store-setup-navigation {
                    display: grid;
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                    gap: 10px;
                }
                .store-setup-navigation > button {
                    min-width: 0;
                    border: 1px solid var(--border-color);
                    border-radius: 15px;
                    padding: 13px;
                    display: flex;
                    align-items: center;
                    gap: 11px;
                    color: var(--text-primary);
                    background: var(--bg-card);
                    text-align: left;
                    cursor: pointer;
                    transition: border-color .2s, transform .2s, background .2s;
                }
                .store-setup-navigation > button:hover {
                    border-color: rgba(108,92,231,.36);
                    background: rgba(108,92,231,.045);
                    transform: translateY(-1px);
                }
                .store-setup-navigation > button.active {
                    border-color: rgba(108,92,231,.42);
                    background: rgba(108,92,231,.09);
                    box-shadow: inset 0 -3px 0 var(--accent-primary);
                }
                .store-setup-navigation > button > span {
                    width: 38px;
                    height: 38px;
                    border-radius: 12px;
                    display: grid;
                    place-items: center;
                    flex: 0 0 auto;
                    color: var(--accent-primary);
                    background: rgba(108,92,231,.11);
                }
                .store-setup-navigation > button.active > span {
                    color: white;
                    background: var(--accent-primary);
                }
                .store-setup-navigation small,
                .store-setup-navigation strong,
                .store-setup-navigation p {
                    display: block;
                }
                .store-setup-navigation small {
                    color: var(--accent-primary);
                    font-size: 8px;
                    font-weight: 900;
                    letter-spacing: .1em;
                    margin-bottom: 2px;
                }
                .store-setup-navigation strong {
                    font-size: 12px;
                    margin-bottom: 2px;
                }
                .store-setup-navigation p {
                    overflow: hidden;
                    color: var(--text-muted);
                    font-size: 9px;
                    white-space: nowrap;
                    text-overflow: ellipsis;
                }
                .store-live-preview-column {
                    position: sticky;
                    top: 18px;
                    min-width: 0;
                    border: 1px solid var(--border-color);
                    border-radius: 20px;
                    padding: 13px;
                    background: var(--bg-card);
                    box-shadow: 0 16px 40px rgba(15,23,42,.08);
                }
                .store-live-preview-heading {
                    padding: 3px 2px 12px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 10px;
                }
                .store-live-preview-heading span {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    color: var(--text-primary);
                    font-size: 9px;
                    font-weight: 900;
                    letter-spacing: .08em;
                }
                .store-live-preview-heading small {
                    color: var(--text-muted);
                    font-size: 8px;
                }
                .store-live-preview {
                    overflow: hidden;
                    border: 1px solid rgba(15,23,42,.12);
                    border-radius: 13px;
                    color: var(--preview-ink);
                    background: var(--preview-bg);
                    box-shadow: 0 10px 24px rgba(15,23,42,.08);
                }
                .store-preview-browser-bar {
                    height: 24px;
                    border-bottom: 1px solid rgba(15,23,42,.09);
                    padding: 0 8px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    background: rgba(255,255,255,.72);
                }
                .store-preview-browser-bar i {
                    width: 5px;
                    height: 5px;
                    border-radius: 999px;
                    background: rgba(15,23,42,.2);
                }
                .store-preview-topline {
                    min-height: 19px;
                    padding: 4px 10px;
                    color: white;
                    background: linear-gradient(90deg, var(--preview-accent), var(--preview-secondary), var(--preview-tertiary));
                    background-size: 200% 100%;
                    text-align: center;
                    font-size: 5px;
                    font-weight: 800;
                    letter-spacing: .04em;
                    animation: store-preview-color 8s linear infinite;
                }
                .store-preview-header {
                    height: 36px;
                    padding: 0 10px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    background: var(--preview-surface);
                }
                .store-preview-logo {
                    width: 17px;
                    height: 17px;
                    border-radius: 5px;
                    display: grid;
                    place-items: center;
                    color: white;
                    background: var(--preview-ink);
                    font-size: 5px;
                    font-weight: 900;
                }
                .store-preview-header strong {
                    min-width: 0;
                    overflow: hidden;
                    white-space: nowrap;
                    text-overflow: ellipsis;
                    font-size: 7px;
                }
                .store-preview-header span:last-child {
                    width: 42px;
                    height: 12px;
                    border-radius: 99px;
                    margin-left: auto;
                    background: rgba(15,23,42,.06);
                }
                .store-preview-hero {
                    min-height: 152px;
                    padding: 18px 12px;
                    display: grid;
                    grid-template-columns: 1.08fr .92fr;
                    align-items: center;
                    gap: 10px;
                    background:
                        radial-gradient(circle at 80% 5%, color-mix(in srgb, var(--preview-secondary) 28%, transparent), transparent 36%),
                        radial-gradient(circle at 5% 90%, color-mix(in srgb, var(--preview-tertiary) 20%, transparent), transparent 34%),
                        var(--preview-bg);
                }
                .store-preview-copy small {
                    display: block;
                    margin-bottom: 6px;
                    color: var(--preview-accent);
                    font-size: 5px;
                    font-weight: 900;
                    letter-spacing: .08em;
                }
                .store-preview-copy h4 {
                    margin: 0 0 7px;
                    font-family: Georgia, serif;
                    font-size: 15px;
                    line-height: 1.02;
                    letter-spacing: -.03em;
                }
                .store-preview-copy p {
                    margin: 0 0 8px;
                    display: -webkit-box;
                    overflow: hidden;
                    color: var(--preview-muted);
                    font-size: 5px;
                    line-height: 1.5;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                }
                .store-preview-copy button {
                    height: 17px;
                    border: none;
                    border-radius: 4px;
                    padding: 0 7px;
                    color: white;
                    background: var(--preview-accent);
                    font-size: 5px;
                    font-weight: 900;
                }
                .store-preview-media {
                    position: relative;
                    min-height: 112px;
                    border-radius: 4px 18px 4px 4px;
                    background: radial-gradient(circle at 72% 18%, var(--preview-secondary), transparent 30%), linear-gradient(145deg, var(--preview-accent), var(--preview-ink));
                    background-position: center;
                    background-size: cover;
                    box-shadow: 5px 5px 0 color-mix(in srgb, var(--preview-tertiary) 32%, transparent);
                    animation: store-preview-float 5s ease-in-out infinite;
                }
                .store-preview-media:after {
                    content: '';
                    position: absolute;
                    right: -5px;
                    bottom: -5px;
                    width: 40%;
                    height: 35%;
                    border: 2px solid var(--preview-bg);
                    background: var(--preview-surface);
                }
                .store-preview-products {
                    padding: 11px 10px 14px;
                    background: var(--preview-surface);
                }
                .store-preview-products > span {
                    display: block;
                    margin-bottom: 7px;
                    font-family: Georgia, serif;
                    font-size: 8px;
                    font-weight: 800;
                }
                .store-preview-product-grid {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 5px;
                }
                .store-preview-product {
                    min-width: 0;
                }
                .store-preview-product-image {
                    height: 38px;
                    margin-bottom: 4px;
                    background: linear-gradient(135deg, color-mix(in srgb, var(--preview-accent) 38%, white), color-mix(in srgb, var(--preview-secondary) 26%, var(--preview-bg)));
                    background-position: center;
                    background-size: cover;
                }
                .store-preview-product:nth-child(2) .store-preview-product-image {
                    background: linear-gradient(135deg, color-mix(in srgb, var(--preview-secondary) 44%, white), var(--preview-bg));
                }
                .store-preview-product:nth-child(3) .store-preview-product-image {
                    background: linear-gradient(135deg, color-mix(in srgb, var(--preview-tertiary) 44%, white), var(--preview-bg));
                }
                @keyframes store-preview-color { to { background-position: 200% 0; } }
                @keyframes store-preview-float { 50% { transform: translateY(-3px) rotate(.5deg); } }
                @media (prefers-reduced-motion: reduce) {
                    .store-preview-topline,
                    .store-preview-media { animation: none; }
                }
                .store-preview-product strong {
                    display: block;
                    overflow: hidden;
                    white-space: nowrap;
                    text-overflow: ellipsis;
                    font-size: 5px;
                }
                .store-preview-product small {
                    display: block;
                    margin-top: 2px;
                    color: var(--preview-muted);
                    font-size: 4px;
                }
                .store-preview-open {
                    min-height: 36px;
                    margin-top: 9px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 7px;
                    color: var(--text-secondary);
                    background: var(--bg-secondary);
                    text-decoration: none;
                    font-size: 10px;
                    font-weight: 800;
                }
                .store-editor-section {
                    padding: 26px;
                }
                .store-section-header {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    margin-bottom: 21px;
                }
                .store-section-header-icon {
                    width: 42px;
                    height: 42px;
                    border-radius: 13px;
                    display: grid;
                    place-items: center;
                    color: var(--accent-primary);
                    background: rgba(108,92,231,.12);
                    flex: 0 0 auto;
                }
                .store-section-header span {
                    display: block;
                    color: var(--accent-primary);
                    font-size: 10px;
                    font-weight: 900;
                    letter-spacing: .12em;
                    margin-bottom: 3px;
                }
                .store-section-header h3 {
                    font-size: 19px;
                    font-weight: 850;
                    margin-bottom: 4px;
                }
                .store-section-header p {
                    color: var(--text-secondary);
                    font-size: 13px;
                    line-height: 1.45;
                }
                .store-form-group {
                    border: 1px solid var(--border-color);
                    border-radius: 16px;
                    padding: 18px;
                    background: var(--bg-secondary);
                }
                .store-form-group + .store-form-group {
                    margin-top: 14px;
                }
                .store-form-group-heading {
                    display: flex;
                    align-items: baseline;
                    justify-content: space-between;
                    gap: 14px;
                    margin-bottom: 15px;
                }
                .store-form-group-heading strong {
                    color: var(--text-primary);
                    font-size: 13px;
                }
                .store-form-group-heading span {
                    color: var(--text-muted);
                    font-size: 10px;
                    text-align: right;
                }
                .store-form-grid {
                    display: grid;
                    gap: 15px;
                }
                .store-form-grid.two {
                    grid-template-columns: 1fr 1fr;
                }
                .store-form-field.wide {
                    grid-column: 1 / -1;
                }
                .store-field-label {
                    display: block;
                    color: var(--text-secondary);
                    font-size: 12px;
                    font-weight: 750;
                    margin-bottom: 6px;
                }
                .store-slug-field {
                    min-height: 48px;
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    background: var(--bg-secondary);
                    display: flex;
                    align-items: center;
                    overflow: hidden;
                }
                .store-slug-field span {
                    padding-left: 14px;
                    color: var(--text-muted);
                    font-size: 13px;
                }
                .store-slug-field input {
                    width: 100%;
                    min-width: 0;
                    border: none;
                    outline: none;
                    padding: 0 14px 0 2px;
                    background: transparent;
                    color: var(--text-primary);
                }
                .store-image-uploader {
                    min-height: 70px;
                    border: 1px dashed var(--border-color);
                    border-radius: 13px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 10px;
                    background: var(--bg-secondary);
                }
                .store-image-uploader img,
                .store-image-placeholder {
                    width: 88px;
                    height: 52px;
                    border-radius: 9px;
                    object-fit: cover;
                    display: grid;
                    place-items: center;
                    color: var(--text-muted);
                    background: var(--bg-card);
                }
                .store-image-uploader label {
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                    color: var(--text-primary);
                    font-size: 12px;
                    font-weight: 800;
                    cursor: pointer;
                }
                .store-image-uploader button {
                    border: none;
                    background: transparent;
                    color: var(--danger);
                    margin-left: auto;
                    cursor: pointer;
                }
                .store-template-grid {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 11px;
                }
                .store-template-grid > button {
                    border: 1px solid var(--border-color);
                    border-radius: 15px;
                    background: var(--bg-secondary);
                    color: var(--text-primary);
                    padding: 10px;
                    text-align: left;
                    cursor: pointer;
                }
                .store-template-grid > button.selected {
                    border-color: var(--accent-primary);
                    box-shadow: 0 0 0 2px rgba(108,92,231,.10);
                }
                .store-template-swatch {
                    height: 72px;
                    border-radius: 10px;
                    margin-bottom: 10px;
                    position: relative;
                }
                .store-template-swatch span {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    width: 24px;
                    height: 24px;
                    border-radius: 999px;
                    display: grid;
                    place-items: center;
                    color: white;
                    background: var(--accent-primary);
                }
                .store-template-grid strong {
                    display: block;
                    font-size: 13px;
                    margin-bottom: 4px;
                }
                .store-template-grid p {
                    color: var(--text-secondary);
                    font-size: 11px;
                    line-height: 1.4;
                    min-height: 31px;
                }
                .store-template-grid small {
                    display: block;
                    color: var(--text-muted);
                    margin-top: 7px;
                    font-size: 10px;
                }
                .store-visual-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 18px;
                }
                .store-color-row {
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                }
                .store-color-row button,
                .store-color-row input {
                    width: 34px;
                    height: 34px;
                    border-radius: 10px;
                    border: 1px solid var(--border-color);
                    cursor: pointer;
                    padding: 0;
                    overflow: hidden;
                }
                .store-color-row button.selected {
                    box-shadow: 0 0 0 2px var(--text-primary);
                }
                .store-background-modes {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 6px;
                }
                .store-background-modes button {
                    min-height: 36px;
                    border: 1px solid var(--border-color);
                    border-radius: 10px;
                    background: var(--bg-secondary);
                    color: var(--text-secondary);
                    font-size: 11px;
                    font-weight: 750;
                    cursor: pointer;
                }
                .store-background-modes button.selected {
                    border-color: var(--accent-primary);
                    color: var(--accent-primary);
                    background: rgba(108,92,231,.09);
                }
                .store-color-input {
                    display: grid;
                    grid-template-columns: 48px 1fr;
                    gap: 8px;
                }
                .store-color-input input[type=color] {
                    width: 48px;
                    height: 48px;
                    border: 1px solid var(--border-color);
                    border-radius: 11px;
                    padding: 3px;
                    background: var(--bg-secondary);
                }
                .store-footer-toggle {
                    margin-left: auto;
                    border: 1px solid var(--border-color);
                    border-radius: 999px;
                    padding: 8px 12px;
                    background: var(--bg-secondary);
                    color: var(--text-secondary);
                    font-size: 12px;
                    font-weight: 800;
                    cursor: pointer;
                }
                .store-footer-toggle.active {
                    color: #00b894;
                    border-color: rgba(0,184,148,.34);
                    background: rgba(0,184,148,.10);
                }
                .store-footer-links {
                    grid-column: 1 / -1;
                    border-top: 1px solid var(--border-color);
                    padding-top: 16px;
                }
                .store-footer-link-row {
                    display: grid;
                    grid-template-columns: .7fr 1.3fr 36px;
                    gap: 8px;
                    margin-bottom: 8px;
                }
                .store-footer-link-row button {
                    border: 1px solid var(--border-color);
                    border-radius: 10px;
                    background: var(--bg-secondary);
                    color: var(--danger);
                    cursor: pointer;
                }
                .store-add-footer-link {
                    border: 1px dashed var(--border-color);
                    border-radius: 10px;
                    padding: 10px 13px;
                    background: transparent;
                    color: var(--text-secondary);
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                    font-weight: 750;
                    cursor: pointer;
                }
                .store-save-button {
                    min-width: 210px;
                    min-height: 46px;
                    display: inline-flex;
                    justify-content: center;
                    align-items: center;
                    gap: 9px;
                    font-size: 14px;
                }
                .store-save-bar {
                    position: sticky;
                    bottom: 14px;
                    z-index: 8;
                    border: 1px solid rgba(108,92,231,.25);
                    border-radius: 16px;
                    padding: 12px 14px 12px 18px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 18px;
                    background: color-mix(in srgb, var(--bg-card) 92%, transparent);
                    box-shadow: 0 14px 34px rgba(15,23,42,.15);
                    backdrop-filter: blur(16px);
                }
                .store-save-bar strong,
                .store-save-bar span {
                    display: block;
                }
                .store-save-bar strong {
                    color: var(--text-primary);
                    font-size: 13px;
                    margin-bottom: 3px;
                }
                .store-save-bar span {
                    color: var(--text-muted);
                    font-size: 10px;
                }
                @media (max-width: 980px) {
                    .store-customizer-layout {
                        grid-template-columns: 1fr;
                    }
                    .store-live-preview-column {
                        position: static;
                        display: none;
                    }
                    .store-setup-navigation {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }
                }
                @media (max-width: 720px) {
                    .store-publish-card,
                    .store-publish-actions {
                        align-items: stretch;
                        flex-direction: column;
                    }
                    .store-publish-actions > * {
                        justify-content: center;
                    }
                    .store-publish-intro {
                        align-items: flex-start;
                    }
                    .store-publish-icon {
                        width: 44px;
                        height: 44px;
                    }
                    .store-setup-navigation {
                        grid-template-columns: 1fr 1fr;
                    }
                    .store-setup-navigation > button {
                        align-items: flex-start;
                    }
                    .store-setup-navigation p {
                        display: none;
                    }
                    .store-editor-section {
                        padding: 18px;
                    }
                    .store-form-group {
                        padding: 14px;
                    }
                    .store-form-group-heading {
                        display: block;
                    }
                    .store-form-group-heading span {
                        display: block;
                        margin-top: 4px;
                        text-align: left;
                    }
                    .store-form-grid.two,
                    .store-template-grid,
                    .store-visual-grid {
                        grid-template-columns: 1fr;
                    }
                    .store-form-field.wide,
                    .store-footer-links {
                        grid-column: auto;
                    }
                    .store-template-grid p {
                        min-height: 0;
                    }
                    .store-footer-link-row {
                        grid-template-columns: 1fr 36px;
                    }
                    .store-footer-link-row input:nth-child(2) {
                        grid-column: 1;
                    }
                    .store-footer-link-row button {
                        grid-column: 2;
                        grid-row: 1 / 3;
                    }
                    .store-save-bar {
                        position: static;
                        align-items: stretch;
                        flex-direction: column;
                        padding: 14px;
                    }
                    .store-save-button {
                        width: 100%;
                    }
                }
            `}</style>
        </div>
    );
}

function StoreLivePreview({ form, products }: { form: StoreForm; products: StoreProduct[] }) {
    const palettes: Record<string, { bg: string; surface: string; ink: string; muted: string; secondary: string; tertiary: string }> = {
        creator: { bg: '#f5f2ec', surface: '#ffffff', ink: '#252826', muted: '#74766f', secondary: '#f2aa5b', tertiary: '#5f9f8c' },
        academy: { bg: '#f3f7f5', surface: '#ffffff', ink: '#193b34', muted: '#64756f', secondary: '#e3a652', tertiary: '#62a6b4' },
        studio: { bg: '#f4efe8', surface: '#fffdf8', ink: '#4c3526', muted: '#817268', secondary: '#d77b58', tertiary: '#8da05e' }
    };
    const palette = palettes[form.store_template] || palettes.creator;
    const backgroundColor = form.store_background_config.mode === 'color'
        ? form.store_background_config.color
        : palette.bg;
    const previewStyle = {
        '--preview-bg': backgroundColor,
        '--preview-surface': palette.surface,
        '--preview-ink': palette.ink,
        '--preview-muted': palette.muted,
        '--preview-accent': form.store_accent_color,
        '--preview-secondary': palette.secondary,
        '--preview-tertiary': palette.tertiary
    } as CSSProperties;
    const initials = (form.store_name || 'Minha Loja')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0]?.toUpperCase())
        .join('');
    const previewProducts = products.slice(0, 3);
    const displayProducts: StoreProduct[] = previewProducts.length ? previewProducts : [
        { id: 'preview-1', name: 'Produto em destaque' },
        { id: 'preview-2', name: 'Nova seleção' },
        { id: 'preview-3', name: 'Escolha especial' }
    ];

    return (
        <div className="store-live-preview" style={previewStyle}>
            <div className="store-preview-browser-bar"><i /><i /><i /></div>
            <div className="store-preview-topline">{form.store_badge_text || 'Uma seleção feita para você'}</div>
            <div className="store-preview-header">
                <span className="store-preview-logo">{initials || 'ML'}</span>
                <strong>{form.store_name || 'Minha Loja'}</strong>
                <span />
            </div>
            <div className="store-preview-hero">
                <div className="store-preview-copy">
                    <small>BEM-VINDO À NOSSA LOJA</small>
                    <h4>{form.store_headline || form.store_name || 'Descubra algo especial'}</h4>
                    <p>{form.store_description || 'Uma seleção cuidadosa, apresentada de um jeito simples e bonito.'}</p>
                    <button type="button">{form.store_cta_text || 'Ver produtos'}</button>
                </div>
                <div
                    className="store-preview-media"
                    style={form.store_banner_url ? { backgroundImage: `url("${form.store_banner_url}")` } : undefined}
                />
            </div>
            <div className="store-preview-products">
                <span>Escolhas da loja</span>
                <div className="store-preview-product-grid">
                    {displayProducts.map(product => (
                        <div className="store-preview-product" key={product.id}>
                            <div
                                className="store-preview-product-image"
                                style={product.image_url ? { backgroundImage: `url("${product.image_url}")` } : undefined}
                            />
                            <strong>{product.name}</strong>
                            <small>Ver detalhes</small>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function SectionHeader({
    icon,
    kicker,
    title,
    description,
    action
}: {
    icon: React.ReactNode;
    kicker: string;
    title: string;
    description: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="store-section-header">
            <div className="store-section-header-icon">{icon}</div>
            <div>
                <span>{kicker}</span>
                <h3>{title}</h3>
                <p>{description}</p>
            </div>
            {action}
        </div>
    );
}

function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
    return (
        <div className={`store-form-field ${wide ? 'wide' : ''}`}>
            <label className="store-field-label">{label}</label>
            {children}
        </div>
    );
}

function ImageUploader({
    imageUrl,
    uploading,
    onFile,
    onRemove
}: {
    imageUrl: string;
    uploading: boolean;
    onFile: (file: File) => void;
    onRemove: () => void;
}) {
    return (
        <div className="store-image-uploader">
            {imageUrl ? <img src={imageUrl} alt="Imagem selecionada" /> : <div className="store-image-placeholder"><FiImage /></div>}
            <label>
                <FiUpload /> {uploading ? 'Enviando...' : imageUrl ? 'Trocar imagem' : 'Enviar imagem'}
                <input
                    type="file"
                    accept="image/*"
                    hidden
                    disabled={uploading}
                    onChange={event => {
                        const file = event.target.files?.[0];
                        if (file) onFile(file);
                        event.target.value = '';
                    }}
                />
            </label>
            {imageUrl && <button type="button" onClick={onRemove} aria-label="Remover imagem"><FiTrash2 /></button>}
        </div>
    );
}

function FooterEditor({ value, onChange }: { value: StoreFooterConfig; onChange: (footer: StoreFooterConfig) => void }) {
    return (
        <section className="glass-card store-editor-section">
            <SectionHeader
                icon={<FiLink />}
                kicker="ETAPA 4"
                title="Rodapé e contatos"
                description="Edite apresentação, contatos e links úteis exibidos no final da página."
                action={(
                    <button type="button" className={`store-footer-toggle ${value.enabled ? 'active' : ''}`} onClick={() => onChange({ ...value, enabled: !value.enabled })}>
                        {value.enabled ? 'Rodapé ativo' : 'Rodapé oculto'}
                    </button>
                )}
            />
            {value.enabled && (
                <div className="store-form-grid two">
                    <Field label="Texto de apresentação" wide>
                        <textarea className="input-field" rows={3} maxLength={300} value={value.description} onChange={event => onChange({ ...value, description: event.target.value })} />
                    </Field>
                    <Field label="E-mail de contato">
                        <div style={{ position: 'relative' }}>
                            <FiMail style={{ position: 'absolute', left: 14, top: 16, color: 'var(--text-muted)' }} />
                            <input className="input-field" type="email" style={{ paddingLeft: 42 }} value={value.contact_email} onChange={event => onChange({ ...value, contact_email: event.target.value })} placeholder="contato@sualoja.com" />
                        </div>
                    </Field>
                    <Field label="WhatsApp">
                        <input className="input-field" value={value.whatsapp} onChange={event => onChange({ ...value, whatsapp: event.target.value })} placeholder="5511999999999" />
                    </Field>
                    <Field label="Instagram">
                        <div style={{ position: 'relative' }}>
                            <FiInstagram style={{ position: 'absolute', left: 14, top: 16, color: 'var(--text-muted)' }} />
                            <input className="input-field" style={{ paddingLeft: 42 }} value={value.instagram} onChange={event => onChange({ ...value, instagram: event.target.value })} placeholder="sualoja" />
                        </div>
                    </Field>
                    <Field label="Texto de direitos autorais">
                        <input className="input-field" maxLength={160} value={value.copyright_text} onChange={event => onChange({ ...value, copyright_text: event.target.value })} placeholder="Todos os direitos reservados." />
                    </Field>
                    <div className="store-footer-links">
                        <label className="store-field-label">Links do rodapé</label>
                        {value.links.map(link => (
                            <div className="store-footer-link-row" key={link.id}>
                                <input className="input-field" maxLength={40} value={link.label} onChange={event => onChange({ ...value, links: value.links.map(item => item.id === link.id ? { ...item, label: event.target.value } : item) })} placeholder="Nome do link" />
                                <input className="input-field" maxLength={1000} value={link.url} onChange={event => onChange({ ...value, links: value.links.map(item => item.id === link.id ? { ...item, url: event.target.value } : item) })} placeholder="https://... ou /pagina" />
                                <button type="button" onClick={() => onChange({ ...value, links: value.links.filter(item => item.id !== link.id) })} aria-label="Remover link"><FiTrash2 /></button>
                            </div>
                        ))}
                        {value.links.length < 6 && (
                            <button type="button" className="store-add-footer-link" onClick={() => onChange({ ...value, links: [...value.links, { id: createStoreBuilderId('footer-link'), label: '', url: '' }] })}>
                                <FiPlus /> Adicionar link
                            </button>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}
