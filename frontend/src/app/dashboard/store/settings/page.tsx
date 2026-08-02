'use client';

import { CSSProperties, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
    FiCheck,
    FiColumns,
    FiExternalLink,
    FiEye,
    FiEyeOff,
    FiImage,
    FiInstagram,
    FiLayout,
    FiLayers,
    FiLink,
    FiMail,
    FiPackage,
    FiPlay,
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
    DEFAULT_STORE_STYLE,
    STORE_COLOR_PALETTES,
    StoreBackgroundConfig,
    StoreFooterConfig,
    StoreLayoutSection,
    StorePaletteColors,
    StorePaletteKey,
    StoreStyleConfig
} from '@/lib/store-builder';

const STORE_TEMPLATES = [
    {
        key: 'creator',
        name: 'Nexus',
        description: 'Interface escura, bento cards e transparências modernas.',
        preview: 'Versátil, tecnológica e focada em conversão.',
        gradient: 'linear-gradient(145deg,#070a12 0 44%,#171e2e 44% 72%,#7c5cff 72%)',
        palette: 'midnight' as StorePaletteKey,
        accent: '#7c5cff',
        style: { font_style: 'modern', hero_layout: 'split', hero_image_style: 'rounded', header_style: 'glass', button_style: 'pill', card_style: 'elevated', corner_style: 'rounded', background_pattern: 'grid' } as Partial<StoreStyleConfig>
    },
    {
        key: 'academy',
        name: 'Mono Grid',
        description: 'Geometria limpa, contraste alto e poucos excessos.',
        preview: 'Ideal para marcas minimalistas e produtos premium.',
        gradient: 'linear-gradient(145deg,#080808 0 48%,#1d1d1d 48% 76%,#ff5a36 76%)',
        palette: 'carbon' as StorePaletteKey,
        accent: '#ff5a36',
        style: { font_style: 'modern', hero_layout: 'centered', hero_image_style: 'framed', header_style: 'minimal', button_style: 'square', card_style: 'minimal', corner_style: 'sharp', background_pattern: 'none' } as Partial<StoreStyleConfig>
    },
    {
        key: 'studio',
        name: 'Pulse',
        description: 'Capa imersiva, cores luminosas e movimento expressivo.',
        preview: 'Uma experiência ousada para marcas cheias de atitude.',
        gradient: 'linear-gradient(145deg,#051019 0 42%,#102533 42% 68%,#00b8ff 68% 84%,#00e5c3 84%)',
        palette: 'ocean' as StorePaletteKey,
        accent: '#00b8ff',
        style: { font_style: 'bold', hero_layout: 'immersive', hero_image_style: 'rounded', header_style: 'solid', button_style: 'pill', card_style: 'colorful', corner_style: 'rounded', background_pattern: 'dots' } as Partial<StoreStyleConfig>
    }
];

const ACCENT_COLORS = ['#7c5cff', '#00b8ff', '#00e5c3', '#a3e635', '#ff5a36', '#ff426d'];

const COLOR_PALETTE_OPTIONS: Array<{ key: StorePaletteKey; name: string; description: string }> = [
    { key: 'midnight', name: 'Midnight', description: 'Azul profundo e violeta elétrico' },
    { key: 'graphite', name: 'Graphite', description: 'Grafite com verde luminoso' },
    { key: 'carbon', name: 'Carbon', description: 'Preto puro com laranja intenso' },
    { key: 'ocean', name: 'Deep Ocean', description: 'Azul escuro, ciano e turquesa' },
    { key: 'pearl', name: 'Pearl', description: 'Alternativa clara e contemporânea' }
];

const CUSTOM_COLOR_FIELDS: Array<{ key: keyof StorePaletteColors; label: string }> = [
    { key: 'bg', label: 'Fundo geral' },
    { key: 'surface', label: 'Cards e menu' },
    { key: 'soft', label: 'Superfície auxiliar' },
    { key: 'ink', label: 'Texto principal' },
    { key: 'muted', label: 'Texto secundário' },
    { key: 'line', label: 'Bordas' },
    { key: 'deep', label: 'Contraste profundo' },
    { key: 'accent', label: 'Destaque principal' },
    { key: 'secondary', label: 'Cor secundária' },
    { key: 'tertiary', label: 'Cor terciária' },
    { key: 'glow', label: 'Brilho e efeitos' }
];

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
    store_style_config: StoreStyleConfig;
};

