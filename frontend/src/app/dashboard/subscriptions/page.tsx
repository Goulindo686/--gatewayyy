'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { FiUsers, FiRepeat, FiTrash2 } from 'react-icons/fi';

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
        const map: Record<string, string> = { week: 'semana', month: 'mês', year: 'ano' };
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
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Planos criados via aba Produtos e seus assinantes</p>
                </div>
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
        </div>
    );
}
