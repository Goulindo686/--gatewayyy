'use client';

import { useEffect, useState, useRef } from 'react';
import { dashboardAPI } from '@/lib/api';
import { FiDollarSign, FiTrendingUp, FiPackage, FiShoppingCart, FiArrowDown, FiArrowUpRight, FiArrowDownRight } from 'react-icons/fi';
import { Line, Bar } from 'react-chartjs-2';
import { useSearchParams } from 'next/navigation';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement,
    LineElement, BarElement, Title, Tooltip, Filler, Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Filler, Legend);

const BANNERS = [
    'https://i.imgur.com/ZavzTqt.png',
    'https://i.imgur.com/ckroQ7b.png',
    'https://i.imgur.com/cOgByLu.png',
];

function BannerCarousel() {
    const [current, setCurrent] = useState(0);

    useEffect(() => {
        const t = setInterval(() => setCurrent(p => (p + 1) % BANNERS.length), 4000);
        return () => clearInterval(t);
    }, []);

    return (
        <div style={{ position: 'relative', width: '100%', borderRadius: 14, overflow: 'hidden', marginBottom: 28, background: '#111', aspectRatio: '16/4' }}>
            {BANNERS.map((src, i) => (
                <img
                    key={i}
                    src={src}
                    alt={`Banner ${i + 1}`}
                    style={{
                        position: 'absolute',
                        top: 0, left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        objectPosition: 'center',
                        opacity: current === i ? 1 : 0,
                        transition: 'opacity 0.7s ease-in-out',
                        pointerEvents: current === i ? 'auto' : 'none',
                    }}
                />
            ))}
            {/* dots */}
            <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, zIndex: 2 }}>
                {BANNERS.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setCurrent(i)}
                        style={{
                            width: current === i ? 20 : 8, height: 8, borderRadius: 4,
                            background: current === i ? '#fff' : 'rgba(255,255,255,0.4)',
                            border: 'none', cursor: 'pointer', padding: 0,
                            transition: 'all 0.3s',
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

interface MonthlySale {
    month: string;
    amount: number;
    net_revenue?: number;
    fees?: number;
}

function calculateDerivedMetrics(monthlySales: MonthlySale[]): MonthlySale[] {
    return monthlySales.map(sale => {
        const amount = Number(sale.amount ?? 0);
        return {
            ...sale,
            amount,
            fees: sale.fees != null ? Number(sale.fees) : amount * 0.05,
            net_revenue: sale.net_revenue != null ? Number(sale.net_revenue) : amount * 0.95,
        };
    });
}

export default function DashboardPage() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<{ monthly_sales: any[]; recent_orders: any[] } | null>(null);
    const [activeTab, setActiveTab] = useState<'vendas' | 'receita'>('vendas');
    const chartRef = useRef<any>(null);
    const searchParams = useSearchParams();

    useEffect(() => { loadStats(); }, []);

    useEffect(() => {
        const start = searchParams.get('start') || undefined;
        const end = searchParams.get('end') || undefined;
        if (start || end) loadPeriod({ start, end });
        else { setPeriod(null); loadStats(); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    const loadStats = async (params?: any) => {
        setLoading(true);
        try {
            const { data } = await dashboardAPI.getStats(params || {});
            setStats(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const loadPeriod = async (params?: any) => {
        try {
            const { data } = await dashboardAPI.getStats(params || {});
            setPeriod({ monthly_sales: data?.monthly_sales || [], recent_orders: data?.recent_orders || [] });
        } catch (err) { console.error(err); }
    };

    const monthlySalesData = calculateDerivedMetrics(period?.monthly_sales || stats?.monthly_sales || []);
    const labels = monthlySalesData.map(m => m.month);

    const datasetMap = {
        vendas: { key: 'amount', color: '#6c5ce7', label: 'Vendas Brutas' },
        receita: { key: 'net_revenue', color: '#00cec9', label: 'Receita Líquida' },
    };

    const active = datasetMap[activeTab];

    const getGradient = (ctx: CanvasRenderingContext2D, color: string) => {
        const gradient = ctx.createLinearGradient(0, 0, 0, 320);
        gradient.addColorStop(0, color + '55');
        gradient.addColorStop(0.6, color + '18');
        gradient.addColorStop(1, color + '00');
        return gradient;
    };

    const chartData = {
        labels,
        datasets: [{
            label: active.label,
            data: monthlySalesData.map((m) => (m as any)[active.key] ?? 0),
            borderColor: active.color,
            backgroundColor: (ctx: any) => {
                const canvas = ctx.chart.ctx;
                return getGradient(canvas, active.color);
            },
            fill: true,
            tension: 0.45,
            pointBackgroundColor: active.color,
            pointBorderColor: '#fff',
            pointBorderWidth: 2.5,
            pointRadius: 5,
            pointHoverRadius: 8,
            borderWidth: 2.5,
        }]
    };

    const chartOptions: any = {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 900, easing: 'easeInOutQuart' },
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#1a1a2e',
                borderColor: active.color + '44',
                borderWidth: 1,
                titleColor: '#fff',
                bodyColor: '#a0a0b8',
                padding: 14,
                cornerRadius: 12,
                callbacks: {
                    label: (ctx: any) => ` R$ ${Number(ctx.parsed.y).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                }
            }
        },
        scales: {
            x: {
                grid: { display: false },
                border: { display: false },
                ticks: { color: '#6b6b8a', font: { size: 12 }, padding: 8 }
            },
            y: {
                grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
                border: { display: false, dash: [4, 4] },
                ticks: {
                    color: '#6b6b8a', font: { size: 11 }, padding: 12,
                    callback: (v: any) => `R$ ${Number(v).toLocaleString('pt-BR')}`
                }
            }
        }
    };

    // Mini sparkline for stat cards
    const sparkData = (color: string, values: number[]) => ({
        labels: values.map(() => ''),
        datasets: [{
            data: values,
            borderColor: color,
            backgroundColor: 'transparent',
            tension: 0.4,
            pointRadius: 0,
            borderWidth: 2,
        }]
    });

    const sparkOptions: any = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } },
        animation: false,
    };

    const recentOrders = period?.recent_orders || stats?.recent_orders || [];

    const statCards = [
        {
            label: 'Saldo Disponível', value: stats?.stats?.available_balance || '0.00',
            icon: <FiDollarSign size={18} />, color: '#00cec9', trend: '+12%', up: true,
            spark: [40, 55, 45, 60, 52, 70, 65, 80]
        },
        {
            label: 'Total Vendido', value: stats?.stats?.total_sold || '0.00',
            icon: <FiTrendingUp size={18} />, color: '#6c5ce7', trend: '+8%', up: true,
            spark: [30, 42, 38, 55, 48, 62, 58, 75]
        },
        {
            label: 'A Receber', value: stats?.stats?.pending_balance || '0.00',
            icon: <FiShoppingCart size={18} />, color: '#fdcb6e', trend: '+3%', up: true,
            spark: [20, 28, 25, 32, 30, 38, 35, 42]
        },
        {
            label: 'Total Sacado', value: stats?.stats?.total_withdrawn || '0.00',
            icon: <FiArrowDown size={18} />, color: '#74b9ff', trend: '-2%', up: false,
            spark: [50, 45, 48, 42, 46, 40, 44, 38]
        },
        {
            label: 'Produtos', value: stats?.stats?.total_products || 0,
            icon: <FiPackage size={18} />, color: '#a29bfe', trend: '+5%', up: true,
            isCurrency: false, spark: [2, 3, 3, 4, 4, 5, 5, 6]
        },
    ];

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{
                    width: 40, height: 40, border: '3px solid rgba(108,92,231,0.2)',
                    borderTopColor: '#6c5ce7', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite', margin: '0 auto 16px'
                }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Carregando dashboard...</p>
                <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        </div>
    );

    return (
        <div className="animate-fade-in" style={{ paddingBottom: 40 }}>
            <style>{`
                .banner-carousel-wrapper { display: block; }
                @media (max-width: 768px) { .banner-carousel-wrapper { display: none; } }
                @keyframes bannerFade { 0%,100%{opacity:0;} 10%,90%{opacity:1;} }
            `}</style>

            {/* Banner Carousel — desktop only */}
            <div className="banner-carousel-wrapper">
                <BannerCarousel />
            </div>

            <style>{`
                .db-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: 20px;
                    transition: box-shadow 0.2s, transform 0.2s;
                }
                .db-card:hover { box-shadow: 0 8px 32px rgba(0,0,0,0.18); transform: translateY(-1px); }
                .stat-pill {
                    display: inline-flex; align-items: center; gap: 4px;
                    padding: 3px 8px; border-radius: 20px; font-size: 11px; font-weight: 600;
                }
                .tab-btn {
                    padding: 6px 16px; border-radius: 10px; font-size: 13px; font-weight: 500;
                    border: none; cursor: pointer; transition: all 0.18s;
                }
                .tab-btn.active { color: #fff; }
                .tab-btn:not(.active) { background: transparent; color: var(--text-secondary); }
                .tab-btn:not(.active):hover { background: rgba(255,255,255,0.06); }
                .order-row { transition: background 0.15s; }
                .order-row:hover { background: rgba(255,255,255,0.03); }
                .db-badge {
                    display: inline-flex; align-items: center; padding: 3px 10px;
                    border-radius: 20px; font-size: 11px; font-weight: 600;
                }
            `}</style>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4, letterSpacing: '-0.5px' }}>Dashboard</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Acompanhe suas vendas e métricas em tempo real</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
                        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                        borderRadius: 12, fontSize: 13, color: 'var(--text-secondary)'
                    }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00cec9', boxShadow: '0 0 6px #00cec9' }} />
                        Ao vivo
                    </div>
                </div>
            </div>

            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14, marginBottom: 24 }}>
                {statCards.map((card, i) => (
                    <div key={i} className="db-card" style={{ padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
                        {/* Glow accent */}
                        <div style={{
                            position: 'absolute', top: -20, right: -20, width: 80, height: 80,
                            borderRadius: '50%', background: card.color + '18', filter: 'blur(20px)', pointerEvents: 'none'
                        }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: 10,
                                background: card.color + '18', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', color: card.color
                            }}>{card.icon}</div>
                            <span className="stat-pill" style={{
                                background: card.up ? 'rgba(0,206,145,0.12)' : 'rgba(255,107,107,0.12)',
                                color: card.up ? '#00ce91' : '#ff6b6b'
                            }}>
                                {card.up ? <FiArrowUpRight size={11} /> : <FiArrowDownRight size={11} />}
                                {card.trend}
                            </span>
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 2, letterSpacing: '-0.5px' }}>
                            {card.isCurrency !== false ? `R$ ${card.value}` : card.value}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>{card.label}</div>
                        {/* Sparkline */}
                        <div style={{ height: 36 }}>
                            <Line data={sparkData(card.color, card.spark)} options={sparkOptions} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Chart + Side Panel */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, marginBottom: 20 }}>

                {/* Chart Card */}
                <div className="db-card" style={{ padding: '24px 28px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <div>
                            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>Análise de Vendas</h3>
                            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Evolução mensal das métricas</p>
                        </div>
                        <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4 }}>
                            {(['vendas', 'receita'] as const).map(tab => (
                                <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                                    style={activeTab === tab ? { background: datasetMap[tab].color } : {}}
                                    onClick={() => setActiveTab(tab)}>
                                    {tab === 'vendas' ? 'Vendas' : 'Receita'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Big number */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 20 }}>
                        <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-1px', color: active.color }}>
                            R$ {monthlySalesData.reduce((s, m: any) => s + Number(m[active.key] ?? 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span style={{ fontSize: 13, color: '#00ce91', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                            <FiArrowUpRight size={14} /> Total acumulado
                        </span>
                    </div>

                    <div style={{ height: 260 }}>
                        {monthlySalesData.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                                <FiTrendingUp size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
                                <p style={{ fontSize: 13 }}>Nenhum dado disponível para o período</p>
                            </div>
                        ) : (
                            <Line ref={chartRef} data={chartData} options={chartOptions} />
                        )}
                    </div>
                </div>

                {/* Side: Quick Stats */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Top metric */}
                    <div className="db-card" style={{ padding: '20px', background: `linear-gradient(135deg, ${active.color}22, ${active.color}08)`, borderColor: active.color + '33' }}>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>Melhor mês</p>
                        <div style={{ fontSize: 22, fontWeight: 800, color: active.color, marginBottom: 4 }}>
                            {monthlySalesData.length > 0
                                ? monthlySalesData.reduce((best, m) => ((m as any)[active.key] ?? 0) > ((best as any)[active.key] ?? 0) ? m : best, monthlySalesData[0]).month
                                : '—'}
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Maior volume de {active.label.toLowerCase()}</p>
                    </div>

                    {/* Breakdown */}
                    <div className="db-card" style={{ padding: '20px', flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Distribuição</p>
                        {[
                            { label: 'Vendas Brutas', color: '#6c5ce7', pct: 100 },
                            { label: 'Receita Líquida', color: '#00cec9', pct: 95 },
                        ].map((item, i) => (
                            <div key={i} style={{ marginBottom: 14 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.label}</span>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: item.color }}>{item.pct}%</span>
                                </div>
                                <div style={{ height: 6, borderRadius: 6, background: 'rgba(255,255,255,0.06)' }}>
                                    <div style={{ height: '100%', borderRadius: 6, width: `${item.pct}%`, background: `linear-gradient(90deg, ${item.color}, ${item.color}88)` }} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Bar mini chart */}
                    <div className="db-card" style={{ padding: '20px' }}>
                        <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Últimos 6 meses</p>
                        <div style={{ height: 80 }}>
                            <Bar
                                data={{
                                    labels: monthlySalesData.slice(-6).map(m => m.month),
                                    datasets: [{
                                        data: monthlySalesData.slice(-6).map((m: any) => m.amount ?? 0),
                                        backgroundColor: monthlySalesData.slice(-6).map((_, i, arr) =>
                                            i === arr.length - 1 ? '#6c5ce7' : '#6c5ce722'
                                        ),
                                        borderRadius: 6,
                                        borderSkipped: false,
                                    }]
                                }}
                                options={{
                                    responsive: true, maintainAspectRatio: false,
                                    plugins: { legend: { display: false }, tooltip: { enabled: false } },
                                    scales: { x: { display: false }, y: { display: false } },
                                    animation: false,
                                } as any}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Orders */}
            <div className="db-card" style={{ padding: '24px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>Vendas Recentes</h3>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{recentOrders.length} transações</p>
                    </div>
                    {recentOrders.length > 0 && (
                        <span style={{ fontSize: 12, color: '#6c5ce7', fontWeight: 600, cursor: 'pointer' }}>Ver todas →</span>
                    )}
                </div>

                {recentOrders.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    {['Produto', 'Comprador', 'Valor', 'Método', 'Status', 'Data'].map(h => (
                                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {recentOrders.map((order: any) => (
                                    <tr key={order.id} className="order-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                        <td style={{ padding: '13px 12px', fontWeight: 600, fontSize: 13 }}>
                                            {order.product_name || order.products?.name || '—'}
                                        </td>
                                        <td style={{ padding: '13px 12px', color: 'var(--text-secondary)', fontSize: 13 }}>
                                            {order.buyer_name || '—'}
                                        </td>
                                        <td style={{ padding: '13px 12px', fontWeight: 700, fontSize: 14, color: '#00ce91' }}>
                                            R$ {order.amount_display}
                                        </td>
                                        <td style={{ padding: '13px 12px' }}>
                                            <span className="db-badge" style={{
                                                background: order.payment_method === 'pix' ? 'rgba(0,206,145,0.12)' : 'rgba(116,185,255,0.12)',
                                                color: order.payment_method === 'pix' ? '#00ce91' : '#74b9ff'
                                            }}>
                                                {order.payment_method === 'pix' ? 'PIX' : 'Cartão'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '13px 12px' }}>
                                            <span className="db-badge" style={{
                                                background: order.status === 'paid' ? 'rgba(0,206,145,0.12)' : order.status === 'pending' ? 'rgba(253,203,110,0.12)' : 'rgba(255,107,107,0.12)',
                                                color: order.status === 'paid' ? '#00ce91' : order.status === 'pending' ? '#fdcb6e' : '#ff6b6b'
                                            }}>
                                                {order.status === 'paid' ? 'Pago' : order.status === 'pending' ? 'Pendente' : order.status === 'failed' ? 'Falhou' : order.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '13px 12px', color: 'var(--text-muted)', fontSize: 12 }}>
                                            {new Date(order.created_at).toLocaleDateString('pt-BR')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
                        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(108,92,231,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#6c5ce7' }}>
                            <FiShoppingCart size={24} />
                        </div>
                        <p style={{ fontWeight: 600, marginBottom: 6 }}>Nenhuma venda ainda</p>
                        <p style={{ fontSize: 13 }}>Crie um produto e compartilhe o link de checkout!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
