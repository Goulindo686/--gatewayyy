'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FiShoppingCart, FiRefreshCw, FiSearch, FiCheckCircle, FiClock, FiPercent, FiUsers, FiX } from 'react-icons/fi';

type SalesFilters = {
    status?: string;
    method?: string;
    start?: string;
    end?: string;
    search?: string;
    page?: number;
};

type SalesPagination = {
    page: number;
    page_size: number;
    total_pages: number;
    total_count: number;
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
    gross_amount?: number | null;
    commission_amount?: number | null;
    commission_rate_bps?: number | null;
    net_amount?: number | null;
    sale_kind?: 'direct_sale' | 'affiliate_sale' | 'affiliate_commission' | string;
    affiliate_name?: string | null;
    producer_name?: string | null;
    can_manage_delivery?: boolean;
    created_at: string;
    delivered?: boolean | null;
    delivered_at?: string | null;
};

function buildDateRangeFilters(
    rangePreset: string,
    startDate = '',
    endDate = '',
): Pick<SalesFilters, 'start' | 'end'> {
    const params: Pick<SalesFilters, 'start' | 'end'> = {};
    const now = new Date();
    const startOfDay = (date: Date) => new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        0,
        0,
        0,
    );
    const endOfDay = (date: Date) => new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        23,
        59,
        59,
    );

    if (rangePreset !== 'custom') {
        if (rangePreset === 'today') {
            params.start = startOfDay(now).toISOString();
            params.end = endOfDay(now).toISOString();
        } else if (rangePreset === 'yesterday') {
            const yesterday = new Date(now.getTime() - 86400000);
            params.start = startOfDay(yesterday).toISOString();
            params.end = endOfDay(yesterday).toISOString();
        } else if (rangePreset === 'last7') {
            const rangeStart = new Date(now.getTime() - 7 * 86400000);
            params.start = startOfDay(rangeStart).toISOString();
            params.end = endOfDay(now).toISOString();
        } else if (rangePreset === 'thisMonth') {
            params.start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            params.end = endOfDay(now).toISOString();
        } else if (rangePreset === 'lastMonth') {
            params.start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
            params.end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
        }
    } else {
        if (startDate) params.start = new Date(startDate + 'T00:00:00').toISOString();
        if (endDate) params.end = new Date(endDate + 'T23:59:59').toISOString();
    }

    return params;
}

