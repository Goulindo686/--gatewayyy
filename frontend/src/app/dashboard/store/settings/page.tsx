'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
    FiCheck,
    FiExternalLink,
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
    DEFAULT_STORE_STYLE,
    StoreBackgroundConfig,
    StoreFooterConfig,
    StoreHeroContentConfig,
    StoreLayoutSection,
    StoreStyleColors,
    StoreStyleConfig
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
    store_accent_color: '#6c5ce7',
    store_headline: '',
    store_cta_text: 'Ver produtos',
    store_badge_text: 'Produtos digitais com acesso online',
    store_layout_sections: [],
    store_footer_config: { ...DEFAULT_STORE_FOOTER, links: [] },
    store_background_config: { ...DEFAULT_STORE_BACKGROUND },
    store_style_config: {
        ...DEFAULT_STORE_STYLE,
        custom_colors: { ...DEFAULT_STORE_STYLE.custom_colors },
        hero_content: {
            ...DEFAULT_STORE_STYLE.hero_content,
            top_badges: { ...DEFAULT_STORE_STYLE.hero_content.top_badges },
            bottom_badges: { ...DEFAULT_STORE_STYLE.hero_content.bottom_badges }
        }
    }
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
                        custom_colors: {
                            ...DEFAULT_STORE_STYLE.custom_colors,
                            ...(store.store_style_config?.custom_colors || {})
                        },
                        hero_content: {
                            ...DEFAULT_STORE_STYLE.hero_content,
                            ...(store.store_style_config?.hero_content || {}),
                            top_badges: {
                                ...DEFAULT_STORE_STYLE.hero_content.top_badges,
                                ...(store.store_style_config?.hero_content?.top_badges || {})
                            },
                            bottom_badges: {
                                ...DEFAULT_STORE_STYLE.hero_content.bottom_badges,
                                ...(store.store_style_config?.hero_content?.bottom_badges || {})
                            }
                        }
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

    const updateStoreTheme = (value: string) => {
        setForm(previous => ({
            ...previous,
            store_theme: value,
            store_background_config: {
                ...previous.store_background_config,
                mode: 'theme'
            },
            store_style_config: {
                ...previous.store_style_config,
                color_mode: 'theme'
            }
        }));
    };

    const updateCustomColor = (field: keyof StoreStyleColors, value: string) => {
        setForm(previous => ({
            ...previous,
            store_accent_color: field === 'accent' ? value : previous.store_accent_color,
            store_style_config: {
                ...previous.store_style_config,
                custom_colors: { ...previous.store_style_config.custom_colors, [field]: value }
            }
        }));
    };

    const updateAccentColor = (value: string) => {
        setForm(previous => ({
            ...previous,
            store_accent_color: value,
            store_style_config: {
                ...previous.store_style_config,
                custom_colors: { ...previous.store_style_config.custom_colors, accent: value }
            }
        }));
    };

    const updateHeroContent = <K extends keyof StoreHeroContentConfig>(field: K, value: StoreHeroContentConfig[K]) => {
        setForm(previous => ({
            ...previous,
            store_style_config: {
                ...previous.store_style_config,
                hero_content: { ...previous.store_style_config.hero_content, [field]: value }
            }
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

    const handleSimpleUpload = async (target: 'hero' | 'background' | 'hero-logo', file: File) => {
        setUploading(target);
        const loadingToast = toast.loading('Enviando imagem...');
        try {
            const url = await uploadImage(file);
            if (target === 'hero') {
                update('store_banner_url', url);
            } else if (target === 'hero-logo') {
                updateHeroContent('logo_url', url);
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
                    <span>Execute o arquivo <code>{migrationFile || 'indicado pela API'}</code> no Supabase para ativar e salvar todas as opções.</span>
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

            <div className="store-builder-workspace">
            <nav className="store-setup-navigation" aria-label="Etapas de configuração">
                <div className="store-setup-navigation-title">
                    <span>NESTA PÁGINA</span>
                    <strong>Configuração da loja</strong>
                    <p>Avance pelas quatro áreas abaixo.</p>
                </div>
                <a href="#store-identity">
                    <span><FiType /></span>
                    <div><small>ETAPA 1</small><strong>Identidade</strong><p>Nome, textos e banner</p></div>
                </a>
                <a href="#store-appearance">
                    <span><FiSliders /></span>
                    <div><small>ETAPA 2</small><strong>Aparência</strong><p>Tema, cores e fundo</p></div>
                </a>
                <a href="#store-structure">
                    <span><FiLayers /></span>
                    <div><small>ETAPA 3</small><strong>Estrutura</strong><p>Produtos e carrosséis</p></div>
                </a>
                <a href="#store-footer">
                    <span><FiLink /></span>
                    <div><small>ETAPA 4</small><strong>Rodapé</strong><p>Contatos e links</p></div>
                </a>
            </nav>

            <div className="store-builder-main">
                <section id="store-identity" className="glass-card store-editor-section store-scroll-section">
                    <SectionHeader
                        icon={<FiType />}
                        kicker="ETAPA 1"
                        title="Identidade da loja"
                        description="Defina como sua marca será apresentada no topo da página."
                    />
                    <div className="store-form-group">
                        <div className="store-form-group-heading">
                            <strong>Informações básicas</strong>
                            <span>Dados usados para identificar e acessar sua loja.</span>
                        </div>
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
                        </div>
                    </div>
                    <div className="store-form-group">
                        <div className="store-form-group-heading">
                            <strong>Apresentação</strong>
                            <span>Textos e imagem que recebem o cliente na página inicial.</span>
                        </div>
                        <div className="store-form-grid two">
                            <Field label="Chamada principal">
                                <input className="input-field" maxLength={140} value={form.store_headline} onChange={event => update('store_headline', event.target.value)} placeholder="Uma frase forte sobre sua loja" />
                            </Field>
                            <Field label="Texto do botão principal">
                                <input className="input-field" maxLength={40} value={form.store_cta_text} onChange={event => update('store_cta_text', event.target.value)} placeholder="Ver produtos" />
                            </Field>
                            <Field label="Descrição" wide>
                                <textarea className="input-field" rows={4} maxLength={600} value={form.store_description} onChange={event => update('store_description', event.target.value)} placeholder="Conte ao cliente o que ele encontra nesta loja." />
                            </Field>
                            <Field label="Selo de destaque">
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
                    </div>
                    <div className="store-form-group">
                        <div className="store-form-group-heading">
                            <strong>Conteúdo da primeira parte da loja</strong>
                            <span>Personalize o logo central, os selos e as garantias da capa.</span>
                        </div>
                        <div className="store-form-grid two">
                            <Field label="Imagem no lugar da letra">
                                <ImageUploader
                                    imageUrl={form.store_style_config.hero_content.logo_url}
                                    uploading={uploading === 'hero-logo'}
                                    onFile={file => handleSimpleUpload('hero-logo', file)}
                                    onRemove={() => updateHeroContent('logo_url', '')}
                                />
                            </Field>
                            <Field label="Texto de boas-vindas">
                                <input
                                    className="input-field"
                                    maxLength={50}
                                    value={form.store_style_config.hero_content.welcome_text}
                                    onChange={event => updateHeroContent('welcome_text', event.target.value)}
                                    placeholder="Bem-vindo à"
                                />
                            </Field>
                            <Field label="Descrição exibida na capa" wide>
                                <textarea
                                    className="input-field"
                                    rows={3}
                                    maxLength={240}
                                    value={form.store_style_config.hero_content.description}
                                    onChange={event => updateHeroContent('description', event.target.value)}
                                    placeholder="Se ficar vazio, será usada a descrição geral da loja."
                                />
                            </Field>
                        </div>

                        <div className="store-hero-copy-section">
                            <div>
                                <strong>Selos acima da imagem</strong>
                                <span>Deixe um campo vazio para ocultar aquele selo.</span>
                            </div>
                            <div className="store-hero-copy-grid">
                                <Field label="Primeiro selo">
                                    <input className="input-field" maxLength={35} value={form.store_style_config.hero_content.top_badges.delivery} onChange={event => updateHeroContent('top_badges', { ...form.store_style_config.hero_content.top_badges, delivery: event.target.value })} />
                                </Field>
                                <Field label="Segundo selo">
                                    <input className="input-field" maxLength={35} value={form.store_style_config.hero_content.top_badges.security} onChange={event => updateHeroContent('top_badges', { ...form.store_style_config.hero_content.top_badges, security: event.target.value })} />
                                </Field>
                                <Field label="Terceiro selo">
                                    <input className="input-field" maxLength={35} value={form.store_style_config.hero_content.top_badges.protected} onChange={event => updateHeroContent('top_badges', { ...form.store_style_config.hero_content.top_badges, protected: event.target.value })} />
                                </Field>
                            </div>
                        </div>

                        <div className="store-hero-copy-section">
                            <div>
                                <strong>Garantias abaixo dos botões</strong>
                                <span>Edite os três textos ou deixe vazio para ocultar.</span>
                            </div>
                            <div className="store-hero-copy-grid">
                                <Field label="Primeira garantia">
                                    <input className="input-field" maxLength={40} value={form.store_style_config.hero_content.bottom_badges.access} onChange={event => updateHeroContent('bottom_badges', { ...form.store_style_config.hero_content.bottom_badges, access: event.target.value })} />
                                </Field>
                                <Field label="Segunda garantia">
                                    <input className="input-field" maxLength={40} value={form.store_style_config.hero_content.bottom_badges.checkout} onChange={event => updateHeroContent('bottom_badges', { ...form.store_style_config.hero_content.bottom_badges, checkout: event.target.value })} />
                                </Field>
                                <Field label="Terceira garantia">
                                    <input className="input-field" maxLength={40} value={form.store_style_config.hero_content.bottom_badges.payment} onChange={event => updateHeroContent('bottom_badges', { ...form.store_style_config.hero_content.bottom_badges, payment: event.target.value })} />
                                </Field>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="store-appearance" className="glass-card store-editor-section store-scroll-section">
                    <SectionHeader
                        icon={<FiSliders />}
                        kicker="ETAPA 2"
                        title="Aparência da loja"
                        description="Escolha uma base visual e aplique as cores da sua marca."
                    />
                    <div className="store-form-group store-theme-mode-group">
                        <div className="store-form-group-heading">
                            <strong>Tema claro ou escuro</strong>
                            <span>Escolha o contraste principal da vitrine. A opção será aplicada ao cabeçalho, produtos, categorias e rodapé.</span>
                        </div>
                        <StyleChoiceGroup
                            label="Tema da loja"
                            value={form.store_theme}
                            options={[{ value: 'light', label: 'Claro' }, { value: 'dark', label: 'Escuro' }]}
                            onChange={updateStoreTheme}
                        />
                    </div>
                    <div className="store-form-group store-appearance-palette">
                        <div className="store-form-group-heading">
                            <strong>Paleta completa</strong>
                            <span>Mantenha as cores do modelo ou defina cada parte da loja.</span>
                        </div>
                        <StyleChoiceGroup
                            label="Modo de cores"
                            value={form.store_style_config.color_mode}
                            options={[{ value: 'theme', label: 'Cores do modelo' }, { value: 'custom', label: 'Paleta personalizada' }]}
                            onChange={value => updateStyle('color_mode', value as StoreStyleConfig['color_mode'])}
                        />
                        {form.store_style_config.color_mode === 'custom' && (
                            <div className="store-custom-colors">
                                {([
                                    ['background', 'Fundo da página'],
                                    ['surface', 'Cards e cabeçalho'],
                                    ['surface_alt', 'Superfície auxiliar'],
                                    ['text', 'Texto principal'],
                                    ['muted', 'Texto secundário'],
                                    ['border', 'Bordas'],
                                    ['accent', 'Destaque e botões']
                                ] as Array<[keyof StoreStyleColors, string]>).map(([field, label]) => (
                                    <label key={field} className="store-custom-color">
                                        <span>{label}</span>
                                        <div>
                                            <input type="color" value={form.store_style_config.custom_colors[field]} onChange={event => updateCustomColor(field, event.target.value)} />
                                            <code>{form.store_style_config.custom_colors[field]}</code>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="store-form-group store-appearance-finish">
                        <div className="store-form-group-heading">
                            <strong>Tipografia e acabamento</strong>
                            <span>As escolhas alteram o estilo, sem trocar a estrutura original.</span>
                        </div>
                        <div className="store-style-groups">
                            <StyleChoiceGroup label="Estilo das letras" value={form.store_style_config.font_style} options={[{ value: 'modern', label: 'Moderna' }, { value: 'editorial', label: 'Editorial' }, { value: 'friendly', label: 'Amigável' }, { value: 'bold', label: 'Marcante' }]} onChange={value => updateStyle('font_style', value as StoreStyleConfig['font_style'])} />
                            <StyleChoiceGroup label="Capa da loja" value={form.store_style_config.hero_style} options={[{ value: 'classic', label: 'Clássica' }, { value: 'compact', label: 'Compacta' }, { value: 'centered', label: 'Centralizada' }]} onChange={value => updateStyle('hero_style', value as StoreStyleConfig['hero_style'])} />
                            <StyleChoiceGroup label="Cabeçalho" value={form.store_style_config.header_style} options={[{ value: 'standard', label: 'Padrão' }, { value: 'glass', label: 'Transparente' }, { value: 'solid', label: 'Sólido' }]} onChange={value => updateStyle('header_style', value as StoreStyleConfig['header_style'])} />
                            <StyleChoiceGroup label="Botões" value={form.store_style_config.button_style} options={[{ value: 'soft', label: 'Suaves' }, { value: 'pill', label: 'Cápsula' }, { value: 'square', label: 'Retos' }]} onChange={value => updateStyle('button_style', value as StoreStyleConfig['button_style'])} />
                            <StyleChoiceGroup label="Cantos" value={form.store_style_config.corner_style} options={[{ value: 'soft', label: 'Suaves' }, { value: 'rounded', label: 'Arredondados' }, { value: 'sharp', label: 'Retos' }]} onChange={value => updateStyle('corner_style', value as StoreStyleConfig['corner_style'])} />
                            <StyleChoiceGroup label="Animações" value={form.store_style_config.animation_level} options={[{ value: 'none', label: 'Nenhuma' }, { value: 'subtle', label: 'Discretas' }, { value: 'expressive', label: 'Expressivas' }]} onChange={value => updateStyle('animation_level', value as StoreStyleConfig['animation_level'])} />
                        </div>
                    </div>
                    <div className="store-form-group store-appearance-catalog">
                        <div className="store-form-group-heading">
                            <strong>Catálogo e elementos visíveis</strong>
                            <span>Controle a densidade dos produtos e o que aparece para o cliente.</span>
                        </div>
                        <div className="store-style-groups">
                            <StyleChoiceGroup label="Cards de produto" value={form.store_style_config.card_style} options={[{ value: 'standard', label: 'Padrão' }, { value: 'elevated', label: 'Elevados' }, { value: 'outlined', label: 'Contornados' }, { value: 'minimal', label: 'Minimalistas' }]} onChange={value => updateStyle('card_style', value as StoreStyleConfig['card_style'])} />
                            <StyleChoiceGroup label="Espaçamento" value={form.store_style_config.catalog_density} options={[{ value: 'compact', label: 'Compacto' }, { value: 'comfortable', label: 'Confortável' }, { value: 'spacious', label: 'Amplo' }]} onChange={value => updateStyle('catalog_density', value as StoreStyleConfig['catalog_density'])} />
                            <StyleChoiceGroup label="Formato das imagens" value={form.store_style_config.image_ratio} options={[{ value: 'square', label: 'Quadrada' }, { value: 'portrait', label: 'Vertical' }, { value: 'landscape', label: 'Horizontal' }]} onChange={value => updateStyle('image_ratio', value as StoreStyleConfig['image_ratio'])} />
                            <StyleChoiceGroup label="Colunas no computador" value={String(form.store_style_config.catalog_columns)} options={[{ value: '2', label: '2 colunas' }, { value: '3', label: '3 colunas' }, { value: '4', label: '4 colunas' }]} onChange={value => updateStyle('catalog_columns', Number(value) as StoreStyleConfig['catalog_columns'])} />
                            <StyleChoiceGroup label="Textura de fundo" value={form.store_style_config.background_pattern} options={[{ value: 'none', label: 'Sem textura' }, { value: 'dots', label: 'Pontos' }, { value: 'grid', label: 'Grade' }]} onChange={value => updateStyle('background_pattern', value as StoreStyleConfig['background_pattern'])} />
                        </div>
                        <div className="store-visibility-grid">
                            <VisibilityToggle label="Barra de benefícios" checked={form.store_style_config.show_benefit_bar} onChange={value => updateStyle('show_benefit_bar', value)} />
                            <VisibilityToggle label="Categorias" checked={form.store_style_config.show_categories} onChange={value => updateStyle('show_categories', value)} />
                            <VisibilityToggle label="Busca" checked={form.store_style_config.show_search} onChange={value => updateStyle('show_search', value)} />
                            <VisibilityToggle label="Área do cliente" checked={form.store_style_config.show_account} onChange={value => updateStyle('show_account', value)} />
                        </div>
                    </div>
                    <div className="store-form-group">
                        <div className="store-form-group-heading">
                            <strong>Métodos de pagamento</strong>
                            <span>Escolha se o cliente poderá pagar com cartão no carrinho da sua loja. O PIX continuará disponível.</span>
                        </div>
                        <div className="store-visibility-grid">
                            <VisibilityToggle
                                label="Aceitar cartão de crédito"
                                checked={form.store_style_config.show_credit_card}
                                onChange={value => updateStyle('show_credit_card', value)}
                            />
                        </div>
                    </div>
                    <div className="store-form-group store-appearance-base">
                        <div className="store-form-group-heading">
                            <strong>Estilo principal</strong>
                            <span>Escolha o acabamento que melhor combina com seus produtos.</span>
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
                    <div className="store-form-group store-appearance-background">
                        <div className="store-form-group-heading">
                            <strong>Cores e plano de fundo</strong>
                            <span>Use uma cor sólida, o fundo do tema ou uma imagem personalizada.</span>
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
                                            onClick={() => updateAccentColor(color)}
                                            aria-label={`Usar cor ${color}`}
                                        />
                                    ))}
                                    <input type="color" value={form.store_accent_color} onChange={event => updateAccentColor(event.target.value)} aria-label="Escolher cor personalizada" />
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
                    </div>
                </section>

                <div id="store-structure" className="store-scroll-section">
                    <StoreBuilderEditor
                        sections={form.store_layout_sections}
                        products={products}
                        uploadingSlideId={uploading}
                        onChange={sections => update('store_layout_sections', sections)}
                        onUploadSlide={handleSlideUpload}
                    />
                </div>

                <div id="store-footer" className="store-scroll-section">
                    <FooterEditor
                        value={form.store_footer_config}
                        onChange={footer => update('store_footer_config', footer)}
                    />
                </div>

                <div className="store-save-bar">
                    <div>
                        <strong>Pronto para publicar?</strong>
                        <span>As alterações só aparecem na loja depois de salvar.</span>
                    </div>
                    <button type="button" onClick={handleSave} disabled={saving || migrationRequired} className="btn-primary store-save-button">
                        <FiSave /> {saving ? 'Salvando...' : 'Salvar e publicar'}
                    </button>
                </div>
            </div>
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
                .store-builder-workspace {
                    display: grid;
                    grid-template-columns: 220px minmax(0, 1fr);
                    align-items: start;
                    gap: 16px;
                }
                .store-scroll-section {
                    scroll-margin-top: 92px;
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
                    position: sticky;
                    top: 86px;
                    z-index: 7;
                    border: 1px solid var(--border-color);
                    border-radius: 17px;
                    padding: 11px;
                    display: flex;
                    flex-direction: column;
                    gap: 7px;
                    background: var(--bg-card);
                    box-shadow: 0 12px 30px rgba(15,23,42,.07);
                }
                .store-setup-navigation-title {
                    border-bottom: 1px solid var(--border-color);
                    padding: 7px 7px 13px;
                    margin-bottom: 2px;
                }
                .store-setup-navigation-title span,
                .store-setup-navigation-title strong,
                .store-setup-navigation-title p {
                    display: block;
                }
                .store-setup-navigation-title span {
                    color: var(--accent-primary);
                    font-size: 8px;
                    font-weight: 900;
                    letter-spacing: .12em;
                    margin-bottom: 4px;
                }
                .store-setup-navigation-title strong {
                    color: var(--text-primary);
                    font-size: 12px;
                    margin-bottom: 3px;
                }
                .store-setup-navigation-title p {
                    color: var(--text-muted);
                    font-size: 9px;
                    line-height: 1.4;
                }
                .store-setup-navigation > a {
                    min-width: 0;
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    padding: 10px;
                    display: flex;
                    align-items: center;
                    gap: 11px;
                    color: var(--text-primary);
                    background: var(--bg-card);
                    text-decoration: none;
                    transition: border-color .2s, transform .2s, background .2s;
                }
                .store-setup-navigation > a:hover {
                    border-color: rgba(108,92,231,.36);
                    background: rgba(108,92,231,.045);
                    transform: translateY(-1px);
                }
                .store-setup-navigation > a > span {
                    width: 34px;
                    height: 34px;
                    border-radius: 10px;
                    display: grid;
                    place-items: center;
                    flex: 0 0 auto;
                    color: var(--accent-primary);
                    background: rgba(108,92,231,.11);
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
                .store-editor-section {
                    padding: 26px;
                }
                #store-appearance {
                    display: flex;
                    flex-direction: column;
                }
                #store-appearance .store-section-header { order: 0; }
                #store-appearance .store-appearance-base { order: 1; margin-top: 0; }
                #store-appearance .store-appearance-background { order: 2; }
                #store-appearance .store-appearance-palette { order: 3; }
                #store-appearance .store-appearance-finish { order: 4; }
                #store-appearance .store-appearance-catalog { order: 5; }
                #store-appearance .store-form-group { margin-top: 14px; }
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
                .store-hero-copy-section {
                    border-top: 1px solid var(--border-color);
                    padding-top: 16px;
                    margin-top: 18px;
                }
                .store-hero-copy-section > div:first-child {
                    display: flex;
                    align-items: baseline;
                    justify-content: space-between;
                    gap: 14px;
                    margin-bottom: 12px;
                }
                .store-hero-copy-section > div:first-child strong {
                    color: var(--text-primary);
                    font-size: 12px;
                }
                .store-hero-copy-section > div:first-child span {
                    color: var(--text-muted);
                    font-size: 10px;
                    text-align: right;
                }
                .store-hero-copy-grid {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 10px;
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
                .store-style-groups {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 16px;
                }
                .store-style-choice-label {
                    display: block;
                    color: var(--text-secondary);
                    font-size: 12px;
                    font-weight: 750;
                    margin-bottom: 7px;
                }
                .store-style-choice-options {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                }
                .store-style-choice-options button {
                    min-height: 35px;
                    border: 1px solid var(--border-color);
                    border-radius: 10px;
                    padding: 0 11px;
                    background: var(--bg-secondary);
                    color: var(--text-secondary);
                    font-size: 11px;
                    font-weight: 750;
                    cursor: pointer;
                    transition: border-color .2s, color .2s, background .2s;
                }
                .store-style-choice-options button.selected {
                    border-color: var(--accent-primary);
                    color: var(--accent-primary);
                    background: rgba(108,92,231,.09);
                }
                .store-custom-colors {
                    display: grid;
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                    gap: 10px;
                    margin-top: 16px;
                }
                .store-custom-color {
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    padding: 10px;
                    background: var(--bg-card);
                }
                .store-custom-color > span {
                    display: block;
                    color: var(--text-secondary);
                    font-size: 10px;
                    font-weight: 750;
                    margin-bottom: 8px;
                }
                .store-custom-color > div {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .store-custom-color input {
                    width: 34px;
                    height: 34px;
                    border: 1px solid var(--border-color);
                    border-radius: 9px;
                    padding: 2px;
                    background: transparent;
                    cursor: pointer;
                }
                .store-custom-color code {
                    color: var(--text-muted);
                    font-size: 10px;
                }
                .store-visibility-grid {
                    display: grid;
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                    gap: 8px;
                    border-top: 1px solid var(--border-color);
                    padding-top: 16px;
                    margin-top: 17px;
                }
                .store-visibility-toggle {
                    min-height: 44px;
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    padding: 0 11px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    background: var(--bg-card);
                    color: var(--text-secondary);
                    font-size: 11px;
                    font-weight: 750;
                    cursor: pointer;
                }
                .store-visibility-toggle span:last-child {
                    width: 30px;
                    height: 18px;
                    border-radius: 999px;
                    padding: 2px;
                    display: flex;
                    justify-content: flex-start;
                    background: var(--border-color);
                }
                .store-visibility-toggle span:last-child::after {
                    content: '';
                    width: 14px;
                    height: 14px;
                    border-radius: 50%;
                    background: white;
                    box-shadow: 0 1px 4px rgba(0,0,0,.22);
                }
                .store-visibility-toggle.active {
                    border-color: rgba(108,92,231,.35);
                    color: var(--text-primary);
                }
                .store-visibility-toggle.active span:last-child {
                    justify-content: flex-end;
                    background: var(--accent-primary);
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
                    .store-builder-workspace {
                        grid-template-columns: 190px minmax(0, 1fr);
                    }
                    .store-custom-colors,
                    .store-visibility-grid {
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
                    .store-builder-workspace {
                        display: block;
                    }
                    .store-setup-navigation {
                        position: sticky;
                        top: 8px;
                        display: flex;
                        flex-direction: row;
                        overflow-x: auto;
                        margin-bottom: 14px;
                        scrollbar-width: none;
                    }
                    .store-setup-navigation::-webkit-scrollbar {
                        display: none;
                    }
                    .store-setup-navigation-title {
                        display: none;
                    }
                    .store-setup-navigation > a {
                        align-items: flex-start;
                        min-width: 165px;
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
                    .store-visual-grid,
                    .store-style-groups,
                    .store-hero-copy-grid {
                        grid-template-columns: 1fr;
                    }
                    .store-hero-copy-section > div:first-child {
                        display: block;
                    }
                    .store-hero-copy-section > div:first-child span {
                        display: block;
                        margin-top: 4px;
                        text-align: left;
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

function StyleChoiceGroup({
    label,
    value,
    options,
    onChange
}: {
    label: string;
    value: string;
    options: Array<{ value: string; label: string }>;
    onChange: (value: string) => void;
}) {
    return (
        <div className="store-style-choice-group">
            <span className="store-style-choice-label">{label}</span>
            <div className="store-style-choice-options">
                {options.map(option => (
                    <button key={option.value} type="button" className={value === option.value ? 'selected' : ''} onClick={() => onChange(option.value)}>
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

function VisibilityToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
    return (
        <button type="button" className={`store-visibility-toggle ${checked ? 'active' : ''}`} onClick={() => onChange(!checked)} aria-pressed={checked}>
            <span>{label}</span>
            <span aria-hidden="true" />
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
