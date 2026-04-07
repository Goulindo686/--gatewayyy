'use client';

import { useEffect, useState } from 'react';
import { dashboardAPI } from '@/lib/api';
import { FiShoppingCart, FiRefreshCw, FiSearch } from 'react-icons/fi';

export default function SalesPage() {
    const [sales, setSales] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [methodFilter, setMethodFilter] = useState('');
    const [rangePreset, setRangePreset] = useState('last7');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [summary, setSummary] = useState<{ count: number; total_amount_display: string } | null>(null);

    useEffect(() => {
        loadSales();
    }, []);

    const loadSales = async (filters?: any) => {
        setLoading(true);
        try {
            const { data } = await dashboardAPI.getSales(filters || {});
            setSales(data?.sales || []);
            setSummary(data?.summary ? { count: data.summary.count, total_amount_display: data.summary.total_amount_display } : null);
        } catch {
            setSales([]);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            const params: any = {
                search: search || undefined,
                status: statusFilter || undefined,
                method: methodFilter || undefined
            };
            const now = new Date();
            const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
            const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

            if (rangePreset !== 'custom') {
                if (rangePreset === 'today') {
                    params.start = startOfDay(now).toISOString();
                    params.end = endOfDay(now).toISOString();
                } else if (rangePreset === 'yesterday') {
                    const y = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                    params.start = startOfDay(y).toISOString();
                    params.end = endOfDay(y).toISOString();
                } else if (rangePreset === 'last7') {
                    const s = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    params.start = startOfDay(s).toISOString();
                    params.end = endOfDay(now).toISOString();
                } else if (rangePreset === 'thisMonth') {
                    const s = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
                    const e = endOfDay(now);
                    params.start = s.toISOString();
                    params.end = e.toISOString();
                } else if (rangePreset === 'lastMonth') {
                    const s = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
                    const e = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
                    params.start = s.toISOString();
                    params.end = e.toISOString();
                }
            } else {
                if (startDate) params.start = new Date(startDate + 'T00:00:00').toISOString();
                if (endDate) params.end = new Date(endDate + 'T23:59:59').toISOString();
            }

            await loadSales(params);
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
                <div style={{ flex: '1 1 250px' }}>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Pesquisar (Nome, E-mail, CPF, Produto)</label>
                    <div style={{ position: 'relative' }}>
                        <input 
                            className="input-field" 
                            style={{ paddingLeft: 40 }}
                            placeholder="Buscar venda..." 
                            value={search} 
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleRefresh()}
                        />
                        <FiSearch style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} size={16} />
                    </div>
                </div>
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
                <div style={{ minWidth: 200 }}>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Período</label>
                    <select className="input-field" value={rangePreset} onChange={(e) => setRangePreset(e.target.value)}>
                        <option value="today">Hoje</option>
                        <option value="yesterday">Ontem</option>
                        <option value="last7">Últimos 7 dias</option>
                        <option value="thisMonth">Este mês</option>
                        <option value="lastMonth">Mês passado</option>
                        <option value="custom">Personalizado</option>
                    </select>
                </div>
                {rangePreset === 'custom' && (
                    <>
                        <div style={{ minWidth: 170 }}>
                            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Início</label>
                            <input type="date" className="input-field" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                        </div>
                        <div style={{ minWidth: 170 }}>
                            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Fim</label>
                            <input type="date" className="input-field" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                        </div>
                    </>
                )}
                <button className="btn-primary" onClick={handleRefresh} disabled={refreshing} style={{ padding: '12px 20px', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <FiRefreshCw size={16} />
                    {refreshing ? 'Atualizando...' : 'Aplicar Filtros'}
                </button>
            </div>

            <div className="glass-card" style={{ padding: 24 }}>
                {summary && (
                    <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            Vendas no período: <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{summary.count}</span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            Total: <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>R$ {summary.total_amount_display}</span>
                        </div>
                    </div>
                )}
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
