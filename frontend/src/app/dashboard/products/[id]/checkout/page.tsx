'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { productsAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import axios from 'axios';
import {
    FiArrowLeft, FiSave, FiSun, FiMoon, FiImage, FiClock,
    FiAlertTriangle, FiDroplet, FiEye, FiCheck, FiUpload, FiTrash2
} from 'react-icons/fi';

const DEFAULT_SETTINGS = {
    theme: 'dark',
    banner_url: '',
    banner_text: '',
    show_countdown: false,
    countdown_minutes: 15,
    countdown_text: 'Oferta expira em:',
    notice_text: '',
    notice_type: 'warning',
    accent_color: '#6C5CE7',
    hide_product_image: false,
};

export default function CheckoutCustomizationPage() {
    const params = useParams();
    const router = useRouter();
    const productId = params.id as string;

    const [product, setProduct] = useState<any>(null);
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingBanner, setUploadingBanner] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        loadProduct();
    }, []);
    useEffect(() => {
        const update = () => setIsMobile(window.innerWidth < 768);
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    const loadProduct = async () => {
        try {
            const { data } = await productsAPI.getById(productId);
            setProduct(data.product);
            if (data.product.checkout_settings) {
                setSettings({ ...DEFAULT_SETTINGS, ...data.product.checkout_settings });
            }
        } catch (err) {
            toast.error('Erro ao carregar produto');
            router.push('/dashboard/products');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await productsAPI.updateCheckoutSettings(productId, settings);
            toast.success('Configurações salvas!');
        } catch (err) {
            toast.error('Erro ao salvar configurações');
        } finally {
            setSaving(false);
        }
    };

    const update = (key: string, value: any) => setSettings({ ...settings, [key]: value });

    const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingBanner(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const token = localStorage.getItem('token');
            const { data } = await axios.post('/api/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${token}` }
            });
            update('banner_url', data.url);
            toast.success('Banner enviado!');
        } catch (err) {
            toast.error('Erro ao enviar imagem');
        } finally {
            setUploadingBanner(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <div style={{ width: 40, height: 40, border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    const previewBg = settings.theme === 'light'
        ? 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)'
        : 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)';
    const previewText = settings.theme === 'light' ? '#1a1a2e' : '#f5f5f5';
    const previewMuted = settings.theme === 'light' ? '#666' : '#999';
    const previewCard = settings.theme === 'light' ? 'rgba(255,255,255,0.9)' : 'rgba(25,25,45,0.8)';
    const previewBorder = settings.theme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)';

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <button onClick={() => router.push('/dashboard/products')} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '8px 12px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                        <FiArrowLeft size={14} /> Voltar
                    </button>
                    <div>
                        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Personalizar <span className="gradient-text">Checkout</span></h1>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{product?.name}</p>
                    </div>
                </div>
                <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', width: isMobile ? '100%' : 'auto' }}>
                    <FiSave size={16} /> {saving ? 'Salvando...' : 'Salvar'}
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '380px 1fr', gap: 24, alignItems: 'start' }}>
                {/* Settings Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* Theme */}
                    <div className="glass-card" style={{ padding: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                            {settings.theme === 'dark' ? <FiMoon size={16} /> : <FiSun size={16} />}
                            <h3 style={{ fontSize: 14, fontWeight: 600 }}>Tema</h3>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {['dark', 'light'].map(t => (
                                <button key={t} onClick={() => update('theme', t)} style={{
                                    padding: '12px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 500,
                                    background: settings.theme === t ? 'rgba(108,92,231,0.12)' : 'var(--bg-secondary)',
                                    border: `1px solid ${settings.theme === t ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                                    color: settings.theme === t ? 'var(--accent-secondary)' : 'var(--text-secondary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                                }}>
                                    {t === 'dark' ? <><FiMoon size={14} /> Escuro</> : <><FiSun size={14} /> Claro</>}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Accent Color */}
                    <div className="glass-card" style={{ padding: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                            <FiDroplet size={16} />
                            <h3 style={{ fontSize: 14, fontWeight: 600 }}>Cor de Destaque</h3>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <input type="color" value={settings.accent_color} onChange={e => update('accent_color', e.target.value)}
                                style={{ width: 48, height: 48, border: 'none', borderRadius: 10, cursor: 'pointer', background: 'none' }} />
                            <input className="input-field" value={settings.accent_color} onChange={e => update('accent_color', e.target.value)}
                                style={{ flex: 1, fontFamily: 'monospace' }} />
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                            {['#6C5CE7', '#00CEC9', '#E17055', '#00B894', '#FDCB6E', '#E84393', '#0984E3', '#FF6B6B'].map(c => (
                                <button key={c} onClick={() => update('accent_color', c)} style={{
                                    width: 28, height: 28, borderRadius: 8, border: settings.accent_color === c ? '2px solid white' : '2px solid transparent',
                                    background: c, cursor: 'pointer', transition: 'transform 0.15s'
                                }} />
                            ))}
                        </div>
                    </div>

                    {/* Banner */}
                    <div className="glass-card" style={{ padding: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                            <FiImage size={16} />
                            <h3 style={{ fontSize: 14, fontWeight: 600 }}>Banner</h3>
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Imagem do banner</label>
                            {settings.banner_url ? (
                                <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                                    <img src={settings.banner_url} alt="Banner" style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }} />
                                    <button onClick={() => update('banner_url', '')} style={{
                                        position: 'absolute', top: 6, right: 6, width: 28, height: 28, borderRadius: 8,
                                        background: 'rgba(0,0,0,0.7)', border: 'none', cursor: 'pointer', color: '#ff6b6b',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <FiTrash2 size={13} />
                                    </button>
                                </div>
                            ) : (
                                <div
                                    onClick={() => document.getElementById('bannerUpload')?.click()}
                                    style={{
                                        border: '2px dashed var(--border-color)', borderRadius: 10, padding: '20px 16px',
                                        textAlign: 'center', cursor: uploadingBanner ? 'not-allowed' : 'pointer',
                                        transition: 'border-color 0.2s', opacity: uploadingBanner ? 0.6 : 1
                                    }}
                                >
                                    {uploadingBanner ? (
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Enviando...</div>
                                    ) : (
                                        <>
                                            <FiUpload size={20} style={{ marginBottom: 6, color: 'var(--accent-secondary)' }} />
                                            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Clique para enviar uma imagem</p>
                                        </>
                                    )}
                                </div>
                            )}
                            <input id="bannerUpload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBannerUpload} />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Texto sobreposto</label>
                            <input className="input-field" placeholder="Ex: Oferta Especial!" value={settings.banner_text} onChange={e => update('banner_text', e.target.value)} />
                        </div>
                    </div>

                    {/* Countdown */}
                    <div className="glass-card" style={{ padding: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <FiClock size={16} />
                                <h3 style={{ fontSize: 14, fontWeight: 600 }}>Contador Regressivo</h3>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                <div onClick={() => update('show_countdown', !settings.show_countdown)} style={{
                                    width: 40, height: 22, borderRadius: 11, cursor: 'pointer', transition: 'background 0.2s',
                                    background: settings.show_countdown ? settings.accent_color : 'var(--bg-secondary)',
                                    border: `1px solid ${settings.show_countdown ? settings.accent_color : 'var(--border-color)'}`,
                                    position: 'relative'
                                }}>
                                    <div style={{
                                        width: 16, height: 16, borderRadius: '50%', background: 'white',
                                        position: 'absolute', top: 2, transition: 'left 0.2s',
                                        left: settings.show_countdown ? 20 : 2
                                    }} />
                                </div>
                            </label>
                        </div>
                        {settings.show_countdown && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Texto</label>
                                    <input className="input-field" value={settings.countdown_text} onChange={e => update('countdown_text', e.target.value)} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Minutos</label>
                                    <input type="number" className="input-field" min={1} max={60} value={settings.countdown_minutes} onChange={e => update('countdown_minutes', parseInt(e.target.value) || 15)} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Notice */}
                    <div className="glass-card" style={{ padding: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                            <FiAlertTriangle size={16} />
                            <h3 style={{ fontSize: 14, fontWeight: 600 }}>Aviso / Destaque</h3>
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Texto do aviso</label>
                            <input className="input-field" placeholder="Ex: ⚡ Últimas vagas disponíveis!" value={settings.notice_text} onChange={e => update('notice_text', e.target.value)} />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Tipo</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                                {[
                                    { key: 'warning', label: 'Alerta', color: '#FDCB6E' },
                                    { key: 'info', label: 'Info', color: '#74B9FF' },
                                    { key: 'success', label: 'Sucesso', color: '#55EFC4' },
                                ].map(t => (
                                    <button key={t.key} onClick={() => update('notice_type', t.key)} style={{
                                        padding: '8px', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                                        background: settings.notice_type === t.key ? `${t.color}22` : 'var(--bg-secondary)',
                                        border: `1px solid ${settings.notice_type === t.key ? t.color : 'var(--border-color)'}`,
                                        color: settings.notice_type === t.key ? t.color : 'var(--text-muted)',
                                    }}>
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* LIVE PREVIEW */}
                <div className="glass-card" style={{ padding: 0, overflow: 'hidden', position: isMobile ? 'relative' : 'sticky', top: isMobile ? undefined : 80 }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
                        <FiEye size={14} /> Preview ao Vivo
                    </div>
                    <div style={{
                        background: previewBg, padding: 0, minHeight: 500, color: previewText,
                        fontSize: 12, position: 'relative', overflow: 'hidden'
                    }}>
                        {/* Countdown Preview */}
                        {settings.show_countdown && (
                            <div style={{
                                background: settings.accent_color, color: 'white', padding: '8px 16px',
                                textAlign: 'center', fontSize: 12, fontWeight: 600,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                            }}>
                                <FiClock size={12} />
                                {settings.countdown_text} <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{settings.countdown_minutes}:00</span>
                            </div>
                        )}

                        {/* Banner Preview */}
                        {(settings.banner_url || settings.banner_text) && (
                            <div className="checkoutBannerPreview" style={{
                                height: settings.banner_url ? 220 : 'auto', position: 'relative',
                                background: settings.banner_url ? `url(${settings.banner_url}) center/cover no-repeat` : `linear-gradient(135deg, ${settings.accent_color}44, ${settings.accent_color}11)`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                {settings.banner_text && (
                                    <div style={{
                                        padding: '12px 20px', fontSize: 14, fontWeight: 700, color: 'white',
                                        textShadow: settings.banner_url ? '0 2px 8px rgba(0,0,0,0.6)' : 'none',
                                        background: settings.banner_url ? 'rgba(0,0,0,0.4)' : 'transparent',
                                        width: '100%', textAlign: 'center'
                                    }}>
                                        {settings.banner_text}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Notice Preview */}
                        {settings.notice_text && (
                            <div style={{
                                margin: '12px 16px', padding: '10px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                                background: settings.notice_type === 'warning' ? 'rgba(253,203,110,0.12)' : settings.notice_type === 'info' ? 'rgba(116,185,255,0.12)' : 'rgba(85,239,196,0.12)',
                                border: `1px solid ${settings.notice_type === 'warning' ? 'rgba(253,203,110,0.3)' : settings.notice_type === 'info' ? 'rgba(116,185,255,0.3)' : 'rgba(85,239,196,0.3)'}`,
                                color: settings.notice_type === 'warning' ? '#FDCB6E' : settings.notice_type === 'info' ? '#74B9FF' : '#55EFC4'
                            }}>
                                {settings.notice_text}
                            </div>
                        )}

                        {/* Mini Checkout Preview */}
                        <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            {/* Product card mini */}
                            <div style={{ background: previewCard, borderRadius: 12, border: `1px solid ${previewBorder}`, overflow: 'hidden' }}>
                                {!settings.hide_product_image && (
                                    <div style={{ height: 80, background: `linear-gradient(135deg, ${settings.accent_color}33, ${settings.accent_color}11)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <FiImage size={20} style={{ opacity: 0.3, color: previewText }} />
                                    </div>
                                )}
                                <div style={{ padding: 12 }}>
                                    <div style={{ fontSize: 10, color: previewMuted }}>Vendido por Vendedor</div>
                                    <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4, color: previewText }}>{product?.name || 'Nome do Produto'}</div>
                                    <div style={{ fontSize: 16, fontWeight: 800, marginTop: 8, color: settings.accent_color }}>
                                        R$ {product?.price_display || '97,00'}
                                    </div>
                                </div>
                            </div>

                            {/* Form mini */}
                            <div style={{ background: previewCard, borderRadius: 12, border: `1px solid ${previewBorder}`, padding: 12 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: previewText }}>Finalizar Compra</div>
                                {['Nome', 'Email', 'CPF'].map(f => (
                                    <div key={f} style={{
                                        background: settings.theme === 'light' ? '#f0f0f0' : 'rgba(255,255,255,0.05)',
                                        borderRadius: 6, padding: '6px 8px', marginBottom: 6, fontSize: 10, color: previewMuted
                                    }}>{f}</div>
                                ))}
                                <div style={{
                                    background: settings.accent_color, borderRadius: 8, padding: '8px',
                                    textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'white', marginTop: 8
                                }}>
                                    Pagar Agora
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .input-field:focus { border-color: ${settings.accent_color} !important; }
                @media (max-width: 640px) {
                    .checkoutBannerPreview {
                        height: 200px !important;
                        background-size: contain !important;
                        background-position: center !important;
                        background-repeat: no-repeat !important;
                    }
                }
            `}</style>
        </div>
    );
}
