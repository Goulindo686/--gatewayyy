'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Script from 'next/script';
import { productsAPI, checkoutAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { FiShoppingCart, FiCreditCard, FiSmartphone, FiCheck, FiCopy, FiPackage, FiArrowRight, FiClock, FiLock, FiChevronDown } from 'react-icons/fi';
import FacebookPixel from '@/components/FacebookPixel';

const DEFAULT_SETTINGS = {
    theme: 'light', // Alterado para light por padrão conforme a imagem
    banner_url: '',
    banner_text: '',
    show_countdown: false,
    countdown_minutes: 15,
    countdown_text: 'Oferta expira em:',
    countdown_color: '#6C5CE7',
    notice_text: '',
    notice_type: 'warning',
    accent_color: '#00B894', // Verde estilo Pagar.me
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

function VideoPlayer({ settings, borderColor }: { settings: any, borderColor: string }) {
    if (!settings.show_video || !settings.video_url) return null;

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

    const videoSrc = getEmbedUrl(settings.video_url);
    const isIframe = videoSrc?.includes('youtube.com/embed') || videoSrc?.includes('player.vimeo.com/video');

    return (
        <div className="w-full rounded-2xl overflow-hidden bg-black mb-6 aspect-video shadow-xl" style={{ border: `1px solid ${borderColor}` }}>
            {isIframe ? (
                <iframe
                    src={videoSrc!}
                    className="w-full h-full border-none"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                />
            ) : (
                <video
                    key={videoSrc}
                    controls={settings.video_controls}
                    autoPlay={settings.video_autoplay}
                    loop={settings.video_loop}
                    muted={settings.video_muted}
                    playsInline
                    preload="auto"
                    className="w-full h-full block object-contain"
                >
                    <source src={videoSrc!} />
                    Seu navegador não suporta a tag de vídeo.
                </video>
            )}
        </div>
    );
}

export default function CheckoutPage() {
    const params = useParams();
    const router = useRouter();
    const enableCreditCard = process.env.NEXT_PUBLIC_ENABLE_CREDIT_CARD ? (process.env.NEXT_PUBLIC_ENABLE_CREDIT_CARD === 'true') : false;
    const [product, setProduct] = useState<any>(null);
    const [plans, setPlans] = useState<any[]>([]);
    const [selectedPlan, setSelectedPlan] = useState<any>(null);
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('pix');
    const [result, setResult] = useState<any>(null);
    const [pixPaid, setPixPaid] = useState(false);
    const pollingRef = useRef<any>(null);
    const [countdown, setCountdown] = useState(5);
    const countdownRef = useRef<any>(null);
    const [timerSeconds, setTimerSeconds] = useState(0);
    const timerRef = useRef<any>(null);
    const [form, setForm] = useState({
        name: '', email: '', cpf: '', phone: '',
        cep: '', street: '', number: '', neighborhood: '', city: '', state: '',
        card_number: '', card_holder: '', card_exp_month: '', card_exp_year: '', card_cvv: '', installments: 1
    });

    const isValidCPF = (v: string) => {
        const s = (v || '').replace(/\D/g, '');
        if (!s || s.length !== 11 || /^(\d)\1+$/.test(s)) return false;
        let sum = 0; for (let i = 0; i < 9; i++) sum += parseInt(s[i]) * (10 - i);
        let d1 = (sum * 10) % 11; if (d1 === 10) d1 = 0; if (d1 !== parseInt(s[9])) return false;
        sum = 0; for (let i = 0; i < 10; i++) sum += parseInt(s[i]) * (11 - i);
        let d2 = (sum * 10) % 11; if (d2 === 10) d2 = 0; return d2 === parseInt(s[10]);
    };
    const isValidCEP = (v: string) => /^\d{8}$/.test((v || '').replace(/\D/g, ''));
    const UFs = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
    const isValidUF = (v: string) => UFs.includes((v || '').toUpperCase());
    const isValidPhone = (v: string) => {
        const d = (v || '').replace(/\D/g, '');
        return d.length >= 10 && d.length <= 11;
    };
 
    useEffect(() => {
        if (params.id) loadProduct(params.id as string);
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [params.id]);

    const loadProduct = async (id: string) => {
        try {
            const { data } = await productsAPI.getPublic(id);
            setProduct(data.product);
            const pl = Array.isArray(data.product?.plans) ? data.product.plans : [];
            setPlans(pl);
            setSelectedPlan(pl.length > 0 ? pl[0] : null);
            const s = { ...DEFAULT_SETTINGS, ...(data.product.checkout_settings || {}) };
            setSettings(s);
            // Start countdown timer if enabled
            if (s.show_countdown) {
                const totalSeconds = (s.countdown_minutes || 15) * 60;
                setTimerSeconds(totalSeconds);
                timerRef.current = setInterval(() => {
                    setTimerSeconds(prev => {
                        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
                        return prev - 1;
                    });
                }, 1000);
            }
        } catch (err) {
            toast.error('Produto não encontrado');
        } finally {
            setLoading(false);
        }
    };

    const autoLoginAndRedirect = (authData: any) => {
        if (authData?.token && authData?.user) {
            localStorage.setItem('token', authData.token);
            localStorage.setItem('user', JSON.stringify(authData.user));
        }
        let count = 5;
        setCountdown(count);
        countdownRef.current = setInterval(() => {
            count--;
            setCountdown(count);
            if (count <= 0) {
                clearInterval(countdownRef.current);
                router.push('/area-membros');
            }
        }, 1000);
    };

    const startPixPolling = (orderId: string) => {
        pollingRef.current = setInterval(async () => {
            try {
                const { data } = await checkoutAPI.getOrderStatus(orderId);
                if (data.order?.status === 'paid') {
                    clearInterval(pollingRef.current);
                    setPixPaid(true);
                    toast.success('Pagamento confirmado! 🎉');
                    if (data.auth) autoLoginAndRedirect(data.auth);
                }
            } catch (err) { /* retry */ }
        }, 3000);
    };

    const handlePay = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        try {
            const methodToSend = enableCreditCard ? paymentMethod : 'pix';
            if (!isValidCPF(form.cpf)) { toast.error('CPF inválido'); setProcessing(false); return; }
            if (!settings.hide_phone && !isValidPhone(form.phone)) { toast.error('Telefone inválido'); setProcessing(false); return; }
            if (methodToSend === 'credit_card') {
                if (!isValidCEP(form.cep)) { toast.error('CEP inválido'); setProcessing(false); return; }
                if (!isValidUF(form.state)) { toast.error('UF inválida'); setProcessing(false); return; }
                if (!form.street || !form.number || !form.neighborhood || !form.city) { toast.error('Endereço incompleto'); setProcessing(false); return; }
            }
            const includeAddress = methodToSend === 'credit_card' || !settings.hide_address_pix;
            const buyer: any = {
                product_id: params.id,
                plan_id: selectedPlan?.id,
                payment_method: methodToSend,
                buyer: {
                    name: form.name,
                    email: form.email,
                    cpf: form.cpf,
                    ...(settings.hide_phone ? {} : { phone: form.phone }),
                    ...(includeAddress ? {
                        address: {
                            line_1: `${form.street || ''}, ${form.number || ''}, ${form.neighborhood || ''}`.trim(),
                            zip_code: form.cep?.replace(/\D/g, ''),
                            city: form.city,
                            state: form.state,
                            country: 'BR',
                            street: form.street,
                            number: form.number,
                            neighborhood: form.neighborhood
                        }
                    } : {})
                }
            };
            const payload: any = buyer;
            if (methodToSend === 'credit_card') {
                payload.card_data = {
                    number: form.card_number.replace(/\s/g, ''), holder_name: form.card_holder,
                    exp_month: parseInt(form.card_exp_month), exp_year: parseInt(form.card_exp_year),
                    cvv: form.card_cvv, installments: form.installments
                };
            }
            const { data } = await checkoutAPI.pay(payload);
            setResult(data);
            if (data.order?.status === 'paid') {
                toast.success('Pagamento aprovado! 🎉');
                if (data.auth) autoLoginAndRedirect(data.auth);
            } else if (methodToSend === 'pix') {
                if (data.pix) {
                    toast.success('QR Code gerado!');
                    startPixPolling(data.order.id);
                } else {
                    toast.error('O pedido foi gerado, mas o Pagar.me não retornou o QR Code.');
                }
            }
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao processar pagamento');
        } finally {
            setProcessing(false);
        }
    };

    const copyPixCode = () => {
        if (result?.pix?.qr_code) { navigator.clipboard.writeText(result.pix.qr_code); toast.success('Código Pix copiado!'); }
    };
    const update = (field: string, value: string) => setForm({ ...form, [field]: value });

    const formatTimer = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    };

    // Theme variables
    const isLight = settings.theme === 'light';
    const bgPrimary = isLight ? '#f8f9fa' : 'var(--bg-primary)';
    const bgCard = isLight ? 'rgba(255,255,255,0.95)' : 'var(--bg-card, rgba(25,25,45,0.6))';
    const borderColor = isLight ? 'rgba(0,0,0,0.1)' : 'var(--border-color)';
    const textPrimary = isLight ? '#1a1a2e' : 'var(--text-primary)';
    const textSecondary = isLight ? '#555' : 'var(--text-secondary)';
    const textMuted = isLight ? '#888' : 'var(--text-muted)';
    const inputBg = isLight ? '#fff' : 'var(--bg-secondary)';
    const accent = settings.accent_color || '#00B894';
    const countdownColor = settings.countdown_color || accent;
    const hasBanner = !!(settings.banner_url || settings.banner_text);
    const hasCountdown = settings.show_countdown && timerSeconds > 0;

    const noticeColors: any = {
        warning: { bg: 'rgba(253,203,110,0.12)', border: 'rgba(253,203,110,0.3)', text: '#FDCB6E' },
        info: { bg: 'rgba(116,185,255,0.12)', border: 'rgba(116,185,255,0.3)', text: '#74B9FF' },
        success: { bg: 'rgba(85,239,196,0.12)', border: 'rgba(85,239,196,0.3)', text: '#55EFC4' },
    };
    const bannerModeDesktop = settings.banner_mode_desktop === 'contain' ? 'contain' : 'cover';
    const bannerModeMobile = settings.banner_mode_mobile === 'contain' ? 'contain' : 'cover';
    const bannerPos = settings.banner_position || 'center';
    const bannerHeightDesktop = settings.banner_height_desktop || 300;
    const bannerHeightMobile = settings.banner_height_mobile || 200;

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bgPrimary }}>
                <div style={{ width: 40, height: 40, border: `3px solid ${borderColor}`, borderTopColor: accent, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!product) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bgPrimary, padding: 24 }}>
                <div style={{ padding: 48, textAlign: 'center', maxWidth: 400, background: bgCard, borderRadius: 16, border: `1px solid ${borderColor}` }}>
                    <FiPackage size={48} style={{ opacity: 0.3, color: textPrimary, marginBottom: 16 }} />
                    <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: textPrimary }}>Produto não encontrado</h2>
                    <p style={{ color: textSecondary, fontSize: 14 }}>Este produto não existe ou foi desativado.</p>
                </div>
            </div>
        );
    }

    // Success Screen
    if (result && (result.order?.status === 'paid' || pixPaid)) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6" style={{ background: bgPrimary }}>
                <div className="w-full max-w-lg p-12 text-center rounded-3xl shadow-2xl border" style={{ background: bgCard, borderColor: borderColor }}>
                    <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center animate-bounce" style={{ background: `${accent}22` }}>
                        <FiCheck size={40} style={{ color: accent }} />
                    </div>
                    <h2 className="text-3xl font-extrabold mb-2" style={{ color: textPrimary }}>
                        Pagamento <span style={{ color: accent }}>Confirmado!</span>
                    </h2>
                    <p className="text-lg mb-8 opacity-80" style={{ color: textSecondary }}>Seu acesso já está disponível.</p>
                    
                    <div className="p-6 rounded-2xl mb-8" style={{ background: isLight ? '#f9fafb' : 'rgba(255,255,255,0.03)' }}>
                        <div className="text-sm opacity-60 mb-1" style={{ color: textSecondary }}>Valor total</div>
                        <div className="text-4xl font-black" style={{ color: accent }}>R$ {result.order.amount_display}</div>
                    </div>

                    <button onClick={() => router.push('/area-membros')} className="w-full py-4 px-6 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98]" style={{ background: accent }}>
                        Começar Agora <FiArrowRight size={20} />
                    </button>
                    <p className="mt-4 text-xs opacity-50" style={{ color: textMuted }}>Redirecionando em {countdown}s...</p>
                </div>
            </div>
        );
    }

    // PIX QR Code screen
    if (result && result.pix) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6" style={{ background: bgPrimary }}>
                <div className="w-full max-w-md p-10 text-center rounded-3xl shadow-2xl border" style={{ background: bgCard, borderColor: borderColor }}>
                    <h2 className="text-2xl font-bold mb-2" style={{ color: textPrimary }}>Pague via Pix</h2>
                    <p className="text-sm mb-8 opacity-70" style={{ color: textSecondary }}>Aponte a câmera do seu celular para o código</p>
                    
                    {result.pix?.qr_code_url && (
                        <div className="bg-white p-4 rounded-2xl inline-block shadow-inner mb-6 border-4" style={{ borderColor: accent }}>
                            <img src={result.pix.qr_code_url} alt="QR Code Pix" className="w-56 h-56" />
                        </div>
                    )}
                    
                    <div className="mb-6">
                        <div className="text-sm opacity-60 mb-1" style={{ color: textSecondary }}>Valor a pagar</div>
                        <div className="text-3xl font-black" style={{ color: accent }}>R$ {result.order.amount_display}</div>
                    </div>

                    {result.pix?.qr_code && (
                        <div className="space-y-4">
                            <div className="p-3 rounded-xl text-xs break-all max-h-24 overflow-auto border border-dashed" style={{ background: isLight ? '#f3f4f6' : 'rgba(255,255,255,0.05)', color: textMuted, borderColor: borderColor }}>
                                {result.pix.qr_code}
                            </div>
                            <button onClick={copyPixCode} className="w-full py-3 px-6 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90" style={{ background: accent }}>
                                <FiCopy size={18} /> Copiar Código Pix
                            </button>
                        </div>
                    )}

                    <div className="mt-8 p-4 rounded-xl flex items-center justify-center gap-3 animate-pulse" style={{ background: `${accent}11`, border: `1px solid ${accent}33` }}>
                        <div className="w-2 h-2 rounded-full" style={{ background: accent }} />
                        <span className="text-sm font-medium" style={{ color: accent }}>Aguardando pagamento...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col" style={{ background: bgPrimary, color: textPrimary }}>
            <FacebookPixel pixelId={product?.facebook_pixel_id} product={product} />

            {/* Countdown bar */}
            {hasCountdown && (
                <div className="py-2 px-4 text-center font-bold text-white flex items-center justify-center gap-3 sticky top-0 z-50 shadow-md" style={{ background: countdownColor }}>
                    <FiClock className="animate-pulse" />
                    <span>{settings.countdown_text}</span>
                    <span className="bg-black/20 px-3 py-1 rounded-lg font-mono text-lg">{formatTimer(timerSeconds)}</span>
                </div>
            )}

            {/* Header */}
            <header className="w-full py-4 px-6 md:px-12 border-b flex items-center justify-between sticky top-0 z-40" style={{ background: bgCard, borderColor: borderColor }}>
                <div className="flex items-center gap-3">
                    <img src="/favicon.png" alt="GouPay" className="w-10 h-10 object-contain" />
                    <span className="text-2xl font-black tracking-tighter" style={{ color: textPrimary }}>
                        Gou<span style={{ color: accent }}>Pay</span>
                    </span>
                </div>
                <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium cursor-pointer hover:opacity-80 transition-opacity" style={{ background: isLight ? '#f9fafb' : 'rgba(255,255,255,0.05)', borderColor: borderColor, color: textSecondary }}>
                    <img src="https://flagcdn.com/w20/br.png" alt="PT-BR" className="w-5 h-3.5 object-cover rounded-sm" />
                    Português <FiChevronDown />
                </div>
            </header>

            <main className="flex-1 flex flex-col md:flex-row">
                {/* Left Side: Forms & Payment */}
                <div className="w-full md:w-[60%] lg:w-[65%] p-6 md:p-12 lg:p-16" style={{ background: bgCard }}>
                    <div className="max-w-2xl mx-auto">
                        
                        {/* Notice */}
                        {settings.notice_text && (
                            <div className="mb-10 p-4 rounded-xl text-center font-semibold text-sm border-2 animate-pulse" style={{ 
                                background: noticeColors[settings.notice_type]?.bg,
                                borderColor: noticeColors[settings.notice_type]?.border,
                                color: noticeColors[settings.notice_type]?.text
                            }}>
                                {settings.notice_text}
                            </div>
                        )}

                        {/* Payment Methods */}
                        <div className="mb-10">
                            <div className="grid grid-cols-1 gap-3">
                                {enableCreditCard && (
                                    <button 
                                        type="button" 
                                        onClick={() => setPaymentMethod('credit_card')}
                                        className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-left ${paymentMethod === 'credit_card' ? '' : 'hover:opacity-80'}`}
                                        style={{ 
                                            borderColor: paymentMethod === 'credit_card' ? accent : borderColor,
                                            background: paymentMethod === 'credit_card' ? `${accent}11` : 'transparent'
                                        }}
                                    >
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${paymentMethod === 'credit_card' ? 'text-white' : ''}`} style={{ background: paymentMethod === 'credit_card' ? accent : (isLight ? '#f3f4f6' : 'rgba(255,255,255,0.05)'), color: paymentMethod === 'credit_card' ? 'white' : textMuted }}>
                                            <FiCreditCard size={24} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-bold" style={{ color: textPrimary }}>Cartão de Crédito</div>
                                            <div className="text-xs" style={{ color: textSecondary }}>Pague em até 12x</div>
                                        </div>
                                        {paymentMethod === 'credit_card' && <div className="w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ background: accent }}><FiCheck size={14} /></div>}
                                    </button>
                                )}
                                <button 
                                    type="button" 
                                    onClick={() => setPaymentMethod('pix')}
                                    className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-left ${paymentMethod === 'pix' ? '' : 'hover:opacity-80'}`}
                                    style={{ 
                                        borderColor: paymentMethod === 'pix' ? accent : borderColor,
                                        background: paymentMethod === 'pix' ? `${accent}11` : 'transparent'
                                    }}
                                >
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${paymentMethod === 'pix' ? 'text-white' : ''}`} style={{ background: paymentMethod === 'pix' ? accent : (isLight ? '#f3f4f6' : 'rgba(255,255,255,0.05)'), color: paymentMethod === 'pix' ? 'white' : textMuted }}>
                                        <FiSmartphone size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold" style={{ color: textPrimary }}>Pix</div>
                                        <div className="text-xs font-bold" style={{ color: accent }}>com desconto</div>
                                    </div>
                                    {paymentMethod === 'pix' && <div className="w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ background: accent }}><FiCheck size={14} /></div>}
                                </button>
                            </div>
                        </div>

                        {/* Form */}
                        <form onSubmit={handlePay} className="space-y-8">
                            <section>
                                <h3 className="text-xl font-bold mb-6" style={{ color: textPrimary }}>Dados pessoais</h3>
                                <div className="space-y-4">
                                    <div className="group">
                                        <label className="text-xs font-bold uppercase tracking-wider mb-2 block transition-colors group-focus-within:opacity-100 opacity-60" style={{ color: textSecondary }}>Nome completo *</label>
                                        <input 
                                            placeholder="Ex: Ana Cristina da Silva" 
                                            required 
                                            value={form.name} 
                                            onChange={e => update('name', e.target.value)}
                                            className="w-full h-14 px-5 rounded-xl border-2 outline-none transition-all font-medium"
                                            style={{ background: inputBg, borderColor: borderColor, color: textPrimary }}
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="group">
                                            <label className="text-xs font-bold uppercase tracking-wider mb-2 block transition-colors group-focus-within:opacity-100 opacity-60" style={{ color: textSecondary }}>E-mail *</label>
                                            <input 
                                                type="email" 
                                                placeholder="seu@email.com" 
                                                required 
                                                value={form.email} 
                                                onChange={e => update('email', e.target.value)}
                                                className="w-full h-14 px-5 rounded-xl border-2 outline-none transition-all font-medium"
                                                style={{ background: inputBg, borderColor: borderColor, color: textPrimary }}
                                            />
                                        </div>
                                        <div className="group">
                                            <label className="text-xs font-bold uppercase tracking-wider mb-2 block transition-colors group-focus-within:opacity-100 opacity-60" style={{ color: textSecondary }}>CPF *</label>
                                            <input 
                                                placeholder="000.000.000-00" 
                                                required 
                                                value={form.cpf} 
                                                onChange={e => update('cpf', e.target.value)}
                                                className="w-full h-14 px-5 rounded-xl border-2 outline-none transition-all font-medium"
                                                style={{ background: inputBg, borderColor: borderColor, color: textPrimary }}
                                            />
                                        </div>
                                    </div>
                                    {!settings.hide_phone && (
                                        <div className="group">
                                            <label className="text-xs font-bold uppercase tracking-wider mb-2 block transition-colors group-focus-within:opacity-100 opacity-60" style={{ color: textSecondary }}>Celular com DDD *</label>
                                            <input 
                                                placeholder="(11) 99999-9999" 
                                                required 
                                                value={form.phone} 
                                                onChange={e => update('phone', e.target.value)}
                                                className="w-full h-14 px-5 rounded-xl border-2 outline-none transition-all font-medium"
                                                style={{ background: inputBg, borderColor: borderColor, color: textPrimary }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Credit Card Details */}
                            {paymentMethod === 'credit_card' && (
                                <section className="pt-4 animate-fadeIn">
                                    <h3 className="text-xl font-bold mb-6" style={{ color: textPrimary }}>Dados do cartão</h3>
                                    <div className="space-y-4">
                                        <div className="group">
                                            <label className="text-xs font-bold uppercase tracking-wider mb-2 block transition-colors group-focus-within:opacity-100 opacity-60" style={{ color: textSecondary }}>Número do cartão *</label>
                                            <input 
                                                placeholder="0000 0000 0000 0000" 
                                                required 
                                                value={form.card_number} 
                                                onChange={e => update('card_number', e.target.value)}
                                                className="w-full h-14 px-5 rounded-xl border-2 outline-none transition-all font-medium"
                                                style={{ background: inputBg, borderColor: borderColor, color: textPrimary }}
                                            />
                                        </div>
                                        <div className="group">
                                            <label className="text-xs font-bold uppercase tracking-wider mb-2 block transition-colors group-focus-within:opacity-100 opacity-60" style={{ color: textSecondary }}>Nome impresso no cartão *</label>
                                            <input 
                                                placeholder="COMO ESTÁ NO CARTÃO" 
                                                required 
                                                value={form.card_holder} 
                                                onChange={e => update('card_holder', e.target.value)}
                                                className="w-full h-14 px-5 rounded-xl border-2 outline-none transition-all font-medium"
                                                style={{ background: inputBg, borderColor: borderColor, color: textPrimary }}
                                            />
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="group">
                                                <label className="text-xs font-bold uppercase tracking-wider mb-2 block opacity-60" style={{ color: textSecondary }}>Validade *</label>
                                                <div className="flex items-center gap-2">
                                                    <input placeholder="MM" maxLength={2} className="w-full h-14 px-3 text-center rounded-xl border-2 outline-none" value={form.card_exp_month} onChange={e => update('card_exp_month', e.target.value)} style={{ background: inputBg, borderColor: borderColor, color: textPrimary }} />
                                                    <span className="opacity-30">/</span>
                                                    <input placeholder="AA" maxLength={2} className="w-full h-14 px-3 text-center rounded-xl border-2 outline-none" value={form.card_exp_year} onChange={e => update('card_exp_year', e.target.value)} style={{ background: inputBg, borderColor: borderColor, color: textPrimary }} />
                                                </div>
                                            </div>
                                            <div className="group col-span-1">
                                                <label className="text-xs font-bold uppercase tracking-wider mb-2 block opacity-60" style={{ color: textSecondary }}>CVV *</label>
                                                <input placeholder="000" maxLength={4} className="w-full h-14 px-5 rounded-xl border-2 outline-none" value={form.card_cvv} onChange={e => update('card_cvv', e.target.value)} style={{ background: inputBg, borderColor: borderColor, color: textPrimary }} />
                                            </div>
                                            <div className="group col-span-1">
                                                <label className="text-xs font-bold uppercase tracking-wider mb-2 block opacity-60" style={{ color: textSecondary }}>Parcelas *</label>
                                                <select 
                                                    className="w-full h-14 px-3 rounded-xl border-2 outline-none font-medium"
                                                    value={form.installments}
                                                    onChange={e => update('installments', e.target.value)}
                                                    style={{ background: inputBg, borderColor: borderColor, color: textPrimary }}
                                                >
                                                    {[...Array(12)].map((_, i) => (
                                                        <option key={i+1} value={i+1}>{i+1}x de R$ {((selectedPlan?.price || product?.price || 0) / 100 / (i+1)).toFixed(2)}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Address for Credit Card */}
                                        <div className="pt-4 space-y-4">
                                            <h4 className="font-bold opacity-80" style={{ color: textPrimary }}>Endereço de cobrança</h4>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div className="col-span-1"><input placeholder="CEP" className="w-full h-12 px-4 rounded-xl border-2 outline-none" value={form.cep} onChange={e => update('cep', e.target.value)} style={{ background: inputBg, borderColor: borderColor, color: textPrimary }} /></div>
                                                <div className="col-span-2 md:col-span-2"><input placeholder="Cidade" className="w-full h-12 px-4 rounded-xl border-2 outline-none" value={form.city} onChange={e => update('city', e.target.value)} style={{ background: inputBg, borderColor: borderColor, color: textPrimary }} /></div>
                                                <div className="col-span-1"><input placeholder="UF" maxLength={2} className="w-full h-12 px-4 rounded-xl border-2 outline-none" value={form.state} onChange={e => update('state', e.target.value.toUpperCase())} style={{ background: inputBg, borderColor: borderColor, color: textPrimary }} /></div>
                                            </div>
                                            <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                                                <div className="col-span-2 md:col-span-3"><input placeholder="Rua / Logradouro" className="w-full h-12 px-4 rounded-xl border-2 outline-none" value={form.street} onChange={e => update('street', e.target.value)} style={{ background: inputBg, borderColor: borderColor, color: textPrimary }} /></div>
                                                <div className="col-span-1"><input placeholder="Nº" className="w-full h-12 px-4 rounded-xl border-2 outline-none" value={form.number} onChange={e => update('number', e.target.value)} style={{ background: inputBg, borderColor: borderColor, color: textPrimary }} /></div>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* Submit Button */}
                            <div className="pt-10 flex flex-col md:flex-row items-center justify-between gap-6 border-t" style={{ borderColor: borderColor }}>
                                <div className="flex items-center gap-2 opacity-50" style={{ color: textSecondary }}>
                                    <FiLock size={16} />
                                    <span className="text-xs font-bold uppercase tracking-wider">Pagamento protegido</span>
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={processing}
                                    className="w-full md:w-auto min-w-[240px] h-16 px-10 rounded-2xl text-white font-black text-lg shadow-xl hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{ background: accent, boxShadow: `0 10px 25px -5px ${accent}66` }}
                                >
                                    {processing ? 'Processando...' : 'Continuar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Right Side: Order Summary */}
                <div className="w-full md:w-[40%] lg:w-[35%] p-6 md:p-12 lg:p-16 border-l" style={{ background: isLight ? '#f9fafb' : 'rgba(255,255,255,0.02)', borderColor: borderColor }}>
                    <div className="max-w-md mx-auto sticky top-32">
                        <div className="uppercase text-[10px] font-black tracking-[0.2em] opacity-40 mb-2" style={{ color: textSecondary }}>Checkout</div>
                        <h2 className="text-3xl font-black mb-10" style={{ color: textPrimary }}>Resumo da compra</h2>

                        {/* Product Card */}
                        <div className="p-6 rounded-3xl shadow-sm border mb-8 space-y-6" style={{ background: bgCard, borderColor: borderColor }}>
                            <div className="flex gap-4">
                                {!settings.hide_product_image && (
                                    <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 border" style={{ background: isLight ? '#f3f4f6' : 'rgba(255,255,255,0.05)', borderColor: borderColor }}>
                                        {product.image_url ? (
                                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center opacity-20" style={{ color: textPrimary }}><FiShoppingCart size={32} /></div>
                                        )}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-lg leading-tight mb-2 truncate" style={{ color: textPrimary }}>{product.name}</h4>
                                    <p className="text-sm line-clamp-3 mb-4 leading-relaxed opacity-60" style={{ color: textSecondary }}>{product.description || 'Produto digital com entrega imediata via e-mail.'}</p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-white text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider" style={{ background: accent }}>1 unidade</span>
                                        <span className="font-bold" style={{ color: textPrimary }}>R$ {selectedPlan ? selectedPlan.price_display : product.price_display}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Plans selection if any */}
                            {plans.length > 1 && (
                                <div className="pt-4 border-t space-y-2" style={{ borderColor: borderColor }}>
                                    <label className="text-[10px] font-bold opacity-40 uppercase tracking-widest mb-2 block" style={{ color: textSecondary }}>Selecione seu plano</label>
                                    {plans.map(p => (
                                        <div 
                                            key={p.id} 
                                            onClick={() => setSelectedPlan(p)}
                                            className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${selectedPlan?.id === p.id ? '' : 'hover:opacity-80'}`}
                                            style={{ 
                                                borderColor: selectedPlan?.id === p.id ? accent : borderColor,
                                                background: selectedPlan?.id === p.id ? `${accent}11` : 'transparent'
                                            }}
                                        >
                                            <span className={`text-sm font-bold ${selectedPlan?.id === p.id ? '' : 'opacity-60'}`} style={{ color: selectedPlan?.id === p.id ? accent : textPrimary }}>{p.name}</span>
                                            <span className="text-sm font-black" style={{ color: textPrimary }}>R$ {p.price_display}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Totals */}
                        <div className="space-y-4 px-2">
                            <div className="flex justify-between items-center opacity-60" style={{ color: textSecondary }}>
                                <span className="text-sm font-medium">Subtotal</span>
                                <span className="font-bold" style={{ color: textPrimary }}>R$ {selectedPlan ? selectedPlan.price_display : product.price_display}</span>
                            </div>
                            <div className="flex justify-between items-center opacity-60" style={{ color: textSecondary }}>
                                <span className="text-sm font-medium">Frete</span>
                                <span className="font-black text-xs uppercase tracking-widest" style={{ color: accent }}>Grátis</span>
                            </div>
                            <div className="pt-4 border-t-2 flex justify-between items-center" style={{ borderColor: borderColor }}>
                                <span className="text-lg font-black" style={{ color: textPrimary }}>Total a pagar</span>
                                <span className="text-2xl font-black tracking-tight" style={{ color: textPrimary }}>R$ {selectedPlan ? selectedPlan.price_display : product.price_display}</span>
                            </div>
                        </div>

                        {/* Video */}
                        {settings.show_video && (
                            <div className="mt-12">
                                <VideoPlayer settings={settings} borderColor={borderColor} />
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <style jsx global>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
                input::placeholder { color: #9ca3af; font-weight: 400; }
                select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 1rem center; background-size: 1.25rem; }
            `}</style>
        </div>
    );
}
