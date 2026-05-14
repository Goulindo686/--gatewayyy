'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiDollarSign, FiCopy, FiCheck, FiX, FiClock, FiTrendingUp, FiAlertCircle, FiRefreshCw, FiUser, FiFileText, FiCreditCard, FiZap } from 'react-icons/fi';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { billingAPI } from '@/lib/api';

interface Billing {
    id: string;
    amount: number;
    amount_display: string;
    fee_amount: number;
    fee_display: string;
    net_amount: number;
    net_display: string;
    description: string;
    status: 'pending' | 'paid' | 'expired' | 'cancelled';
    pix_qr_code: string;
    pix_qr_code_url: string;
    pix_expires_at: string;
    paid_at?: string;
    created_at: string;
}

interface Stats {
    total_billings: number;
    pending: number;
    paid: number;
    expired: number;
    cancelled: number;
    total_amount_display: string;
    total_paid_display: string;
    total_fees_display: string;
    total_net_display: string;
}

export default function BillingsPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<Stats | null>(null);
    const [billings, setBillings] = useState<Billing[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedBilling, setSelectedBilling] = useState<Billing | null>(null);
    const [copiedQR, setCopiedQR] = useState(false);
    
    // Form state
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerDoc, setCustomerDoc] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (!token || !userData) {
            router.push('/login');
            return;
        }
        setUser(JSON.parse(userData));
        loadData();
    }, [router]);

    const loadData = async () => {
        try {
            const [statsRes, billingsRes] = await Promise.all([
                billingAPI.getStats(),
                billingAPI.listCharges({ limit: 100 })
            ]);

            if (statsRes.data) {
                setStats(statsRes.data.stats);
            }

            if (billingsRes.data) {
                setBillings(billingsRes.data.billings);
            }
        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCharge = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || parseFloat(amount) <= 0) {
            toast.error('Digite um valor válido');
            return;
        }

        setCreating(true);
        try {
            const { data } = await billingAPI.createCharge({
                amount: parseFloat(amount),
                description: description || 'Cobrança',
                customer_name: customerName,
                customer_doc: customerDoc
            });

            toast.success('Cobrança gerada com sucesso!');
            
            setAmount('');
            setDescription('');
            setCustomerName('');
            setCustomerDoc('');
            setShowCreateModal(false);
            
            // Show payment modal
            setSelectedBilling(data.billing);
            setShowPaymentModal(true);
            
            // Reload data
            loadData();
        } catch (error: any) {
            const errorMessage = error.response?.data?.error || error.message || 'Erro ao criar cobrança';
            toast.error(errorMessage);
        } finally {
            setCreating(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedQR(true);
        toast.success('Código PIX copiado!');
        setTimeout(() => setCopiedQR(false), 2000);
    };

    const checkPaymentStatus = async (billingId: string) => {
        try {
            const { data } = await billingAPI.getCharge(billingId);

            if (data.billing.status === 'paid') {
                toast.success('Pagamento confirmado! 🎉');
                setShowPaymentModal(false);
                setSelectedBilling(null);
                loadData();
            } else {
                toast('Aguardando pagamento...', { icon: '⏳' });
            }
        } catch (error) {
            console.error('Error checking payment:', error);
        }
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            pending: { bg: '#FEF3C7', color: '#92400E', icon: <FiClock size={14} /> },
            paid: { bg: '#D1FAE5', color: '#065F46', icon: <FiCheck size={14} /> },
            expired: { bg: '#FEE2E2', color: '#991B1B', icon: <FiX size={14} /> },
            cancelled: { bg: '#E5E7EB', color: '#374151', icon: <FiX size={14} /> }
        };

        const style = styles[status as keyof typeof styles] || styles.pending;
        const labels = {
            pending: 'Pendente',
            paid: 'Pago',
            expired: 'Expirado',
            cancelled: 'Cancelado'
        };

        return (
            <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                background: style.bg,
                color: style.color
            }}>
                {style.icon}
                {labels[status as keyof typeof labels]}
            </span>
        );
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Cobranças</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                    Crie cobranças rápidas via PIX e receba pagamentos instantaneamente
                </p>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 32 }}>
                    <div className="card" style={{ padding: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                            <div style={{
                                width: 40,
                                height: 40,
                                borderRadius: 10,
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <FiDollarSign size={20} color="white" />
                            </div>
                            <div>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 2 }}>Total Cobranças</div>
                                <div style={{ fontSize: 24, fontWeight: 700 }}>{stats.total_billings}</div>
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ padding: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                            <div style={{
                                width: 40,
                                height: 40,
                                borderRadius: 10,
                                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <FiClock size={20} color="white" />
                            </div>
                            <div>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 2 }}>Pendentes</div>
                                <div style={{ fontSize: 24, fontWeight: 700 }}>{stats.pending}</div>
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ padding: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                            <div style={{
                                width: 40,
                                height: 40,
                                borderRadius: 10,
                                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <FiCheck size={20} color="white" />
                            </div>
                            <div>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 2 }}>Pagas</div>
                                <div style={{ fontSize: 24, fontWeight: 700 }}>{stats.paid}</div>
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ padding: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                            <div style={{
                                width: 40,
                                height: 40,
                                borderRadius: 10,
                                background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <FiTrendingUp size={20} color="white" />
                            </div>
                            <div>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 2 }}>Total Recebido</div>
                                <div style={{ fontSize: 24, fontWeight: 700 }}>R$ {stats.total_paid_display}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Button */}
            <div style={{ marginBottom: 24 }}>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                    <FiDollarSign size={18} />
                    Nova Cobrança
                </button>
            </div>

            {/* Billings List */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
                    <h3 style={{ fontSize: 18, fontWeight: 600 }}>Histórico de Cobranças</h3>
                </div>

                {billings.length === 0 ? (
                    <div style={{ padding: 60, textAlign: 'center' }}>
                        <FiAlertCircle size={48} color="var(--text-muted)" style={{ marginBottom: 16 }} />
                        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                            Nenhuma cobrança criada ainda
                        </p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Descrição</th>
                                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Valor</th>
                                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Taxa</th>
                                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Líquido</th>
                                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Status</th>
                                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Data</th>
                                    <th style={{ padding: '12px 24px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {billings.map((billing) => (
                                    <tr key={billing.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{ fontWeight: 500 }}>{billing.description}</div>
                                        </td>
                                        <td style={{ padding: '16px 24px', fontWeight: 600 }}>
                                            R$ {billing.amount_display}
                                        </td>
                                        <td style={{ padding: '16px 24px', color: 'var(--danger)' }}>
                                            R$ {billing.fee_display}
                                        </td>
                                        <td style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--success)' }}>
                                            R$ {billing.net_display}
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            {getStatusBadge(billing.status)}
                                        </td>
                                        <td style={{ padding: '16px 24px', fontSize: 13, color: 'var(--text-muted)' }}>
                                            {new Date(billing.created_at).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                            {billing.status === 'pending' && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedBilling(billing);
                                                        setShowPaymentModal(true);
                                                    }}
                                                    className="btn btn-sm btn-primary"
                                                >
                                                    Ver QR Code
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div
                    onClick={() => setShowCreateModal(false)}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 1000,
                        background: 'rgba(0,0,0,0.55)',
                        backdropFilter: 'blur(6px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '16px',
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: '100%', maxWidth: 520,
                            background: 'var(--bg-card)',
                            borderRadius: 20,
                            border: '1px solid var(--border-color)',
                            boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Modal header */}
                        <div style={{
                            padding: '22px 28px 20px',
                            borderBottom: '1px solid var(--border-color)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{
                                    width: 38, height: 38, borderRadius: 10,
                                    background: 'rgba(124,58,237,0.12)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--accent-primary)',
                                }}>
                                    <FiZap size={18} />
                                </div>
                                <div>
                                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Nova Cobrança</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>Gere um PIX instantâneo</div>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                style={{
                                    width: 32, height: 32, borderRadius: 8,
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-secondary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer',
                                }}
                            >
                                <FiX size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateCharge} style={{ padding: '24px 28px 28px' }}>

                            {/* Valor — destaque principal */}
                            <div style={{ marginBottom: 20 }}>
                                <label style={{
                                    display: 'block', fontSize: 12, fontWeight: 700,
                                    color: 'var(--text-secondary)', textTransform: 'uppercase',
                                    letterSpacing: '0.6px', marginBottom: 8,
                                }}>
                                    Valor da cobrança
                                </label>
                                <div style={{
                                    display: 'flex', alignItems: 'center',
                                    background: 'var(--bg-secondary)',
                                    border: '1.5px solid var(--border-color)',
                                    borderRadius: 12,
                                    overflow: 'hidden',
                                    transition: 'border-color 0.2s',
                                }}
                                    onFocusCapture={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
                                    onBlurCapture={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
                                >
                                    <span style={{
                                        padding: '0 14px',
                                        fontSize: 18, fontWeight: 700,
                                        color: 'var(--text-muted)',
                                        borderRight: '1px solid var(--border-color)',
                                        height: 54, display: 'flex', alignItems: 'center',
                                        background: 'var(--bg-card)',
                                        flexShrink: 0,
                                    }}>R$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0,00"
                                        required
                                        autoFocus
                                        style={{
                                            flex: 1, border: 'none', outline: 'none',
                                            background: 'transparent',
                                            padding: '0 16px',
                                            fontSize: 22, fontWeight: 700,
                                            color: 'var(--text-primary)',
                                            height: 54,
                                        }}
                                    />
                                </div>

                                {/* Preview taxa em tempo real */}
                                {amount && parseFloat(amount) > 0 && (
                                    <div style={{
                                        marginTop: 10,
                                        padding: '10px 14px',
                                        borderRadius: 10,
                                        background: 'rgba(124,58,237,0.06)',
                                        border: '1px solid rgba(124,58,237,0.15)',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        fontSize: 13,
                                    }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>
                                            Taxa: <span style={{ color: 'var(--danger)', fontWeight: 600 }}>− R$ 2,00</span>
                                        </span>
                                        <span style={{ color: 'var(--text-secondary)' }}>
                                            Você recebe:{' '}
                                            <span style={{ color: 'var(--success)', fontWeight: 700 }}>
                                                R$ {Math.max(0, parseFloat(amount) - 2).toFixed(2).replace('.', ',')}
                                            </span>
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Descrição */}
                            <div style={{ marginBottom: 16 }}>
                                <label style={{
                                    display: 'block', fontSize: 12, fontWeight: 700,
                                    color: 'var(--text-secondary)', textTransform: 'uppercase',
                                    letterSpacing: '0.6px', marginBottom: 8,
                                }}>
                                    Descrição <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span>
                                </label>
                                <div style={{
                                    display: 'flex', alignItems: 'center',
                                    background: 'var(--bg-secondary)',
                                    border: '1.5px solid var(--border-color)',
                                    borderRadius: 12, overflow: 'hidden',
                                    transition: 'border-color 0.2s',
                                }}
                                    onFocusCapture={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
                                    onBlurCapture={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
                                >
                                    <span style={{
                                        padding: '0 14px', color: 'var(--text-muted)',
                                        display: 'flex', alignItems: 'center', height: 46, flexShrink: 0,
                                    }}>
                                        <FiFileText size={16} />
                                    </span>
                                    <input
                                        type="text"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Ex: Pagamento de serviço"
                                        maxLength={100}
                                        style={{
                                            flex: 1, border: 'none', outline: 'none',
                                            background: 'transparent',
                                            padding: '0 12px 0 0',
                                            fontSize: 14, color: 'var(--text-primary)',
                                            height: 46,
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Nome + CPF/CNPJ */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                                <div>
                                    <label style={{
                                        display: 'block', fontSize: 12, fontWeight: 700,
                                        color: 'var(--text-secondary)', textTransform: 'uppercase',
                                        letterSpacing: '0.6px', marginBottom: 8,
                                    }}>
                                        Nome do cliente
                                    </label>
                                    <div style={{
                                        display: 'flex', alignItems: 'center',
                                        background: 'var(--bg-secondary)',
                                        border: '1.5px solid var(--border-color)',
                                        borderRadius: 12, overflow: 'hidden',
                                        transition: 'border-color 0.2s',
                                    }}
                                        onFocusCapture={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
                                        onBlurCapture={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
                                    >
                                        <span style={{
                                            padding: '0 12px', color: 'var(--text-muted)',
                                            display: 'flex', alignItems: 'center', height: 46, flexShrink: 0,
                                        }}>
                                            <FiUser size={15} />
                                        </span>
                                        <input
                                            type="text"
                                            value={customerName}
                                            onChange={(e) => setCustomerName(e.target.value)}
                                            placeholder="Nome completo"
                                            required
                                            style={{
                                                flex: 1, border: 'none', outline: 'none',
                                                background: 'transparent',
                                                padding: '0 10px 0 0',
                                                fontSize: 13, color: 'var(--text-primary)',
                                                height: 46,
                                            }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{
                                        display: 'block', fontSize: 12, fontWeight: 700,
                                        color: 'var(--text-secondary)', textTransform: 'uppercase',
                                        letterSpacing: '0.6px', marginBottom: 8,
                                    }}>
                                        CPF / CNPJ
                                    </label>
                                    <div style={{
                                        display: 'flex', alignItems: 'center',
                                        background: 'var(--bg-secondary)',
                                        border: '1.5px solid var(--border-color)',
                                        borderRadius: 12, overflow: 'hidden',
                                        transition: 'border-color 0.2s',
                                    }}
                                        onFocusCapture={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
                                        onBlurCapture={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
                                    >
                                        <span style={{
                                            padding: '0 12px', color: 'var(--text-muted)',
                                            display: 'flex', alignItems: 'center', height: 46, flexShrink: 0,
                                        }}>
                                            <FiCreditCard size={15} />
                                        </span>
                                        <input
                                            type="text"
                                            value={customerDoc}
                                            onChange={(e) => setCustomerDoc(e.target.value)}
                                            placeholder="000.000.000-00"
                                            required
                                            style={{
                                                flex: 1, border: 'none', outline: 'none',
                                                background: 'transparent',
                                                padding: '0 10px 0 0',
                                                fontSize: 13, color: 'var(--text-primary)',
                                                height: 46,
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Botões */}
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    disabled={creating}
                                    style={{
                                        flex: 1, height: 46, borderRadius: 10,
                                        border: '1px solid var(--border-color)',
                                        background: 'var(--bg-secondary)',
                                        color: 'var(--text-secondary)',
                                        fontWeight: 600, fontSize: 14,
                                        cursor: 'pointer',
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    style={{
                                        flex: 2, height: 46, borderRadius: 10,
                                        border: 'none',
                                        background: creating ? 'rgba(124,58,237,0.5)' : 'var(--accent-primary)',
                                        color: 'white',
                                        fontWeight: 700, fontSize: 14,
                                        cursor: creating ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                        boxShadow: creating ? 'none' : '0 2px 10px rgba(124,58,237,0.3)',
                                        transition: 'background 0.2s, box-shadow 0.2s',
                                    }}
                                >
                                    {creating ? (
                                        <>
                                            <span style={{
                                                width: 16, height: 16, borderRadius: '50%',
                                                border: '2px solid rgba(255,255,255,0.3)',
                                                borderTopColor: 'white',
                                                animation: 'spin 0.7s linear infinite',
                                                display: 'inline-block',
                                            }} />
                                            Gerando...
                                        </>
                                    ) : (
                                        <>
                                            <FiZap size={16} />
                                            Gerar Cobrança PIX
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    <style>{`
                        @keyframes spin { to { transform: rotate(360deg); } }
                        input[type=number]::-webkit-inner-spin-button,
                        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
                        input[type=number] { -moz-appearance: textfield; }
                    `}</style>
                </div>
            )}

            {/* Payment Modal */}
            {showPaymentModal && selectedBilling && (
                <div
                    onClick={() => setShowPaymentModal(false)}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 1000,
                        background: 'rgba(0,0,0,0.55)',
                        backdropFilter: 'blur(6px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '16px',
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: '100%', maxWidth: 480,
                            background: 'var(--bg-card)',
                            borderRadius: 20,
                            border: '1px solid var(--border-color)',
                            boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            padding: '22px 28px 20px',
                            borderBottom: '1px solid var(--border-color)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{
                                    width: 38, height: 38, borderRadius: 10,
                                    background: 'rgba(16,185,129,0.12)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--success)',
                                }}>
                                    <FiDollarSign size={18} />
                                </div>
                                <div>
                                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Pagamento via PIX</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>Escaneie o QR Code ou copie o código</div>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowPaymentModal(false)}
                                style={{
                                    width: 32, height: 32, borderRadius: 8,
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-secondary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer',
                                }}
                            >
                                <FiX size={16} />
                            </button>
                        </div>

                        <div style={{ padding: '24px 28px 28px' }}>

                            {/* Valor em destaque */}
                            <div style={{
                                padding: '16px 20px',
                                borderRadius: 12,
                                background: 'rgba(124,58,237,0.06)',
                                border: '1px solid rgba(124,58,237,0.15)',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                marginBottom: 24,
                            }}>
                                <div>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4 }}>
                                        Valor da cobrança
                                    </div>
                                    <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                                        R$ {selectedBilling.amount_display}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Você recebe</div>
                                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--success)' }}>
                                        R$ {selectedBilling.net_display}
                                    </div>
                                </div>
                            </div>

                            {/* QR Code */}
                            {selectedBilling.pix_qr_code && (
                                <div style={{
                                    display: 'flex', justifyContent: 'center',
                                    marginBottom: 20,
                                }}>
                                    <div style={{
                                        padding: 16,
                                        background: 'white',
                                        borderRadius: 16,
                                        border: '1px solid var(--border-color)',
                                        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                                        display: 'inline-flex',
                                    }}>
                                        <QRCodeSVG value={selectedBilling.pix_qr_code} size={188} />
                                    </div>
                                </div>
                            )}

                            {/* Instrução */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                justifyContent: 'center',
                                marginBottom: 20,
                                fontSize: 13, color: 'var(--text-muted)',
                            }}>
                                <FiClock size={14} />
                                Aguardando pagamento · expira em 30 minutos
                            </div>

                            {/* PIX Copia e Cola */}
                            <div style={{ marginBottom: 12 }}>
                                <label style={{
                                    display: 'block', fontSize: 12, fontWeight: 700,
                                    color: 'var(--text-secondary)', textTransform: 'uppercase',
                                    letterSpacing: '0.6px', marginBottom: 8,
                                }}>
                                    PIX Copia e Cola
                                </label>
                                <div style={{
                                    display: 'flex', gap: 8, alignItems: 'stretch',
                                }}>
                                    <div style={{
                                        flex: 1,
                                        background: 'var(--bg-secondary)',
                                        border: '1.5px solid var(--border-color)',
                                        borderRadius: 12,
                                        padding: '10px 14px',
                                        fontSize: 11,
                                        fontFamily: 'monospace',
                                        color: 'var(--text-secondary)',
                                        overflow: 'hidden',
                                        whiteSpace: 'nowrap',
                                        textOverflow: 'ellipsis',
                                        display: 'flex', alignItems: 'center',
                                    }}>
                                        {selectedBilling.pix_qr_code}
                                    </div>
                                    <button
                                        onClick={() => copyToClipboard(selectedBilling.pix_qr_code)}
                                        style={{
                                            height: 46, minWidth: 46, borderRadius: 12,
                                            border: copiedQR ? '1.5px solid var(--success)' : '1.5px solid var(--border-color)',
                                            background: copiedQR ? 'rgba(16,185,129,0.1)' : 'var(--bg-secondary)',
                                            color: copiedQR ? 'var(--success)' : 'var(--text-secondary)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            flexShrink: 0,
                                            gap: 6, padding: '0 14px',
                                            fontWeight: 600, fontSize: 13,
                                        }}
                                    >
                                        {copiedQR ? <><FiCheck size={15} /> Copiado</> : <><FiCopy size={15} /> Copiar</>}
                                    </button>
                                </div>
                            </div>

                            {/* Verificar pagamento */}
                            <button
                                onClick={() => checkPaymentStatus(selectedBilling.id)}
                                style={{
                                    width: '100%', height: 46, borderRadius: 10,
                                    border: '1.5px solid var(--border-color)',
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    fontWeight: 600, fontSize: 14,
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    transition: 'border-color 0.2s',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
                                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
                            >
                                <FiRefreshCw size={15} />
                                Verificar Pagamento
                            </button>

                            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 14, textAlign: 'center' }}>
                                O pagamento é confirmado automaticamente após a aprovação
                            </p>
                        </div>
                    </div>

                    <style>{`
                        @keyframes spin { to { transform: rotate(360deg); } }
                        input[type=number]::-webkit-inner-spin-button,
                        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
                        input[type=number] { -moz-appearance: textfield; }
                    `}</style>
                </div>
            )}
        </div>
    );
}
