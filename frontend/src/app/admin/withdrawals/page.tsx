'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FiCheckCircle, FiClock, FiDollarSign, FiRefreshCw, FiSend, FiXCircle } from 'react-icons/fi';

type WithdrawalStatus = 'pending' | 'processing' | 'completed' | 'failed' | string;

type AdminWithdrawal = {
    id: string;
    user_id: string;
    amount: number;
    amount_display?: string;
    pix_key?: string | null;
    pix_key_type?: string | null;
    status: WithdrawalStatus;
    pagarme_transfer_id?: string | null;
    failure_reason?: string | null;
    created_at: string;
    updated_at?: string;
    seller?: {
        id: string;
        name?: string | null;
        email?: string | null;
        pix_key?: string | null;
        pix_key_type?: string | null;
    } | null;
};

const statusConfig: Record<string, { color: string; label: string; icon: ReactNode }> = {
    pending: { color: 'var(--warning)', label: 'Em analise', icon: <FiClock size={14} /> },
    processing: { color: 'var(--info)', label: 'Enviado ao Pagar.me', icon: <FiSend size={14} /> },
    completed: { color: 'var(--success)', label: 'Sacado', icon: <FiCheckCircle size={14} /> },
    failed: { color: 'var(--danger)', label: 'Falhou', icon: <FiXCircle size={14} /> },
};

function formatAmount(withdrawal: AdminWithdrawal) {
    const value = withdrawal.amount_display || (withdrawal.amount / 100).toFixed(2);
    return Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AdminWithdrawalsPage() {
    const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([]);
    const [loading, setLoading] = useState(true);
    const [approvingId, setApprovingId] = useState<string | null>(null);

    const loadWithdrawals = async () => {
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const { data } = await axios.get('/api/admin/withdrawals', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setWithdrawals(data.withdrawals || []);
        } catch (err) {
            console.error(err);
            toast.error('Erro ao carregar saques');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadWithdrawals();
    }, []);

    const approveWithdrawal = async (withdrawal: AdminWithdrawal) => {
        const confirmed = window.confirm(`Aprovar o saque de R$ ${formatAmount(withdrawal)} para ${withdrawal.seller?.name || withdrawal.seller?.email || 'este vendedor'}?`);
        if (!confirmed) return;

        setApprovingId(withdrawal.id);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            await axios.post(`/api/admin/withdrawals/${withdrawal.id}/approve`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            toast.success('Saque aprovado e enviado ao Pagar.me');
            await loadWithdrawals();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { error?: string } } };
            toast.error(error.response?.data?.error || 'Erro ao aprovar saque');
            await loadWithdrawals();
        } finally {
            setApprovingId(null);
        }
    };

    const totals = withdrawals.reduce((acc, withdrawal) => {
        acc.count += 1;
        acc.amount += withdrawal.amount || 0;
        if (withdrawal.status === 'pending') acc.pending += withdrawal.amount || 0;
        if (withdrawal.status === 'processing') acc.processing += withdrawal.amount || 0;
        return acc;
    }, { count: 0, amount: 0, pending: 0, processing: 0 });

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                <div style={{ width: 36, height: 36, border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Saques</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                        Aprove solicitacoes de saque. O status final muda para sacado apenas quando o Pagar.me confirmar pelo webhook.
                    </p>
                </div>
                <button className="btn-secondary" onClick={loadWithdrawals} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <FiRefreshCw size={15} /> Atualizar
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
                {[
                    { label: 'Solicitacoes', value: totals.count.toString(), color: '#6c5ce7', icon: <FiDollarSign size={20} /> },
                    { label: 'Pendente', value: `R$ ${(totals.pending / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: '#fdcb6e', icon: <FiClock size={20} /> },
                    { label: 'No Pagar.me', value: `R$ ${(totals.processing / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: '#74b9ff', icon: <FiSend size={20} /> },
                ].map((card, index) => (
                    <div key={index} className="stat-card">
                        <div style={{ width: 40, height: 40, borderRadius: 10, marginBottom: 16, background: `${card.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.color }}>
                            {card.icon}
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{card.value}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{card.label}</div>
                    </div>
                ))}
            </div>

            <div className="glass-card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Solicitacoes de Saque</h3>
                {withdrawals.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Vendedor</th>
                                    <th>Valor</th>
                                    <th>Pix</th>
                                    <th>Status</th>
                                    <th>Data</th>
                                    <th>Acao</th>
                                </tr>
                            </thead>
                            <tbody>
                                {withdrawals.map(withdrawal => {
                                    const st = statusConfig[withdrawal.status] || statusConfig.pending;
                                    const sellerLabel = withdrawal.seller?.name || withdrawal.seller?.email || withdrawal.user_id;
                                    return (
                                        <tr key={withdrawal.id}>
                                            <td>
                                                <div style={{ fontWeight: 650 }}>{sellerLabel}</div>
                                                {withdrawal.seller?.email && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{withdrawal.seller.email}</div>}
                                            </td>
                                            <td style={{ fontWeight: 700 }}>R$ {formatAmount(withdrawal)}</td>
                                            <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{withdrawal.pix_key || withdrawal.seller?.pix_key || '-'}</td>
                                            <td>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: st.color, fontSize: 13, fontWeight: 600 }}>
                                                    {st.icon} {st.label}
                                                </span>
                                                {withdrawal.failure_reason && <div style={{ color: 'var(--danger)', fontSize: 11, marginTop: 4 }}>{withdrawal.failure_reason}</div>}
                                            </td>
                                            <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                                                {new Date(withdrawal.created_at).toLocaleString('pt-BR')}
                                            </td>
                                            <td>
                                                {withdrawal.status === 'pending' ? (
                                                    <button
                                                        className="btn-primary"
                                                        onClick={() => approveWithdrawal(withdrawal)}
                                                        disabled={approvingId === withdrawal.id}
                                                        style={{ padding: '9px 13px', display: 'inline-flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}
                                                    >
                                                        <FiCheckCircle size={14} />
                                                        {approvingId === withdrawal.id ? 'Enviando...' : 'Aprovar'}
                                                    </button>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                                                        {withdrawal.pagarme_transfer_id ? withdrawal.pagarme_transfer_id : '-'}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '44px 0', color: 'var(--text-muted)' }}>
                        <FiDollarSign size={34} style={{ marginBottom: 12, opacity: 0.45 }} />
                        <p>Nenhuma solicitacao de saque encontrada</p>
                    </div>
                )}
            </div>
        </div>
    );
}
