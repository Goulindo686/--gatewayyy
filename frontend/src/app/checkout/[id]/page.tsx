'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Script from 'next/script';
import { productsAPI, checkoutAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { FiShoppingCart, FiCreditCard, FiSmartphone, FiCheck, FiCopy, FiPackage, FiArrowRight, FiClock } from 'react-icons/fi';
import FacebookPixel from '@/components/FacebookPixel';

const DEFAULT_SETTINGS = {
    theme: 'dark',
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
};

export default function CheckoutPage() {
    const params = useParams();
    const router = useRouter();
    const enableCreditCard = process.env.NEXT_PUBLIC_ENABLE_CREDIT_CARD ? (process.env.NEXT_PUBLIC_ENABLE_CREDIT_CARD === 'true') : true;
    const [product, setProduct] = useState<any>(null);
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
    const accent = settings.accent_color || '#6C5CE7';
    const countdownColor = settings.countdown_color || accent;
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
                <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bgPrimary, padding: 24 }}>
                <div style={{ width: '100%', maxWidth: 500, padding: 48, textAlign: 'center', background: bgCard, borderRadius: 20, border: `1px solid ${borderColor}` }}>
                    <div style={{
                        width: 80, height: 80, borderRadius: '50%', margin: '0 auto 24px',
                        background: 'rgba(0,206,201,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        animation: 'scaleIn 0.5s ease'
                    }}>
                        <FiCheck size={40} style={{ color: '#00CEC9' }} />
                    </div>
                    <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, color: textPrimary }}>
                        Pagamento <span style={{ color: accent }}>Confirmado!</span>
                    </h2>
                    <p style={{ color: textSecondary, marginBottom: 8, fontSize: 15 }}>Seu pagamento foi processado com sucesso.</p>
                    <p style={{ color: textMuted, marginBottom: 24, fontSize: 13 }}>Seu acesso ao produto já está disponível no Painel do Aluno.</p>
                    <div style={{ background: isLight ? '#f0f0f5' : 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 16, marginBottom: 24 }}>
                        <div style={{ fontSize: 14, color: textSecondary, marginBottom: 4 }}>Valor pago</div>
                        <div style={{ fontSize: 32, fontWeight: 700, color: accent }}>R$ {result.order.amount_display}</div>
                    </div>
                    <button onClick={() => router.push('/area-membros')} style={{
                        width: '100%', padding: '16px', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        background: accent, color: 'white', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 700
                    }}>
                        Acessar Painel do Aluno <FiArrowRight size={18} />
                    </button>
                    <p style={{ color: textMuted, fontSize: 12, marginTop: 12 }}>Redirecionando automaticamente em {countdown}s...</p>
                </div>
                <style jsx>{`@keyframes scaleIn { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
            </div>
        );
    }

    // PIX QR Code screen
    if (result && result.pix) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bgPrimary, padding: 24 }}>
                <div style={{ width: '100%', maxWidth: 480, padding: 40, textAlign: 'center', background: bgCard, borderRadius: 20, border: `1px solid ${borderColor}` }}>
                    <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: textPrimary }}>Pague via Pix</h2>
                    <p style={{ color: textSecondary, fontSize: 14, marginBottom: 24 }}>Escaneie o QR Code ou copie o código abaixo</p>
                    {result.pix?.qr_code_url && (
                        <div style={{ background: 'white', borderRadius: 16, padding: 16, display: 'inline-block', marginBottom: 20 }}>
                            <img src={result.pix.qr_code_url} alt="QR Code Pix" style={{ width: 220, height: 220 }} />
                        </div>
                    )}
                    <div style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 14, color: textSecondary, marginBottom: 8 }}>Valor</div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: accent }}>R$ {result.order.amount_display}</div>
                    </div>
                    {result.pix?.qr_code && (
                        <div>
                            <div style={{
                                background: isLight ? '#f0f0f5' : 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '12px 16px',
                                fontSize: 12, color: textMuted, wordBreak: 'break-all', maxHeight: 80, overflow: 'auto', marginBottom: 12
                            }}>
                                {result.pix.qr_code}
                            </div>
                            <button onClick={copyPixCode} style={{
                                display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px',
                                background: accent, color: 'white', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13
                            }}>
                                <FiCopy size={14} /> Copiar Pix Copia e Cola
                            </button>
                        </div>
                    )}
                    <div style={{
                        marginTop: 24, padding: 16, borderRadius: 12,
                        background: `${accent}11`, border: `1px solid ${accent}33`
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, color: accent }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: accent, animation: 'pulse 1.5s ease infinite' }} />
                            Aguardando confirmação do pagamento...
                        </div>
                    </div>
                </div>
                <style jsx>{`@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.8); } }`}</style>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: bgPrimary, color: textPrimary }}>
            <FacebookPixel pixelId={product?.facebook_pixel_id} product={product} />

            {/* Countdown Timer */}
            {hasCountdown && (
                <div style={{
                    background: countdownColor, color: 'white', padding: '10px 16px',
                    textAlign: 'center', fontSize: 14, fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    position: 'sticky', top: 0, zIndex: 50
                }}>
                    <FiClock size={14} />
                    {settings.countdown_text}
                    <span style={{
                        fontFamily: 'monospace', fontWeight: 800, fontSize: 16,
                        background: 'rgba(0,0,0,0.2)', padding: '3px 10px', borderRadius: 6
                    }}>
                        {formatTimer(timerSeconds)}
                    </span>
                </div>
            )}

            {/* Banner */}
            {(settings.banner_url || settings.banner_text) && (
                <div className="checkoutBanner" style={{
                    height: settings.banner_url ? bannerHeightDesktop : 'auto', position: 'relative',
                    background: settings.banner_url ? `url(${settings.banner_url}) ${bannerPos}/${bannerModeDesktop} no-repeat` : `linear-gradient(135deg, ${accent}44, ${accent}11)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    {settings.banner_url && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }} />}
                    {settings.banner_text && (
                        <div style={{
                            position: 'relative', zIndex: 1, padding: '20px 24px', fontSize: 22, fontWeight: 800,
                            color: 'white', textShadow: settings.banner_url ? '0 2px 12px rgba(0,0,0,0.5)' : 'none',
                            textAlign: 'center'
                        }}>
                            {settings.banner_text}
                        </div>
                    )}
                </div>
            )}

            {/* Notice */}
            {settings.notice_text && (
                <div style={{
                    maxWidth: 1000, margin: '16px auto 0', padding: '0 24px'
                }}>
                    <div style={{
                        padding: '14px 20px', borderRadius: 12, fontSize: 14, fontWeight: 600,
                        background: noticeColors[settings.notice_type]?.bg,
                        border: `1px solid ${noticeColors[settings.notice_type]?.border}`,
                        color: isLight ? (settings.notice_type === 'warning' ? '#b8860b' : settings.notice_type === 'info' ? '#2171b5' : '#0e8c5e') : noticeColors[settings.notice_type]?.text,
                        textAlign: 'center'
                    }}>
                        {settings.notice_text}
                    </div>
                </div>
            )}

            {/* Header removido: logo será exibida abaixo do botão de pagar */}

            <div
                style={{ maxWidth: 1000, margin: `${hasCountdown ? '32px' : '0'} auto`, padding: '0 24px 40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start' }}
                className="checkoutLayout"
            >
                {/* Product Info */}
                <div style={{ padding: 0, overflow: 'hidden', background: bgCard, borderRadius: 16, border: `1px solid ${borderColor}` }}>
                    <div className="productMobileHeader" style={{ display: 'none', alignItems: 'center', gap: 12, padding: 12, borderBottom: `1px solid ${borderColor}` }}>
                        {!settings.hide_product_image && (
                            <div style={{ width: 60, height: 60, borderRadius: 10, overflow: 'hidden', background: `linear-gradient(135deg, ${accent}22, ${accent}0a)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {product.image_url ? (
                                    <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <FiShoppingCart size={28} style={{ opacity: 0.3, color: textMuted }} />
                                )}
                            </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                            <div style={{ fontSize: 16, fontWeight: 700, color: textPrimary }}>{product.name}</div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: accent }}>R$ {product.price_display}</div>
                        </div>
                    </div>
                    {!settings.hide_product_image && (
                        <div className="checkoutProductImage" style={{
                            height: 220, background: `linear-gradient(135deg, ${accent}22, ${accent}0a)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            {product.image_url ? (
                                <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <FiShoppingCart size={48} style={{ opacity: 0.3, color: textMuted }} />
                            )}
                        </div>
                    )}
                    <div style={{ padding: 28 }} className="checkoutCardBody">
                        <h1 style={{ fontSize: 24, fontWeight: 700, marginTop: 8, marginBottom: 12, color: textPrimary }}>{product.name}</h1>
                        <div style={{ fontSize: 32, fontWeight: 800, color: accent }}>R$ {product.price_display}</div>
                    </div>
                </div>

                {/* Payment Form */}
                <div style={{ padding: 28, background: bgCard, borderRadius: 16, border: `1px solid ${borderColor}` }} className="checkoutCardBody">
                    <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, color: textPrimary }}>Finalizar Compra</h2>
                    <form onSubmit={handlePay}>
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ fontSize: 13, fontWeight: 500, color: textSecondary, marginBottom: 6, display: 'block' }}>Nome completo</label>
                            <input placeholder="Seu nome" required value={form.name} onChange={e => update('name', e.target.value)}
                                style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: `1px solid ${borderColor}`, background: inputBg, color: textPrimary, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }} className="checkoutGrid2">
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 500, color: textSecondary, marginBottom: 6, display: 'block' }}>Email</label>
                                <input type="email" placeholder="seu@email.com" required value={form.email} onChange={e => update('email', e.target.value)}
                                    style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: `1px solid ${borderColor}`, background: inputBg, color: textPrimary, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 500, color: textSecondary, marginBottom: 6, display: 'block' }}>CPF</label>
                                <input placeholder="000.000.000-00" required value={form.cpf} onChange={e => update('cpf', e.target.value)}
                                    style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: `1px solid ${borderColor}`, background: inputBg, color: textPrimary, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                        </div>
                        {!settings.hide_phone && (
                            <div style={{ marginBottom: 20 }}>
                                <label style={{ fontSize: 13, fontWeight: 500, color: textSecondary, marginBottom: 6, display: 'block' }}>Telefone</label>
                                <input placeholder="(11) 99999-9999" required value={form.phone} onChange={e => update('phone', e.target.value)}
                                    style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: `1px solid ${borderColor}`, background: inputBg, color: textPrimary, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                        )}

                        {(paymentMethod === 'credit_card' || !settings.hide_address_pix) && (
                        <div style={{ marginBottom: 16 }}>
                            <h3 style={{ fontSize: 14, fontWeight: 700, color: textSecondary, marginBottom: 10 }}>Endereço de cobrança</h3>
                            <div className="checkoutGrid2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ fontSize: 13, fontWeight: 500, color: textSecondary, marginBottom: 6, display: 'block' }}>CEP</label>
                                    <input placeholder="00000-000" value={form.cep} onChange={e => update('cep', e.target.value)}
                                        required={enableCreditCard && paymentMethod === 'credit_card'}
                                        style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: `1px solid ${borderColor}`, background: inputBg, color: textPrimary, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 13, fontWeight: 500, color: textSecondary, marginBottom: 6, display: 'block' }}>Cidade</label>
                                    <input placeholder="Cidade" value={form.city} onChange={e => update('city', e.target.value)}
                                        required={enableCreditCard && paymentMethod === 'credit_card'}
                                        style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: `1px solid ${borderColor}`, background: inputBg, color: textPrimary, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                            </div>
                            <div className="checkoutGrid2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                                <div>
                                    <label style={{ fontSize: 13, fontWeight: 500, color: textSecondary, marginBottom: 6, display: 'block' }}>Estado</label>
                                    <input placeholder="UF" maxLength={2} value={form.state} onChange={e => update('state', e.target.value.toUpperCase())}
                                        required={enableCreditCard && paymentMethod === 'credit_card'}
                                        style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: `1px solid ${borderColor}`, background: inputBg, color: textPrimary, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 13, fontWeight: 500, color: textSecondary, marginBottom: 6, display: 'block' }}>Bairro</label>
                                    <input placeholder="Bairro" value={form.neighborhood} onChange={e => update('neighborhood', e.target.value)}
                                        required={enableCreditCard && paymentMethod === 'credit_card'}
                                        style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: `1px solid ${borderColor}`, background: inputBg, color: textPrimary, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                            </div>
                            <div className="checkoutGrid2" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginTop: 12 }}>
                                <div>
                                    <label style={{ fontSize: 13, fontWeight: 500, color: textSecondary, marginBottom: 6, display: 'block' }}>Rua</label>
                                    <input placeholder="Rua" value={form.street} onChange={e => update('street', e.target.value)}
                                        required={enableCreditCard && paymentMethod === 'credit_card'}
                                        style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: `1px solid ${borderColor}`, background: inputBg, color: textPrimary, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 13, fontWeight: 500, color: textSecondary, marginBottom: 6, display: 'block' }}>Número</label>
                                    <input placeholder="Nº" value={form.number} onChange={e => update('number', e.target.value)}
                                        required={enableCreditCard && paymentMethod === 'credit_card'}
                                        style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: `1px solid ${borderColor}`, background: inputBg, color: textPrimary, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                            </div>
                        </div>
                        )}

                        {/* Payment method */}
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ fontSize: 13, fontWeight: 500, color: textSecondary, marginBottom: 10, display: 'block' }}>Forma de pagamento</label>
                            <div style={{ display: 'grid', gridTemplateColumns: enableCreditCard ? '1fr 1fr' : '1fr', gap: 10 }}>
                                <button type="button" onClick={() => setPaymentMethod('pix')}
                                    style={{
                                        padding: '14px', borderRadius: 12, cursor: 'pointer', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, fontWeight: 500,
                                        transition: 'all 0.2s ease', fontFamily: 'inherit',
                                        background: paymentMethod === 'pix' ? `${accent}1a` : (isLight ? '#f5f5f5' : 'var(--bg-secondary)'),
                                        border: `1px solid ${paymentMethod === 'pix' ? accent : borderColor}`,
                                        color: paymentMethod === 'pix' ? accent : textSecondary
                                    }}>
                                    <FiSmartphone size={18} /> Pix
                                </button>
                                {enableCreditCard && (
                                    <button type="button" onClick={() => setPaymentMethod('credit_card')}
                                        style={{
                                            padding: '14px', borderRadius: 12, cursor: 'pointer', display: 'flex',
                                            alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, fontWeight: 500,
                                            transition: 'all 0.2s ease', fontFamily: 'inherit',
                                            background: paymentMethod === 'credit_card' ? `${accent}1a` : (isLight ? '#f5f5f5' : 'var(--bg-secondary)'),
                                            border: `1px solid ${paymentMethod === 'credit_card' ? accent : borderColor}`,
                                            color: paymentMethod === 'credit_card' ? accent : textSecondary
                                        }}>
                                        <FiCreditCard size={18} /> Cartão de Crédito
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Credit Card Fields */}
                        {enableCreditCard && paymentMethod === 'credit_card' && (
                            <div style={{ marginBottom: 20 }}>
                                <div style={{ marginBottom: 12 }}>
                                    <label style={{ fontSize: 13, fontWeight: 500, color: textSecondary, marginBottom: 6, display: 'block' }}>Número do cartão</label>
                                    <input placeholder="0000 0000 0000 0000" required value={form.card_number} onChange={e => update('card_number', e.target.value)}
                                        style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: `1px solid ${borderColor}`, background: inputBg, color: textPrimary, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                                <div style={{ marginBottom: 12 }}>
                                    <label style={{ fontSize: 13, fontWeight: 500, color: textSecondary, marginBottom: 6, display: 'block' }}>Nome no cartão</label>
                                    <input placeholder="Nome como está no cartão" required value={form.card_holder} onChange={e => update('card_holder', e.target.value)}
                                        style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: `1px solid ${borderColor}`, background: inputBg, color: textPrimary, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }} className="checkoutGrid3">
                                    <div>
                                        <label style={{ fontSize: 13, fontWeight: 500, color: textSecondary, marginBottom: 6, display: 'block' }}>Mês</label>
                                        <input placeholder="MM" maxLength={2} required value={form.card_exp_month} onChange={e => update('card_exp_month', e.target.value)}
                                            style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: `1px solid ${borderColor}`, background: inputBg, color: textPrimary, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 13, fontWeight: 500, color: textSecondary, marginBottom: 6, display: 'block' }}>Ano</label>
                                        <input placeholder="AA" maxLength={2} required value={form.card_exp_year} onChange={e => update('card_exp_year', e.target.value)}
                                            style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: `1px solid ${borderColor}`, background: inputBg, color: textPrimary, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 13, fontWeight: 500, color: textSecondary, marginBottom: 6, display: 'block' }}>CVV</label>
                                        <input placeholder="000" maxLength={4} required value={form.card_cvv} onChange={e => update('card_cvv', e.target.value)}
                                            style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: `1px solid ${borderColor}`, background: inputBg, color: textPrimary, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 13, fontWeight: 500, color: textSecondary, marginBottom: 6, display: 'block' }}>Parcelas</label>
                                        <input type="number" min={1} max={12} required value={String(form.installments)} onChange={e => {
                                            const v = parseInt(e.target.value) || 1;
                                            const clamped = Math.max(1, Math.min(12, v));
                                            update('installments', String(clamped));
                                        }}
                                            style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: `1px solid ${borderColor}`, background: inputBg, color: textPrimary, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                                    </div>
                                </div>
                            </div>
                        )}

                        <button type="submit" disabled={processing}
                            style={{
                                width: '100%', padding: '16px', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                background: accent, color: 'white', borderRadius: 12, border: 'none', cursor: processing ? 'not-allowed' : 'pointer',
                                fontWeight: 700, opacity: processing ? 0.7 : 1, transition: 'all 0.2s'
                            }}>
                            {processing ? 'Processando...' : (
                                <>
                                    {paymentMethod === 'pix' ? <FiSmartphone size={18} /> : <FiCreditCard size={18} />}
                                    Pagar R$ {product.price_display}
                                </>
                            )}
                        </button>
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                <img src="/logo.png" alt="GouPay Logo" style={{ width: 40, height: 40, objectFit: 'contain' }} />
                                <span style={{ fontSize: 14, fontWeight: 700, color: textSecondary }}>GouPay</span>
                            </div>
                        </div>
                        <p style={{ textAlign: 'center', fontSize: 11, color: textMuted, marginTop: 10 }}>
                            🔒 Pagamento seguro processado via Pagar.me
                        </p>
                    </form>
                </div>
            </div>

            <style jsx>{`
                input:focus { border-color: ${accent} !important; box-shadow: 0 0 0 3px ${accent}22 !important; }
                @media (max-width: 920px) {
                    .checkoutLayout {
                        grid-template-columns: 1fr !important;
                        gap: 18px !important;
                    }
                }
                @media (max-width: 640px) {
                    .checkoutLayout {
                        padding: 0 14px 28px !important;
                    }
                    .checkoutProductImage {
                        display: none !important;
                    }
                    .productMobileHeader {
                        display: flex !important;
                    }
                    .checkoutBanner {
                        height: ${bannerHeightMobile}px !important;
                        background-size: ${bannerModeMobile} !important;
                        background-position: ${bannerPos} !important;
                        background-repeat: no-repeat !important;
                    }
                    .checkoutCardBody {
                        padding: 18px !important;
                    }
                    .checkoutGrid2 {
                        grid-template-columns: 1fr !important;
                        gap: 10px !important;
                    }
                    .checkoutGrid3 {
                        grid-template-columns: 1fr 1fr !important;
                        gap: 10px !important;
                    }
                }
            `}</style>
        </div>
    );
}
