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
    STORE_BUILDER_LIMITS,
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
    store_theme: 'dark',
    store_banner_url: '',
    store_template: 'creator',
    store_accent_color: '#6c5ce7',
    store_headline: '',
    store_cta_text: 'Explorar a loja',
    store_badge_text: 'Curadoria, confiança e compra segura',
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

    const handleSectionImageUpload = async (sectionId: string, file: File) => {
        setUploading(sectionId);
        const loadingToast = toast.loading('Enviando imagem...');
        try {
            const url = await uploadImage(file);
            setForm(previous => ({
                ...previous,
                store_layout_sections: previous.store_layout_sections.map(section => (
                    section.id === sectionId && section.type === 'content'
                        ? { ...section, image_url: url }
                        : section
                ))
            }));
            toast.success('Imagem adicionada!', { id: loadingToast });
        } catch (error: unknown) {
            toast.error(errorMessage(error, 'Erro ao enviar imagem'), { id: loadingToast });
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

            <nav className="store-setup-navigation" aria-label="Etapas de configuração">
                <button type="button" className={activeEditor === 'identity' ? 'active' : ''} onClick={() => setActiveEditor('identity')}>
                    <span><FiType /></span>
                    <div><small>ETAPA 1</small><strong>Marca e abertura</strong><p>Textos, produtos e chamada principal</p></div>
                </button>
                <button type="button" className={activeEditor === 'appearance' ? 'active' : ''} onClick={() => setActiveEditor('appearance')}>
                    <span><FiSliders /></span>
                    <div><small>ETAPA 2</small><strong>Visual</strong><p>Tema, cabeçalho, cores e fundo</p></div>
                </button>
                <button type="button" className={activeEditor === 'structure' ? 'active' : ''} onClick={() => setActiveEditor('structure')}>
                    <span><FiLayers /></span>
                    <div><small>ETAPA 3</small><strong>Conteúdo</strong><p>Linhas, banners e seções da página</p></div>
                </button>
                <button type="button" className={activeEditor === 'footer' ? 'active' : ''} onClick={() => setActiveEditor('footer')}>
                    <span><FiLink /></span>
                    <div><small>ETAPA 4</small><strong>Rodapé</strong><p>Contatos, redes sociais e links</p></div>
                </button>
            </nav>

            <div className="store-builder-main">
                {activeEditor === 'identity' && <section id="store-identity" className="glass-card store-editor-section store-scroll-section">
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
                            <strong>Produtos da abertura</strong>
                            <span>Escolha até três produtos para aparecerem em destaque logo no início da loja.</span>
                        </div>
                        <HeroProductPicker
                            products={visibleProducts}
                            selectedIds={form.store_background_config.hero_product_ids}
                            onChange={heroProductIds => update('store_background_config', { ...form.store_background_config, hero_product_ids: heroProductIds })}
                        />
                        <div className="store-form-grid two store-hero-copy-fields">
                            <Field label="Título informativo">
                                <input className="input-field" maxLength={80} value={form.store_background_config.hero_info_title} onChange={event => update('store_background_config', { ...form.store_background_config, hero_info_title: event.target.value })} />
                            </Field>
                            <Field label="Título promocional">
                                <input className="input-field" maxLength={80} value={form.store_background_config.hero_promo_title} onChange={event => update('store_background_config', { ...form.store_background_config, hero_promo_title: event.target.value })} />
                            </Field>
                            <Field label="Texto informativo">
                                <textarea className="input-field" rows={3} maxLength={240} value={form.store_background_config.hero_info_text} onChange={event => update('store_background_config', { ...form.store_background_config, hero_info_text: event.target.value })} />
                            </Field>
                            <Field label="Texto promocional">
                                <textarea className="input-field" rows={3} maxLength={240} value={form.store_background_config.hero_promo_text} onChange={event => update('store_background_config', { ...form.store_background_config, hero_promo_text: event.target.value })} />
                            </Field>
                        </div>
                    </div>
                </section>}

                {activeEditor === 'appearance' && <section id="store-appearance" className="glass-card store-editor-section store-scroll-section">
                    <SectionHeader
                        icon={<FiSliders />}
                        kicker="ETAPA 2"
                        title="Aparência da loja"
                        description="Escolha uma base visual e controle cada detalhe da composição da página."
                    />
                    <div className="store-form-group">
                        <div className="store-form-group-heading">
                            <strong>Composição profissional</strong>
                            <span>Controle a personalidade, proporção e ritmo visual da página.</span>
                        </div>
                        <div className="store-design-grid">
                            <ChoiceField
                                label="Modo do site"
                                value={form.store_background_config.color_scheme}
                                options={[['dark', 'Escuro'], ['light', 'Claro']]}
                                onChange={value => update('store_background_config', { ...form.store_background_config, color_scheme: value as StoreBackgroundConfig['color_scheme'] })}
                            />
                            <ChoiceField
                                label="Cabeçalho"
                                value={form.store_background_config.header_style}
                                options={[['floating', 'Flutuante'], ['solid', 'Sólido'], ['minimal', 'Minimalista']]}
                                onChange={value => update('store_background_config', { ...form.store_background_config, header_style: value as StoreBackgroundConfig['header_style'] })}
                            />
                            <ChoiceField
                                label="Abertura da página"
                                value={form.store_background_config.hero_layout}
                                options={[['split', 'Vitrine com produtos'], ['centered', 'Centralizada'], ['compact', 'Compacta']]}
                                onChange={value => update('store_background_config', { ...form.store_background_config, hero_layout: value as StoreBackgroundConfig['hero_layout'] })}
                            />
                            <ChoiceField
                                label="Tipografia"
                                value={form.store_background_config.font_style}
                                options={[['modern', 'Moderna'], ['editorial', 'Editorial'], ['friendly', 'Amigável']]}
                                onChange={value => update('store_background_config', { ...form.store_background_config, font_style: value as StoreBackgroundConfig['font_style'] })}
                            />
                            <ChoiceField
                                label="Largura do conteúdo"
                                value={form.store_background_config.content_width}
                                options={[['compact', 'Compacta'], ['standard', 'Padrão'], ['wide', 'Ampla']]}
                                onChange={value => update('store_background_config', { ...form.store_background_config, content_width: value as StoreBackgroundConfig['content_width'] })}
                            />
                            <ChoiceField
                                label="Espaçamento"
                                value={form.store_background_config.section_spacing}
                                options={[['compact', 'Compacto'], ['comfortable', 'Confortável'], ['airy', 'Arejado']]}
                                onChange={value => update('store_background_config', { ...form.store_background_config, section_spacing: value as StoreBackgroundConfig['section_spacing'] })}
                            />
                            <ChoiceField
                                label="Estilo dos cards"
                                value={form.store_background_config.card_style}
                                options={[['elevated', 'Elevado'], ['outlined', 'Contorno'], ['minimal', 'Minimalista']]}
                                onChange={value => update('store_background_config', { ...form.store_background_config, card_style: value as StoreBackgroundConfig['card_style'] })}
                            />
                            <ChoiceField
                                label="Cantos"
                                value={form.store_background_config.card_radius}
                                options={[['square', 'Discreto'], ['soft', 'Suave'], ['rounded', 'Arredondado']]}
                                onChange={value => update('store_background_config', { ...form.store_background_config, card_radius: value as StoreBackgroundConfig['card_radius'] })}
                            />
                            <ChoiceField
                                label="Formato das imagens"
                                value={form.store_background_config.product_image_ratio}
                                options={[['landscape', 'Paisagem'], ['square', 'Quadrada'], ['portrait', 'Vertical']]}
                                onChange={value => update('store_background_config', { ...form.store_background_config, product_image_ratio: value as StoreBackgroundConfig['product_image_ratio'] })}
                            />
                        </div>
                    </div>
                    <div className="store-form-group">
                        <div className="store-form-group-heading">
                            <strong>Elementos automáticos</strong>
                            <span>Escolha quais áreas padrão aparecem além dos blocos montados por você.</span>
                        </div>
                        <div className="store-visibility-grid">
                            {[
                                ['show_header_categories', 'Categorias no cabeçalho', 'Coloca os principais nichos diretamente no menu superior.'],
                                ['show_header_search', 'Busca no cabeçalho', 'Permite procurar produtos sem sair do início da página.'],
                                ['show_categories', 'Categorias em destaque', 'Ajuda o visitante a navegar por nichos diferentes.'],
                                ['show_benefit_strip', 'Faixa de confiança', 'Exibe segurança, facilidade e suporte logo após a abertura.'],
                                ['show_closing_cta', 'Chamada final', 'Reforça a ação de explorar o catálogo antes do rodapé.']
                            ].map(([key, label, description]) => {
                                const enabled = form.store_background_config[key as 'show_header_categories' | 'show_header_search' | 'show_categories' | 'show_benefit_strip' | 'show_closing_cta'];
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        className={enabled ? 'active' : ''}
                                        onClick={() => update('store_background_config', { ...form.store_background_config, [key]: !enabled })}
                                    >
                                        <span>{enabled ? <FiCheck /> : null}</span>
                                        <strong>{label}</strong>
                                        <small>{description}</small>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="store-form-group">
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
                    <div className="store-form-group">
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
                    </div>
                </section>}

                {activeEditor === 'structure' && <div id="store-structure" className="store-scroll-section">
                    <StoreBuilderEditor
                        sections={form.store_layout_sections}
                        products={products}
                        uploadingSlideId={uploading}
                        onChange={sections => update('store_layout_sections', sections)}
                        onUploadSlide={handleSlideUpload}
                        onUploadSectionImage={handleSectionImageUpload}
                    />
                </div>}

                {activeEditor === 'footer' && <div id="store-footer" className="store-scroll-section">
                    <FooterEditor
                        value={form.store_footer_config}
                        onChange={footer => update('store_footer_config', footer)}
                    />
                </div>}

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
                    text-decoration: none;
                    text-align: left;
                    cursor: pointer;
                    transition: border-color .2s, transform .2s, background .2s;
                }
                .store-setup-navigation > button:hover,
                .store-setup-navigation > button.active {
                    border-color: rgba(108,92,231,.36);
                    background: rgba(108,92,231,.045);
                    transform: translateY(-1px);
                }
                .store-setup-navigation > button.active {
                    box-shadow: inset 0 0 0 1px rgba(108,92,231,.08);
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
                .store-hero-product-picker {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 10px;
                    margin-bottom: 18px;
                }
                .store-hero-product-picker > button {
                    min-width: 0;
                    min-height: 76px;
                    border: 1px solid var(--border-color);
                    border-radius: 14px;
                    padding: 8px;
                    display: grid;
                    grid-template-columns: 58px minmax(0, 1fr) 30px;
                    align-items: center;
                    gap: 10px;
                    color: var(--text-primary);
                    background: var(--bg-card);
                    text-align: left;
                    cursor: pointer;
                }
                .store-hero-product-picker > button.selected {
                    border-color: rgba(108,92,231,.48);
                    background: rgba(108,92,231,.07);
                    box-shadow: inset 0 0 0 1px rgba(108,92,231,.06);
                }
                .store-hero-product-picker > button:disabled {
                    opacity: .42;
                    cursor: not-allowed;
                }
                .store-hero-product-image {
                    width: 58px;
                    height: 58px;
                    border-radius: 11px;
                    background: linear-gradient(135deg, rgba(108,92,231,.22), var(--bg-secondary)) center/cover;
                }
                .store-hero-product-copy {
                    min-width: 0;
                }
                .store-hero-product-copy strong,
                .store-hero-product-copy small {
                    display: block;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .store-hero-product-copy strong {
                    font-size: 12px;
                    margin-bottom: 5px;
                }
                .store-hero-product-copy small {
                    color: var(--text-secondary);
                    font-size: 9px;
                }
                .store-hero-product-picker i {
                    width: 28px;
                    height: 28px;
                    border-radius: 9px;
                    display: grid;
                    place-items: center;
                    color: var(--accent-primary);
                    background: rgba(108,92,231,.11);
                    font-style: normal;
                }
                .store-hero-products-empty {
                    border: 1px dashed var(--border-color);
                    border-radius: 14px;
                    padding: 18px;
                    color: var(--text-secondary);
                    background: var(--bg-secondary);
                    font-size: 12px;
                    margin-bottom: 18px;
                }
                .store-hero-copy-fields {
                    padding-top: 18px;
                    border-top: 1px solid var(--border-color);
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
                .store-design-grid {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 14px;
                }
                .store-choice-options {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 6px;
                }
                .store-choice-options button {
                    min-height: 38px;
                    border: 1px solid var(--border-color);
                    border-radius: 10px;
                    padding: 6px 8px;
                    color: var(--text-secondary);
                    background: var(--bg-card);
                    font-size: 10px;
                    font-weight: 800;
                    cursor: pointer;
                }
                .store-choice-options button.selected {
                    border-color: var(--accent-primary);
                    color: var(--accent-primary);
                    background: rgba(108,92,231,.09);
                    box-shadow: 0 0 0 1px rgba(108,92,231,.08);
                }
                .store-visibility-grid {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 9px;
                }
                .store-visibility-grid > button {
                    min-height: 104px;
                    border: 1px solid var(--border-color);
                    border-radius: 14px;
                    padding: 12px;
                    display: grid;
                    grid-template-columns: 26px 1fr;
                    grid-template-rows: auto 1fr;
                    gap: 4px 8px;
                    color: var(--text-primary);
                    background: var(--bg-card);
                    text-align: left;
                    cursor: pointer;
                }
                .store-visibility-grid > button.active {
                    border-color: rgba(108,92,231,.38);
                    background: rgba(108,92,231,.07);
                }
                .store-visibility-grid > button > span {
                    grid-row: 1 / 3;
                    width: 26px;
                    height: 26px;
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    display: grid;
                    place-items: center;
                    color: white;
                    background: var(--bg-secondary);
                }
                .store-visibility-grid > button.active > span {
                    border-color: var(--accent-primary);
                    background: var(--accent-primary);
                }
                .store-visibility-grid strong {
                    font-size: 12px;
                }
                .store-visibility-grid small {
                    color: var(--text-muted);
                    font-size: 10px;
                    line-height: 1.4;
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
                    .store-visual-grid,
                    .store-design-grid,
                    .store-hero-product-picker,
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

function HeroProductPicker({
    products,
    selectedIds,
    onChange
}: {
    products: StoreProduct[];
    selectedIds: string[];
    onChange: (productIds: string[]) => void;
}) {
    const toggle = (productId: string) => {
        if (selectedIds.includes(productId)) {
            onChange(selectedIds.filter(id => id !== productId));
            return;
        }
        if (selectedIds.length >= STORE_BUILDER_LIMITS.heroProducts) return;
        onChange([...selectedIds, productId]);
    };

    if (products.length === 0) {
        return <div className="store-hero-products-empty">Ative produtos na aba “Produtos da loja” para montar a vitrine inicial.</div>;
    }

    return (
        <div className="store-hero-product-picker">
            {products.map(product => {
                const selectedIndex = selectedIds.indexOf(product.id);
                const selected = selectedIndex >= 0;
                const disabled = !selected && selectedIds.length >= STORE_BUILDER_LIMITS.heroProducts;
                return (
                    <button
                        type="button"
                        key={product.id}
                        className={selected ? 'selected' : ''}
                        disabled={disabled}
                        onClick={() => toggle(product.id)}
                    >
                        <span className="store-hero-product-image" style={product.image_url ? { backgroundImage: `url("${product.image_url}")` } : undefined} />
                        <span className="store-hero-product-copy">
                            <strong>{product.name}</strong>
                            <small>{selected ? `Posição ${selectedIndex + 1} na abertura` : 'Adicionar à abertura'}</small>
                        </span>
                        <i>{selected ? <FiCheck /> : <FiPlus />}</i>
                    </button>
                );
            })}
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

function ChoiceField({
    label,
    value,
    options,
    onChange
}: {
    label: string;
    value: string;
    options: Array<[string, string]>;
    onChange: (value: string) => void;
}) {
    return (
        <div>
            <label className="store-field-label">{label}</label>
            <div className="store-choice-options">
                {options.map(([optionValue, optionLabel]) => (
                    <button key={optionValue} type="button" className={value === optionValue ? 'selected' : ''} onClick={() => onChange(optionValue)}>
                        {optionLabel}
                    </button>
                ))}
            </div>
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
