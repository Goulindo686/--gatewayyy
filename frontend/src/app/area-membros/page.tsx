'use client';

import { useEffect, useState } from 'react';
import { memberAPI } from '@/lib/api';
import api from '@/lib/api';
import Link from 'next/link';
import { FiPackage, FiPlay, FiBookOpen, FiArrowRight, FiLogOut, FiRepeat, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function MemberAreaPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [subscriptions, setSubscriptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'products' | 'subscriptions'>('products');

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [prodRes, subRes] = await Promise.all([
                memberAPI.listMyProducts(),
                api.get('/member/my-subscriptions').catch(() => ({ data: { subscriptions: [] } }))
            ]);
            setProducts(prodRes.data.products || []);
            setSubscriptions(subRes.data.subscriptions || []);
        } catch (err) {
            console.error(err);
            toast.error('Erro ao carregar seus produtos');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary)' }}>
                <div style={{ width: 40, height: 40, border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            {/* Header Area Membros */}
            <nav style={{
                background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)',
                padding: '16px 24px', position: 'sticky', top: 0, zIndex: 10,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img src="/logo.png" alt="GouPay Logo" style={{ width: 50, height: 50, objectFit: 'contain', flexShrink: 0 }} />
                    <span style={{ fontSize: 18, fontWeight: 700 }}>Gou<span className="gradient-text">Pay</span> <span style={{ fontSize: 12, opacity: 0.5, marginLeft: 8, fontWeight: 400 }}>Área de Membros</span></span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ textAlign: 'right', display: 'none', md: 'block' } as any}>
                        <p style={{ fontSize: 13, fontWeight: 500 }}>{user?.name || 'Estudante'}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{user?.email}</p>
                    </div>
                    <button onClick={handleLogout} style={{
                        background: 'none', border: 'none', color: 'var(--text-secondary)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14
                    }}>
                        <FiLogOut size={16} /> <span style={{ display: 'none' } as any}>Sair</span>
                    </button>
                </div>
            </nav>

            <main style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 24px' }}>
                <header style={{ marginBottom: 32 }}>
                    <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Área de <span className="gradient-text">Membros</span></h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Bem-vindo de volta, {user?.name?.split(' ')[0] || 'Estudante'}!</p>
                </header>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 32, borderBottom: '1px solid var(--border-color)', paddingBottom: 0 }}>
                    {[
                        { key: 'products', label: 'Meus Produtos', icon: <FiBookOpen size={15} /> },
                        { key: 'subscriptions', label: 'Minhas Assinaturas', icon: <FiRepeat size={15} /> }
                    ].map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} style={{
                            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
                            background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                            color: activeTab === tab.key ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            borderBottom: activeTab === tab.key ? '2px solid var(--accent-primary)' : '2px solid transparent',
                            marginBottom: -1
                        }}>
                            {tab.icon} {tab.label}
                            {tab.key === 'subscriptions' && subscriptions.length > 0 && (
                                <span style={{ background: 'var(--accent-primary)', color: 'white', borderRadius: 20, padding: '1px 7px', fontSize: 11 }}>
                                    {subscriptions.filter((s: any) => s.status === 'active').length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Produtos */}
                {activeTab === 'products' && (products.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
                        {products.map((product) => (
                            <div key={product.id} className="glass-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ height: 160, background: 'var(--bg-secondary)', position: 'relative' }}>
                                    {product.image_url ? (
                                        <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <FiPackage size={48} style={{ opacity: 0.1 }} />
                                        </div>
                                    )}
                                    <div style={{
                                        position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                                        display: 'flex', alignItems: 'flex-end', padding: 16
                                    }}>
                                        <span className="badge badge-info" style={{ fontSize: 10 }}>Acesso Vitalício</span>
                                    </div>
                                </div>
                                <div style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{product.name}</h3>
                                    <p style={{
                                        color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24, flex: 1,
                                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                                    }}>
                                        {product.description || 'Acesse o conteúdo exclusivo deste produto.'}
                                    </p>
                                    <Link href={`/area-membros/curso/${product.id}`} className="btn-primary" style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%'
                                    }}>
                                        <FiPlay size={16} /> Acessar Conteúdo
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="glass-card" style={{ textAlign: 'center', padding: '80px 24px' }}>
                        <FiBookOpen size={64} style={{ marginBottom: 24, opacity: 0.1 }} />
                        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Nenhum curso encontrado</h2>
                        <p style={{ color: 'var(--text-secondary)', maxWidth: 400, margin: '0 auto 32px' }}>
                            Você ainda não possui produtos digitais vinculados a este e-mail.
                        </p>
                        <Link href="/" style={{ color: 'var(--accent-primary)', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            Voltar para o site <FiArrowRight size={14} />
                        </Link>
                    </div>
                ))}

                {/* Assinaturas */}
                {activeTab === 'subscriptions' && (subscriptions.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {subscriptions.map((sub: any) => {
                            const statusMap: Record<string, { label: string; color: string }> = {
                                active:   { label: 'Ativa',     color: '#00cec9' },
                                pending:  { label: 'Pendente',  color: '#f39c12' },
                                past_due: { label: 'Em atraso', color: '#e17055' },
                                canceled: { label: 'Cancelada', color: '#636e72' },
                            };
                            const st = statusMap[sub.status] || { label: sub.status, color: '#636e72' };
                            const intervalLabel = sub.subscription_plans?.interval === 'month' ? 'mês' : sub.subscription_plans?.interval === 'week' ? 'semana' : 'ano';
                            return (
                                <div key={sub.id} className="glass-card" style={{ padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(0,206,201,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <FiRepeat size={20} color="#00cec9" />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 15 }}>{sub.subscription_plans?.name || 'Assinatura'}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                                R$ {(sub.amount / 100).toFixed(2).replace('.', ',')} / {intervalLabel}
                                                {sub.current_period_end && ` • Próxima cobrança: ${new Date(sub.current_period_end).toLocaleDateString('pt-BR')}`}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <span style={{ background: `${st.color}22`, color: st.color, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                                            {st.label}
                                        </span>
                                        <Link href={`/my-subscription/${sub.id}`} style={{
                                            padding: '8px 16px', borderRadius: 10, border: '1px solid var(--border-color)',
                                            color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, textDecoration: 'none',
                                            display: 'flex', alignItems: 'center', gap: 6
                                        }}>
                                            Gerenciar <FiArrowRight size={13} />
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="glass-card" style={{ textAlign: 'center', padding: '80px 24px' }}>
                        <FiRepeat size={64} style={{ marginBottom: 24, opacity: 0.1 }} />
                        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Nenhuma assinatura ativa</h2>
                        <p style={{ color: 'var(--text-secondary)' }}>Você não possui assinaturas ativas no momento.</p>
                    </div>
                ))}
            </main>

            <style jsx>{`
                .glass-card {
                    transition: transform 0.2s, border-color 0.2s;
                }
                .glass-card:hover {
                    transform: translateY(-4px);
                    border-color: var(--accent-primary);
                }
            `}</style>
        </div>
    );
}
