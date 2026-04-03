'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { FiPlus, FiX, FiUsers, FiRepeat, FiTrash2 } from 'react-icons/fi';

const INTERVALS = [
    { value: 'weekly', label: 'Semanal' },
    { value: 'monthly', label: 'Mensal' },
    { value: 'yearly', label: 'Anual' },
];

const statusLabel: Record<string, { label: string; color: string }> = {
    active:   { label: 'Ativa',       color: '#00cec9' },
    pending:  { label: 'Pendente',    color: '#f39c12' },
    past_due: { label: 'Em atraso',   color: '#e17055' },
    canceled: { label: 'Cancelada',   color: '#636e72' },
};

export default function SubscriptionsPage() {
    const [plans, setPlans] = useState<any[]>([]);
    const [subscriptions, setSubscriptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ name: '', description: '', amount: '', interval: 'monthly', interval_count: '1' });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [plansRes, subsRes] = await Promise.all([
                api.get('/subscriptions/plans'),
                api.get('/subscriptions')
            ]);
            setPlans(plansRes.data.plans || []);
            setSubscriptions(subsRes.data.subscriptions || []);
        } catch { toast.error('Erro ao carregar dados'); }
        finally { setLoading(false); }
    };

    const handleCreatePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/subscriptions/plans', {
                ...form,
                amount: parseFloat(form.amount.replace(',', '.')),
                interval_count: parseInt(form.interval_count)
            });
            toast.success('Plano criado!');
            setShowModal(false);
            setForm({ name: '', description: '', amount: '', interval: 'monthly', interval_count: '1' });
            loadData();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao criar plano');
        } finally { setSaving(false); }
    };

    const handleDeletePlan = async (id: string) => {
        if (!confirm('Desativar este plano? Assinaturas existentes não serão afetadas.')) return;
        try {
            await api.delete(`/subscriptions/plans/${id}`);
            toast.success('Plano desativado');
            loadData();
        } catch { toast.error('Erro ao desativar plano'); }
    };

    const handleCancelSub = async (id: string) => {
        if (!confirm('Cancelar esta assinatura? O cliente perderá o acesso no próximo ciclo.')) return;
        try {
            await api.post(`/subscriptions/${id}/cancel`);
            toast.success('Assinatura cancelada');
            loadData();
        } catch { toast.error('Erro ao cancelar assinatura'); }
    };

    const fmtBRL = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
    const fmtInterval = (interval: string, count: number) => {
        const map: Record<string, string> = { weekly: 'semana', monthly: 'mês', yearly: 'ano' };
        return count > 1 ? `a cada ${count} ${map[interval] || interval}s` : `por ${map[interval] || interval}`;
    };

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
            <div style={{ width: 36, height: 36, border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Assinaturas</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Crie planos recorrentes e gerencie assinantes</p>
                </div>
                <button className="btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FiPlus size={16} /> Novo Plano
                </button>
            </div>

            {/* Planos */}
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, color: 'var(--text-secondary)' }}>Meus Planos</h2>
            {plans.filter(p => p.status === 'active').length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '40px 24px', marginBottom: 32 }}>
                    <FiRepeat size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
                    <p style={{ color: 'var(--text-muted)' }}>Nenhum plano criado ainda</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginBottom: 32 }}>
                    {plans.filter(p => p.status === 'active').map(plan => (
                        <div key={plan.id} className="glass-card" style={{ padding: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                <div style={{ fontWeight: 700, fontSize: 15 }}>{plan.name}</div>
                                <button onClick={() => handleDeletePlan(plan.id)} className="btn-danger" style={{ padding: '4px 10px', fontSize: 12 }}>
                                    <FiTrash2 size={13} />
                                </button>
                            </div>
                            {plan.description && <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>{plan.description}</p>}
                            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-primary)' }}>{fmtBRL(plan.amount)}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{fmtInterval(plan.interval, plan.interval_count)}</div>
                            <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                                Link: <span style={{ color: 'var(--accent-primary)' }}>/subscribe/{plan.id}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Assinantes */}
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, color: 'var(--text-secondary)' }}>
                Assinantes <span style={{ fontWeight: 400, fontSize: 13 }}>({subscriptions.length})</span>
            </h2>
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                {subscriptions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--text-muted)' }}>
                        <FiUsers size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
                        <p>Nenhum assinante ainda</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr><th>Cliente</th><th>Plano</th><th>Valor</th><th>Status</th><th>Próx. cobrança</th><th>Ações</th></tr>
                            </thead>
                            <tbody>
                                {subscriptions.map(sub => {
                                    const st = statusLabel[sub.status] || { label: sub.status, color: '#636e72' };
                                    return (
                                        <tr key={sub.id}>
                                            <td>
                                                <div style={{ fontWeight: 500 }}>{sub.customer_name}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sub.customer_email}</div>
                                            </td>
                                            <td style={{ fontSize: 13 }}>{sub.subscription_plans?.name || '—'}</td>
                                            <td style={{ fontWeight: 600 }}>{fmtBRL(sub.amount)}</td>
                                            <td>
                                                <span style={{ background: `${st.color}22`, color: st.color, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                                                    {st.label}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                                {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString('pt-BR') : '—'}
                                            </td>
                                            <td>
                                                {sub.status !== 'canceled' && (
                                                    <button onClick={() => handleCancelSub(sub.id)} className="btn-danger" style={{ padding: '5px 12px', fontSize: 12 }}>
                                                        Cancelar
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal criar plano */}
            {showModal && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: 460, padding: 36 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                            <h3 style={{ fontSize: 18, fontWeight: 700 }}>Novo Plano de Assinatura</h3>
                            <button type="button" onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <FiX size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreatePlan}>
                            <div style={{ marginBottom: 14 }}>
                                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Nome do plano</label>
                                <input className="input-field" placeholder="Ex: Plano Mensal Premium" required
                                    value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div style={{ marginBottom: 14 }}>
                                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Descrição (opcional)</label>
                                <input className="input-field" placeholder="O que está incluso neste plano"
                                    value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Valor (R$)</label>
                                    <input type="number" step="0.01" min="1" className="input-field" placeholder="29.90" required
                                        value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Intervalo</label>
                                    <select className="input-field" value={form.interval} onChange={e => setForm({ ...form, interval: e.target.value })}>
                                        {INTERVALS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
                                ⚠️ Assinaturas funcionam apenas com cartão de crédito. O cliente será cobrado automaticamente a cada ciclo.
                            </p>
                            <button type="submit" className="btn-primary" disabled={saving} style={{ width: '100%' }}>
                                {saving ? 'Criando plano no Pagar.me...' : 'Criar Plano'}
                            </button>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
