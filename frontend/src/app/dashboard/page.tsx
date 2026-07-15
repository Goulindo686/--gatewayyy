'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useRef, useState } from 'react';
import { dashboardAPI } from '@/lib/api';
import { useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
    FiArrowDownRight,
    FiArrowUpRight,
    FiBox,
    FiCreditCard,
    FiDollarSign,
    FiEye,
    FiMoreHorizontal,
    FiShoppingBag,
    FiTrendingUp,
    FiUsers,
    FiZap,
} from 'react-icons/fi';
import { Bar, Line } from 'react-chartjs-2';
import {
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Filler,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    Title,
    Tooltip,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Filler, Legend);

interface MonthlySale {
    month: string;
    amount: number;
    net_revenue?: number;
    fees?: number;
}

function calculateDerivedMetrics(monthlySales: MonthlySale[]): MonthlySale[] {
    return monthlySales.map((sale) => {
        const amount = Number(sale.amount ?? 0);
        return {
            ...sale,
            amount,
            fees: sale.fees != null ? Number(sale.fees) : amount * 0.05,
            net_revenue: sale.net_revenue != null ? Number(sale.net_revenue) : amount * 0.95,
        };
    });
}

const money = (value: unknown) =>
    Number(value ?? 0).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

export default function DashboardPage() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<{ monthly_sales: any[]; recent_orders: any[] } | null>(null);
    const chartRef = useRef<any>(null);
    const searchParams = useSearchParams();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    useEffect(() => {
        const start = searchParams.get('start') || undefined;
        const end = searchParams.get('end') || undefined;
        if (start || end) loadPeriod({ start, end });
        else {
            setPeriod(null);
            loadStats();
        }
    }, [searchParams]);

    const loadStats = async (params?: any) => {
        setLoading(true);
        try {
            const { data } = await dashboardAPI.getStats(params || {});
            setStats(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadPeriod = async (params?: any) => {
        setLoading(true);
        try {
            const { data } = await dashboardAPI.getStats(params || {});
            setPeriod({ monthly_sales: data?.monthly_sales || [], recent_orders: data?.recent_orders || [] });
            setStats(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const monthlySalesData = calculateDerivedMetrics(period?.monthly_sales || stats?.monthly_sales || []);
    const recentOrders = period?.recent_orders || stats?.recent_orders || [];
    const totalSold = Number(stats?.stats?.total_sold ?? 0);
    const available = Number(stats?.stats?.available_balance ?? 0);
    const pending = Number(stats?.stats?.pending_balance ?? 0);
    const withdrawn = Number(stats?.stats?.total_withdrawn ?? 0);
    const products = Number(stats?.stats?.total_products ?? 0);

    const totalNetRevenue = monthlySalesData.reduce((sum, item) => sum + Number(item.net_revenue ?? 0), 0);
    const totalFees = monthlySalesData.reduce((sum, item) => sum + Number(item.fees ?? 0), 0);
    const lineColor = '#2f6bff';
    const lineData = {
        labels: monthlySalesData.map((item) => item.month),
        datasets: [
            {
                label: 'Vendas brutas',
                data: monthlySalesData.map((item) => item.amount),
                borderColor: lineColor,
                backgroundColor: (ctx: any) => {
                    const chart = ctx.chart;
                    const area = chart.chartArea;
                    if (!area) return 'rgba(47,107,255,0.14)';
                    const gradient = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
                    gradient.addColorStop(0, 'rgba(47,107,255,0.22)');
                    gradient.addColorStop(0.75, 'rgba(47,107,255,0.04)');
                    gradient.addColorStop(1, 'rgba(47,107,255,0)');
                    return gradient;
                },
                borderWidth: 2.5,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointBackgroundColor: lineColor,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                tension: 0.42,
            },
            {
                label: 'Receita liquida',
                data: monthlySalesData.map((item) => item.net_revenue ?? 0),
                borderColor: 'rgba(148,163,184,0.45)',
                borderDash: [5, 5],
                borderWidth: 1.4,
                fill: false,
                pointRadius: 0,
                tension: 0.42,
            },
        ],
    };

    const lineOptions: any = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: isDark ? '#f8fafc' : '#111827',
                padding: 12,
                cornerRadius: 10,
                titleColor: isDark ? '#111827' : '#ffffff',
                bodyColor: isDark ? '#334155' : '#f8fafc',
                callbacks: {
                    label: (ctx: any) => ` ${ctx.dataset.label}: R$ ${money(ctx.parsed.y)}`,
                },
            },
        },
        scales: {
            x: {
                grid: { display: false },
                border: { display: false },
                ticks: { color: isDark ? '#64748b' : '#94a3b8', font: { size: 11 }, maxRotation: 0 },
            },
            y: {
                grid: { color: isDark ? 'rgba(148,163,184,0.14)' : '#eef2f7', drawTicks: false },
                border: { display: false, dash: [4, 4] },
                ticks: {
                    color: isDark ? '#64748b' : '#94a3b8',
                    font: { size: 11 },
                    padding: 10,
                    callback: (value: any) => `R$ ${Number(value).toLocaleString('pt-BR')}`,
                },
            },
        },
    };

    const dayActivity = [
        { day: 'Dom', value: 58 },
        { day: 'Seg', value: 50 },
        { day: 'Ter', value: 94 },
        { day: 'Qua', value: 46 },
        { day: 'Qui', value: 32 },
        { day: 'Sex', value: 58 },
        { day: 'Sab', value: 66 },
    ];

    const customerMix = useMemo(() => {
        const gross = Math.max(totalSold, 1);
        return [
            { label: 'Disponivel', value: available, pct: Math.min(100, (available / gross) * 100), color: '#2f6bff' },
            { label: 'A receber', value: pending, pct: Math.min(100, (pending / gross) * 100), color: '#21c978' },
            { label: 'Taxas', value: totalFees, pct: Math.min(100, (totalFees / gross) * 100), color: '#ff8a3d' },
        ];
    }, [available, pending, totalFees, totalSold]);

    const statCards = [
        {
            label: 'Saldo Disponivel',
            value: `R$ ${money(available)}`,
            hint: `vs. R$ ${money(pending)} a receber`,
            trend: '+15.5%',
            up: true,
            icon: <FiEye size={16} />,
        },
        {
            label: 'Total Vendido',
            value: `R$ ${money(totalSold)}`,
            hint: `R$ ${money(totalNetRevenue)} liquido`,
            trend: '+8.4%',
            up: true,
            icon: <FiUsers size={16} />,
        },
        {
            label: 'A Receber',
            value: `R$ ${money(pending)}`,
            hint: `R$ ${money(withdrawn)} sacado`,
            trend: '-10.5%',
            up: false,
            icon: <FiTrendingUp size={16} />,
        },
        {
            label: 'Produtos',
            value: String(products),
            hint: `${recentOrders.length} vendas recentes`,
            trend: '+4.4%',
            up: true,
            icon: <FiBox size={16} />,
        },
    ];

    if (loading) {
        return (
            <div className="dashboard-shell-loading">
                <div className="dashboard-loader" />
                <p>Carregando dashboard...</p>
            </div>
        );
    }

    return (
        <div className="shop-dashboard">
            <style jsx>{`
                .shop-dashboard {
                    --dash-card: #ffffff;
                    --dash-card-soft: #f9fbfe;
                    --dash-border: #edf1f7;
                    --dash-border-strong: #e8edf5;
                    --dash-text: #111827;
                    --dash-secondary: #64748b;
                    --dash-muted: #94a3b8;
                    --dash-row: #f0f3f8;
                    --dash-icon-bg: #eff5ff;
                    --dash-table-thumb: #f3f6fb;
                    color: var(--dash-text);
                }
                :global(.dark) .shop-dashboard {
                    --dash-card: #16161f;
                    --dash-card-soft: #111827;
                    --dash-border: #2a2a3a;
                    --dash-border-strong: #343448;
                    --dash-text: #f0f0f5;
                    --dash-secondary: #a8a8ba;
                    --dash-muted: #8888a0;
                    --dash-row: rgba(255,255,255,0.06);
                    --dash-icon-bg: rgba(47,107,255,0.16);
                    --dash-table-thumb: #1c1c28;
                }
                .dashboard-shell-loading {
                    min-height: 420px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 14px;
                    color: var(--dash-secondary);
                }
                .dashboard-loader {
                    width: 38px;
                    height: 38px;
                    border-radius: 50%;
                    border: 3px solid #dbe7ff;
                    border-top-color: #2f6bff;
                    animation: spin 0.8s linear infinite;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
                .dash-header {
                    display: flex;
                    align-items: flex-end;
                    justify-content: space-between;
                    gap: 16px;
                    margin-bottom: 20px;
                }
                .dash-title {
                    font-size: 26px;
                    line-height: 1.1;
                    font-weight: 800;
                    letter-spacing: 0;
                    margin: 0;
                }
                .dash-subtitle {
                    color: var(--dash-secondary);
                    font-size: 13px;
                    margin-top: 7px;
                }
                .dash-chip-row {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    flex-wrap: wrap;
                }
                .dash-chip {
                    height: 38px;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 0 13px;
                    border-radius: 12px;
                    border: 1px solid var(--dash-border-strong);
                    background: var(--dash-card);
                    color: var(--dash-secondary);
                    font-size: 12px;
                    font-weight: 700;
                    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
                }
                .dash-card {
                    background: var(--dash-card);
                    border: 1px solid var(--dash-border);
                    border-radius: 18px;
                    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.04);
                }
                .metric-grid {
                    display: grid;
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                    gap: 18px;
                    margin-bottom: 22px;
                }
                .metric-card {
                    min-height: 112px;
                    padding: 20px;
                    position: relative;
                    overflow: hidden;
                }
                .metric-top {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    color: var(--dash-text);
                    font-size: 14px;
                    font-weight: 800;
                    margin-bottom: 18px;
                }
                .metric-icon {
                    color: #2f6bff;
                    width: 28px;
                    height: 28px;
                    border-radius: 9px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--dash-icon-bg);
                }
                .metric-value {
                    font-size: 25px;
                    font-weight: 900;
                    letter-spacing: 0;
                    margin-bottom: 7px;
                }
                .metric-foot {
                    display: flex;
                    align-items: center;
                    gap: 9px;
                    color: var(--dash-muted);
                    font-size: 11px;
                    white-space: nowrap;
                }
                .trend {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    border-radius: 999px;
                    padding: 3px 8px;
                    font-size: 11px;
                    font-weight: 800;
                }
                .trend.up {
                    color: #18b56f;
                    background: #e9fbf1;
                }
                .trend.down {
                    color: #f04b72;
                    background: #fff0f4;
                }
                .main-grid {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) 330px;
                    gap: 18px;
                    align-items: start;
                }
                .left-stack, .right-stack {
                    display: grid;
                    gap: 18px;
                }
                .chart-card {
                    padding: 22px;
                    min-height: 324px;
                }
                .card-head {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    margin-bottom: 16px;
                }
                .card-title {
                    margin: 0;
                    font-size: 15px;
                    font-weight: 900;
                }
                .card-muted {
                    color: var(--dash-muted);
                    font-size: 11px;
                    font-weight: 700;
                }
                .profit-line {
                    display: flex;
                    align-items: baseline;
                    gap: 10px;
                    margin-bottom: 6px;
                }
                .profit-value {
                    font-size: 34px;
                    font-weight: 950;
                    letter-spacing: 0;
                }
                .chart-area {
                    height: 210px;
                }
                .mix-panel {
                    margin-top: 16px;
                    border: 1px solid var(--dash-border);
                    border-radius: 14px;
                    padding: 15px;
                    background: var(--dash-card);
                }
                .mix-grid {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 12px;
                }
                .mix-item {
                    border-left: 2px solid var(--mix-color);
                    padding-left: 12px;
                }
                .mix-value {
                    font-size: 15px;
                    font-weight: 900;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .mix-bar {
                    height: 5px;
                    border-radius: 999px;
                    background: var(--dash-row);
                    overflow: hidden;
                    margin-top: 10px;
                }
                .mix-bar span {
                    display: block;
                    height: 100%;
                    width: var(--pct);
                    background: var(--mix-color);
                }
                .activity-card {
                    padding: 20px;
                    min-height: 160px;
                }
                .bars {
                    height: 102px;
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    gap: 11px;
                    align-items: end;
                    margin-top: 8px;
                }
                .bar-wrap {
                    display: grid;
                    gap: 8px;
                    justify-items: center;
                    color: var(--dash-muted);
                    font-size: 11px;
                    font-weight: 700;
                }
                .bar {
                    width: 25px;
                    height: var(--h);
                    border-radius: 8px 8px 5px 5px;
                    background: var(--dash-row);
                }
                .bar.active {
                    background: linear-gradient(180deg, #2f6bff 0%, #6494ff 100%);
                    box-shadow: 0 10px 18px rgba(47, 107, 255, 0.2);
                }
                .rate-card {
                    padding: 20px;
                    text-align: center;
                }
                .gauge {
                    --value: 68;
                    width: min(190px, 100%);
                    aspect-ratio: 2 / 1;
                    margin: 10px auto 0;
                    border-radius: 190px 190px 0 0;
                    background:
                        radial-gradient(circle at 50% 100%, var(--dash-card) 0 54%, transparent 55%),
                        conic-gradient(from 270deg at 50% 100%, #39c98e 0 calc(var(--value) * 0.5%), var(--dash-row) 0 50%, transparent 0);
                    position: relative;
                }
                .gauge-number {
                    margin-top: -12px;
                    font-size: 33px;
                    font-weight: 950;
                }
                .orders-card {
                    padding: 20px;
                    overflow: hidden;
                }
                .orders-table {
                    width: 100%;
                    border-collapse: collapse;
                    min-width: 680px;
                }
                .orders-table th {
                    color: var(--dash-muted);
                    font-size: 10px;
                    text-align: left;
                    text-transform: uppercase;
                    letter-spacing: .08em;
                    padding: 10px 8px;
                    border-bottom: 1px solid var(--dash-border);
                }
                .orders-table td {
                    padding: 13px 8px;
                    border-bottom: 1px solid var(--dash-row);
                    color: var(--dash-secondary);
                    font-size: 12px;
                    font-weight: 700;
                }
                .product-cell {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    color: var(--dash-text);
                }
                .product-thumb {
                    width: 28px;
                    height: 28px;
                    border-radius: 8px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--dash-table-thumb);
                    color: #2f6bff;
                    flex: 0 0 auto;
                }
                .status-badge {
                    display: inline-flex;
                    align-items: center;
                    border-radius: 999px;
                    padding: 4px 9px;
                    font-size: 11px;
                    font-weight: 900;
                }
                .status-paid {
                    color: #18a866;
                    background: #e9fbf1;
                }
                .status-pending {
                    color: #b98208;
                    background: #fff7dd;
                }
                .status-failed {
                    color: #e13f62;
                    background: #fff0f4;
                }
                .empty-state {
                    min-height: 190px;
                    display: grid;
                    place-items: center;
                    color: var(--dash-muted);
                    text-align: center;
                }
                .empty-state strong {
                    color: var(--dash-text);
                    display: block;
                    margin-bottom: 5px;
                }
                @media (max-width: 1180px) {
                    .metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                    .main-grid { grid-template-columns: 1fr; }
                    .right-stack { grid-template-columns: repeat(3, minmax(0, 1fr)); }
                }
                @media (max-width: 760px) {
                    .dash-header { align-items: flex-start; flex-direction: column; }
                    .metric-grid, .mix-grid, .right-stack { grid-template-columns: 1fr; }
                    .metric-foot { white-space: normal; }
                    .chart-card, .orders-card, .activity-card, .rate-card { padding: 16px; }
                    .profit-value { font-size: 28px; }
                }
            `}</style>

            <div className="dash-header">
                <div>
                    <h1 className="dash-title">Dashboard</h1>
                    <div className="dash-subtitle">Resumo visual das vendas, saldo e desempenho do gateway.</div>
                </div>
                <div className="dash-chip-row">
                    <div className="dash-chip"><FiZap size={14} /> Ao vivo</div>
                    <div className="dash-chip"><FiCreditCard size={14} /> PIX e cartao</div>
                </div>
            </div>

            <section className="metric-grid">
                {statCards.map((card) => (
                    <article className="dash-card metric-card" key={card.label}>
                        <div className="metric-top">
                            <span>{card.label}</span>
                            <span className="metric-icon">{card.icon}</span>
                        </div>
                        <div className="metric-value">{card.value}</div>
                        <div className="metric-foot">
                            <span className={`trend ${card.up ? 'up' : 'down'}`}>
                                {card.up ? <FiArrowUpRight size={12} /> : <FiArrowDownRight size={12} />}
                                {card.trend}
                            </span>
                            <span>{card.hint}</span>
                        </div>
                    </article>
                ))}
            </section>

            <section className="main-grid">
                <div className="left-stack">
                    <article className="dash-card chart-card">
                        <div className="card-head">
                            <div>
                                <h2 className="card-title">Lucro Total</h2>
                                <div className="card-muted">Vendas brutas vs. receita liquida</div>
                            </div>
                            <FiMoreHorizontal color="#94a3b8" />
                        </div>

                        <div className="profit-line">
                            <span className="profit-value">R$ {money(totalNetRevenue || totalSold)}</span>
                            <span className="trend up"><FiArrowUpRight size={12} /> 24.4%</span>
                            <span className="card-muted">vs. periodo anterior</span>
                        </div>

                        <div className="chart-area">
                            {monthlySalesData.length === 0 ? (
                                <div className="empty-state">
                                    <div>
                                        <strong>Nenhum dado no periodo</strong>
                                        <span>As vendas vao aparecer aqui assim que entrarem.</span>
                                    </div>
                                </div>
                            ) : (
                                <Line ref={chartRef} data={lineData} options={lineOptions} />
                            )}
                        </div>

                        <div className="mix-panel">
                            <div className="card-head" style={{ marginBottom: 12 }}>
                                <h3 className="card-title">Fluxo financeiro</h3>
                                <FiMoreHorizontal color="#94a3b8" />
                            </div>
                            <div className="mix-grid">
                                {customerMix.map((item) => (
                                    <div
                                        className="mix-item"
                                        key={item.label}
                                        style={{ '--mix-color': item.color, '--pct': `${Math.max(8, item.pct)}%` } as React.CSSProperties}
                                    >
                                        <div className="mix-value">
                                            <FiDollarSign size={14} color={item.color} />
                                            R$ {money(item.value)}
                                        </div>
                                        <div className="card-muted">{item.label}</div>
                                        <div className="mix-bar"><span /></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </article>

                    <article className="dash-card orders-card">
                        <div className="card-head">
                            <div>
                                <h2 className="card-title">Vendas Recentes</h2>
                                <div className="card-muted">{recentOrders.length} transacoes</div>
                            </div>
                            <FiMoreHorizontal color="#94a3b8" />
                        </div>

                        {recentOrders.length > 0 ? (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="orders-table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Produto</th>
                                            <th>Valor</th>
                                            <th>Metodo</th>
                                            <th>Status</th>
                                            <th>Data</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentOrders.slice(0, 5).map((order: any) => {
                                            const statusClass = order.status === 'paid'
                                                ? 'status-paid'
                                                : order.status === 'pending'
                                                    ? 'status-pending'
                                                    : 'status-failed';

                                            return (
                                                <tr key={order.id}>
                                                    <td>#{String(order.id).slice(0, 6)}</td>
                                                    <td>
                                                        <div className="product-cell">
                                                            <span className="product-thumb"><FiShoppingBag size={14} /></span>
                                                            <span>{order.product_name || order.products?.name || 'Produto'}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ color: '#18a866' }}>R$ {order.amount_display || money(order.amount)}</td>
                                                    <td>{order.payment_method === 'pix' ? 'PIX' : 'Cartao'}</td>
                                                    <td>
                                                        <span className={`status-badge ${statusClass}`}>
                                                            {order.status === 'paid' ? 'Pago' : order.status === 'pending' ? 'Pendente' : 'Falhou'}
                                                        </span>
                                                    </td>
                                                    <td>{order.created_at ? new Date(order.created_at).toLocaleDateString('pt-BR') : '-'}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="empty-state">
                                <div>
                                    <strong>Nenhuma venda ainda</strong>
                                    <span>Crie um produto e compartilhe o link de checkout.</span>
                                </div>
                            </div>
                        )}
                    </article>
                </div>

                <aside className="right-stack">
                    <article className="dash-card activity-card">
                        <div className="card-head">
                            <h2 className="card-title">Dia Mais Ativo</h2>
                            <FiMoreHorizontal color="#94a3b8" />
                        </div>
                        <div className="bars">
                            {dayActivity.map((day) => (
                                <div className="bar-wrap" key={day.day}>
                                    <div className={`bar ${day.day === 'Ter' ? 'active' : ''}`} style={{ '--h': `${day.value}px` } as React.CSSProperties} />
                                    <span style={{ color: day.day === 'Ter' ? '#2f6bff' : undefined }}>{day.day}</span>
                                </div>
                            ))}
                        </div>
                    </article>

                    <article className="dash-card rate-card">
                        <div className="card-head">
                            <h2 className="card-title">Taxa de Conversao</h2>
                            <FiMoreHorizontal color="#94a3b8" />
                        </div>
                        <div className="gauge" style={{ '--value': 68 } as React.CSSProperties} />
                        <div className="gauge-number">68%</div>
                        <div className="card-muted">Meta mensal: 80%</div>
                    </article>

                    <article className="dash-card activity-card">
                        <div className="card-head">
                            <h2 className="card-title">Ultimos Meses</h2>
                            <FiMoreHorizontal color="#94a3b8" />
                        </div>
                        <div style={{ height: 118 }}>
                            <Bar
                                data={{
                                    labels: monthlySalesData.slice(-6).map((item) => item.month),
                                    datasets: [{
                                        data: monthlySalesData.slice(-6).map((item) => item.amount),
                                        backgroundColor: monthlySalesData.slice(-6).map((_, index, arr) =>
                                            index === arr.length - 1 ? '#2f6bff' : '#e3e9f3'
                                        ),
                                        borderRadius: 8,
                                        borderSkipped: false,
                                    }],
                                }}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { display: false }, tooltip: { enabled: false } },
                                    scales: { x: { display: false }, y: { display: false } },
                                    animation: false,
                                } as any}
                            />
                        </div>
                    </article>
                </aside>
            </section>
        </div>
    );
}
