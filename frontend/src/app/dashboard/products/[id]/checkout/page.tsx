'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { productsAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import axios from 'axios';
import {
    FiArrowLeft, FiSave, FiSun, FiMoon, FiImage, FiClock,
    FiAlertTriangle, FiDroplet, FiEye, FiCheck, FiUpload, FiTrash2,
    FiPlay, FiVideo, FiPackage, FiLock, FiChevronDown, FiCreditCard, FiSmartphone
} from 'react-icons/fi';

const DEFAULT_SETTINGS = {
    theme: 'light',
    banner_url: '',
    banner_text: '',
    show_countdown: false,
    countdown_minutes: 15,
    countdown_text: 'Oferta expira em:',
    countdown_color: '#6C5CE7',
    notice_text: '',
    notice_type: 'warning',
    accent_color: '#6C5CE7',
    hide_product_image: false,
    banner_mode_desktop: 'cover',
    banner_mode_mobile: 'contain',
    banner_height_desktop: 300,
    banner_height_mobile: 200,
    banner_position: 'center',
    hide_phone: false,
    hide_address_pix: false,
    show_video: false,
    video_url: '',
    video_autoplay: false,
    video_loop: false,
    video_muted: false,
    video_controls: true,
    video_position: 'above_product',
};

export default function CheckoutCustomizationPage() {
    const params = useParams();
    const router = useRouter();
    const productId = params.id as string;

    const [product, setProduct] = useState<any>(null);
    const [isSubscription, setIsSubscription] = useState(false);
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingBanner, setUploadingBanner] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        loadProduct();
    }, []);
    useEffect(() => {
        const updateSize = () => setIsMobile(window.innerWidth < 768);
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    const loadProduct = async () => {
        try {
            const { data } = await productsAPI.getById(productId);
            setProduct(data.product);
            if (data.product.checkout_settings) {
                setSettings({ ...DEFAULT_SETTINGS, ...data.product.checkout_settings });
            }
            // Verifica se o produto tem plano de assinatura vinculado
            const { data: subData } = await import('@/lib/api').then(m => m.default.get(`/subscriptions/plans?product_id=${productId}`)).catch(() => ({ data: { plans: [] } }));
            if (subData?.plans?.length > 0) setIsSubscription(true);
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

        // Limite de 4.5MB para o Vercel
        if (file.size > 4.5 * 1024 * 1024) {
            toast.error('A imagem é muito grande (máximo 4.5MB)');
            return;
        }

        setUploadingBanner(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const token = localStorage.getItem('token');
            const { data } = await axios.post('/api/upload', formData, {
                headers: { 
                    'Content-Type': 'multipart/form-data', 
                    'Authorization': `Bearer ${token}` 
                },
                timeout: 30000
            });
            if (data && data.url) {
                update('banner_url', data.url);
                toast.success('Banner enviado!');
            }
        } catch (err: any) {
            console.error('Erro no upload do banner:', err);
            const msg = err.response?.data?.error || 'Erro ao enviar imagem';
            toast.error(msg);
        } finally {
            setUploadingBanner(false);
            e.target.value = '';
        }
    };

    const getEmbedUrl = (url: string) => {
        if (!url) return null;
        
        // YouTube
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            const id = url.includes('v=') ? url.split('v=')[1]?.split('&')[0] : url.split('/').pop()?.split('?')[0];
            if (id) return `https://www.youtube.com/embed/${id}?autoplay=${settings.video_autoplay ? 1 : 0}&mute=${settings.video_muted ? 1 : 0}&loop=${settings.video_loop ? 1 : 0}&playlist=${id}&controls=${settings.video_controls ? 1 : 0}`;
        }
        
        // Vimeo
        if (url.includes('vimeo.com')) {
            const id = url.split('/').pop()?.split('?')[0];
            if (id) return `https://player.vimeo.com/video/${id}?autoplay=${settings.video_autoplay ? 1 : 0}&muted=${settings.video_muted ? 1 : 0}&loop=${settings.video_loop ? 1 : 0}&controls=${settings.video_controls ? 1 : 0}`;
        }

        // Google Drive
        if (url.includes('drive.google.com')) {
            const id = url.split('/d/')[1]?.split('/')[0] || url.split('id=')[1]?.split('&')[0];
            if (id) return `https://drive.google.com/uc?id=${id}&export=download`;
        }

        // Dropbox
        if (url.includes('dropbox.com')) {
            return url.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace('?dl=0', '').replace('&dl=0', '');
        }

        return url;
    };

    const videoSrcPreview = getEmbedUrl(settings.video_url);
    const isIframePreview = videoSrcPreview?.includes('youtube.com/embed') || videoSrcPreview?.includes('player.vimeo.com/video');

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <div style={{ width: 40, height: 40, border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    const previewBg = settings.theme === 'light' ? '#f3f4f6' : '#0a0a0f';
    const previewHeaderBg = settings.theme === 'light' ? '#ffffff' : '#16161f';
    const previewText = settings.theme === 'light' ? '#1e293b' : '#f8fafc';
    const previewMuted = settings.theme === 'light' ? '#64748b' : '#94a3b8';
    const previewCard = settings.theme === 'light' ? '#f9fafb' : '#16161f';
    const previewBorder = settings.theme === 'light' ? '#e2e8f0' : '#2a2a3a';
    const previewInputBg = settings.theme === 'light' ? '#ffffff' : '#0a0a0f';
    const previewAccent = settings.accent_color || '#6C5CE7';

    return (
        <div className="max-w-[1400px] mx-auto p-4 md:p-8 w-full box-border">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/dashboard/products')} className="bg-white border border-gray-200 rounded-xl px-4 py-2 hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-semibold text-gray-600">
                        <FiArrowLeft size={16} /> Voltar
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-gray-800 tracking-tight">Personalizar <span className="text-[#6C5CE7]">Checkout</span></h1>
                        <p className="text-sm text-gray-500 font-medium">{product?.name}</p>
                    </div>
                </div>
                <button onClick={handleSave} disabled={saving} className="h-12 px-8 rounded-xl bg-[#6C5CE7] text-white font-bold shadow-lg shadow-[#6C5CE7]/20 hover:shadow-[#6C5CE7]/30 hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50">
                    <FiSave size={18} /> {saving ? 'Salvando...' : 'Salvar alterações'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8 items-start">
                {/* Settings Panel */}
                <div className="flex flex-col gap-6 overflow-y-auto max-h-[calc(100vh-200px)] pr-2 custom-scrollbar">

                    {/* Theme & Basic */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
                        <div>
                            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <FiSun size={16} className="text-[#6C5CE7]" /> Estilo Visual
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                {['light', 'dark'].map(t => (
                                    <button key={t} onClick={() => update('theme', t)} className={`h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all border-2 ${settings.theme === t ? 'border-[#6C5CE7] bg-[#6C5CE7]/5 text-[#6C5CE7]' : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200'}`}>
                                        {t === 'light' ? <FiSun /> : <FiMoon />} {t === 'light' ? 'Claro' : 'Escuro'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <FiDroplet size={16} className="text-[#6C5CE7]" /> Cor de Destaque
                            </h3>
                            <div className="flex items-center gap-3">
                                <input type="color" value={settings.accent_color} onChange={e => update('accent_color', e.target.value)} className="w-12 h-12 rounded-xl border-none p-0 cursor-pointer overflow-hidden" />
                                <input className="flex-1 h-12 px-4 rounded-xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-[#6C5CE7] outline-none font-mono text-sm" value={settings.accent_color} onChange={e => update('accent_color', e.target.value)} />
                            </div>
                            <div className="flex flex-wrap gap-2 mt-4">
                                {['#6C5CE7', '#00B894', '#E17055', '#FDCB6E', '#0984E3', '#E84393', '#2D3436'].map(c => (
                                    <button key={c} onClick={() => update('accent_color', c)} className={`w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110 ${settings.accent_color === c ? 'border-gray-800' : 'border-transparent'}`} style={{ background: c }} />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Banner Settings */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
                        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <FiImage size={16} className="text-[#6C5CE7]" /> Banner do Checkout
                        </h3>
                        
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">Imagem do Banner</label>
                            {settings.banner_url ? (
                                <div className="relative rounded-xl overflow-hidden group">
                                    <img src={settings.banner_url} alt="Banner" className="w-full h-32 object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <button onClick={() => document.getElementById('banner-upload')?.click()} className="p-2 bg-white rounded-lg text-gray-800 hover:bg-gray-100"><FiUpload size={16} /></button>
                                        <button onClick={() => update('banner_url', '')} className="p-2 bg-red-500 rounded-lg text-white hover:bg-red-600"><FiTrash2 size={16} /></button>
                                    </div>
                                </div>
                            ) : (
                                <div onClick={() => document.getElementById('banner-upload')?.click()} className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#6C5CE7] hover:bg-[#6C5CE7]/5 transition-all">
                                    {uploadingBanner ? (
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6C5CE7]" />
                                    ) : (
                                        <>
                                            <FiImage size={32} className="text-gray-300" />
                                            <span className="text-xs font-bold text-gray-400">Clique para enviar</span>
                                        </>
                                    )}
                                </div>
                            )}
                            <input id="banner-upload" type="file" className="hidden" accept="image/*" onChange={handleBannerUpload} />
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">Texto sobre o Banner</label>
                            <input className="w-full h-12 px-4 rounded-xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-[#6C5CE7] outline-none text-sm" placeholder="Ex: Ganhe 50% de desconto hoje!" value={settings.banner_text} onChange={e => update('banner_text', e.target.value)} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">Altura Desktop</label>
                                <input type="number" className="w-full h-12 px-4 rounded-xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-[#6C5CE7] outline-none text-sm" value={settings.banner_height_desktop} onChange={e => update('banner_height_desktop', parseInt(e.target.value) || 300)} />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">Altura Mobile</label>
                                <input type="number" className="w-full h-12 px-4 rounded-xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-[#6C5CE7] outline-none text-sm" value={settings.banner_height_mobile} onChange={e => update('banner_height_mobile', parseInt(e.target.value) || 200)} />
                            </div>
                        </div>
                    </div>

                    {/* Form Fields */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <FiCheck size={16} className="text-[#6C5CE7]" /> Campos do Formulário
                        </h3>
                        <div className="space-y-4">
                            {[
                                { key: 'hide_phone', label: 'Ocultar Telefone' },
                                { key: 'hide_address_pix', label: 'Ocultar Endereço no Pix' },
                                { key: 'hide_product_image', label: 'Ocultar Imagem do Produto' }
                            ].map(opt => (
                                <label key={opt.key} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors border border-transparent hover:border-gray-100">
                                    <span className="text-sm font-semibold text-gray-600">{opt.label}</span>
                                    <button onClick={() => update(opt.key, !settings[opt.key as keyof typeof settings])} className={`w-12 h-6 rounded-full relative transition-colors ${settings[opt.key as keyof typeof settings] ? 'bg-[#6C5CE7]' : 'bg-gray-200'}`}>
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings[opt.key as keyof typeof settings] ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Notice & Countdown */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
                        <div>
                            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <FiAlertTriangle size={16} className="text-[#6C5CE7]" /> Aviso em Destaque
                            </h3>
                            <input className="w-full h-12 px-4 rounded-xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-[#6C5CE7] outline-none text-sm mb-3" placeholder="Ex: ⚡ Oferta expira em breve!" value={settings.notice_text} onChange={e => update('notice_text', e.target.value)} />
                            <div className="grid grid-cols-3 gap-2">
                                {['warning', 'info', 'success'].map(t => (
                                    <button key={t} onClick={() => update('notice_type', t)} className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border-2 transition-all ${settings.notice_type === t ? 'border-[#6C5CE7] bg-[#6C5CE7]/5 text-[#6C5CE7]' : 'border-gray-50 text-gray-400'}`}>
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                                    <FiClock size={16} className="text-[#6C5CE7]" /> Contador Regressivo
                                </h3>
                                <button onClick={() => update('show_countdown', !settings.show_countdown)} className={`w-12 h-6 rounded-full relative transition-colors ${settings.show_countdown ? 'bg-[#6C5CE7]' : 'bg-gray-200'}`}>
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.show_countdown ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>
                            {settings.show_countdown && (
                                <div className="space-y-4 animate-fadeIn">
                                    <input className="w-full h-12 px-4 rounded-xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-[#6C5CE7] outline-none text-sm" placeholder="Texto do contador" value={settings.countdown_text} onChange={e => update('countdown_text', e.target.value)} />
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Minutos</label>
                                            <input type="number" className="w-full h-12 px-4 rounded-xl border-2 border-gray-50 bg-gray-50 focus:border-[#00B894] outline-none text-sm" value={settings.countdown_minutes} onChange={e => update('countdown_minutes', parseInt(e.target.value) || 15)} />
                                        </div>
                                        <div className="w-24">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Cor</label>
                                            <input type="color" className="w-full h-12 rounded-xl border-none p-0 cursor-pointer overflow-hidden" value={settings.countdown_color} onChange={e => update('countdown_color', e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Video */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                                <FiVideo size={16} className="text-[#6C5CE7]" /> Vídeo de Vendas
                            </h3>
                            <button onClick={() => update('show_video', !settings.show_video)} className={`w-12 h-6 rounded-full relative transition-colors ${settings.show_video ? 'bg-[#6C5CE7]' : 'bg-gray-200'}`}>
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.show_video ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>
                        {settings.show_video && (
                            <div className="space-y-4 animate-fadeIn">
                                <input className="w-full h-12 px-4 rounded-xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-[#6C5CE7] outline-none text-sm" placeholder="URL do vídeo (Youtube, Vimeo, Direct link)" value={settings.video_url} onChange={e => update('video_url', e.target.value)} />
                                {settings.video_url && (
                                    <div className="rounded-xl overflow-hidden aspect-video bg-black relative">
                                        {isIframePreview ? (
                                            <iframe src={videoSrcPreview!} className="w-full h-full border-none" />
                                        ) : (
                                            <video src={videoSrcPreview!} className="w-full h-full object-contain" controls />
                                        )}
                                        <button onClick={() => update('video_url', '')} className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/50 text-white hover:bg-red-500 transition-colors flex items-center justify-center">
                                            <FiTrash2 size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* LIVE PREVIEW */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden sticky top-8 min-h-[800px] flex flex-col scale-90 md:scale-100 origin-top">
                    <div className="bg-gray-50 px-6 py-3 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-400" />
                            <div className="w-3 h-3 rounded-full bg-yellow-400" />
                            <div className="w-3 h-3 rounded-full bg-green-400" />
                        </div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <FiEye size={12} /> Visualização em tempo real
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto flex flex-col" style={{ background: previewBg }}>
                        {/* Countdown bar Preview */}
                        {settings.show_countdown && (
                            <div className="py-2 px-4 text-center font-bold text-white flex items-center justify-center gap-2 text-xs sticky top-0 z-10" style={{ background: settings.countdown_color || previewAccent }}>
                                <FiClock size={12} />
                                <span>{settings.countdown_text}</span>
                                <span className="bg-black/20 px-2 py-0.5 rounded font-mono">{settings.countdown_minutes}:00</span>
                            </div>
                        )}

                        {/* Banner Preview */}
                        {(settings.banner_url || settings.banner_text) && (
                            <div className="relative w-full overflow-hidden" style={{ height: settings.banner_url ? 120 : 'auto', minHeight: 60 }}>
                                {settings.banner_url ? (
                                    <img src={settings.banner_url} alt="Banner" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${previewAccent}44, ${previewAccent}11)` }} />
                                )}
                                {settings.banner_text && (
                                    <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
                                        <span className="text-white font-black text-sm drop-shadow-md">{settings.banner_text}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto" style={{ background: previewBg }}>
                            <div className="px-6 py-8">
                                <div className="mx-auto w-full max-w-[560px]">
                                    <div className="rounded-3xl border shadow-sm overflow-hidden" style={{ background: previewHeaderBg, borderColor: previewBorder }}>
                                        <div className="p-5 flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                                <button type="button" className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold" style={{ background: previewInputBg, borderColor: previewBorder, color: previewText }}>
                                                    <img src="https://flagcdn.com/w20/br.png" alt="BR" className="w-4 h-3 object-cover rounded-sm" />
                                                    Brasil <FiChevronDown size={12} />
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-70" style={{ color: previewMuted }}>
                                                <FiLock size={12} />
                                                GouPay
                                            </div>
                                        </div>

                                        <div className="px-5 pb-5">
                                            <div className="rounded-2xl border p-4" style={{ background: previewInputBg, borderColor: previewBorder }}>
                                                <div className="flex gap-4">
                                                    {!settings.hide_product_image && (
                                                        <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border flex items-center justify-center" style={{ borderColor: previewBorder, background: previewCard, color: previewMuted }}>
                                                            <FiPackage size={20} />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <div className="text-xs font-black truncate" style={{ color: previewText }}>{product?.name || 'Produto Exemplo'}</div>
                                                                <div className="text-[10px] opacity-70 mt-0.5" style={{ color: previewMuted }}>Checkout seguro</div>
                                                            </div>
                                                            <div className="text-xs font-black whitespace-nowrap" style={{ color: previewText }}>
                                                                R$ {product?.price_display || '97,00'}
                                                            </div>
                                                        </div>
                                                        <div className="mt-2 text-[10px] opacity-70" style={{ color: previewMuted }}>
                                                            Ver mais
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="px-5 pb-6 space-y-6">
                                            {settings.notice_text && (
                                                <div className="p-3 rounded-2xl text-center font-bold text-[10px] uppercase tracking-wider border-2" style={{
                                                    background: settings.notice_type === 'warning' ? '#FDCB6E22' : settings.notice_type === 'info' ? '#74B9FF22' : '#55EFC422',
                                                    borderColor: settings.notice_type === 'warning' ? '#FDCB6E' : settings.notice_type === 'info' ? '#74B9FF' : '#55EFC4',
                                                    color: settings.notice_type === 'warning' ? '#b8860b' : settings.notice_type === 'info' ? '#2171b5' : '#0e8c5e'
                                                }}>
                                                    {settings.notice_text}
                                                </div>
                                            )}

                                            <div className="space-y-4">
                                                <h4 className="text-sm font-black" style={{ color: previewText }}>Seus dados</h4>
                                                {[
                                                    { label: 'Nome completo', value: 'Ana Cristina da Silva' },
                                                    { label: 'E-mail', value: 'ana.silva@exemplo.com' },
                                                    { label: 'CPF', value: '000.000.000-00' },
                                                    ...(settings.hide_phone ? [] : [{ label: 'Seu celular', value: '(11) 99999-9999' }])
                                                ].map(f => (
                                                    <div key={f.label}>
                                                        <label className="text-[10px] font-black uppercase tracking-widest mb-1.5 block opacity-60" style={{ color: previewMuted }}>{f.label}</label>
                                                        <div className="w-full h-12 rounded-2xl border px-4 flex items-center text-xs font-medium italic" style={{ background: previewInputBg, borderColor: previewBorder, color: previewMuted }}>
                                                            {f.value}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="space-y-4">
                                                <h4 className="text-sm font-black" style={{ color: previewText }}>Pagamento</h4>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="rounded-2xl border p-4" style={{ background: previewCard, borderColor: previewAccent }}>
                                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-white" style={{ background: previewAccent }}>
                                                            <FiCreditCard size={18} />
                                                        </div>
                                                        <div className="text-xs font-black" style={{ color: previewText }}>Cartão de crédito</div>
                                                    </div>
                                                    <div className="rounded-2xl border p-4" style={{ background: previewInputBg, borderColor: previewBorder }}>
                                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: previewCard, color: previewMuted }}>
                                                            <FiSmartphone size={18} />
                                                        </div>
                                                        <div className="text-xs font-black" style={{ color: previewText }}>Pix</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 rounded-3xl border shadow-sm overflow-hidden" style={{ background: previewHeaderBg, borderColor: previewBorder }}>
                                        <div className="p-6">
                                            <div className="text-sm font-black mb-4" style={{ color: previewText }}>Resumo</div>

                                            <div className="space-y-3">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="text-xs font-semibold leading-snug" style={{ color: previewText }}>{product?.name || 'Produto Exemplo'}</div>
                                                    <div className="text-xs font-semibold whitespace-nowrap" style={{ color: previewText }}>R$ {product?.price_display || '97,00'}</div>
                                                </div>

                                                <div className="pt-3 border-t space-y-2" style={{ borderColor: previewBorder }}>
                                                    <div className="flex items-center justify-between text-xs" style={{ color: previewMuted }}>
                                                        <span>Subtotal</span>
                                                        <span className="font-bold" style={{ color: previewText }}>R$ {product?.price_display || '97,00'}</span>
                                                    </div>
                                                    <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: previewBorder }}>
                                                        <span className="text-xs font-black" style={{ color: previewText }}>Total</span>
                                                        <span className="text-lg font-black tracking-tight" style={{ color: previewText }}>R$ {product?.price_display || '97,00'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-6 w-full h-12 rounded-2xl text-white font-black text-sm flex items-center justify-center" style={{ background: previewAccent }}>
                                                Comprar agora
                                            </div>

                                            <div className="mt-4 flex items-center justify-center gap-2 opacity-60" style={{ color: previewMuted }}>
                                                <FiLock size={12} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Ambiente seguro</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
                .input-field:focus { border-color: ${settings.accent_color} !important; }
                @media (max-width: 640px) {
                    .checkoutBannerPreview {
                        height: ${(settings.banner_height_mobile || 200)}px !important;
                        background-size: ${settings.banner_mode_mobile === 'contain' ? 'contain' : 'cover'} !important;
                        background-position: center !important;
                        background-repeat: no-repeat !important;
                    }
                }
            `}</style>
        </div>
    );
}
