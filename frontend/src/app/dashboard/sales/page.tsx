'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FiShoppingCart, FiRefreshCw, FiSearch, FiCheckCircle, FiClock, FiX } from 'react-icons/fi';

type SalesFilters = {
    status?: string;
    method?: string;
    start?: string;
    end?: string;
    search?: string;
};

type Sale = {
    id: string;
    buyer_name?: string | null;
    buyer_email?: string | null;
    buyer_cpf?: string | null;
    buyer_phone?: string | null;
    product_name?: string | null;
    products?: { name?: string | null } | null;
    pagarme_order_id?: string | null;
    pagarme_charge_id?: string | null;
    status?: string | null;
    payment_method?: string | null;
    amount_display?: string | null;
    created_at: string;
    delivered?: boolean | null;
    delivered_at?: string | null;
};

export default function SalesPage() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [statusFilter, setStatusFilter] = useState('');
    const [methodFilter, setMethodFilter] = useState('');
    const [rangePreset, setRangePreset] = useState('last7');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [summary, setSummary] = useState<{ count: number; total_amount_display: string } | null>(null);
    const [search, setSearch] = useState('');
    const [delivering, setDelivering] = useState<string | null>(null);
    const appliedFilters = useRef<SalesFilters>({});
    const firstSearchEffect = useRef(true);
    const requestId = useRef(0);

    const loadSales = useCallback(async (filters: SalesFilters = {}, options: { background?: boolean } = {}) => {
        const currentRequestId = ++requestId.current;
        if (!options.background) setLoading(true);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const params = new URLSearchParams();
            if (filters?.status) params.set('status', filters.status);
            if (filters?.method) params.set('method', filters.method);
            if (filters?.start) params.set('start', filters.start);
            if (filters?.end) params.set('end', filters.end);
            if (filters?.search?.trim()) params.set('search', filters.search.trim());

            const { data } = await axios.get(`/api/sales?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (currentRequestId !== requestId.current) return;
            const result = data.data || data;
            setSales(result?.sales || []);
            setSummary(result?.summary || null);
        } catch {
            if (currentRequestId !== requestId.current) return;
            setSales([]);
        } finally {
            if (currentRequestId === requestId.current) setLoading(false);
        }
    }, []);

    useEffect(() => { loadSales(); }, [loadSales]);

    // Search the complete history on the server. The small delay avoids a
    // request for every keystroke while keeping the field feeling instant.
    useEffect(() => {
        if (firstSearchEffect.current) {
            firstSearchEffect.current = false;
            return;
        }

        const timer = window.setTimeout(() => {
            void loadSales(
                { ...appliedFilters.current, search: search.trim() || undefined },
                { background: true },
            );
        }, 350);

        return () => window.clearTimeout(timer);
    }, [loadSales, search]);

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            const params: SalesFilters = {
                status: statusFilter || undefined,
                method: methodFilter || undefined
            };
            const now = new Date();
            const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
            const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

            if (rangePreset !== 'custom') {
                if (rangePreset === 'today') { params.start = startOfDay(now).toISOString(); params.end = endOfDay(now).toISOString(); }
                else if (rangePreset === 'yesterday') { const y = new Date(now.getTime() - 86400000); params.start = startOfDay(y).toISOString(); params.end = endOfDay(y).toISOString(); }
                else if (rangePreset === 'last7') { const s = new Date(now.getTime() - 7 * 86400000); params.start = startOfDay(s).toISOString(); params.end = endOfDay(now).toISOString(); }
                else if (rangePreset === 'thisMonth') { params.start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString(); params.end = endOfDay(now).toISOString(); }
                else if (rangePreset === 'lastMonth') { params.start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(); params.end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString(); }
            } else {
                if (startDate) params.start = new Date(startDate + 'T00:00:00').toISOString();
                if (endDate) params.end = new Date(endDate + 'T23:59:59').toISOString();
            }
            appliedFilters.current = params;
            await loadSales({ ...params, search: search.trim() || undefined });
        } finally {
            setRefreshing(false);
        }
    };

    const formatPhone = (phone?: string | null) => {
        const digits = String(phone || '').replace(/\D/g, '');
        if (!digits) return '—';
        if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
        if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
        return phone || digits;
    };

    const normalizeSearchText = (value: unknown) => String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

    // Keep a local pass so formatted CPF/phone values and accented names also
    // match immediately while the server request is being completed.
    const filtered = useMemo(() => {
        if (!search.trim()) return sales;
        const searchLower = normalizeSearchText(search);
        const searchDigits = search.replace(/\D/g, '');
        return sales.filter(o => {
            const searchableText = [
                o.buyer_name,
                o.buyer_email,
                o.buyer_cpf,
                o.buyer_phone,
                o.product_name,
                o.products?.name,
                o.pagarme_order_id,
                o.pagarme_charge_id,
                o.status,
                o.payment_method,
            ].map(normalizeSearchText);
            const cpf = (o.buyer_cpf || '').replace(/\D/g, '');
            const phone = (o.buyer_phone || '').replace(/\D/g, '');
            return (
                searchableText.some(value => value.includes(searchLower)) ||
                (searchDigits && cpf.includes(searchDigits)) ||
                (searchDigits && phone.includes(searchDigits))
            );
        });
    }, [sales, search]);

    const toggleDelivered = async (order: Sale) => {
        setDelivering(order.id);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const newValue = !order.delivered;
            await axios.patch(`/api/orders/${order.id}/deliver`, { delivered: newValue }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSales(prev => prev.map(o =>
                o.id === order.id
                    ? { ...o, delivered: newValue, delivered_at: newValue ? new Date().toISOString() : null }
                    : o
            ));
            toast.success(newValue ? 'Venda marcada como entregue!' : 'Marcação removida');
        } catch (err: unknown) {
            const message = axios.isAxiosError(err) ? err.response?.data?.error : undefined;
            toast.error(message || 'Erro ao atualizar venda');
        } finally {
            setDelivering(null);
        }
    };

    const formatDate = (iso: string | null | undefined) => {
        if (!iso) return '—';
        try { return new Date(iso).toLocaleString('pt-BR'); } catch { return iso; }
    };

    const statusLabel: Record<string, { label: string; color: string }> = {
        paid: { label: 'Pago', color: 'var(--success)' },
        pending: { label: 'Pendente', color: 'var(--warning)' },
        failed: { label: 'Falhou', color: 'var(--danger)' },
        refunded: { label: 'Estornado', color: 'var(--text-muted)' },
        cancelled: { label: 'Cancelado', color: 'var(--text-muted)' },
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

            {/* Filtros */}
            <div className="glass-card" style={{ padding: 20, marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 160 }}>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Status</label>
                    <select className="input-field" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
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
                    <select className="input-field" value={methodFilter} onChange={e => setMethodFilter(e.target.value)}>
                        <option value="">Todos</option>
                        <option value="pix">Pix</option>
                        <option value="credit_card">Cartão</option>
                    </select>
                </div>
                <div style={{ minWidth: 200 }}>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Período</label>
                    <select className="input-field" value={rangePreset} onChange={e => setRangePreset(e.target.value)}>
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
                            <input type="date" className="input-field" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </div>
                        <div style={{ minWidth: 170 }}>
                            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Fim</label>
                            <input type="date" className="input-field" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                    </>
                )}
                <button className="btn-primary" onClick={handleRefresh} disabled={refreshing} style={{ padding: '12px 20px', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <FiRefreshCw size={16} />
                    {refreshing ? 'Atualizando...' : 'Aplicar Filtros'}
                </button>
            </div>

            {/* Barra de busca */}
            <div className="glass-card" style={{ padding: '14px 20px', marginBottom: 16 }}>
                <div style={{ position: 'relative' }}>
                    <FiSearch size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input
                        type="text"
                        className="input-field"
                        placeholder="Buscar por nome, e-mail, CPF ou telefone..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ paddingLeft: 40, paddingRight: search ? 40 : 16 }}
                    />
                    {search && (
                        <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
                            <FiX size={15} />
                        </button>
                    )}
                </div>
                {search && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                        {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} para &quot;{search}&quot;
                    </div>
                )}
            </div>

            {/* Tabela */}
            <div className="glass-card" style={{ padding: 24 }}>
                {summary && !search && (
                    <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            Vendas no período: <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{summary.count}</span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            Total: <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>R$ {summary.total_amount_display}</span>
                        </div>
                    </div>
                )}

                {filtered.length > 0 ? (
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
                                    <th>Entregue</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(o => {
                                    const st = (o.status ? statusLabel[o.status] : undefined) || { label: o.status || '—', color: 'var(--text-muted)' };
                                    const isDelivering = delivering === o.id;
                                    return (
                                        <tr key={o.id} style={{ opacity: isDelivering ? 0.6 : 1 }}>
                                            <td style={{ fontWeight: 600 }}>{o.product_name}</td>
                                            <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{o.buyer_name || '—'}</td>
                                            <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{o.buyer_email || '—'}</td>
                                            <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{o.buyer_cpf || '—'}</td>
                                            <td style={{ color: 'var(--text-secondary)', fontSize: 13, whiteSpace: 'nowrap' }}>{formatPhone(o.buyer_phone)}</td>
                                            <td style={{ fontWeight: 600 }}>R$ {o.amount_display}</td>
                                            <td style={{ textTransform: 'uppercase', fontSize: 12, color: 'var(--text-muted)' }}>
                                                {o.payment_method === 'credit_card' ? 'Cartão' : 'Pix'}
                                            </td>
                                            <td>
                                                <span style={{ fontSize: 12, fontWeight: 600, color: st.color }}>{st.label}</span>
                                            </td>
                                            <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{formatDate(o.created_at)}</td>
                                            <td>
                                                <button
                                                    onClick={() => toggleDelivered(o)}
                                                    disabled={isDelivering}
                                                    title={o.delivered ? `Entregue em ${formatDate(o.delivered_at)}. Clique para desmarcar.` : 'Marcar como entregue'}
                                                    style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: 5,
                                                        padding: '5px 12px', borderRadius: 8, border: 'none',
                                                        cursor: isDelivering ? 'not-allowed' : 'pointer',
                                                        fontSize: 12, fontWeight: 600,
                                                        background: o.delivered ? 'rgba(85,239,196,0.15)' : 'rgba(255,255,255,0.06)',
                                                        color: o.delivered ? '#55efc4' : 'var(--text-muted)',
                                                        transition: 'all 0.2s',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {isDelivering
                                                        ? <FiClock size={13} />
                                                        : o.delivered
                                                            ? <><FiCheckCircle size={13} /> Entregue</>
                                                            : <><FiClock size={13} /> Pendente</>
                                                    }
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                        <FiShoppingCart size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
                        <p>{search ? `Nenhuma venda encontrada para "${search}"` : 'Nenhuma venda encontrada'}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
