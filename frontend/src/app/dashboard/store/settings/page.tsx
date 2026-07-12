'use client';

import { useEffect, useState } from 'react';
import { authAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { FiCheck, FiExternalLink, FiImage, FiLayout, FiPower, FiSave, FiUpload } from 'react-icons/fi';

const STORE_TEMPLATES = [
    {
        key: 'creator',
        name: 'Creator Pro',
        description: 'Ideal para infoprodutos, aulas, ebooks e mentorias.',
        preview: 'Hero forte, cards escuros e foco em conversao.'
    },
    {
        key: 'academy',
        name: 'Academy',
        description: 'Visual educacional para cursos e areas de membros.',
        preview: 'Layout claro, seco, organizado por categorias.'
    },
    {
        key: 'studio',
        name: 'Studio',
        description: 'Vitrine premium para produtos digitais de marca.',
        preview: 'Visual editorial, banner grande e produtos em destaque.'
    }
];

const ACCENT_COLORS = ['#6c5ce7', '#00b894', '#0984e3', '#e84393', '#f59e0b', '#111827'];

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
    store_badge_text: 'Produtos digitais com acesso online'
};

function slugify(value: string) {
    return value.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export default function StoreSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingBanner, setUploadingBanner] = useState(false);
    const [form, setForm] = useState<StoreForm>(initialForm);

    useEffect(() => {
        loadProfile();
    }, []);

    const hydrateForm = (user: any) => {
        setForm({
            store_active: user.store_active || false,
            store_name: user.store_name || '',
            store_slug: user.store_slug || '',
            store_description: user.store_description || '',
            store_theme: user.store_theme || 'light',
            store_banner_url: user.store_banner_url || '',
            store_template: user.store_template || 'creator',
            store_accent_color: user.store_accent_color || '#6c5ce7',
            store_headline: user.store_headline || '',
            store_cta_text: user.store_cta_text || 'Ver produtos',
            store_badge_text: user.store_badge_text || 'Produtos digitais com acesso online'
        });
    };

    const loadProfile = async () => {
        try {
            const { data } = await authAPI.getProfile();
            hydrateForm(data.user || data);
        } catch {
            toast.error('Erro ao carregar configuracoes da loja');
        } finally {
            setLoading(false);
        }
    };

    const update = (field: keyof StoreForm, value: StoreForm[keyof StoreForm]) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (!form.store_name.trim()) return toast.error('Informe o nome da loja');
        if (!form.store_slug.trim()) return toast.error('Informe o link da loja');

        setSaving(true);
        try {
            const { data } = await authAPI.updateProfile({
                ...form,
                store_slug: slugify(form.store_slug),
                store_headline: form.store_headline.trim() || form.store_name.trim(),
                store_badge_text: form.store_badge_text.trim() || 'Produtos digitais com acesso online'
            });
            const updatedUser = data.user || data;
            if (updatedUser) {
                localStorage.setItem('user', JSON.stringify(updatedUser));
                hydrateForm(updatedUser);
            }
            toast.success('Loja atualizada com sucesso!');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Erro ao salvar loja');
        } finally {
            setSaving(false);
        }
    };

    const handleBannerUpload = async (file: File) => {
        setUploadingBanner(true);
        const loadingToast = toast.loading('Enviando banner...');
        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                body: formData
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro no upload');
            update('store_banner_url', data.url as string);
            toast.success('Banner enviado!', { id: loadingToast });
        } catch (err: any) {
            toast.error(err.message || 'Erro ao enviar banner', { id: loadingToast });
        } finally {
            setUploadingBanner(false);
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: 40 }}>Carregando...</div>;

    const selectedTemplate = STORE_TEMPLATES.find(t => t.key === form.store_template) || STORE_TEMPLATES[0];
    const publicUrl = form.store_slug ? `/store/${form.store_slug}` : '';

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) 420px', gap: 24, alignItems: 'start' }} className="store-builder-layout">
            <div style={{ display: 'grid', gap: 20 }}>
                <section className="glass-card" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', marginBottom: 22 }}>
                        <div>
                            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Publicacao</h3>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Controle se sua vitrine digital aparece para compradores.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => update('store_active', !form.store_active)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                border: `1px solid ${form.store_active ? 'rgba(0,184,148,0.35)' : 'var(--border-color)'}`,
                                background: form.store_active ? 'rgba(0,184,148,0.12)' : 'var(--bg-secondary)',
                                color: form.store_active ? '#00b894' : 'var(--text-secondary)',
                                borderRadius: 12,
                                padding: '10px 14px',
                                cursor: 'pointer',
                                fontWeight: 700
                            }}
                        >
                            <FiPower size={16} /> {form.store_active ? 'Loja ativa' : 'Loja offline'}
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="store-two-cols">
                        <div>
                            <label className="store-label">Nome da loja</label>
                            <input className="input-field" placeholder="Ex: Academia do Criador" value={form.store_name} onChange={e => update('store_name', e.target.value)} />
                        </div>
                        <div>
                            <label className="store-label">Link da loja</label>
                            <input className="input-field" placeholder="minha-loja" value={form.store_slug} onChange={e => update('store_slug', slugify(e.target.value))} />
                            {publicUrl && (
                                <a href={publicUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', gap: 6, alignItems: 'center', marginTop: 8, fontSize: 12, color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 700 }}>
                                    Abrir loja <FiExternalLink size={12} />
                                </a>
                            )}
                        </div>
                    </div>
                </section>

                <section className="glass-card" style={{ padding: 24 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 18 }}>Conteudo da pagina</h3>
                    <div style={{ display: 'grid', gap: 16 }}>
                        <div>
                            <label className="store-label">Chamada principal</label>
                            <input className="input-field" placeholder="Ex: Aprenda habilidades digitais com aulas diretas ao ponto" value={form.store_headline} onChange={e => update('store_headline', e.target.value)} />
                        </div>
                        <div>
                            <label className="store-label">Descricao</label>
                            <textarea className="input-field" rows={4} placeholder="Explique o que sua loja oferece e por que seus produtos digitais ajudam o comprador." value={form.store_description} onChange={e => update('store_description', e.target.value)} />
                        </div>
                        <div>
                            <label className="store-label">Texto do botao principal</label>
                            <input className="input-field" placeholder="Ver produtos" value={form.store_cta_text} onChange={e => update('store_cta_text', e.target.value)} />
                        </div>
                        <div>
                            <label className="store-label">Texto do selo do topo</label>
                            <input
                                className="input-field"
                                placeholder="Produtos digitais com acesso online"
                                value={form.store_badge_text}
                                maxLength={60}
                                onChange={e => update('store_badge_text', e.target.value)}
                            />
                        </div>
                    </div>
                </section>

                <section className="glass-card" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                        <FiLayout size={18} color="var(--accent-primary)" />
                        <h3 style={{ fontSize: 18, fontWeight: 700 }}>Template da loja</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }} className="template-grid">
                        {STORE_TEMPLATES.map(template => {
                            const selected = form.store_template === template.key;
                            return (
                                <button
                                    key={template.key}
                                    type="button"
                                    onClick={() => update('store_template', template.key)}
                                    style={{
                                        textAlign: 'left',
                                        border: `1px solid ${selected ? form.store_accent_color : 'var(--border-color)'}`,
                                        background: selected ? 'rgba(108,92,231,0.10)' : 'var(--bg-secondary)',
                                        color: 'var(--text-primary)',
                                        borderRadius: 12,
                                        padding: 14,
                                        cursor: 'pointer',
                                        minHeight: 150
                                    }}
                                >
                                    <div style={{ height: 46, borderRadius: 8, marginBottom: 12, background: template.key === 'creator' ? 'linear-gradient(135deg,#111827,#6c5ce7)' : template.key === 'academy' ? 'linear-gradient(135deg,#f8fafc,#0984e3)' : 'linear-gradient(135deg,#141417,#f59e0b)' }} />
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                                        <strong>{template.name}</strong>
                                        {selected && <FiCheck size={16} color={form.store_accent_color} />}
                                    </div>
                                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{template.description}</p>
                                </button>
                            );
                        })}
                    </div>
                </section>

                <section className="glass-card" style={{ padding: 24 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 18 }}>Visual</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }} className="store-two-cols">
                        <div>
                            <label className="store-label">Cor de destaque</label>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                                {ACCENT_COLORS.map(color => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => update('store_accent_color', color)}
                                        style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: 10,
                                            border: form.store_accent_color === color ? '2px solid var(--text-primary)' : '1px solid var(--border-color)',
                                            background: color,
                                            cursor: 'pointer'
                                        }}
                                        aria-label={`Selecionar cor ${color}`}
                                    />
                                ))}
                            </div>
                            <input className="input-field" value={form.store_accent_color} onChange={e => update('store_accent_color', e.target.value)} />
                        </div>
                        <div>
                            <label className="store-label">Banner da loja</label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, border: '1px dashed var(--border-color)', borderRadius: 12, cursor: uploadingBanner ? 'not-allowed' : 'pointer', background: 'var(--bg-secondary)' }}>
                                {form.store_banner_url ? (
                                    <img src={form.store_banner_url} alt="Banner da loja" style={{ width: 72, height: 46, objectFit: 'cover', borderRadius: 8 }} />
                                ) : (
                                    <span style={{ width: 72, height: 46, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)' }}>
                                        <FiImage size={18} />
                                    </span>
                                )}
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700 }}>
                                    <FiUpload size={15} /> {uploadingBanner ? 'Enviando...' : 'Enviar banner'}
                                </span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    disabled={uploadingBanner}
                                    style={{ display: 'none' }}
                                    onChange={async e => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        await handleBannerUpload(file);
                                        e.target.value = '';
                                    }}
                                />
                            </label>
                        </div>
                    </div>
                </section>

                <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <FiSave size={16} /> {saving ? 'Salvando...' : 'Salvar loja'}
                </button>
            </div>

            <aside className="glass-card store-preview-card" style={{ padding: 18, position: 'sticky', top: 92 }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 700, marginBottom: 12 }}>Previa do template</div>
                <div style={{ overflow: 'hidden', borderRadius: 16, border: '1px solid var(--border-color)', background: form.store_template === 'academy' ? '#f8fafc' : '#0a0a0c' }}>
                    <div style={{ padding: 10, display: 'flex', justifyContent: 'center', background: form.store_template === 'academy' ? '#eef2ff' : '#09090b' }}>
                        <div style={{ maxWidth: '100%', minHeight: 36, borderRadius: 999, padding: '5px 8px', display: 'flex', alignItems: 'center', gap: 8, background: form.store_template === 'academy' ? 'rgba(255,255,255,0.86)' : 'rgba(255,255,255,0.10)', border: '1px solid rgba(148,163,184,0.24)', color: form.store_template === 'academy' ? '#0f172a' : 'white', overflow: 'hidden' }}>
                            <strong style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{form.store_name || 'Sua loja'}</strong>
                            <span style={{ width: 1, alignSelf: 'stretch', background: 'rgba(148,163,184,0.35)' }} />
                            {['Inicio', 'Loja'].map((label, index) => (
                                <span key={`${label}-${index}`} style={{ borderRadius: 999, padding: '6px 9px', background: index === 0 ? 'rgba(148,163,184,0.28)' : 'transparent', fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap' }}>
                                    {label}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div style={{ height: 130, background: form.store_banner_url ? `linear-gradient(90deg, rgba(0,0,0,0.72), rgba(0,0,0,0.10)), url(${form.store_banner_url}) center/cover` : `linear-gradient(135deg, ${form.store_accent_color}, #111827)`, padding: 18, color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>{selectedTemplate.name}</div>
                        <strong style={{ fontSize: 20, lineHeight: 1.1 }}>{form.store_headline || form.store_name || 'Sua loja digital'}</strong>
                    </div>
                    <div style={{ padding: 16, display: 'grid', gap: 12 }}>
                        {[1, 2].map(i => (
                            <div key={i} style={{ display: 'grid', gridTemplateColumns: '64px 1fr', gap: 12, alignItems: 'center', background: form.store_template === 'academy' ? 'white' : '#141417', border: '1px solid rgba(148,163,184,0.18)', borderRadius: 12, padding: 10 }}>
                                <div style={{ height: 54, borderRadius: 10, background: `linear-gradient(135deg, ${form.store_accent_color}, rgba(255,255,255,0.25))` }} />
                                <div>
                                    <div style={{ height: 10, width: '70%', borderRadius: 99, background: form.store_template === 'academy' ? '#0f172a' : 'white', marginBottom: 8 }} />
                                    <div style={{ height: 8, width: '45%', borderRadius: 99, background: form.store_accent_color }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <p style={{ marginTop: 12, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{selectedTemplate.preview}</p>
            </aside>

            <style jsx global>{`
                .store-label {
                    display: block;
                    font-size: 13px;
                    font-weight: 700;
                    color: var(--text-secondary);
                    margin-bottom: 6px;
                }
                @media (max-width: 1100px) {
                    .store-builder-layout {
                        grid-template-columns: 1fr !important;
                    }
                    .store-preview-card {
                        position: static !important;
                    }
                }
                @media (max-width: 760px) {
                    .store-two-cols,
                    .template-grid {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </div>
    );
}
