'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { FiLock, FiRepeat } from 'react-icons/fi';

export default function SubscribePage() {
    const { planId } = useParams() as { planId: string };
    const router = useRouter();
    const [plan, setPlan] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
    const [countdown, setCountdown] = useState(5);

    const [customer, setCustomer] = useState({ name: '', email: '', cpf: '', phone: '' });
    const [card, setCard] = useState({ number: '', holder_name: '', exp_month: '', exp_year: '', cvv: '' });
    const [address, setAddress] = useState({ zip_code: '', street: '', number: '', city: '', state: '' });

    useEffect(() => {
        api.get(`/subscriptions/plans/${planId}`)
            .then(r => setPlan(r.data.plan))
            .catch(() => toast.error('Plano não encontrado'))
            .finally(() => setLoading(false));
    }, [planId]);

    useEffect(() => {
        if (!success) return;
        if (countdown <= 0) { router.push('/area-membros'); return; }
        const t = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [success, countdown, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await api.post('/subscriptions/subscribe', {
                plan_id: planId,
                customer,
                card: {
                    ...card,
                    exp_month: parseInt(card.exp_month),
                    exp_year: parseInt(card.exp_year)
                },
                address
            });
            const data = res.data;
            setSubscriptionId(data.subscription?.id || null);

            // Login automático
            if (data.auth?.token) {
                localStorage.setItem('token', data.auth.token);
                localStorage.setItem('user', JSON.stringify(data.auth.user));
            }

            setSuccess(true);
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao processar assinatura');
        } finally {
            setSubmitting(false);
        }
    };

    const fmtBRL = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
    const fmtInterval = (interval: string) => ({ week: 'semana', month: 'mês', year: 'ano' }[interval] || interval);

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0c' }}>
            <div style={{ width: 36, height: 36, border: '3px solid #222', borderTopColor: '#00cec9', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    if (!plan) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0c', color: 'white' }}>
            <p>Plano não encontrado.</p>
        </div>
    );

    if (success) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0c', color: 'white', flexDirection: 'column', gap: 16, padding: 24 }}>
            <div style={{ fontSize: 48 }}>✅</div>
            <h2 style={{ fontSize: 24, fontWeight: 800 }}>Assinatura ativada!</h2>
            <p style={{ color: '#94a3b8', textAlign: 'center' }}>Você assinou o plano <strong>{plan.name}</strong>. A cobrança foi realizada no seu cartão.</p>
            <p style={{ color: '#64748b', fontSize: 14 }}>Redirecionando para sua área de membros em <strong style={{ color: '#00cec9' }}>{countdown}s</strong>...</p>
            <button onClick={() => router.push('/area-membros')} style={{
                marginTop: 8, padding: '12px 24px', borderRadius: 12, border: 'none',
                background: '#00cec9', color: '#0a0a0c', fontWeight: 700, cursor: 'pointer'
            }}>
                Ir para Área de Membros agora
            </button>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a0c', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
            <div style={{ width: '100%', maxWidth: 460, background: '#141417', borderRadius: 24, border: '1px solid rgba(255,255,255,0.06)', padding: 36 }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52, borderRadius: 16, background: 'rgba(0,206,201,0.12)', marginBottom: 14 }}>
                        <FiRepeat size={24} color="#00cec9" />
                    </div>
                    <h1 style={{ fontSize: 22, fontWeight: 800, color: 'white', marginBottom: 6 }}>{plan.name}</h1>
                    {plan.description && <p style={{ fontSize: 14, color: '#94a3b8' }}>{plan.description}</p>}
                    <div style={{ marginTop: 12, fontSize: 28, fontWeight: 900, color: '#00cec9' }}>
                        {fmtBRL(plan.amount)}
                        <span style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}> / {fmtInterval(plan.interval)}</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: 0.5, marginBottom: 12 }}>SEUS DADOS</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                        <input className="input-field" placeholder="Nome completo" required
                            value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} />
                        <input className="input-field" type="email" placeholder="E-mail" required
                            value={customer.email} onChange={e => setCustomer({ ...customer, email: e.target.value })} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <input className="input-field" placeholder="CPF" required
                                value={customer.cpf} onChange={e => setCustomer({ ...customer, cpf: e.target.value })} />
                            <input className="input-field" placeholder="Telefone" 
                                value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} />
                        </div>
                    </div>

                    <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: 0.5, marginBottom: 12 }}>ENDEREÇO DE COBRANÇA</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <input className="input-field" placeholder="CEP" maxLength={9} required
                                value={address.zip_code} onChange={e => setAddress({ ...address, zip_code: e.target.value.replace(/\D/g, '') })} />
                            <input className="input-field" placeholder="Número" required
                                value={address.number} onChange={e => setAddress({ ...address, number: e.target.value })} />
                        </div>
                        <input className="input-field" placeholder="Rua / Logradouro" required
                            value={address.street} onChange={e => setAddress({ ...address, street: e.target.value })} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <input className="input-field" placeholder="Cidade" required
                                value={address.city} onChange={e => setAddress({ ...address, city: e.target.value })} />
                            <input className="input-field" placeholder="Estado (UF)" maxLength={2} required
                                value={address.state} onChange={e => setAddress({ ...address, state: e.target.value.toUpperCase() })} />
                        </div>
                    </div>

                    <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: 0.5, marginBottom: 12 }}>CARTÃO DE CRÉDITO</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                        <input className="input-field" placeholder="Número do cartão" maxLength={19} required
                            value={card.number} onChange={e => setCard({ ...card, number: e.target.value })} />
                        <input className="input-field" placeholder="Nome no cartão" required
                            value={card.holder_name} onChange={e => setCard({ ...card, holder_name: e.target.value })} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                            <input className="input-field" placeholder="Mês (MM)" maxLength={2} required
                                value={card.exp_month} onChange={e => setCard({ ...card, exp_month: e.target.value })} />
                            <input className="input-field" placeholder="Ano (AAAA)" maxLength={4} required
                                value={card.exp_year} onChange={e => setCard({ ...card, exp_year: e.target.value })} />
                            <input className="input-field" placeholder="CVV" maxLength={4} required
                                value={card.cvv} onChange={e => setCard({ ...card, cvv: e.target.value })} />
                        </div>
                    </div>

                    <button type="submit" disabled={submitting} style={{
                        width: '100%', padding: 16, borderRadius: 14, border: 'none',
                        background: submitting ? '#1e1e24' : 'white', color: '#0a0a0c',
                        fontWeight: 800, fontSize: 15, cursor: submitting ? 'not-allowed' : 'pointer'
                    }}>
                        {submitting ? 'Processando...' : `Assinar por ${fmtBRL(plan.amount)}/${fmtInterval(plan.interval)}`}
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14, color: '#64748b', fontSize: 12 }}>
                        <FiLock size={12} /> Pagamento seguro via Pagar.me
                    </div>
                </form>
            </div>
        </div>
    );
}