const initialForm: StoreForm = {
    store_active: false,
    store_name: '',
    store_slug: '',
    store_description: '',
    store_theme: 'light',
    store_banner_url: '',
    store_template: 'creator',
    store_accent_color: STORE_COLOR_PALETTES.midnight.accent,
    store_headline: '',
    store_cta_text: 'Ver produtos',
    store_badge_text: 'Uma seleção feita para você',
    store_layout_sections: [],
    store_footer_config: { ...DEFAULT_STORE_FOOTER, links: [] },
    store_background_config: { ...DEFAULT_STORE_BACKGROUND },
    store_style_config: { ...DEFAULT_STORE_STYLE }
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
    const [migrationFile, setMigrationFile] = useState('');
    const [uploading, setUploading] = useState<string | null>(null);
    const [form, setForm] = useState<StoreForm>(initialForm);
    const [products, setProducts] = useState<StoreProduct[]>([]);
    const [activeEditor, setActiveEditor] = useState<'identity' | 'appearance' | 'layout' | 'experience' | 'structure' | 'footer'>('identity');

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
                setMigrationFile(store.migration_file || '');
                setProducts(data.products || []);
                setForm({
                    ...initialForm,
                    ...store,
                    store_layout_sections: Array.isArray(store.store_layout_sections) ? store.store_layout_sections : [],
                    store_footer_config: { ...DEFAULT_STORE_FOOTER, ...(store.store_footer_config || {}), links: store.store_footer_config?.links || [] },
                    store_background_config: { ...DEFAULT_STORE_BACKGROUND, ...(store.store_background_config || {}) },
                    store_style_config: {
                        ...DEFAULT_STORE_STYLE,
                        ...(store.store_style_config || {}),
                        custom_colors: { ...DEFAULT_STORE_STYLE.custom_colors, ...(store.store_style_config?.custom_colors || {}) }
                    }
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

    const updateStyle = <K extends keyof StoreStyleConfig>(field: K, value: StoreStyleConfig[K]) => {
        setForm(previous => ({
            ...previous,
            store_style_config: { ...previous.store_style_config, [field]: value }
        }));
    };

    const applyVisualTemplate = (template: typeof STORE_TEMPLATES[number]) => {
        setForm(previous => ({
            ...previous,
            store_template: template.key,
            store_accent_color: template.accent,
            store_style_config: {
                ...previous.store_style_config,
                ...template.style,
                color_mode: 'preset',
                palette_preset: template.palette
            }
        }));
    };

    const applyPalette = (paletteKey: StorePaletteKey) => {
        const palette = STORE_COLOR_PALETTES[paletteKey];
        setForm(previous => ({
            ...previous,
            store_accent_color: palette.accent,
            store_style_config: {
                ...previous.store_style_config,
                color_mode: 'preset',
                palette_preset: paletteKey
            }
        }));
    };

    const updateCustomColor = (field: keyof StorePaletteColors, color: string) => {
        setForm(previous => ({
            ...previous,
            store_accent_color: field === 'accent' ? color : previous.store_accent_color,
            store_style_config: {
                ...previous.store_style_config,
                color_mode: 'custom',
                custom_colors: { ...previous.store_style_config.custom_colors, [field]: color }
            }
        }));
    };

    const enableCustomColors = () => {
        setForm(previous => {
            const base = previous.store_style_config.color_mode === 'custom'
                ? previous.store_style_config.custom_colors
                : STORE_COLOR_PALETTES[previous.store_style_config.palette_preset];
            return {
                ...previous,
                store_style_config: {
                    ...previous.store_style_config,
                    color_mode: 'custom',
                    custom_colors: { ...base, accent: previous.store_accent_color }
                }
            };
        });
    };

    const updateAccentColor = (color: string) => {
        setForm(previous => ({
            ...previous,
            store_accent_color: color,
            store_style_config: previous.store_style_config.color_mode === 'custom'
                ? { ...previous.store_style_config, custom_colors: { ...previous.store_style_config.custom_colors, accent: color } }
                : previous.store_style_config
        }));
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
            return toast.error(`Execute primeiro a migration ${migrationFile || 'pendente'} no Supabase.`);
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
                    <span>Execute o arquivo <code>{migrationFile || 'indicado pela API'}</code> no Supabase para ativar e salvar todas as opções do construtor.</span>
                </div>
            )}

            <section className="glass-card store-publish-card">
                <div className="store-publish-intro">
                    <div className="store-publish-icon"><FiLayout /></div>
                    <div>
                        <span className="store-builder-eyebrow">PAINEL DA LOJA</span>
                        <h2>{form.store_name || 'Configure sua loja'}</h2>
                        <p>Personalize cada detalhe da experiência e publique quando estiver tudo pronto.</p>
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
                            { key: 'layout', step: '03', label: 'Layout', description: 'Capa, menu e formas', icon: <FiLayout /> },
                            { key: 'experience', step: '04', label: 'Vitrine', description: 'Produtos e movimento', icon: <FiColumns /> },
                            { key: 'structure', step: '05', label: 'Seções', description: 'Ordem e destaques', icon: <FiLayers /> },
                            { key: 'footer', step: '06', label: 'Contatos', description: 'Rodapé e canais', icon: <FiLink /> }
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
                                            <button key={template.key} type="button" className={selected ? 'selected' : ''} onClick={() => applyVisualTemplate(template)}>
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
                                    <span>Use uma combinação pronta ou controle individualmente cada cor da loja.</span>
                                </div>
                                <div className="store-palette-grid">
                                    {COLOR_PALETTE_OPTIONS.map(option => {
                                        const colors = STORE_COLOR_PALETTES[option.key];
                                        const selected = form.store_style_config.color_mode === 'preset' && form.store_style_config.palette_preset === option.key;
                                        return (
                                            <button key={option.key} type="button" className={selected ? 'selected' : ''} onClick={() => applyPalette(option.key)}>
                                                <span className="store-palette-swatches">
                                                    {[colors.bg, colors.surface, colors.accent, colors.secondary, colors.tertiary].map((color, index) => <i key={`${color}-${index}`} style={{ background: color }} />)}
                                                </span>
                                                <strong>{option.name}</strong>
                                                <small>{option.description}</small>
                                                {selected && <em><FiCheck /></em>}
                                            </button>
                                        );
                                    })}
                                    <button type="button" className={`store-custom-palette-card ${form.store_style_config.color_mode === 'custom' ? 'selected' : ''}`} onClick={enableCustomColors}>
                                        <span className="store-custom-palette-icon"><FiSliders /></span>
                                        <strong>Minha paleta</strong>
                                        <small>Personalize todas as cores</small>
                                        {form.store_style_config.color_mode === 'custom' && <em><FiCheck /></em>}
                                    </button>
                                </div>
                                {form.store_style_config.color_mode === 'custom' && (
                                    <div className="store-custom-colors">
                                        {CUSTOM_COLOR_FIELDS.map(field => (
                                            <label key={field.key}>
                                                <span>{field.label}</span>
                                                <div>
                                                    <input type="color" value={form.store_style_config.custom_colors[field.key]} onChange={event => updateCustomColor(field.key, event.target.value)} />
                                                    <code>{form.store_style_config.custom_colors[field.key]}</code>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}
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
                                                    onClick={() => updateAccentColor(color)}
                                                    aria-label={`Usar cor ${color}`}
                                                />
                                            ))}
                                            <input type="color" value={form.store_accent_color} onChange={event => updateAccentColor(event.target.value)} aria-label="Escolher cor personalizada" />
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
                            <div className="store-form-group">
                                <div className="store-form-group-heading">
                                    <strong>Personalidade da marca</strong>
                                    <span>A tipografia, a energia das cores e a textura mudam totalmente a sensação da loja.</span>
                                </div>
                                <StyleChoiceGroup
                                    label="Estilo de tipografia"
                                    value={form.store_style_config.font_style}
                                    onChange={value => updateStyle('font_style', value)}
                                    options={[
                                        { value: 'modern', label: 'Moderna', description: 'Limpa e objetiva' },
                                        { value: 'editorial', label: 'Editorial', description: 'Elegante e autoral' },
                                        { value: 'friendly', label: 'Amigável', description: 'Leve e acolhedora' },
                                        { value: 'bold', label: 'Marcante', description: 'Forte e comercial' }
                                    ]}
                                />
                                <StyleChoiceGroup
                                    label="Intensidade das cores"
                                    value={form.store_style_config.color_intensity}
                                    onChange={value => updateStyle('color_intensity', value)}
                                    options={[
                                        { value: 'monochrome', label: 'Discreta', description: 'Quase monocromática' },
                                        { value: 'balanced', label: 'Equilibrada', description: 'Cor em pontos-chave' },
                                        { value: 'vibrant', label: 'Vibrante', description: 'Mais energia e contraste' }
                                    ]}
                                />
                                <StyleChoiceGroup
                                    label="Textura do fundo"
                                    value={form.store_style_config.background_pattern}
                                    onChange={value => updateStyle('background_pattern', value)}
                                    options={[
                                        { value: 'none', label: 'Lisa', description: 'Fundo limpo' },
                                        { value: 'dots', label: 'Pontos', description: 'Textura delicada' },
                                        { value: 'grid', label: 'Grade', description: 'Ritmo contemporâneo' },
                                        { value: 'waves', label: 'Ondas', description: 'Mais orgânica' }
                                    ]}
                                />
                            </div>
                        </section>
                    )}

                    {activeEditor === 'layout' && (
                        <section className="glass-card store-editor-section">
                            <SectionHeader
                                icon={<FiLayout />}
                                kicker="COMPOSIÇÃO DA PÁGINA"
                                title="Escolha a forma da sua loja"
                                description="Mude a capa, o cabeçalho, os botões e os cantos para fugir de um visual genérico."
                            />
                            <div className="store-form-group store-choice-stack">
                                <StyleChoiceGroup
                                    label="Formato da capa"
                                    value={form.store_style_config.hero_layout}
                                    onChange={value => updateStyle('hero_layout', value)}
                                    options={[
                                        { value: 'split', label: 'Dividida', description: 'Texto e imagem lado a lado' },
                                        { value: 'centered', label: 'Central', description: 'Mensagem em destaque' },
                                        { value: 'immersive', label: 'Imersiva', description: 'Imagem ampla e impactante' }
                                    ]}
                                />
                                <StyleChoiceGroup
                                    label="Tratamento da imagem principal"
                                    value={form.store_style_config.hero_image_style}
                                    onChange={value => updateStyle('hero_image_style', value)}
                                    options={[
                                        { value: 'arched', label: 'Arco', description: 'Curvas editoriais' },
                                        { value: 'rounded', label: 'Suave', description: 'Bloco arredondado' },
                                        { value: 'framed', label: 'Moldura', description: 'Imagem emoldurada' }
                                    ]}
                                />
                                <StyleChoiceGroup
                                    label="Estilo do cabeçalho"
                                    value={form.store_style_config.header_style}
                                    onChange={value => updateStyle('header_style', value)}
                                    options={[
                                        { value: 'glass', label: 'Flutuante', description: 'Transparência e desfoque' },
                                        { value: 'solid', label: 'Sólido', description: 'Presença e contraste' },
                                        { value: 'minimal', label: 'Minimal', description: 'Leve e sem bordas' }
                                    ]}
                                />
                                <StyleChoiceGroup
                                    label="Formato dos botões"
                                    value={form.store_style_config.button_style}
                                    onChange={value => updateStyle('button_style', value)}
                                    options={[
                                        { value: 'soft', label: 'Suave', description: 'Cantos moderados' },
                                        { value: 'pill', label: 'Cápsula', description: 'Totalmente arredondado' },
                                        { value: 'square', label: 'Reto', description: 'Geometria firme' }
                                    ]}
                                />
                                <StyleChoiceGroup
                                    label="Cantos da interface"
                                    value={form.store_style_config.corner_style}
                                    onChange={value => updateStyle('corner_style', value)}
                                    options={[
                                        { value: 'soft', label: 'Equilibrados', description: 'Curvas discretas' },
                                        { value: 'rounded', label: 'Arredondados', description: 'Mais leves e orgânicos' },
                                        { value: 'sharp', label: 'Retos', description: 'Visual editorial e preciso' }
                                    ]}
                                />
                            </div>
                        </section>
                    )}

                    {activeEditor === 'experience' && (
                        <section className="glass-card store-editor-section">
                            <SectionHeader
                                icon={<FiColumns />}
                                kicker="EXPERIÊNCIA DA VITRINE"
                                title="Controle como o catálogo se comporta"
                                description="Ajuste densidade, imagens, cards, animações e quais elementos aparecem para o cliente."
                            />
                            <div className="store-form-group store-choice-stack">
                                <StyleChoiceGroup
                                    label="Estilo dos produtos"
                                    value={form.store_style_config.card_style}
                                    onChange={value => updateStyle('card_style', value)}
                                    options={[
                                        { value: 'colorful', label: 'Colorido', description: 'Cards com personalidade' },
                                        { value: 'elevated', label: 'Elevado', description: 'Sombras e profundidade' },
                                        { value: 'outlined', label: 'Contornado', description: 'Estrutura bem definida' },
                                        { value: 'minimal', label: 'Essencial', description: 'Produto em primeiro plano' }
                                    ]}
                                />
                                <StyleChoiceGroup
                                    label="Espaçamento do catálogo"
                                    value={form.store_style_config.catalog_density}
                                    onChange={value => updateStyle('catalog_density', value)}
                                    options={[
                                        { value: 'compact', label: 'Compacto', description: 'Mais itens na tela' },
                                        { value: 'comfortable', label: 'Confortável', description: 'Equilíbrio visual' },
                                        { value: 'spacious', label: 'Espaçoso', description: 'Mais respiro e luxo' }
                                    ]}
                                />
                                <StyleChoiceGroup
                                    label="Proporção das fotos"
                                    value={form.store_style_config.image_ratio}
                                    onChange={value => updateStyle('image_ratio', value)}
                                    options={[
                                        { value: 'square', label: 'Quadrada', description: '1:1 versátil' },
                                        { value: 'portrait', label: 'Vertical', description: 'Moda e produtos altos' },
                                        { value: 'landscape', label: 'Horizontal', description: 'Cenas e produtos largos' }
                                    ]}
                                />
                                <StyleChoiceGroup
                                    label="Colunas no desktop"
                                    value={form.store_style_config.catalog_columns}
                                    onChange={value => updateStyle('catalog_columns', value)}
                                    options={[
                                        { value: 2, label: '2 colunas', description: 'Cards grandes' },
                                        { value: 3, label: '3 colunas', description: 'Vitrine equilibrada' },
                                        { value: 4, label: '4 colunas', description: 'Catálogo amplo' }
                                    ]}
                                />
                                <StyleChoiceGroup
                                    label="Movimento da página"
                                    value={form.store_style_config.animation_level}
                                    onChange={value => updateStyle('animation_level', value)}
                                    options={[
                                        { value: 'none', label: 'Sem animação', description: 'Experiência direta' },
                                        { value: 'subtle', label: 'Sutil', description: 'Movimentos delicados' },
                                        { value: 'expressive', label: 'Expressivo', description: 'Mais vida e impacto' }
                                    ]}
                                />
                            </div>
                            <div className="store-form-group">
                                <div className="store-form-group-heading">
                                    <strong>Elementos visíveis</strong>
                                    <span>Monte uma página mais completa ou enxuta conforme seu público.</span>
                                </div>
                                <div className="store-visibility-grid">
                                    <VisibilityToggle icon={<FiPlay />} label="Aviso no topo" description="Mensagem curta acima do menu" enabled={form.store_style_config.show_announcement} onChange={value => updateStyle('show_announcement', value)} />
                                    <VisibilityToggle icon={<FiLayers />} label="Barra de benefícios" description="Compra, pagamento e suporte" enabled={form.store_style_config.show_service_bar} onChange={value => updateStyle('show_service_bar', value)} />
                                    <VisibilityToggle icon={<FiPlay />} label="Faixa animada" description="Palavras em movimento na página" enabled={form.store_style_config.show_marquee} onChange={value => updateStyle('show_marquee', value)} />
                                    <VisibilityToggle icon={<FiColumns />} label="Categorias" description="Atalhos visuais para os departamentos" enabled={form.store_style_config.show_categories} onChange={value => updateStyle('show_categories', value)} />
                                    <VisibilityToggle icon={<FiEye />} label="Campo de busca" description="Busca no menu e no catálogo" enabled={form.store_style_config.show_search} onChange={value => updateStyle('show_search', value)} />
                                    <VisibilityToggle icon={<FiEyeOff />} label="Acesso à conta" description="Atalho de login no cabeçalho" enabled={form.store_style_config.show_account} onChange={value => updateStyle('show_account', value)} />
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
                    grid-template-columns: repeat(3, minmax(0, 1fr));
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
                    background: color-mix(in srgb, var(--preview-surface) 92%, var(--preview-ink));
                }
                .store-preview-browser-bar i {
                    width: 5px;
                    height: 5px;
                    border-radius: 999px;
                    background: color-mix(in srgb, var(--preview-ink) 24%, transparent);
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
                    color: var(--preview-muted);
                    background: color-mix(in srgb, var(--preview-ink) 7%, transparent);
                }
                .store-preview-hero {
                    min-height: 160px;
                    padding: 7px;
                    display: grid;
                    grid-template-columns: 1.05fr .72fr .3fr;
                    align-items: stretch;
                    gap: 5px;
                    background: var(--preview-bg);
                }
                .store-preview-copy {
                    border: 1px solid color-mix(in srgb, var(--preview-ink) 10%, transparent);
                    border-radius: 11px;
                    padding: 12px 9px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    background: radial-gradient(circle at 90% 10%, color-mix(in srgb, var(--preview-accent) 18%, transparent), transparent 35%), var(--preview-surface);
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
                    font-size: 15px;
                    font-weight: 760;
                    line-height: 1.02;
                    letter-spacing: -.06em;
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
                    color: color-mix(in srgb, var(--preview-ink) 8%, black);
                    background: var(--preview-accent);
                    font-size: 5px;
                    font-weight: 900;
                }
                .store-preview-media {
                    position: relative;
                    min-height: 146px;
                    border: 1px solid color-mix(in srgb, var(--preview-ink) 10%, transparent);
                    border-radius: 11px;
                    background: radial-gradient(circle at 72% 18%, var(--preview-secondary), transparent 30%), linear-gradient(145deg, var(--preview-accent), var(--preview-ink));
                    background-position: center;
                    background-size: cover;
                    box-shadow: none;
                    animation: store-preview-float 5s ease-in-out infinite;
                }
                .store-preview-media:after {
                    content: '';
                    position: absolute;
                    inset: 50% 0 0;
                    border-radius: 0 0 11px 11px;
                    background: linear-gradient(transparent, rgba(0,0,0,.5));
                }
                .store-preview-rail {
                    display: grid;
                    grid-template-rows: 1.2fr .8fr;
                    gap: 5px;
                }
                .store-preview-rail span {
                    border-radius: 9px;
                    background: var(--preview-accent);
                }
                .store-preview-rail span:last-child {
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
                    grid-template-columns: repeat(var(--preview-columns), minmax(0, 1fr));
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
                .store-preview-service {
                    min-height: 22px;
                    padding: 0 10px;
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    align-items: center;
                    gap: 4px;
                    border-block: 1px solid color-mix(in srgb, var(--preview-ink) 10%, transparent);
                    background: var(--preview-surface);
                    color: var(--preview-muted);
                    font-size: 4px;
                    text-align: center;
                }
                .store-preview-marquee {
                    overflow: hidden;
                    padding: 4px 0;
                    color: var(--preview-ink);
                    background: var(--preview-secondary);
                    white-space: nowrap;
                    font-size: 5px;
                    font-weight: 900;
                    letter-spacing: .12em;
                    animation: store-preview-marquee 9s linear infinite;
                }
                .preview-font-modern { font-family: Arial, Helvetica, sans-serif; }
                .preview-font-modern .store-preview-copy h4,
                .preview-font-modern .store-preview-products > span { font-family: Arial, Helvetica, sans-serif; letter-spacing: -.05em; }
                .preview-font-friendly { font-family: "Trebuchet MS", Arial, sans-serif; }
                .preview-font-friendly .store-preview-copy h4,
                .preview-font-friendly .store-preview-products > span { font-family: "Trebuchet MS", Arial, sans-serif; letter-spacing: -.04em; }
                .preview-font-bold { font-family: Impact, "Arial Black", sans-serif; }
                .preview-font-bold .store-preview-copy p,
                .preview-font-bold .store-preview-product { font-family: Arial, sans-serif; }
                .preview-hero-centered .store-preview-hero { grid-template-columns: 1fr 1fr; text-align: center; }
                .preview-hero-centered .store-preview-copy { grid-column: 1 / -1; }
                .preview-hero-centered .store-preview-rail { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr; }
                .preview-hero-immersive .store-preview-hero { position: relative; grid-template-columns: 1fr; min-height: 174px; }
                .preview-hero-immersive .store-preview-media { position: absolute; inset: 0; opacity: .32; border-radius: 0; box-shadow: none; }
                .preview-hero-immersive .store-preview-copy { position: relative; z-index: 1; max-width: 72%; }
                .preview-hero-immersive .store-preview-rail { display: none; }
                .preview-image-rounded .store-preview-media { border-radius: 16px; box-shadow: none; }
                .preview-image-framed .store-preview-media { border: 5px solid var(--preview-surface); border-radius: 2px; box-shadow: 0 0 0 1px var(--preview-ink); }
                .preview-header-solid .store-preview-header { color: white; background: var(--preview-ink); }
                .preview-header-solid .store-preview-logo { color: var(--preview-ink); background: white; }
                .preview-header-minimal .store-preview-header { background: transparent; }
                .preview-button-pill .store-preview-copy button { border-radius: 999px; }
                .preview-button-square .store-preview-copy button { border-radius: 0; }
                .preview-card-elevated .store-preview-product { padding: 4px; background: var(--preview-surface); box-shadow: 0 4px 10px rgba(15,23,42,.12); }
                .preview-card-outlined .store-preview-product { padding: 4px; border: 1px solid color-mix(in srgb, var(--preview-ink) 18%, transparent); }
                .preview-card-minimal .store-preview-product-image { background: color-mix(in srgb, var(--preview-bg) 80%, white); }
                .preview-corners-rounded .store-preview-product,
                .preview-corners-rounded .store-preview-product-image { border-radius: 10px; }
                .preview-corners-sharp,
                .preview-corners-sharp .store-preview-media,
                .preview-corners-sharp .store-preview-product,
                .preview-corners-sharp .store-preview-product-image { border-radius: 0; }
                .preview-density-compact .store-preview-products { padding: 8px; }
                .preview-density-compact .store-preview-product-grid { gap: 3px; }
                .preview-density-spacious .store-preview-products { padding: 16px 12px 18px; }
                .preview-density-spacious .store-preview-product-grid { gap: 9px; }
                .preview-ratio-square .store-preview-product-image { height: auto; aspect-ratio: 1; }
                .preview-ratio-portrait .store-preview-product-image { height: auto; aspect-ratio: .76; }
                .preview-ratio-landscape .store-preview-product-image { height: auto; aspect-ratio: 1.45; }
                .preview-pattern-dots { background-image: radial-gradient(color-mix(in srgb, var(--preview-accent) 18%, transparent) 1px, transparent 1px); background-size: 10px 10px; }
                .preview-pattern-grid { background-image: linear-gradient(color-mix(in srgb, var(--preview-ink) 7%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--preview-ink) 7%, transparent) 1px, transparent 1px); background-size: 14px 14px; }
                .preview-pattern-waves { background-image: radial-gradient(ellipse at 50% 100%, transparent 58%, color-mix(in srgb, var(--preview-accent) 12%, transparent) 60%, transparent 64%); background-size: 28px 14px; }
                .preview-motion-none *,
                .preview-motion-none *::before,
                .preview-motion-none *::after { animation: none !important; transition: none !important; }
                .preview-motion-subtle .store-preview-media { animation-duration: 10s; }
                .preview-motion-subtle .store-preview-topline,
                .preview-motion-subtle .store-preview-marquee { animation-duration: 18s; }
                @keyframes store-preview-marquee { to { text-indent: -45%; } }
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
                .store-palette-grid {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 9px;
                    margin-bottom: 18px;
                }
                .store-palette-grid > button {
                    position: relative;
                    min-height: 96px;
                    border: 1px solid var(--border-color);
                    border-radius: 14px;
                    padding: 11px;
                    color: var(--text-primary);
                    background: var(--bg-card);
                    text-align: left;
                    cursor: pointer;
                    transition: .2s ease;
                }
                .store-palette-grid > button:hover { border-color: rgba(108,92,231,.4); transform: translateY(-1px); }
                .store-palette-grid > button.selected { border-color: var(--accent-primary); box-shadow: inset 0 -3px 0 var(--accent-primary); }
                .store-palette-grid strong,
                .store-palette-grid small { display: block; }
                .store-palette-grid strong { margin-top: 9px; font-size: 11px; }
                .store-palette-grid small { margin-top: 3px; padding-right: 16px; color: var(--text-muted); font-size: 9px; line-height: 1.3; }
                .store-palette-grid em {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    width: 19px;
                    height: 19px;
                    border-radius: 999px;
                    display: grid;
                    place-items: center;
                    color: white;
                    background: var(--accent-primary);
                    font-size: 10px;
                    font-style: normal;
                }
                .store-palette-swatches {
                    height: 28px;
                    display: flex;
                    overflow: hidden;
                    border: 1px solid rgba(255,255,255,.12);
                    border-radius: 8px;
                }
                .store-palette-swatches i { flex: 1; }
                .store-custom-palette-icon {
                    width: 32px;
                    height: 28px;
                    border-radius: 8px;
                    display: grid;
                    place-items: center;
                    color: white;
                    background: linear-gradient(135deg,#7c5cff,#00b8ff,#ff426d);
                }
                .store-custom-colors {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 8px;
                    margin-bottom: 20px;
                    border: 1px solid rgba(108,92,231,.25);
                    border-radius: 14px;
                    padding: 12px;
                    background: rgba(108,92,231,.055);
                }
                .store-custom-colors > label {
                    border: 1px solid var(--border-color);
                    border-radius: 11px;
                    padding: 9px;
                    background: var(--bg-card);
                }
                .store-custom-colors > label > span { display: block; margin-bottom: 7px; color: var(--text-secondary); font-size: 9px; font-weight: 750; }
                .store-custom-colors > label > div { display: flex; align-items: center; gap: 7px; }
                .store-custom-colors input { width: 28px; height: 28px; border: 0; border-radius: 7px; padding: 0; overflow: hidden; cursor: pointer; }
                .store-custom-colors code { color: var(--text-muted); font-size: 9px; }
                .store-visual-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 18px;
                }
                .store-choice-stack {
                    display: grid;
                    gap: 20px;
                }
                .store-style-choice-group {
                    display: grid;
                    gap: 9px;
                }
                .store-style-choice-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(128px, 1fr));
                    gap: 8px;
                }
                .store-style-choice-grid > button {
                    position: relative;
                    min-height: 78px;
                    border: 1px solid var(--border-color);
                    border-radius: 13px;
                    padding: 13px;
                    color: var(--text-primary);
                    background: var(--bg-card);
                    text-align: left;
                    cursor: pointer;
                    transition: .2s ease;
                }
                .store-style-choice-grid > button:hover {
                    border-color: rgba(108,92,231,.4);
                    transform: translateY(-1px);
                }
                .store-style-choice-grid > button.selected {
                    border-color: var(--accent-primary);
                    background: rgba(108,92,231,.09);
                    box-shadow: inset 0 -3px 0 var(--accent-primary);
                }
                .store-style-choice-grid > button > i {
                    position: absolute;
                    top: 9px;
                    right: 9px;
                    width: 19px;
                    height: 19px;
                    border: 1px solid var(--border-color);
                    border-radius: 999px;
                    display: grid;
                    place-items: center;
                    color: white;
                    background: var(--bg-secondary);
                    font-size: 10px;
                    font-style: normal;
                }
                .store-style-choice-grid > button.selected > i { border-color: var(--accent-primary); background: var(--accent-primary); }
                .store-style-choice-grid strong,
                .store-style-choice-grid span { display: block; padding-right: 18px; }
                .store-style-choice-grid strong { margin-bottom: 5px; font-size: 12px; }
                .store-style-choice-grid span { color: var(--text-muted); font-size: 10px; line-height: 1.35; }
                .store-visibility-grid {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 9px;
                }
                .store-visibility-toggle {
                    min-height: 64px;
                    border: 1px solid var(--border-color);
                    border-radius: 13px;
                    padding: 10px 12px;
                    display: grid;
                    grid-template-columns: 34px 1fr 24px;
                    align-items: center;
                    gap: 9px;
                    color: var(--text-primary);
                    background: var(--bg-card);
                    text-align: left;
                    cursor: pointer;
                }
                .store-visibility-toggle.active { border-color: rgba(0,184,148,.38); background: rgba(0,184,148,.07); }
                .store-visibility-toggle > span { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; color: var(--accent-primary); background: rgba(108,92,231,.1); }
                .store-visibility-toggle strong,
                .store-visibility-toggle small { display: block; }
                .store-visibility-toggle strong { margin-bottom: 3px; font-size: 11px; }
                .store-visibility-toggle small { color: var(--text-muted); font-size: 9px; line-height: 1.3; }
                .store-visibility-toggle > i { color: var(--text-muted); font-style: normal; }
                .store-visibility-toggle.active > i { color: #00b894; }
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
                    .store-palette-grid,
                    .store-custom-colors,
                    .store-visual-grid,
                    .store-visibility-grid {
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
    const visual = form.store_style_config;
    const palette = visual.color_mode === 'custom'
        ? visual.custom_colors
        : STORE_COLOR_PALETTES[visual.palette_preset];
    const accent = visual.color_mode === 'custom' ? palette.accent : form.store_accent_color;
    const backgroundColor = form.store_background_config.mode === 'color'
        ? form.store_background_config.color
        : palette.bg;
    const secondary = visual.color_intensity === 'monochrome' ? accent : palette.secondary;
    const tertiary = visual.color_intensity === 'vibrant' ? palette.tertiary : accent;
    const previewStyle = {
        '--preview-bg': backgroundColor,
        '--preview-surface': palette.surface,
        '--preview-ink': palette.ink,
        '--preview-muted': palette.muted,
        '--preview-accent': accent,
        '--preview-secondary': secondary,
        '--preview-tertiary': tertiary,
        '--preview-columns': Math.min(visual.catalog_columns, 3)
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
        <div
            className={[
                'store-live-preview',
                `preview-font-${visual.font_style}`,
                `preview-hero-${visual.hero_layout}`,
                `preview-image-${visual.hero_image_style}`,
                `preview-header-${visual.header_style}`,
                `preview-button-${visual.button_style}`,
                `preview-card-${visual.card_style}`,
                `preview-corners-${visual.corner_style}`,
                `preview-density-${visual.catalog_density}`,
                `preview-ratio-${visual.image_ratio}`,
                `preview-motion-${visual.animation_level}`,
                `preview-pattern-${visual.background_pattern}`
            ].join(' ')}
            style={previewStyle}
        >
            <div className="store-preview-browser-bar"><i /><i /><i /></div>
            {visual.show_announcement && <div className="store-preview-topline">{form.store_badge_text || 'Uma seleção feita para você'}</div>}
            <div className="store-preview-header">
                <span className="store-preview-logo">{initials || 'ML'}</span>
                <strong>{form.store_name || 'Minha Loja'}</strong>
                <span>{visual.show_search ? '⌕' : ''}{visual.show_account ? ' ○' : ''}</span>
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
                <div className="store-preview-rail" aria-hidden="true"><span /><span /></div>
            </div>
            {visual.show_service_bar && <div className="store-preview-service"><span>Compra segura</span><span>Pagamento protegido</span><span>Suporte da loja</span></div>}
            {visual.show_marquee && <div className="store-preview-marquee">DESCUBRA · ESCOLHA · APROVEITE ·</div>}
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

type StyleChoiceValue = string | number;

function StyleChoiceGroup<T extends StyleChoiceValue>({
    label,
    value,
    options,
    onChange
}: {
    label: string;
    value: T;
    options: Array<{ value: T; label: string; description: string }>;
    onChange: (value: T) => void;
}) {
    return (
        <div className="store-style-choice-group">
            <label className="store-field-label">{label}</label>
            <div className="store-style-choice-grid">
                {options.map(option => (
                    <button
                        key={String(option.value)}
                        type="button"
                        className={value === option.value ? 'selected' : ''}
                        onClick={() => onChange(option.value)}
                    >
                        <i>{value === option.value && <FiCheck />}</i>
                        <strong>{option.label}</strong>
                        <span>{option.description}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

function VisibilityToggle({
    icon,
    label,
    description,
    enabled,
    onChange
}: {
    icon: React.ReactNode;
    label: string;
    description: string;
    enabled: boolean;
    onChange: (enabled: boolean) => void;
}) {
    return (
        <button type="button" className={`store-visibility-toggle ${enabled ? 'active' : ''}`} onClick={() => onChange(!enabled)}>
            <span>{icon}</span>
            <div><strong>{label}</strong><small>{description}</small></div>
            <i>{enabled ? <FiEye /> : <FiEyeOff />}</i>
        </button>
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
                kicker="ETAPA 6"
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
