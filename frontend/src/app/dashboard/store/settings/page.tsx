'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
    FiCheck,
    FiExternalLink,
    FiImage,
    FiInstagram,
    FiLayout,
    FiLink,
    FiMail,
    FiPlus,
    FiPower,
    FiSave,
    FiTrash2,
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
        name: 'Creator Pro',
        description: 'Contraste forte e foco total na oferta.',
        preview: 'Ideal para infoprodutos, acessos e lançamentos.',
        gradient: 'linear-gradient(135deg,#09090b,#6c5ce7)'
    },
    {
        key: 'academy',
        name: 'Academy',
        description: 'Visual claro, leve e muito organizado.',
        preview: 'Ideal para cursos, aulas e comunidades.',
        gradient: 'linear-gradient(135deg,#f8fafc,#0984e3)'
    },
    {
        key: 'studio',
        name: 'Studio',
        description: 'Estética editorial e acabamento premium.',
        preview: 'Ideal para marcas e catálogos exclusivos.',
        gradient: 'linear-gradient(135deg,#11100f,#f59e0b)'
    }
];

const ACCENT_COLORS = ['#6c5ce7', '#00b894', '#0984e3', '#e84393', '#f59e0b', '#111827'];

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
    store_accent_color: '#6c5ce7',
    store_headline: '',
    store_cta_text: 'Ver produtos',
    store_badge_text: 'Produtos digitais com acesso online',
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

    return (
        <div className="store-builder-page">
            {migrationRequired && (
                <div className="store-migration-alert">
                    <strong>Uma atualização do banco está pendente.</strong>
                    <span>Execute o arquivo <code>029_add_storefront_builder.sql</code> no Supabase para ativar e salvar o novo construtor.</span>
                </div>
            )}

            <div className="store-builder-main">
                <section className="glass-card store-publish-card">
                    <div>
                        <span className="store-builder-eyebrow">SUA VITRINE DIGITAL</span>
                        <h2>{form.store_name || 'Configure sua loja'}</h2>
                        <p>Edite a identidade, organize as seções e publique tudo em uma única tela.</p>
                    </div>
                    <div className="store-publish-actions">
                        {publicUrl && (
                            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                                Ver loja <FiExternalLink />
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

                <section className="glass-card store-editor-section">
                    <SectionHeader
                        icon={<FiLayout />}
                        kicker="IDENTIDADE"
                        title="Cabeçalho e apresentação"
                        description="Essas informações aparecem no topo e ajudam o comprador a entender sua oferta."
                    />
                    <div className="store-form-grid two">
                        <Field label="Nome da loja">
                            <input className="input-field" maxLength={100} value={form.store_name} onChange={event => update('store_name', event.target.value)} placeholder="Ex: Academia do Criador" />
                        </Field>
                        <Field label="Link público">
                            <div className="store-slug-field">
                                <span>/store/</span>
                                <input value={form.store_slug} maxLength={64} onChange={event => update('store_slug', slugify(event.target.value))} placeholder="minha-loja" />
                            </div>
                        </Field>
                        <Field label="Chamada principal">
                            <input className="input-field" maxLength={140} value={form.store_headline} onChange={event => update('store_headline', event.target.value)} placeholder="Uma frase forte sobre sua loja" />
                        </Field>
                        <Field label="Texto do botão principal">
                            <input className="input-field" maxLength={40} value={form.store_cta_text} onChange={event => update('store_cta_text', event.target.value)} placeholder="Ver produtos" />
                        </Field>
                        <Field label="Descrição" wide>
                            <textarea className="input-field" rows={4} maxLength={600} value={form.store_description} onChange={event => update('store_description', event.target.value)} placeholder="Conte ao cliente o que ele encontra nesta loja." />
                        </Field>
                        <Field label="Selo no topo">
                            <input className="input-field" maxLength={60} value={form.store_badge_text} onChange={event => update('store_badge_text', event.target.value)} />
                        </Field>
                        <Field label="Banner principal">
                            <ImageUploader
                                imageUrl={form.store_banner_url}
                                uploading={uploading === 'hero'}
                                onFile={file => handleSimpleUpload('hero', file)}
                                onRemove={() => update('store_banner_url', '')}
                            />
                        </Field>
                    </div>
                </section>

                <StoreBuilderEditor
                    sections={form.store_layout_sections}
                    products={products}
                    uploadingSlideId={uploading}
                    onChange={sections => update('store_layout_sections', sections)}
                    onUploadSlide={handleSlideUpload}
                />

                <section className="glass-card store-editor-section">
                    <SectionHeader
                        icon={<FiImage />}
                        kicker="VISUAL"
                        title="Tema, cores e fundo"
                        description="O novo visual mantém a mesma estrutura profissional para todos, com personalização de marca e fundo."
                    />
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

                    <div className="store-visual-grid">
                        <div>
                            <label className="store-field-label">Cor de destaque</label>
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
                            <label className="store-field-label">Tipo de fundo</label>
                            <div className="store-background-modes">
                                {[
                                    { value: 'theme', label: 'Do tema' },
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
                                <Field label={`Escurecimento da imagem: ${form.store_background_config.overlay}%`}>
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
                </section>

                <FooterEditor
                    value={form.store_footer_config}
                    onChange={footer => update('store_footer_config', footer)}
                />

                <button type="button" onClick={handleSave} disabled={saving || migrationRequired} className="btn-primary store-save-button">
                    <FiSave /> {saving ? 'Salvando...' : 'Salvar e publicar alterações'}
                </button>
            </div>

            <aside className="store-preview-column">
                <div className="glass-card store-preview-card">
                    <div className="store-preview-heading">
                        <div>
                            <strong>Prévia ao vivo</strong>
                            <span>{visibleProducts.length} produtos disponíveis</span>
                        </div>
                        <span className={form.store_active ? 'online' : ''}>{form.store_active ? 'ONLINE' : 'OFFLINE'}</span>
                    </div>
                    <StoreMiniPreview form={form} products={visibleProducts} />
                </div>
            </aside>

            <style jsx global>{`
                .store-builder-page {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) 390px;
                    gap: 22px;
                    align-items: start;
                }
                .store-builder-main {
                    display: grid;
                    gap: 18px;
                    min-width: 0;
                }
                .store-migration-alert {
                    grid-column: 1 / -1;
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
                    padding: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 20px;
                    background:
                        radial-gradient(circle at 92% 8%, rgba(108,92,231,.16), transparent 32%),
                        var(--bg-card);
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
                .store-editor-section {
                    padding: 24px;
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
                    margin-bottom: 22px;
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
                    border-top: 1px solid var(--border-color);
                    padding-top: 20px;
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
                    width: 100%;
                    min-height: 52px;
                    display: inline-flex;
                    justify-content: center;
                    align-items: center;
                    gap: 9px;
                    font-size: 14px;
                }
                .store-preview-column {
                    position: sticky;
                    top: 88px;
                }
                .store-preview-card {
                    padding: 15px;
                }
                .store-preview-heading {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 12px;
                }
                .store-preview-heading strong {
                    display: block;
                    font-size: 13px;
                }
                .store-preview-heading div span {
                    color: var(--text-secondary);
                    font-size: 10px;
                }
                .store-preview-heading > span {
                    color: var(--text-muted);
                    font-size: 9px;
                    font-weight: 900;
                    letter-spacing: .08em;
                }
                .store-preview-heading > span.online {
                    color: #00b894;
                }
                .store-mini-preview {
                    height: 640px;
                    border: 1px solid var(--border-color);
                    border-radius: 17px;
                    overflow: hidden;
                    color: var(--mini-text);
                    background-color: var(--mini-bg);
                    background-size: cover;
                    background-position: center;
                    display: flex;
                    flex-direction: column;
                }
                .store-mini-nav {
                    margin: 9px;
                    min-height: 36px;
                    border: 1px solid var(--mini-border);
                    border-radius: 999px;
                    padding: 0 11px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: var(--mini-surface);
                    backdrop-filter: blur(10px);
                    font-size: 9px;
                    font-weight: 900;
                }
                .store-mini-cart {
                    padding: 5px 8px;
                    border-radius: 999px;
                    color: white;
                    background: var(--mini-accent);
                }
                .store-mini-hero {
                    min-height: 150px;
                    padding: 20px 16px 14px;
                    display: flex;
                    flex-direction: column;
                    justify-content: flex-end;
                    background-size: cover;
                    background-position: center;
                }
                .store-mini-hero small {
                    color: var(--mini-accent);
                    font-size: 7px;
                    font-weight: 900;
                }
                .store-mini-hero strong {
                    display: block;
                    max-width: 270px;
                    font-size: 20px;
                    line-height: 1.05;
                    margin: 5px 0;
                }
                .store-mini-hero p {
                    color: var(--mini-muted);
                    font-size: 8px;
                    line-height: 1.4;
                    max-width: 260px;
                }
                .store-mini-content {
                    flex: 1;
                    padding: 13px;
                    overflow: hidden;
                    display: grid;
                    align-content: start;
                    gap: 12px;
                }
                .store-mini-section-title {
                    width: 110px;
                    height: 7px;
                    border-radius: 99px;
                    background: var(--mini-text);
                    margin-bottom: 7px;
                    opacity: .86;
                }
                .store-mini-products {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 5px;
                }
                .store-mini-product {
                    min-width: 0;
                    height: 78px;
                    border: 1px solid var(--mini-border);
                    border-radius: 7px;
                    background: var(--mini-surface);
                    overflow: hidden;
                }
                .store-mini-product div {
                    height: 48px;
                    background: linear-gradient(135deg, var(--mini-accent), rgba(148,163,184,.4));
                    background-size: cover;
                    background-position: center;
                }
                .store-mini-product span {
                    display: block;
                    height: 5px;
                    margin: 8px;
                    border-radius: 99px;
                    background: var(--mini-text);
                    opacity: .75;
                }
                .store-mini-banner {
                    min-height: 80px;
                    border-radius: 9px;
                    background: linear-gradient(120deg, var(--mini-accent), rgba(15,23,42,.88));
                    background-size: cover;
                    background-position: center;
                    display: flex;
                    align-items: flex-end;
                    padding: 10px;
                    font-size: 10px;
                    font-weight: 900;
                    color: white;
                }
                .store-mini-footer {
                    border-top: 1px solid var(--mini-border);
                    background: var(--mini-surface);
                    padding: 12px;
                    font-size: 8px;
                    color: var(--mini-muted);
                }
                @media (max-width: 1180px) {
                    .store-builder-page {
                        grid-template-columns: 1fr;
                    }
                    .store-preview-column {
                        position: static;
                    }
                    .store-mini-preview {
                        height: 560px;
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
                }
            `}</style>
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
                kicker="RODAPÉ"
                title="Informações finais da loja"
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

function StoreMiniPreview({ form, products }: { form: StoreForm; products: StoreProduct[] }) {
    const theme = form.store_template === 'academy'
        ? { bg: '#f8fafc', surface: 'rgba(255,255,255,.92)', text: '#0f172a', muted: '#64748b', border: 'rgba(15,23,42,.10)' }
        : form.store_template === 'studio'
            ? { bg: '#11100f', surface: 'rgba(27,25,23,.92)', text: '#fffaf0', muted: '#c7b9a1', border: 'rgba(255,250,240,.10)' }
            : { bg: '#09090b', surface: 'rgba(20,20,23,.92)', text: '#fff', muted: '#94a3b8', border: 'rgba(255,255,255,.08)' };

    const background = form.store_background_config;
    const backgroundImage = background.mode === 'image' && background.image_url
        ? `linear-gradient(rgba(9,9,11,${background.overlay / 100}),rgba(9,9,11,${background.overlay / 100})),url("${background.image_url}")`
        : undefined;
    const backgroundColor = background.mode === 'color' ? background.color : theme.bg;
    const sections = form.store_layout_sections.length > 0
        ? form.store_layout_sections.slice(0, 4)
        : [{
            id: 'preview-products',
            type: 'products' as const,
            title: 'Produtos em destaque',
            subtitle: '',
            product_ids: products.slice(0, 4).map(product => product.id)
        }];
    const productsById = useMemo(() => new Map(products.map(product => [product.id, product])), [products]);

    return (
        <div
            className="store-mini-preview"
            style={{
                '--mini-bg': backgroundColor,
                '--mini-surface': theme.surface,
                '--mini-text': theme.text,
                '--mini-muted': theme.muted,
                '--mini-border': theme.border,
                '--mini-accent': form.store_accent_color,
                backgroundImage
            } as React.CSSProperties}
        >
            <div className="store-mini-nav">
                <span>{form.store_name || 'Sua loja'}</span>
                <span className="store-mini-cart">Carrinho</span>
            </div>
            <div
                className="store-mini-hero"
                style={{
                    backgroundImage: form.store_banner_url
                        ? `linear-gradient(90deg,rgba(9,9,11,.88),rgba(9,9,11,.2)),url("${form.store_banner_url}")`
                        : `radial-gradient(circle at 90% 10%,${form.store_accent_color}99,transparent 45%)`
                }}
            >
                <small>{form.store_badge_text}</small>
                <strong>{form.store_headline || form.store_name || 'Sua vitrine digital'}</strong>
                <p>{form.store_description || 'Uma loja bonita, rápida e organizada para seus clientes.'}</p>
            </div>
            <div className="store-mini-content">
                {sections.map(section => section.type === 'products' ? (
                    <div key={section.id}>
                        <div className="store-mini-section-title" />
                        <div className="store-mini-products">
                            {section.product_ids.slice(0, 4).map(productId => {
                                const product = productsById.get(productId);
                                return (
                                    <div className="store-mini-product" key={productId}>
                                        <div style={product?.image_url ? { backgroundImage: `url("${product.image_url}")` } : undefined} />
                                        <span />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div
                        className="store-mini-banner"
                        key={section.id}
                        style={section.slides[0]?.image_url ? { backgroundImage: `linear-gradient(90deg,rgba(0,0,0,.68),rgba(0,0,0,.1)),url("${section.slides[0].image_url}")` } : undefined}
                    >
                        {section.slides[0]?.title || 'Seu banner em destaque'}
                    </div>
                ))}
            </div>
            {form.store_footer_config.enabled && (
                <div className="store-mini-footer">
                    {form.store_footer_config.description || `${form.store_name || 'Sua loja'} — produtos digitais selecionados.`}
                </div>
            )}
        </div>
    );
}
