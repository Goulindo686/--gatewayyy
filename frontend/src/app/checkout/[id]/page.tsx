'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Script from 'next/script';
import { productsAPI, checkoutAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { FiShoppingCart, FiCreditCard, FiSmartphone, FiCheck, FiCopy, FiPackage, FiArrowRight, FiClock, FiLock, FiChevronDown, FiTag, FiPlusCircle } from 'react-icons/fi';
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

function OrderSummary({
    product,
    selectedPlan,
    processing,
    paymentMethod,
    installments,
    isLight,
    borderColor,
    textPrimary,
    textSecondary,
    textMuted,
    accent,
    grandTotalCents,
    selectedBumpsCount,
}: {
    product: any;
    selectedPlan: any;
    processing: boolean;
    paymentMethod: string;
    installments: number;
    isLight: boolean;
    borderColor: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    accent: string;
    grandTotalCents: number;
    selectedBumpsCount: number;
}) {
    const mainDisplay = selectedPlan ? selectedPlan.price_display : product.price_display;
    const grandTotalDisplay = grandTotalCents.toFixed(2);
    const installmentsSafe = Math.max(1, Number(installments) || 1);
    const perInstallment = grandTotalCents / installmentsSafe;

    return (
        <div className="rounded-3xl border shadow-sm overflow-hidden" style={{ background: isLight ? '#fff' : 'rgba(255,255,255,0.04)', borderColor }}>
            <div className="p-6">
                <div className="text-lg font-black mb-4" style={{ color: textPrimary }}>Resumo</div>

                <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                        <div className="text-sm font-semibold leading-snug" style={{ color: textPrimary }}>{product.name}</div>
                        <div className="text-sm font-semibold whitespace-nowrap" style={{ color: textPrimary }}>R$ {mainDisplay}</div>
                    </div>

                    {selectedBumpsCount > 0 && (
                        <div className="flex items-start justify-between gap-4">
                            <div className="text-sm font-semibold leading-snug opacity-80" style={{ color: textPrimary }}>
                                + {selectedBumpsCount} oferta{selectedBumpsCount > 1 ? 's' : ''} adicional{selectedBumpsCount > 1 ? 'is' : ''}
                            </div>
                            <div className="text-sm font-semibold whitespace-nowrap" style={{ color: accent }}>
                                + R$ {(grandTotalCents - Number(selectedPlan?.price || product?.price || 0)).toFixed(2)}
                            </div>
                        </div>
                    )}

                    <div className="pt-3 border-t space-y-2" style={{ borderColor }}>
                        <div className="flex items-center justify-between text-sm" style={{ color: textPrimary }}>
                            <span className="opacity-70" style={{ color: textSecondary }}>Subtotal</span>
                            <span className="font-bold">R$ {grandTotalDisplay}</span>
                        </div>
                        {paymentMethod === 'credit_card' && (
                            <div className="flex items-center justify-between text-sm" style={{ color: textPrimary }}>
                                <span className="opacity-70" style={{ color: textSecondary }}>Total em parcelas</span>
                                <span className="font-bold">{installmentsSafe}x de R$ {perInstallment.toFixed(2)}*</span>
                            </div>
                        )}
                        <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor }}>
                            <span className="text-base font-black" style={{ color: textPrimary }}>Total</span>
                            <span className="text-xl font-black tracking-tight" style={{ color: textPrimary }}>
                                {paymentMethod === 'credit_card'
                                    ? `${installmentsSafe}x R$ ${perInstallment.toFixed(2)}`
                                    : `R$ ${grandTotalDisplay}`}
                            </span>
                        </div>
                    </div>
                </div>

                <button
                    form="checkout-form"
                    type="submit"
                    disabled={processing}
                    className="mt-6 w-full h-14 rounded-2xl text-white font-black text-base shadow-sm transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: accent }}
                >
                    {processing ? 'Processando...' : 'Comprar agora'}
                </button>

                <div className="mt-5 flex items-center justify-center gap-2 opacity-60" style={{ color: textSecondary }}>
                    <FiLock size={14} />
                    <span className="text-xs font-black uppercase tracking-wider">Ambiente seguro</span>
                </div>
                <div className="mt-4 text-[11px] leading-relaxed opacity-70 text-center" style={{ color: textMuted }}>
                    Ao clicar em &quot;Comprar agora&quot;, você confirma que revisou o valor e os dados informados.
                </div>
            </div>
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
    const [orderBumps, setOrderBumps] = useState<any[]>([]);
    const [selectedBumps, setSelectedBumps] = useState<Set<string>>(new Set());
    // Mapa bumpId → plano selecionado (para bumps com múltiplos planos sem plano fixo)
    const [selectedBumpPlans, setSelectedBumpPlans] = useState<Record<string, any>>({});
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
            // Carrega order bumps vindos junto com o produto
            const bumps = Array.isArray(data.product?.order_bumps) ? data.product.order_bumps : [];
            setOrderBumps(bumps);
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

    const toggleBump = (bumpId: string) => {
        setSelectedBumps(prev => {
            const next = new Set(prev);
            if (next.has(bumpId)) {
                next.delete(bumpId);
                // Limpa o plano selecionado ao desmarcar
                setSelectedBumpPlans(p => { const n = { ...p }; delete n[bumpId]; return n; });
            } else {
                next.add(bumpId);
            }
            return next;
        });
    };

    const selectBumpPlan = (bumpId: string, plan: any) => {
        setSelectedBumpPlans(prev => ({ ...prev, [bumpId]: plan }));
        // Garante que o bump fica marcado ao escolher um plano
        setSelectedBumps(prev => new Set(prev).add(bumpId));
    };

    // Retorna o preço efetivo de um bump em reais, considerando plano escolhido pelo comprador
    const getBumpPrice = (bump: any): number => {
        if (bump.custom_price != null) return Number(bump.custom_price);
        if (bump.bump_plan) return Number(bump.bump_plan.price) / 100;
        const chosenPlan = selectedBumpPlans[bump.id];
        if (chosenPlan) return Number(chosenPlan.price) / 100;
        const plans = bump.bump_product?.plans || [];
        if (plans.length === 1) return Number(plans[0].price) / 100;
        return Number(bump.bump_product?.price) / 100 || 0;
    };

    // Calcula total incluindo bumps selecionados
    // product.price e selectedPlan.price chegam como string da rota pública — forçar Number()
    const bumpsTotal = orderBumps
        .filter(b => selectedBumps.has(b.id))
        .reduce((acc: number, b: any) => acc + getBumpPrice(b), 0);

    const mainPrice = Number(selectedPlan?.price || product?.price || 0);
    const grandTotal = mainPrice + bumpsTotal;
    const grandTotalCents = grandTotal;
    const grandTotalDisplay = grandTotal.toFixed(2);

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
            // Envia os bumps selecionados
            if (selectedBumps.size > 0) {
                payload.selected_bumps = Array.from(selectedBumps);
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
    const accent = settings.accent_color || '#6C5CE7';
    const countdownColor = settings.countdown_color || accent;
    const hasBanner = !!(settings.banner_url || settings.banner_text);
    const hasCountdown = settings.show_countdown && timerSeconds > 0;

    const noticeColors: any = {
        warning: { bg: 'rgba(253,203,110,0.12)', border: 'rgba(253,203,110,0.3)', text: '#FDCB6E' },
        info: { bg: 'rgba(116,185,255,0.12)', border: 'rgba(116,185,255,0.3)', text: '#74B9FF' },
        success: { bg: 'rgba(85,239,196,0.12)', border: 'rgba(85,239,196,0.3)', text: '#55EFC4' },
    };
    
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
        <div className="min-h-screen" style={{ background: isLight ? '#f3f4f6' : bgPrimary, color: textPrimary }}>
            <FacebookPixel pixelId={product?.facebook_pixel_id} product={product} />

            {hasCountdown && (
                <div className="px-4 py-3 text-white" style={{ background: countdownColor }}>
                    <div className="mx-auto w-full max-w-[560px] flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                            <FiClock className="opacity-80" />
                            <span className="opacity-90">{settings.countdown_text}</span>
                        </div>
                        <div className="px-3 py-1 rounded-lg font-mono text-base font-black border" style={{ background: 'rgba(0,0,0,0.18)', borderColor: 'rgba(255,255,255,0.25)' }}>
                            {formatTimer(timerSeconds)}
                        </div>
                    </div>
                </div>
            )}

            <main className="mx-auto w-full max-w-[560px] px-4 pb-12" style={{ paddingTop: hasCountdown ? 18 : 26 }}>
                {hasBanner && (
                    <div className="mb-6">
                        <div className="relative w-full overflow-hidden rounded-3xl shadow-sm border" style={{ borderColor }}>
                            <div className="relative w-full overflow-hidden" style={{ height: settings.banner_url ? bannerHeightMobile : 'auto', minHeight: 120 }}>
                                {settings.banner_url ? (
                                    <img src={settings.banner_url} alt="Banner" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${accent}44, ${accent}11)` }} />
                                )}
                                {settings.banner_text && (
                                    <div className="absolute inset-0 flex items-end justify-center p-5 text-center">
                                        <h1 className="text-white font-black text-xl drop-shadow-xl">{settings.banner_text}</h1>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {settings.notice_text && (
                    <div className="mb-6 p-4 rounded-2xl text-center font-semibold text-sm border" style={{
                        background: noticeColors[settings.notice_type]?.bg,
                        borderColor: noticeColors[settings.notice_type]?.border,
                        color: noticeColors[settings.notice_type]?.text
                    }}>
                        {settings.notice_text}
                    </div>
                )}

                <div className="rounded-3xl border shadow-sm" style={{ background: isLight ? '#fff' : bgCard, borderColor }}>
                    <div className="p-5">
                        <div className="flex items-center justify-between gap-3">
                            <button type="button" className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold" style={{ background: isLight ? '#fff' : inputBg, borderColor, color: textPrimary }}>
                                <img src="https://flagcdn.com/w20/br.png" alt="BR" className="w-5 h-3.5 object-cover rounded-sm" />
                                Brasil <FiChevronDown />
                            </button>
                            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider opacity-70" style={{ color: textSecondary }}>
                                <FiLock size={14} />
                                GouPay
                            </div>
                        </div>
                    </div>

                    <div className="px-5 pb-5">
                        <div className="rounded-2xl border p-4" style={{ background: isLight ? '#fff' : inputBg, borderColor }}>
                            <div className="flex gap-4">
                                {!settings.hide_product_image && (
                                    <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border" style={{ borderColor, background: isLight ? '#f3f4f6' : 'rgba(255,255,255,0.06)' }}>
                                        {product.image_url ? (
                                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center opacity-20" style={{ color: textPrimary }}>
                                                <FiShoppingCart size={22} />
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="text-sm font-black truncate" style={{ color: textPrimary }}>{product.name}</div>
                                            <div className="text-xs opacity-70 mt-0.5" style={{ color: textSecondary }}>Checkout seguro</div>
                                        </div>
                                        <div className="text-sm font-black whitespace-nowrap" style={{ color: textPrimary }}>
                                            R$ {selectedPlan ? selectedPlan.price_display : product.price_display}
                                        </div>
                                    </div>
                                    <details className="mt-2">
                                        <summary className="text-xs font-semibold cursor-pointer opacity-70" style={{ color: textSecondary }}>Ver mais</summary>
                                        <div className="text-xs leading-relaxed opacity-70 mt-2" style={{ color: textSecondary }}>
                                            {product.description || 'Produto digital com entrega imediata via e-mail.'}
                                        </div>
                                    </details>
                                </div>
                            </div>
                        </div>
                    </div>

                    {plans.length > 1 && (
                        <div className="px-5 pb-5">
                            <div className="text-xs font-black uppercase tracking-wider opacity-50 mb-3" style={{ color: textSecondary }}>Selecione o plano</div>
                            <div className="grid gap-2">
                                {plans.map(p => {
                                    const active = selectedPlan?.id === p.id;
                                    return (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => setSelectedPlan(p)}
                                            className="w-full rounded-2xl border px-4 py-3 text-left transition-opacity hover:opacity-90"
                                            style={{
                                                borderColor: active ? accent : borderColor,
                                                background: active ? `${accent}10` : 'transparent'
                                            }}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="text-sm font-extrabold truncate" style={{ color: active ? accent : textPrimary }}>{p.name}</div>
                                                </div>
                                                <div className="text-sm font-black whitespace-nowrap" style={{ color: textPrimary }}>R$ {p.price_display}</div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="px-5 pb-6">
                        <form id="checkout-form" onSubmit={handlePay} className="space-y-8">
                            <section>
                                <h3 className="text-base font-black mb-4" style={{ color: textPrimary }}>Seus dados</h3>
                                <div className="space-y-4">
                                    <div className="group">
                                        <label className="text-xs font-black uppercase tracking-wider mb-2 block opacity-60" style={{ color: textSecondary }}>Nome completo *</label>
                                        <input
                                            placeholder="Ex: Ana Cristina da Silva"
                                            required
                                            value={form.name}
                                            onChange={e => update('name', e.target.value)}
                                            className="w-full h-14 px-5 rounded-2xl border outline-none transition-colors font-medium"
                                            style={{ background: isLight ? '#fff' : inputBg, borderColor: borderColor, color: textPrimary }}
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="group">
                                            <label className="text-xs font-black uppercase tracking-wider mb-2 block opacity-60" style={{ color: textSecondary }}>E-mail *</label>
                                            <input
                                                type="email"
                                                placeholder="seu@email.com"
                                                required
                                                value={form.email}
                                                onChange={e => update('email', e.target.value)}
                                                className="w-full h-14 px-5 rounded-2xl border outline-none transition-colors font-medium"
                                                style={{ background: isLight ? '#fff' : inputBg, borderColor: borderColor, color: textPrimary }}
                                            />
                                        </div>
                                        <div className="group">
                                            <label className="text-xs font-black uppercase tracking-wider mb-2 block opacity-60" style={{ color: textSecondary }}>CPF *</label>
                                            <input
                                                placeholder="000.000.000-00"
                                                required
                                                value={form.cpf}
                                                onChange={e => update('cpf', e.target.value)}
                                                className="w-full h-14 px-5 rounded-2xl border outline-none transition-colors font-medium"
                                                style={{ background: isLight ? '#fff' : inputBg, borderColor: borderColor, color: textPrimary }}
                                            />
                                        </div>
                                    </div>
                                    {!settings.hide_phone && (
                                        <div className="group">
                                            <label className="text-xs font-black uppercase tracking-wider mb-2 block opacity-60" style={{ color: textSecondary }}>Seu celular *</label>
                                            <div className="flex gap-3">
                                                <div className="h-14 px-4 rounded-2xl border flex items-center gap-2 shrink-0" style={{ background: isLight ? '#fff' : inputBg, borderColor }}>
                                                    <img src="https://flagcdn.com/w20/br.png" alt="BR" className="w-5 h-3.5 object-cover rounded-sm" />
                                                    <span className="text-sm font-extrabold" style={{ color: textPrimary }}>+55</span>
                                                </div>
                                                <input
                                                    placeholder="(11) 99999-9999"
                                                    required
                                                    value={form.phone}
                                                    onChange={e => update('phone', e.target.value)}
                                                    className="w-full h-14 px-5 rounded-2xl border outline-none transition-colors font-medium"
                                                    style={{ background: isLight ? '#fff' : inputBg, borderColor: borderColor, color: textPrimary }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>

                            <section>
                                <h3 className="text-base font-black mb-4" style={{ color: textPrimary }}>Pagamento</h3>
                                <div className={`grid gap-3 ${enableCreditCard ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                    {enableCreditCard && (
                                        <button
                                            type="button"
                                            onClick={() => setPaymentMethod('credit_card')}
                                            className="rounded-2xl border p-4 transition-colors flex flex-col items-center justify-center text-center min-h-[96px]"
                                            style={{
                                                borderColor: paymentMethod === 'credit_card' ? accent : borderColor,
                                                background: paymentMethod === 'credit_card'
                                                    ? (isLight ? '#f3f4f6' : `${accent}1A`)
                                                    : (isLight ? '#fff' : 'rgba(255,255,255,0.04)')
                                            }}
                                        >
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: paymentMethod === 'credit_card' ? accent : (isLight ? '#f3f4f6' : 'rgba(255,255,255,0.06)'), color: paymentMethod === 'credit_card' ? 'white' : textMuted }}>
                                                <FiCreditCard size={20} />
                                            </div>
                                            <div className="mt-2 text-sm font-black" style={{ color: textPrimary }}>Cartão de crédito</div>
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('pix')}
                                        className="rounded-2xl border p-4 transition-colors flex flex-col items-center justify-center text-center min-h-[96px]"
                                        style={{
                                            borderColor: paymentMethod === 'pix' ? accent : borderColor,
                                            background: paymentMethod === 'pix'
                                                ? (isLight ? '#f3f4f6' : `${accent}1A`)
                                                : (isLight ? '#fff' : 'rgba(255,255,255,0.04)')
                                        }}
                                    >
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: paymentMethod === 'pix' ? accent : (isLight ? '#f3f4f6' : 'rgba(255,255,255,0.06)'), color: paymentMethod === 'pix' ? 'white' : textMuted }}>
                                            <FiSmartphone size={20} />
                                        </div>
                                        <div className="mt-2 text-sm font-black" style={{ color: textPrimary }}>Pix</div>
                                    </button>
                                </div>
                            </section>

                            {paymentMethod === 'credit_card' && (
                                <section className="pt-2 animate-fadeIn">
                                    <h3 className="text-base font-black mb-4" style={{ color: textPrimary }}>Dados do cartão</h3>
                                    <div className="space-y-4">
                                        <div className="group">
                                            <label className="text-xs font-black uppercase tracking-wider mb-2 block opacity-60" style={{ color: textSecondary }}>Número do cartão *</label>
                                            <input
                                                placeholder="0000 0000 0000 0000"
                                                required
                                                value={form.card_number}
                                                onChange={e => update('card_number', e.target.value)}
                                                className="w-full h-14 px-5 rounded-2xl border outline-none transition-colors font-medium"
                                                style={{ background: isLight ? '#fff' : inputBg, borderColor: borderColor, color: textPrimary }}
                                            />
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="group col-span-2">
                                                <label className="text-xs font-black uppercase tracking-wider mb-2 block opacity-60" style={{ color: textSecondary }}>Validade *</label>
                                                <div className="flex items-center gap-2">
                                                    <input placeholder="MM" maxLength={2} className="w-full h-14 px-3 text-center rounded-2xl border outline-none" value={form.card_exp_month} onChange={e => update('card_exp_month', e.target.value)} style={{ background: isLight ? '#fff' : inputBg, borderColor: borderColor, color: textPrimary }} />
                                                    <span className="opacity-30">/</span>
                                                    <input placeholder="AA" maxLength={2} className="w-full h-14 px-3 text-center rounded-2xl border outline-none" value={form.card_exp_year} onChange={e => update('card_exp_year', e.target.value)} style={{ background: isLight ? '#fff' : inputBg, borderColor: borderColor, color: textPrimary }} />
                                                </div>
                                            </div>
                                            <div className="group col-span-1">
                                                <label className="text-xs font-black uppercase tracking-wider mb-2 block opacity-60" style={{ color: textSecondary }}>CVV *</label>
                                                <input placeholder="000" maxLength={4} className="w-full h-14 px-5 rounded-2xl border outline-none" value={form.card_cvv} onChange={e => update('card_cvv', e.target.value)} style={{ background: isLight ? '#fff' : inputBg, borderColor: borderColor, color: textPrimary }} />
                                            </div>
                                        </div>
                                        <div className="group">
                                            <label className="text-xs font-black uppercase tracking-wider mb-2 block opacity-60" style={{ color: textSecondary }}>Nome do titular *</label>
                                            <input
                                                placeholder="Insira o nome impresso no cartão"
                                                required
                                                value={form.card_holder}
                                                onChange={e => update('card_holder', e.target.value)}
                                                className="w-full h-14 px-5 rounded-2xl border outline-none transition-colors font-medium"
                                                style={{ background: isLight ? '#fff' : inputBg, borderColor: borderColor, color: textPrimary }}
                                            />
                                        </div>
                                        <div className="group">
                                            <label className="text-xs font-black uppercase tracking-wider mb-2 block opacity-60" style={{ color: textSecondary }}>Parcelas *</label>
                                            <select
                                                className="w-full h-14 px-5 rounded-2xl border outline-none font-medium"
                                                value={form.installments}
                                                onChange={e => update('installments', e.target.value)}
                                                style={{ background: isLight ? '#fff' : inputBg, borderColor: borderColor, color: textPrimary }}
                                            >
                                                {[...Array(12)].map((_, i) => (
                                                    <option key={i + 1} value={i + 1}>{i + 1}x de R$ {((selectedPlan?.price || product?.price || 0) / 100 / (i + 1)).toFixed(2)}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="pt-2 space-y-4">
                                            <h4 className="font-black opacity-80" style={{ color: textPrimary }}>Endereço de cobrança</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <input placeholder="CEP" className="w-full h-12 px-4 rounded-2xl border outline-none" value={form.cep} onChange={e => update('cep', e.target.value)} style={{ background: isLight ? '#fff' : inputBg, borderColor: borderColor, color: textPrimary }} />
                                                <input placeholder="UF" maxLength={2} className="w-full h-12 px-4 rounded-2xl border outline-none" value={form.state} onChange={e => update('state', e.target.value.toUpperCase())} style={{ background: isLight ? '#fff' : inputBg, borderColor: borderColor, color: textPrimary }} />
                                            </div>
                                            <input placeholder="Cidade" className="w-full h-12 px-4 rounded-2xl border outline-none" value={form.city} onChange={e => update('city', e.target.value)} style={{ background: isLight ? '#fff' : inputBg, borderColor: borderColor, color: textPrimary }} />
                                            <div className="grid grid-cols-3 gap-4">
                                                <input placeholder="Rua / Logradouro" className="w-full h-12 px-4 rounded-2xl border outline-none col-span-2" value={form.street} onChange={e => update('street', e.target.value)} style={{ background: isLight ? '#fff' : inputBg, borderColor: borderColor, color: textPrimary }} />
                                                <input placeholder="Nº" className="w-full h-12 px-4 rounded-2xl border outline-none col-span-1" value={form.number} onChange={e => update('number', e.target.value)} style={{ background: isLight ? '#fff' : inputBg, borderColor: borderColor, color: textPrimary }} />
                                            </div>
                                            <input placeholder="Bairro" className="w-full h-12 px-4 rounded-2xl border outline-none" value={form.neighborhood} onChange={e => update('neighborhood', e.target.value)} style={{ background: isLight ? '#fff' : inputBg, borderColor: borderColor, color: textPrimary }} />
                                        </div>
                                    </div>
                                </section>
                            )}
                        </form>
                    </div>
                </div>

                {/* ===== ORDER BUMPS ===== */}
                {orderBumps.length > 0 && (
                    <div className="mt-4 space-y-3">
                        {orderBumps.map((bump: any) => {
                            const isSelected = selectedBumps.has(bump.id);
                            const bumpProduct = bump.bump_product;
                            const bumpPlan = bump.bump_plan; // plano fixo definido pelo vendedor
                            const planOptions: any[] = bumpProduct?.plans || [];
                            const needsPlanChoice = !bumpPlan && planOptions.length > 1;
                            const chosenPlan = selectedBumpPlans[bump.id];
                            const displayPrice = getBumpPrice(bump).toFixed(2);

                            return (
                                <div
                                    key={bump.id}
                                    className="rounded-3xl border overflow-hidden transition-all"
                                    style={{
                                        borderColor: isSelected ? accent : (isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)'),
                                        background: isSelected
                                            ? (isLight ? `${accent}08` : `${accent}12`)
                                            : (isLight ? '#fff' : 'rgba(255,255,255,0.04)'),
                                        boxShadow: isSelected ? `0 0 0 2px ${accent}40` : 'none',
                                    }}
                                >
                                    {/* Badge topo */}
                                    <div className="px-5 py-2 flex items-center gap-2" style={{ background: bump.badge_color || '#E17055' }}>
                                        <FiTag size={12} color="#fff" />
                                        <span className="text-xs font-black text-white uppercase tracking-widest">
                                            {bump.badge_text || 'OFERTA EXCLUSIVA'}
                                        </span>
                                    </div>

                                    <div className="p-5">
                                        {/* Info do produto */}
                                        <div className="flex gap-4 mb-4">
                                            {bumpProduct?.image_url && (
                                                <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 border" style={{ borderColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)' }}>
                                                    <img src={bumpProduct.image_url} alt={bumpProduct.name} className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-black mb-1" style={{ color: textPrimary }}>{bump.title}</div>
                                                <div className="text-xs font-semibold opacity-70 mb-1" style={{ color: textSecondary }}>
                                                    {bumpProduct?.name}
                                                    {bumpPlan && <span style={{ color: accent }}> — {bumpPlan.name}</span>}
                                                    {!bumpPlan && chosenPlan && <span style={{ color: accent }}> — {chosenPlan.name}</span>}
                                                </div>
                                                {bump.description && (
                                                    <div className="text-xs leading-relaxed opacity-70" style={{ color: textSecondary }}>{bump.description}</div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Seletor de plano clicável */}
                                        {needsPlanChoice && (
                                            <div className="mb-4">
                                                <div className="text-xs font-black uppercase tracking-wider opacity-60 mb-2" style={{ color: textSecondary }}>
                                                    Escolha o plano
                                                </div>
                                                <div className="grid gap-2">
                                                    {planOptions.map((pl: any) => {
                                                        const planActive = chosenPlan?.id === pl.id;
                                                        return (
                                                            <button
                                                                key={pl.id}
                                                                type="button"
                                                                onClick={() => selectBumpPlan(bump.id, pl)}
                                                                className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border text-sm transition-all"
                                                                style={{
                                                                    borderColor: planActive ? accent : (isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'),
                                                                    background: planActive ? `${accent}12` : (isLight ? '#f9fafb' : 'rgba(255,255,255,0.03)'),
                                                                    color: textPrimary,
                                                                    boxShadow: planActive ? `0 0 0 2px ${accent}40` : 'none',
                                                                }}
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                                                                        style={{ borderColor: planActive ? accent : (isLight ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)') }}>
                                                                        {planActive && <div className="w-2 h-2 rounded-full" style={{ background: accent }} />}
                                                                    </div>
                                                                    <span className="font-semibold">{pl.name}</span>
                                                                </div>
                                                                <span className="font-black" style={{ color: planActive ? accent : textPrimary }}>
                                                                    R$ {pl.price_display || (pl.price / 100).toFixed(2)}
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Preço + CTA */}
                                        <div className="flex items-center justify-between gap-4 flex-wrap">
                                            <div>
                                                <div className="text-xs opacity-60 mb-0.5" style={{ color: textSecondary }}>
                                                    Adicionar por apenas
                                                </div>
                                                <div className="text-2xl font-black" style={{ color: accent }}>
                                                    R$ {displayPrice}
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (needsPlanChoice && !chosenPlan && !isSelected) {
                                                        selectBumpPlan(bump.id, planOptions[0]);
                                                    } else {
                                                        toggleBump(bump.id);
                                                    }
                                                }}
                                                className="flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-sm transition-all"
                                                style={{
                                                    background: isSelected ? accent : 'transparent',
                                                    color: isSelected ? '#fff' : accent,
                                                    border: `2px solid ${accent}`,
                                                    minWidth: 180,
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                {isSelected ? (
                                                    <><FiCheck size={16} /> Adicionado!</>
                                                ) : (
                                                    <><FiPlusCircle size={16} /><span className="truncate">{bump.call_to_action || 'Sim! Quero esta oferta'}</span></>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="mt-6">
                    <OrderSummary
                        product={product}
                        selectedPlan={selectedPlan}
                        processing={processing}
                        paymentMethod={enableCreditCard ? paymentMethod : 'pix'}
                        installments={Number(form.installments) || 1}
                        isLight={isLight}
                        borderColor={borderColor}
                        textPrimary={textPrimary}
                        textSecondary={textSecondary}
                        textMuted={textMuted}
                        accent={accent}
                        grandTotalCents={grandTotalCents}
                        selectedBumpsCount={selectedBumps.size}
                    />
                </div>

                {settings.show_video && (
                    <div className="mt-8">
                        <VideoPlayer settings={settings} borderColor={borderColor} />
                    </div>
                )}
            </main>

            <style jsx global>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
                input::placeholder { color: #9ca3af; font-weight: 500; }
                select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 1rem center; background-size: 1.25rem; }
                details > summary::-webkit-details-marker { display: none; }
            `}</style>
        </div>
    );
}
