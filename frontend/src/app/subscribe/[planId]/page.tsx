'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { FiLock, FiCreditCard, FiCheck, FiPackage, FiClock, FiChevronDown, FiArrowRight } from 'react-icons/fi';
import FacebookPixel from '@/components/FacebookPixel';

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
};

export default function SubscribePage() {
    const { planId } = useParams() as { planId: string };
    const router = useRouter();
    const [plan, setPlan] = useState<any>(null);
    const [settings, setSettings] = useState<any>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [success, setSuccess] = useState(false);
    const [countdown, setCountdown] = useState(5);
    const [timerSeconds, setTimerSeconds] = useState(0);
    const timerRef = useRef<any>(null);
    const countdownRef = useRef<any>(null);

    const [form, setForm] = useState({
        name: '', email: '', cpf: '', phone: '',
        card_number: '', card_holder: '', card_exp_month: '', card_exp_year: '', card_cvv: '',
        cep: '', street: '', number: '', neighborhood: '', city: '', state: '',
    });

    const update = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

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
    const isValidPhone = (v: string) => { const d = (v || '').replace(/\D/g, ''); return d.length >= 10 && d.length <= 11; };

    useEffect(() => {
        api.get(`/subscriptions/plans/${planId}`)
            .then(r => {
                setPlan(r.data.plan);
                const s = { ...DEFAULT_SETTINGS, ...(r.data.plan?.checkout_settings || {}) };
                setSettings(s);
                if (s.show_countdown && s.countdown_minutes > 0) {
                    const total = s.countdown_minutes * 60;
                    setTimerSeconds(total);
                    timerRef.current = setInterval(() => {
                        setTimerSeconds(prev => {
                            if (prev <= 1) { clearInterval(timerRef.current); return 0; }
                            return prev - 1;
                        });
                    }, 1000);
                }
            })
            .catch(() => toast.error('Plano não encontrado'))
            .finally(() => setLoading(false));
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, [planId]);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValidCPF(form.cpf)) { toast.error('CPF inválido'); return; }
        if (!settings.hide_phone && !isValidPhone(form.phone)) { toast.error('WhatsApp inválido'); return; }
        if (!isValidCEP(form.cep)) { toast.error('CEP inválido'); return; }
        if (!isValidUF(form.state)) { toast.error('UF inválida'); return; }
        if (!form.street || !form.number || !form.city) { toast.error('Endereço incompleto'); return; }
        setProcessing(true);
        try {
            const res = await api.post('/subscriptions/subscribe', {
                plan_id: planId,
                customer: {
                    name: form.name,
                    email: form.email,
                    cpf: form.cpf,
                    ...(settings.hide_phone ? {} : { phone: form.phone }),
                },
                card: {
                    number: form.card_number.replace(/\s/g, ''),
                    holder_name: form.card_holder,
                    exp_month: parseInt(form.card_exp_month),
                    exp_year: parseInt(form.card_exp_year),
                    cvv: form.card_cvv,
                },
                address: {
                    zip_code: form.cep.replace(/\D/g, ''),
                    street: form.street,
                    number: form.number,
                    neighborhood: form.neighborhood,
                    city: form.city,
                    state: form.state,
                    country: 'BR',
                },
            });
            toast.success('Assinatura ativada! 🎉');
            setSuccess(true);
            if (res.data.auth) autoLoginAndRedirect(res.data.auth);
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao processar assinatura');
        } finally {
            setProcessing(false);
        }
    };

    const fmtBRL = (cents: number) => (cents / 100).toFixed(2);
    const fmtInterval = (interval: string) => ({ week: 'semana', month: 'mês', year: 'ano' }[interval] || interval);
    const formatTimer = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

    // Theme variables — idêntico ao checkout PIX
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
    const bannerHeightDesktop = settings.banner_height_desktop || 300;
    const bannerHeightMobile = settings.banner_height_mobile || 200;

    const noticeColors: any = {
        warning: { bg: 'rgba(253,203,110,0.12)', border: 'rgba(253,203,110,0.3)', text: '#FDCB6E' },
        info: { bg: 'rgba(116,185,255,0.12)', border: 'rgba(116,185,255,0.3)', text: '#74B9FF' },
        success: { bg: 'rgba(85,239,196,0.12)', border: 'rgba(85,239,196,0.3)', text: '#55EFC4' },
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bgPrimary }}>
                <div style={{ width: 40, height: 40, border: `3px solid ${borderColor}`, borderTopColor: accent, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!plan) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bgPrimary, padding: 24 }}>
                <div style={{ padding: 48, textAlign: 'center', maxWidth: 400, background: bgCard, borderRadius: 16, border: `1px solid ${borderColor}` }}>
                    <FiPackage size={48} style={{ opacity: 0.3, color: textPrimary, marginBottom: 16 }} />
                    <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: textPrimary }}>Plano não encontrado</h2>
                    <p style={{ color: textSecondary, fontSize: 14 }}>Este plano não existe ou foi desativado.</p>
                </div>
            </div>
        );
    }

    // Tela de sucesso — idêntica ao checkout PIX
    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6" style={{ background: bgPrimary }}>
                <div className="w-full max-w-lg p-12 text-center rounded-3xl shadow-2xl border" style={{ background: bgCard, borderColor }}>
                    <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center animate-bounce" style={{ background: `${accent}22` }}>
                        <FiCheck size={40} style={{ color: accent }} />
                    </div>
                    <h2 className="text-3xl font-extrabold mb-2" style={{ color: textPrimary }}>
                        Assinatura <span style={{ color: accent }}>Ativada!</span>
                    </h2>
                    <p className="text-lg mb-8 opacity-80" style={{ color: textSecondary }}>Seu acesso já está disponível.</p>
                    <div className="p-6 rounded-2xl mb-8" style={{ background: isLight ? '#f9fafb' : 'rgba(255,255,255,0.03)' }}>
                        <div className="text-sm opacity-60 mb-1" style={{ color: textSecondary }}>Plano</div>
                        <div className="text-2xl font-black" style={{ color: accent }}>
                            R$ {fmtBRL(plan.amount)}<span className="text-base font-medium opacity-70"> / {fmtInterval(plan.interval)}</span>
                        </div>
                    </div>
                    <button onClick={() => router.push('/area-membros')} className="w-full py-4 px-6 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98]" style={{ background: accent }}>
                        Começar Agora <FiArrowRight size={20} />
                    </button>
                    <p className="mt-4 text-xs opacity-50" style={{ color: textMuted }}>Redirecionando em {countdown}s...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen" style={{ background: isLight ? '#f3f4f6' : bgPrimary, color: textPrimary }}>
            <FacebookPixel pixelId={plan?.facebook_pixel_id} product={plan} />

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

                {/* Card principal — mesmo estilo do checkout PIX */}
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

                    {/* Info do produto */}
                    <div className="px-5 pb-5">
                        <div className="rounded-2xl border p-4" style={{ background: isLight ? '#fff' : inputBg, borderColor }}>
                            <div className="flex gap-4">
                                {!settings.hide_product_image && (
                                    <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border" style={{ borderColor, background: isLight ? '#f3f4f6' : 'rgba(255,255,255,0.06)' }}>
                                        {plan.product_image ? (
                                            <img src={plan.product_image} alt={plan.product_name || plan.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center opacity-20" style={{ color: textPrimary }}>
                                                <FiPackage size={22} />
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="text-sm font-black truncate" style={{ color: textPrimary }}>{plan.product_name || plan.name}</div>
                                            <div className="text-xs opacity-70 mt-0.5" style={{ color: textSecondary }}>Assinatura recorrente</div>
                                        </div>
                                        <div className="text-sm font-black whitespace-nowrap" style={{ color: textPrimary }}>
                                            R$ {fmtBRL(plan.amount)}<span className="text-xs font-medium opacity-60">/{fmtInterval(plan.interval)}</span>
                                        </div>
                                    </div>
                                    {(plan.product_description || plan.description) && (
                                        <details className="mt-2">
                                            <summary className="text-xs font-semibold cursor-pointer opacity-70" style={{ color: textSecondary }}>Ver mais</summary>
                                            <div className="text-xs leading-relaxed opacity-70 mt-2" style={{ color: textSecondary }}>
                                                {plan.product_description || plan.description}
                                            </div>
                                        </details>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Formulário */}
                    <div className="px-5 pb-6">
                        <form id="subscribe-form" onSubmit={handleSubmit} className="space-y-8">
                            {/* Dados pessoais */}
                            <section>
                                <h3 className="text-base font-black mb-4" style={{ color: textPrimary }}>Seus dados</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-black uppercase tracking-wider mb-2 block opacity-60" style={{ color: textSecondary }}>Nome completo *</label>
                                        <input placeholder="Ex: Ana Cristina da Silva" required value={form.name} onChange={e => update('name', e.target.value)}
                                            className="w-full h-14 px-5 rounded-2xl border outline-none transition-colors font-medium"
                                            style={{ background: isLight ? '#fff' : inputBg, borderColor, color: textPrimary }} />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-black uppercase tracking-wider mb-2 block opacity-60" style={{ color: textSecondary }}>E-mail *</label>
                                            <input type="email" placeholder="seu@email.com" required value={form.email} onChange={e => update('email', e.target.value)}
                                                className="w-full h-14 px-5 rounded-2xl border outline-none transition-colors font-medium"
                                                style={{ background: isLight ? '#fff' : inputBg, borderColor, color: textPrimary }} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-black uppercase tracking-wider mb-2 block opacity-60" style={{ color: textSecondary }}>CPF *</label>
                                            <input placeholder="000.000.000-00" required value={form.cpf} onChange={e => update('cpf', e.target.value)}
                                                className="w-full h-14 px-5 rounded-2xl border outline-none transition-colors font-medium"
                                                style={{ background: isLight ? '#fff' : inputBg, borderColor, color: textPrimary }} />
                                        </div>
                                    </div>
                                    {!settings.hide_phone && (
                                        <div>
                                            <label className="text-xs font-black uppercase tracking-wider mb-2 block opacity-60" style={{ color: textSecondary }}>WhatsApp *</label>
                                            <div className="flex gap-3">
                                                <div className="h-14 px-4 rounded-2xl border flex items-center gap-2 shrink-0" style={{ background: isLight ? '#fff' : inputBg, borderColor }}>
                                                    <img src="https://flagcdn.com/w20/br.png" alt="BR" className="w-5 h-3.5 object-cover rounded-sm" />
                                                    <span className="text-sm font-extrabold" style={{ color: textPrimary }}>+55</span>
                                                </div>
                                                <input placeholder="(11) 99999-9999" required value={form.phone} onChange={e => update('phone', e.target.value)}
                                                    className="w-full h-14 px-5 rounded-2xl border outline-none transition-colors font-medium"
                                                    style={{ background: isLight ? '#fff' : inputBg, borderColor, color: textPrimary }} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Método de pagamento — apenas cartão (assinatura) */}
                            <section>
                                <h3 className="text-base font-black mb-4" style={{ color: textPrimary }}>Pagamento</h3>
                                <div className="rounded-2xl border p-4 flex flex-col items-center justify-center text-center min-h-[96px]"
                                    style={{ borderColor: accent, background: isLight ? '#f3f4f6' : `${accent}1A` }}>
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2" style={{ background: accent, color: 'white' }}>
                                        <FiCreditCard size={20} />
                                    </div>
                                    <div className="text-sm font-black" style={{ color: textPrimary }}>Cartão de crédito</div>
                                    <div className="text-xs opacity-60 mt-1" style={{ color: textSecondary }}>Cobrança recorrente</div>
                                </div>
                            </section>

                            {/* Dados do cartão */}
                            <section className="pt-2">
                                <h3 className="text-base font-black mb-4" style={{ color: textPrimary }}>Dados do cartão</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-black uppercase tracking-wider mb-2 block opacity-60" style={{ color: textSecondary }}>Número do cartão *</label>
                                        <input placeholder="0000 0000 0000 0000" required value={form.card_number} onChange={e => update('card_number', e.target.value)}
                                            className="w-full h-14 px-5 rounded-2xl border outline-none transition-colors font-medium"
                                            style={{ background: isLight ? '#fff' : inputBg, borderColor, color: textPrimary }} />
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="col-span-2">
                                            <label className="text-xs font-black uppercase tracking-wider mb-2 block opacity-60" style={{ color: textSecondary }}>Validade *</label>
                                            <div className="flex items-center gap-2">
                                                <input placeholder="MM" maxLength={2} className="w-full h-14 px-3 text-center rounded-2xl border outline-none" value={form.card_exp_month} onChange={e => update('card_exp_month', e.target.value)} style={{ background: isLight ? '#fff' : inputBg, borderColor, color: textPrimary }} />
                                                <span className="opacity-30">/</span>
                                                <input placeholder="AA" maxLength={2} className="w-full h-14 px-3 text-center rounded-2xl border outline-none" value={form.card_exp_year} onChange={e => update('card_exp_year', e.target.value)} style={{ background: isLight ? '#fff' : inputBg, borderColor, color: textPrimary }} />
                                            </div>
                                        </div>
                                        <div className="col-span-1">
                                            <label className="text-xs font-black uppercase tracking-wider mb-2 block opacity-60" style={{ color: textSecondary }}>CVV *</label>
                                            <input placeholder="000" maxLength={4} className="w-full h-14 px-5 rounded-2xl border outline-none" value={form.card_cvv} onChange={e => update('card_cvv', e.target.value)} style={{ background: isLight ? '#fff' : inputBg, borderColor, color: textPrimary }} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-black uppercase tracking-wider mb-2 block opacity-60" style={{ color: textSecondary }}>Nome do titular *</label>
                                        <input placeholder="Insira o nome impresso no cartão" required value={form.card_holder} onChange={e => update('card_holder', e.target.value)}
                                            className="w-full h-14 px-5 rounded-2xl border outline-none transition-colors font-medium"
                                            style={{ background: isLight ? '#fff' : inputBg, borderColor, color: textPrimary }} />
                                    </div>
                                </div>
                            </section>

                            {/* Endereço de cobrança */}
                            <section className="pt-2">
                                <h4 className="font-black opacity-80 mb-4" style={{ color: textPrimary }}>Endereço de cobrança</h4>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <input placeholder="CEP" className="w-full h-12 px-4 rounded-2xl border outline-none" value={form.cep} onChange={e => update('cep', e.target.value)} style={{ background: isLight ? '#fff' : inputBg, borderColor, color: textPrimary }} />
                                        <input placeholder="UF" maxLength={2} className="w-full h-12 px-4 rounded-2xl border outline-none" value={form.state} onChange={e => update('state', e.target.value.toUpperCase())} style={{ background: isLight ? '#fff' : inputBg, borderColor, color: textPrimary }} />
                                    </div>
                                    <input placeholder="Cidade" className="w-full h-12 px-4 rounded-2xl border outline-none" value={form.city} onChange={e => update('city', e.target.value)} style={{ background: isLight ? '#fff' : inputBg, borderColor, color: textPrimary }} />
                                    <div className="grid grid-cols-3 gap-4">
                                        <input placeholder="Rua / Logradouro" className="w-full h-12 px-4 rounded-2xl border outline-none col-span-2" value={form.street} onChange={e => update('street', e.target.value)} style={{ background: isLight ? '#fff' : inputBg, borderColor, color: textPrimary }} />
                                        <input placeholder="Nº" className="w-full h-12 px-4 rounded-2xl border outline-none col-span-1" value={form.number} onChange={e => update('number', e.target.value)} style={{ background: isLight ? '#fff' : inputBg, borderColor, color: textPrimary }} />
                                    </div>
                                    <input placeholder="Bairro" className="w-full h-12 px-4 rounded-2xl border outline-none" value={form.neighborhood} onChange={e => update('neighborhood', e.target.value)} style={{ background: isLight ? '#fff' : inputBg, borderColor, color: textPrimary }} />
                                </div>
                            </section>
                        </form>
                    </div>
                </div>

                {/* Resumo + botão de compra — mesmo componente visual do checkout PIX */}
                <div className="mt-6">
                    <div className="rounded-3xl border shadow-sm overflow-hidden" style={{ background: isLight ? '#fff' : 'rgba(255,255,255,0.04)', borderColor }}>
                        <div className="p-6">
                            <div className="text-lg font-black mb-4" style={{ color: textPrimary }}>Resumo</div>
                            <div className="space-y-3">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="text-sm font-semibold leading-snug" style={{ color: textPrimary }}>{plan.product_name || plan.name}</div>
                                    <div className="text-sm font-semibold whitespace-nowrap" style={{ color: textPrimary }}>R$ {fmtBRL(plan.amount)}</div>
                                </div>
                                <div className="pt-3 border-t" style={{ borderColor }}>
                                    <div className="flex items-center justify-between text-sm mb-2" style={{ color: textPrimary }}>
                                        <span className="opacity-70" style={{ color: textSecondary }}>Recorrência</span>
                                        <span className="font-bold">a cada {fmtInterval(plan.interval)}</span>
                                    </div>
                                    <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor }}>
                                        <span className="text-base font-black" style={{ color: textPrimary }}>Total</span>
                                        <span className="text-xl font-black tracking-tight" style={{ color: textPrimary }}>R$ {fmtBRL(plan.amount)}</span>
                                    </div>
                                </div>
                            </div>

                            <button form="subscribe-form" type="submit" disabled={processing}
                                className="mt-6 w-full h-14 rounded-2xl text-white font-black text-base shadow-sm transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ background: accent }}>
                                {processing ? 'Processando...' : 'Assinar agora'}
                            </button>

                            <div className="mt-5 flex items-center justify-center gap-2 opacity-60" style={{ color: textSecondary }}>
                                <FiLock size={14} />
                                <span className="text-xs font-black uppercase tracking-wider">Ambiente seguro</span>
                            </div>
                            <div className="mt-4 text-[11px] leading-relaxed opacity-70 text-center" style={{ color: textMuted }}>
                                Ao clicar em &quot;Assinar agora&quot;, você confirma que revisou o valor e os dados informados.
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <style jsx global>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
                input::placeholder { color: #9ca3af; font-weight: 500; }
                details > summary::-webkit-details-marker { display: none; }
            `}</style>
        </div>
    );
}