export default function SalesPage() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [querying, setQuerying] = useState(false);
    const [statusFilter, setStatusFilter] = useState('');
    const [methodFilter, setMethodFilter] = useState('');
    const [rangePreset, setRangePreset] = useState('last7');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [summary, setSummary] = useState<{ count: number; total_amount_display: string } | null>(null);
    const [pagination, setPagination] = useState<SalesPagination>({
        page: 1,
        page_size: 50,
        total_pages: 1,
        total_count: 0,
    });
    const [search, setSearch] = useState('');
    const [delivering, setDelivering] = useState<string | null>(null);
    const appliedFilters = useRef<SalesFilters>({});
    const firstSearchEffect = useRef(true);
    const requestId = useRef(0);
    const requestController = useRef<AbortController | null>(null);
    const salesSection = useRef<HTMLDivElement | null>(null);

    const loadSales = useCallback(async (filters: SalesFilters = {}, options: { background?: boolean } = {}) => {
        const currentRequestId = ++requestId.current;
        requestController.current?.abort();
        const controller = new AbortController();
        requestController.current = controller;
        if (!options.background) setLoading(true);
        else setQuerying(true);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const params = new URLSearchParams();
            if (filters?.status) params.set('status', filters.status);
            if (filters?.method) params.set('method', filters.method);
            if (filters?.start) params.set('start', filters.start);
            if (filters?.end) params.set('end', filters.end);
            if (filters?.search?.trim()) params.set('search', filters.search.trim());
            params.set('page', String(Math.max(1, filters.page || 1)));
            params.set('per_page', '50');

            const { data } = await axios.get(`/api/sales?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
                signal: controller.signal,
            });
            if (currentRequestId !== requestId.current) return;
            const result = data.data || data;
            setSales(result?.sales || []);
            setSummary(result?.summary || null);
            setPagination(result?.pagination || {
                page: 1,
                page_size: 50,
                total_pages: 1,
                total_count: result?.summary?.count || 0,
            });
        } catch (error) {
            if (axios.isCancel(error)) return;
            if (currentRequestId !== requestId.current) return;
            setSales([]);
        } finally {
            if (currentRequestId === requestId.current) {
                setLoading(false);
                setQuerying(false);
            }
        }
    }, []);

    useEffect(() => {
        const initialFilters: SalesFilters = {
            ...buildDateRangeFilters('last7'),
            page: 1,
        };
        appliedFilters.current = initialFilters;
        void loadSales(initialFilters);
    }, [loadSales]);

    useEffect(() => () => requestController.current?.abort(), []);

    // Search the complete history on the server. The small delay avoids a
    // request for every keystroke while keeping the field feeling instant.
    useEffect(() => {
        if (firstSearchEffect.current) {
            firstSearchEffect.current = false;
            return;
        }

        const timer = window.setTimeout(() => {
            void loadSales(
                {
                    ...appliedFilters.current,
                    search: search.trim() || undefined,
                    page: 1,
                },
                { background: true },
            );
        }, 450);

        return () => window.clearTimeout(timer);
    }, [loadSales, search]);

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            const params: SalesFilters = {
                status: statusFilter || undefined,
                method: methodFilter || undefined,
                ...buildDateRangeFilters(rangePreset, startDate, endDate),
                page: 1,
            };
            appliedFilters.current = params;
            await loadSales(
                { ...params, search: search.trim() || undefined },
                { background: true },
            );
        } finally {
            setRefreshing(false);
        }
    };

    const changePage = async (nextPage: number) => {
        if (
            querying
            || nextPage < 1
            || nextPage > pagination.total_pages
            || nextPage === pagination.page
        ) return;

        await loadSales(
            {
                ...appliedFilters.current,
                search: search.trim() || undefined,
                page: nextPage,
            },
            { background: true },
        );
        salesSection.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const formatPhone = (phone?: string | null) => {
        const digits = String(phone || '').replace(/\D/g, '');
        if (!digits) return '—';
        if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
        if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
        return phone || digits;
    };

    const toggleDelivered = async (order: Sale) => {
        if (order.can_manage_delivery === false || order.sale_kind === 'affiliate_commission') return;
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
                        placeholder="Buscar por produto, cliente, produtor ou afiliado..."
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
                        {querying
                            ? 'Buscando no historico...'
                            : `${summary?.count || 0} resultado${summary?.count === 1 ? '' : 's'} para "${search}"`}
                    </div>
                )}
            </div>

            {/* Tabela */}
            <div ref={salesSection} className="glass-card sales-card">
                {summary && (
                    <div className="sales-summary">
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            Vendas no período: <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{summary.count}</span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            Total: <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>R$ {summary.total_amount_display}</span>
                        </div>
                        {querying && (
                            <span className="query-indicator">
                                <FiRefreshCw size={13} /> Atualizando
                            </span>
                        )}
                    </div>
                )}

                {sales.length > 0 ? (
                    <>
                    <div className={`sales-table-shell${querying ? ' is-querying' : ''}`} aria-busy={querying}>
                        <table className="data-table sales-table">
                            <colgroup>
                                <col className="product-column" />
                                <col className="customer-column" />
                                <col className="payment-column" />
                                <col className="date-column" />
                                <col className="delivery-column" />
                            </colgroup>
                            <thead>
                                <tr>
                                    <th>Produto e origem</th>
                                    <th>Cliente</th>
                                    <th>Pagamento</th>
                                    <th>Data</th>
                                    <th>Entrega</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sales.map(o => {
                                    const st = (o.status ? statusLabel[o.status] : undefined) || { label: o.status || '—', color: 'var(--text-muted)' };
                                    const isDelivering = delivering === o.id;
                                    const isAffiliateCommission = o.sale_kind === 'affiliate_commission';
                                    const isAffiliateSale = o.sale_kind === 'affiliate_sale';
                                    const sourceLabel = isAffiliateCommission
                                        ? 'Comissão de afiliado'
                                        : isAffiliateSale
                                            ? 'Venda com afiliado'
                                            : 'Venda direta';
                                    const sourceName = isAffiliateCommission ? o.producer_name : o.affiliate_name;
                                    const methodLabel = o.payment_method === 'credit_card' || o.payment_method === 'card'
                                        ? 'Cartão'
                                        : o.payment_method === 'pix'
                                            ? 'Pix'
                                            : o.payment_method === 'recurrence'
                                                ? 'Recorrência'
                                                : '—';
                                    return (
                                        <tr key={o.id} style={{ opacity: isDelivering ? 0.6 : 1 }}>
                                            <td data-label="Produto e origem" className="product-cell">
                                                <strong>{o.product_name || '—'}</strong>
                                                <div className="source-details">
                                                    <span className={`source-badge${isAffiliateCommission || isAffiliateSale ? ' affiliate' : ''}`}>
                                                        {isAffiliateCommission
                                                            ? <FiPercent size={12} />
                                                            : isAffiliateSale
                                                                ? <FiUsers size={12} />
                                                                : null}
                                                        {sourceLabel}
                                                    </span>
                                                    {sourceName && (
                                                        <span className="source-name">
                                                            {isAffiliateCommission ? 'Produtor' : 'Afiliado'}: {sourceName}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td data-label="Cliente" className="customer-cell">
                                                <strong>{isAffiliateCommission ? 'Venda indicada' : o.buyer_name || '—'}</strong>
                                                <span className="customer-email">{o.buyer_email || 'E-mail não informado'}</span>
                                                <div className="customer-meta">
                                                    <span>CPF: {o.buyer_cpf || '—'}</span>
                                                    <span>Tel: {formatPhone(o.buyer_phone)}</span>
                                                </div>
                                            </td>
                                            <td data-label="Pagamento" className="payment-cell">
                                                <strong>R$ {o.amount_display}</strong>
                                                <div className="payment-meta">
                                                    <span>{methodLabel}</span>
                                                    <span style={{ color: st.color }}>{st.label}</span>
                                                </div>
                                                <div className="amount-details">
                                                    {isAffiliateCommission && (
                                                        <span>Sua comissão</span>
                                                    )}
                                                    {isAffiliateSale && o.net_amount != null && (
                                                        <span>
                                                            Líquido: R$ {(Number(o.net_amount) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td data-label="Data" className="date-cell">{formatDate(o.created_at)}</td>
                                            <td data-label="Entrega" className="delivery-cell">
                                                {isAffiliateCommission ? (
                                                    <span className="producer-responsibility">Responsável: produtor</span>
                                                ) : (
                                                    <button
                                                        className={`delivery-button${o.delivered ? ' delivered' : ''}`}
                                                        onClick={() => toggleDelivered(o)}
                                                        disabled={isDelivering}
                                                        title={o.delivered ? `Entregue em ${formatDate(o.delivered_at)}. Clique para desmarcar.` : 'Marcar como entregue'}
                                                    >
                                                        {isDelivering
                                                            ? <FiClock size={13} />
                                                            : o.delivered
                                                                ? <><FiCheckCircle size={13} /> Entregue</>
                                                                : <><FiClock size={13} /> Pendente</>
                                                        }
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {pagination.total_pages > 1 && (
                        <div className="sales-pagination">
                            <span>
                                Exibindo {(pagination.page - 1) * pagination.page_size + 1}–{Math.min(
                                    pagination.page * pagination.page_size,
                                    pagination.total_count,
                                )} de {pagination.total_count}
                            </span>
                            <div>
                                <button
                                    type="button"
                                    disabled={querying || pagination.page <= 1}
                                    onClick={() => void changePage(pagination.page - 1)}
                                >
                                    Anterior
                                </button>
                                <strong>{pagination.page} / {pagination.total_pages}</strong>
                                <button
                                    type="button"
                                    disabled={querying || pagination.page >= pagination.total_pages}
                                    onClick={() => void changePage(pagination.page + 1)}
                                >
                                    Próxima
                                </button>
                            </div>
                        </div>
                    )}
                    </>
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                        <FiShoppingCart size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
                        <p>{search ? `Nenhuma venda encontrada para "${search}"` : 'Nenhuma venda encontrada'}</p>
                    </div>
                )}
            </div>
            <style jsx>{`
                .sales-card {
                    padding: 20px;
                    min-width: 0;
                }
                .sales-summary {
                    min-height: 24px;
                    display: flex;
                    gap: 16px;
                    margin-bottom: 14px;
                    align-items: center;
                    flex-wrap: wrap;
                }
                .query-indicator {
                    margin-left: auto;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    color: var(--text-muted);
                    font-size: 12px;
                }
                .query-indicator :global(svg) {
                    animation: sales-spin .8s linear infinite;
                }
                .sales-table-shell {
                    width: 100%;
                    min-width: 0;
                    overflow: hidden;
                    transition: opacity .16s ease;
                }
                .sales-table-shell.is-querying {
                    opacity: .58;
                    pointer-events: none;
                }
                .sales-table {
                    width: 100%;
                    table-layout: fixed;
                }
                .sales-table .product-column { width: 23%; }
                .sales-table .customer-column { width: 31%; }
                .sales-table .payment-column { width: 16%; }
                .sales-table .date-column { width: 15%; }
                .sales-table .delivery-column { width: 15%; }
                .sales-table th,
                .sales-table td {
                    padding: 14px 12px;
                    vertical-align: top;
                    overflow-wrap: anywhere;
                }
                .product-cell > strong,
                .customer-cell > strong,
                .payment-cell > strong {
                    display: block;
                    color: var(--text-primary);
                    font-size: 13px;
                    line-height: 1.4;
                    margin-bottom: 7px;
                }
                .source-details {
                    display: grid;
                    justify-items: start;
                    gap: 5px;
                    min-width: 0;
                }
                .source-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    max-width: 100%;
                    padding: 4px 8px;
                    border-radius: 999px;
                    background: var(--bg-secondary);
                    color: var(--text-muted);
                    font-size: 10px;
                    font-weight: 800;
                    line-height: 1.2;
                }
                .source-badge.affiliate {
                    background: rgba(139,92,246,.12);
                    color: #7c3aed;
                }
                .source-name,
                .customer-email,
                .customer-meta,
                .payment-meta,
                .amount-details,
                .date-cell,
                .producer-responsibility {
                    color: var(--text-muted);
                    font-size: 11px;
                    line-height: 1.45;
                }
                .source-name,
                .customer-email {
                    display: block;
                    width: 100%;
                    overflow-wrap: anywhere;
                }
                .customer-email,
                .customer-meta,
                .payment-meta,
                .amount-details {
                    margin-top: 5px;
                }
                .customer-meta {
                    display: flex;
                    gap: 5px 12px;
                    flex-wrap: wrap;
                }
                .payment-meta {
                    display: flex;
                    gap: 5px 10px;
                    flex-wrap: wrap;
                    font-weight: 700;
                    text-transform: uppercase;
                }
                .amount-details {
                    display: grid;
                    gap: 2px;
                    font-weight: 600;
                }
                .date-cell {
                    font-size: 12px;
                }
                .delivery-button {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 5px;
                    max-width: 100%;
                    padding: 6px 10px;
                    border: 0;
                    border-radius: 8px;
                    background: rgba(148,163,184,.10);
                    color: var(--text-muted);
                    cursor: pointer;
                    font-size: 11px;
                    font-weight: 700;
                    white-space: nowrap;
                    transition: background .16s ease, color .16s ease;
                }
                .delivery-button.delivered {
                    background: rgba(85,239,196,.15);
                    color: #20a980;
                }
                .delivery-button:disabled {
                    cursor: not-allowed;
                }
                .sales-pagination {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 16px;
                    padding-top: 18px;
                    color: var(--text-muted);
                    font-size: 12px;
                }
                .sales-pagination > div {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .sales-pagination button {
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    background: var(--bg-card);
                    color: var(--text-primary);
                    padding: 8px 11px;
                    cursor: pointer;
                    font-weight: 700;
                }
                .sales-pagination button:disabled {
                    opacity: .45;
                    cursor: not-allowed;
                }
                @keyframes sales-spin {
                    to { transform: rotate(360deg); }
                }
                @media (max-width: 1100px) {
                    .sales-card { padding: 16px; }
                    .sales-table .product-column { width: 22%; }
                    .sales-table .customer-column { width: 32%; }
                    .sales-table .payment-column { width: 17%; }
                    .sales-table .date-column { width: 14%; }
                    .sales-table .delivery-column { width: 15%; }
                    .sales-table th,
                    .sales-table td { padding: 12px 8px; }
                }
                @media (max-width: 850px) {
                    .sales-table colgroup,
                    .sales-table thead {
                        display: none;
                    }
                    .sales-table,
                    .sales-table tbody {
                        display: block;
                        width: 100%;
                    }
                    .sales-table tr {
                        display: grid;
                        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
                        gap: 15px;
                        padding: 16px 0;
                        border-bottom: 1px solid var(--border-color);
                    }
                    .sales-table td {
                        display: grid;
                        gap: 7px;
                        padding: 0;
                        border: 0;
                        min-width: 0;
                    }
                    .sales-table td::before {
                        content: attr(data-label);
                        color: var(--text-muted);
                        font-size: 10px;
                        font-weight: 800;
                        letter-spacing: .06em;
                        text-transform: uppercase;
                    }
                    .sales-table .product-cell,
                    .sales-table .customer-cell {
                        grid-column: 1 / -1;
                    }
                }
                @media (max-width: 560px) {
                    .sales-card { padding: 14px; }
                    .sales-table tr { grid-template-columns: 1fr; }
                    .sales-table .product-cell,
                    .sales-table .customer-cell {
                        grid-column: auto;
                    }
                    .sales-pagination {
                        align-items: stretch;
                        flex-direction: column;
                    }
                    .sales-pagination > div {
                        justify-content: space-between;
                    }
                }
            `}</style>
        </div>
    );
}
