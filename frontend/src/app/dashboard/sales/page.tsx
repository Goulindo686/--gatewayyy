'use client';

import { useEffect, useState } from 'react';
import { dashboardAPI } from '@/lib/api';
import { FiShoppingCart, FiRefreshCw } from 'react-icons/fi';

export default function SalesPage() {
    const [sales, setSales] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [statusFilter, setStatusFilter] = useState('');
    const [methodFilter, setMethodFilter] = useState('');

    useEffect(() => {
        loadSales();
    }, []);

    const loadSales = async (filters?: any) => {
        setLoading(true);
        try {
            const { data } = await dashboardAPI.getSales(filters || {});
            setSales(data?.sales || []);
        } catch {
            setSales([]);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await loadSales({
                status: statusFilter || undefined,
                method: methodFilter || undefined
            });
        } finally {
            setRefreshing(false);
        }
    };

    const formatDate = (iso: string) => {
        try {
            return new Date(iso).toLocaleString('pt-BR');
        } catch {
            return iso;
        }
    };

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
            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 28, display: 'flex', alignItems: 'center', gap: 10 }}>
                <FiShoppingCart size={24} /> Vendas
            </h1>

            <div className="glass-card" style={{ padding: 20, marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 160 }}>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Status</label>
                    <select className="input-field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="">Todos</option>
                        <option value="paid">Pago</option>
                        <option value="pending">Pendente</option>
                        <option value="failed">Falhou</option>
                        <option value="refunded">Estornado</option>
                        <option value="cancelled">Cancelado</option>
                    </select>
                </div>
                <div style={{ minWidth: 160 }}>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Método</label>
                    <select className="input-field" value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
                        <option value="">Todos</option>
                        <option value="pix">Pix</option>
                        <option value="credit_card">Cartão</option>
                    </select>
                </div>
                <button className="btn-primary" onClick={handleRefresh} disabled={refreshing} style={{ padding: '12px 20px', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <FiRefreshCw size={16} />
                    {refreshing ? 'Atualizando...' : 'Aplicar Filtros'}
                </button>
            </div>

            <div className="glass-card" style={{ padding: 24 }}>
                {sales.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Produto</th>
                                    <th>Cliente</th>
                                    <th>E-mail</th>
                                    <th>CPF</th>
                                    <th>Telefone</th>
                                    <th>Valor</th>
                                    <th>Método</th>
                                    <th>Status</th>
                                    <th>Data</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sales.map((o) => (
                                    <tr key={o.id}>
                                        <td style={{ fontWeight: 600 }}>{o.product_name}</td>
                                        <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{o.buyer_name || '—'}</td>
                                        <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{o.buyer_email || '—'}</td>
                                        <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{o.buyer_cpf || '—'}</td>
                                        <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{o.buyer_phone || '—'}</td>
                                        <td style={{ fontWeight: 600 }}>R$ {o.amount_display}</td>
                                        <td style={{ textTransform: 'uppercase', fontSize: 12, color: 'var(--text-muted)' }}>{o.payment_method}</td>
                                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{o.status}</td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{formatDate(o.created_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                        <FiShoppingCart size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
                        <p>Nenhuma venda encontrada</p>
                    </div>
                )}
            </div>
        </div>
    );
}
