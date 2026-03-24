'use client';

import { useEffect, useState } from 'react';
import { dashboardAPI } from '@/lib/api';
import { FiDollarSign, FiTrendingUp, FiPackage, FiShoppingCart, FiArrowDown, FiPercent } from 'react-icons/fi';
import { Line } from 'react-chartjs-2';
import { useSearchParams } from 'next/navigation';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement,
    LineElement, Title, Tooltip, Filler, Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, Legend);

export default function DashboardPage() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<{ monthly_sales: any[]; recent_orders: any[] } | null>(null);
    const searchParams = useSearchParams();

    useEffect(() => {
        loadStats();
    }, []);

    useEffect(() => {
        const start = searchParams.get('start') || undefined;
        const end = searchParams.get('end') || undefined;
        if (start || end) {
            loadPeriod({ start, end });
        } else {
            setPeriod(null);
            loadStats();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    const loadStats = async (params?: any) => {
        setLoading(true);
        try {
            const { data } = await dashboardAPI.getStats(params || {});
            setStats(data);
        } catch (err) {
            console.error('Failed to load stats:', err);
        } finally {
            setLoading(false);
        }
    };
    const loadPeriod = async (params?: any) => {
        try {
            const { data } = await dashboardAPI.getStats(params || {});
            setPeriod({
                monthly_sales: data?.monthly_sales || [],
                recent_orders: data?.recent_orders || []
            });
        } catch (err) {
            console.error('Failed to load period stats:', err);
        }
    };

 

    const chartData = {
        labels: (period?.monthly_sales || stats?.monthly_sales || []).map((m: any) => m.month),
        datasets: [{
            label: 'Vendas (R$)',
            data: (period?.monthly_sales || stats?.monthly_sales || []).map((m: any) => m.amount),
            borderColor: '#6c5ce7',
            backgroundColor: 'rgba(108, 92, 231, 0.1)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#6c5ce7',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 5,
        }]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-color)',
                borderWidth: 1,
                titleColor: 'var(--text-primary)',
                bodyColor: 'var(--text-secondary)',
                padding: 12,
                cornerRadius: 10,
                callbacks: {
                    label: (ctx: any) => `R$ ${ctx.parsed.y.toFixed(2)}`
                }
            }
        },
        scales: {
            x: {
                grid: { color: 'rgba(42,42,58,0.3)' },
                ticks: { color: '#55556a', font: { size: 12 } }
            },
            y: {
                grid: { color: 'rgba(42,42,58,0.3)' },
                ticks: { color: '#55556a', font: { size: 12 }, callback: (v: any) => `R$${v}` }
            }
        }
    };

    const statCards = [
        { label: 'Saldo Disponível', value: stats?.stats?.available_balance || '0.00', icon: <FiDollarSign size={20} />, color: '#00cec9' },
        { label: 'Total Vendido', value: stats?.stats?.total_sold || '0.00', icon: <FiTrendingUp size={20} />, color: '#6c5ce7' },
        { label: 'A Receber', value: stats?.stats?.pending_balance || '0.00', icon: <FiShoppingCart size={20} />, color: '#fdcb6e' },
        { label: 'Total Sacado', value: stats?.stats?.total_withdrawn || '0.00', icon: <FiArrowDown size={20} />, color: '#74b9ff' },
        { label: 'Taxas Pagas', value: stats?.stats?.total_fees || '0.00', icon: <FiPercent size={20} />, color: '#ff6b6b' },
        { label: 'Produtos', value: stats?.stats?.total_products || 0, icon: <FiPackage size={20} />, color: '#a29bfe', isCurrency: false },
    ];

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: 40, height: 40, border: '3px solid var(--border-color)',
                        borderTopColor: 'var(--accent-primary)', borderRadius: '50%',
                        animation: 'spin 1s linear infinite', margin: '0 auto 16px'
                    }} />
                    <p style={{ color: 'var(--text-secondary)' }}>Carregando dashboard...</p>
                    <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Dashboard</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Visão geral do seu negócio</p>
            </div>

            <div className="dashboardBanner">
                <img
                    src="https://i.imgur.com/YCfndJ9.png"
                    alt="Banner do Dashboard"
                    loading="eager"
                    onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = 'https://i.imgur.com/20tNSps.jpg';
                    }}
                    className="dashboardBannerImg"
                />
            </div>

            <style>{`
                .dashboardBanner {
                    border-radius: 18px;
                    overflow: hidden;
                    border: 1px solid var(--border-color);
                    background: var(--bg-card);
                    margin-bottom: 24px;
                    height: clamp(160px, 20vw, 260px);
                    position: relative;
                }

                .dashboardBannerImg {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    object-position: right 32%;
                    display: block;
                }

                @media (max-width: 640px) {
                    .dashboardBanner {
                        height: auto;
                        background: transparent;
                    }

                    .dashboardBannerImg {
                        height: auto;
                        object-fit: initial;
                        object-position: initial;
                    }
                }
            `}</style>

            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
                {statCards.map((card, i) => (
                    <div key={i} className="stat-card" style={{ animationDelay: `${i * 0.05}s` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                            <div style={{
                                width: 40, height: 40, borderRadius: 10,
                                background: `${card.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: card.color
                            }}>{card.icon}</div>
                        </div>
                        <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
                            {card.isCurrency !== false ? `R$ ${card.value}` : card.value}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{card.label}</div>
                    </div>
                ))}
            </div>

            {/* Chart */}
            <div style={{
                background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                borderRadius: 16, padding: 24, marginBottom: 32
            }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 24 }}>Vendas por Mês</h3>
                <div style={{ height: 300 }}>
                    <Line data={chartData} options={chartOptions as any} />
                </div>
            </div>

            {/* Recent Orders */}
            <div style={{
                background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                borderRadius: 16, padding: 24
            }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Vendas Recentes</h3>
                {stats?.recent_orders?.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Produto</th>
                                    <th>Comprador</th>
                                    <th>Valor</th>
                                    <th>Método</th>
                                    <th>Status</th>
                                    <th>Data</th>
                                </tr>
                            </thead>
                            <tbody>
                {(period?.recent_orders || stats?.recent_orders || []).map((order: any) => (
                                    <tr key={order.id}>
                                        <td style={{ fontWeight: 500 }}>{order.product_name || order.products?.name || '—'}</td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{order.buyer_name || '—'}</td>
                                        <td style={{ fontWeight: 600, color: 'var(--success)' }}>R$ {order.amount_display}</td>
                                        <td>
                                            <span className={`badge ${order.payment_method === 'pix' ? 'badge-success' : 'badge-info'}`}>
                                                {order.payment_method === 'pix' ? 'PIX' : 'Cartão'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${order.status === 'paid' ? 'badge-success' :
                                                order.status === 'pending' ? 'badge-warning' :
                                                    order.status === 'failed' ? 'badge-danger' : 'badge-neutral'
                                                }`}>
                                                {order.status === 'paid' ? 'Pago' :
                                                    order.status === 'pending' ? 'Pendente' :
                                                        order.status === 'failed' ? 'Falhou' : order.status}
                                            </span>
                                        </td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                                            {new Date(order.created_at).toLocaleDateString('pt-BR')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                        <FiShoppingCart size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
                        <p>Nenhuma venda ainda. Crie um produto e compartilhe o link de checkout!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
