'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiDollarSign, FiCopy, FiCheck, FiX, FiClock, FiTrendingUp, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
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
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <h3 style={{ fontSize: 20, fontWeight: 600 }}>Nova Cobrança</h3>
                            <button onClick={() => setShowCreateModal(false)} className="btn-icon">
                                <FiX size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateCharge}>
                            <div style={{ marginBottom: 20 }}>
                                <label className="form-label">Valor (R$)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="form-input"
                                    placeholder="0,00"
                                    required
                                    autoFocus
                                />
                            </div>

                            <div style={{ marginBottom: 20 }}>
                                <label className="form-label">Descrição (opcional)</label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="form-input"
                                    placeholder="Ex: Pagamento de serviço"
                                    maxLength={100}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                                <div>
                                    <label className="form-label">Nome do Cliente</label>
                                    <input
                                        type="text"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        className="form-input"
                                        placeholder="Nome completo"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="form-label">CPF/CNPJ do Cliente</label>
                                    <input
                                        type="text"
                                        value={customerDoc}
                                        onChange={(e) => setCustomerDoc(e.target.value)}
                                        className="form-input"
                                        placeholder="000.000.000-00"
                                        required
                                    />
                                </div>
                            </div>

                            {user?.role !== 'admin' && (
                                <div style={{
                                    padding: 12,
                                    borderRadius: 8,
                                    background: 'var(--bg-secondary)',
                                    marginBottom: 20,
                                    fontSize: 13
                                }}>
                                    <strong>Taxa da plataforma:</strong> R$ 2,00 por cobrança paga
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 12 }}>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="btn btn-secondary"
                                    style={{ flex: 1 }}
                                    disabled={creating}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ flex: 1 }}
                                    disabled={creating}
                                >
                                    {creating ? 'Gerando...' : 'Gerar Cobrança'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {showPaymentModal && selectedBilling && (
                <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <h3 style={{ fontSize: 20, fontWeight: 600 }}>Pagamento via PIX</h3>
                            <button onClick={() => setShowPaymentModal(false)} className="btn-icon">
                                <FiX size={20} />
                            </button>
                        </div>

                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 4 }}>Valor da cobrança</div>
                                <div style={{ fontSize: 32, fontWeight: 700 }}>R$ {selectedBilling.amount_display}</div>
                            </div>

                            {selectedBilling.pix_qr_code_url && (
                                <div style={{
                                    display: 'inline-block',
                                    padding: 16,
                                    background: 'white',
                                    borderRadius: 12,
                                    marginBottom: 20
                                }}>
                                    <QRCodeSVG value={selectedBilling.pix_qr_code} size={200} />
                                </div>
                            )}

                            <div style={{ marginBottom: 20 }}>
                                <label className="form-label" style={{ textAlign: 'left' }}>PIX Copia e Cola</label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input
                                        type="text"
                                        value={selectedBilling.pix_qr_code}
                                        readOnly
                                        className="form-input"
                                        style={{ fontSize: 12, fontFamily: 'monospace' }}
                                    />
                                    <button
                                        onClick={() => copyToClipboard(selectedBilling.pix_qr_code)}
                                        className="btn btn-primary"
                                        style={{ minWidth: 100 }}
                                    >
                                        {copiedQR ? <FiCheck size={18} /> : <FiCopy size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={() => checkPaymentStatus(selectedBilling.id)}
                                className="btn btn-secondary"
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                            >
                                <FiRefreshCw size={18} />
                                Verificar Pagamento
                            </button>

                            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 16 }}>
                                O pagamento será confirmado automaticamente após a aprovação
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
