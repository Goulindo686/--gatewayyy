'use client';

import { useEffect, useRef, useState } from 'react';
import { authAPI } from '@/lib/api';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    FiAlertTriangle,
    FiArrowDown,
    FiCalendar,
    FiCheckCircle,
    FiDollarSign,
    FiExternalLink,
    FiInfo,
    FiLock,
    FiShield,
    FiTrendingUp,
    FiXCircle,
    FiClock,
} from 'react-icons/fi';

export default function WithdrawalsPage() {
    const [balance, setBalance] = useState<any>(null);
    const [withdrawals, setWithdrawals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [amount, setAmount] = useState('');
    const [requesting, setRequesting] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const requestingRef = useRef(false);
    const WITHDRAWAL_FEE = 3.67;

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const headers = { Authorization: `Bearer ${token}` };

            const [balanceRes, withdrawalsRes] = await Promise.all([
                axios.get('/api/withdrawals/balance', { headers }),
                axios.get('/api/withdrawals', { headers })
            ]);
            setBalance(balanceRes.data.data || balanceRes.data);
            setWithdrawals(withdrawalsRes.data.data?.withdrawals || withdrawalsRes.data.withdrawals || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        setVerifying(true);
        // Abre a janela ANTES do await para não ser bloqueado pelo Safari no iPhone
        const newWindow = window.open('', '_blank');
        try {
            const { data } = await authAPI.getKycLink();
            if (data.url) {
                if (newWindow) {
                    newWindow.location.href = data.url;
                } else {
                    // Fallback: redireciona na mesma aba se popup foi bloqueado
                    window.location.href = data.url;
                }
                toast.success('Link de verificação aberto!');
            } else {
                newWindow?.close();
                toast.error('Não foi possível gerar o link de verificação');
            }
        } catch (err: any) {
            newWindow?.close();
            toast.error(err.response?.data?.error || 'Erro ao gerar link de verificação');
        } finally {
            setVerifying(false);
        }
    };

    const handleWithdraw = async () => {
        if (requestingRef.current) return;

        const value = parseFloat(amount);
        const available = parseFloat(balance?.available || '0');
        const maxConsideringFee = Math.max(0, available - WITHDRAWAL_FEE);
        if (!value || value < 5) return toast.error('O valor mínimo para saque é R$ 5,00');
        if (value + WITHDRAWAL_FEE > available) {
            const maxText = maxConsideringFee.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            return toast.error(`Saldo insuficiente considerando a taxa de R$ ${WITHDRAWAL_FEE.toFixed(2).replace('.', ',')}. Máximo por saque: R$ ${maxText}`);
        }

        requestingRef.current = true;
        setRequesting(true);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            await axios.post('/api/withdrawals', { amount: value }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            toast.success('Saque solicitado!');
            setAmount('');
            loadData();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao solicitar saque');
        } finally {
            requestingRef.current = false;
            setRequesting(false);
        }
    };

    const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
        pending: { icon: <FiClock size={14} />, color: 'var(--warning)', label: 'Em analise' },
        processing: { icon: <FiClock size={14} />, color: 'var(--warning)', label: 'Em analise' },
        completed: { icon: <FiCheckCircle size={14} />, color: 'var(--success)', label: 'Sacado' },
        failed: { icon: <FiXCircle size={14} />, color: 'var(--danger)', label: 'Falhou' },
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                <div style={{ width: 36, height: 36, border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    const needsVerification = balance?.recipient_status !== 'active';
    const availableDisplay = Number(balance?.available || 0);
    const maxConsideringFee = Math.max(0, availableDisplay - WITHDRAWAL_FEE);
    const exampleBalance = 100;
    const exampleMax = Math.max(0, exampleBalance - WITHDRAWAL_FEE);
    const affiliateBalance = balance?.affiliate_balance || {};
    const formatMoney = (value: unknown) =>
        Number(value || 0).toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    const nextReleaseAt = affiliateBalance.next_release_at
        ? new Date(affiliateBalance.next_release_at)
        : null;
    const hasValidNextRelease = Boolean(
        nextReleaseAt && Number.isFinite(nextReleaseAt.getTime()),
    );

    return (
        <div className="animate-fade-in">
            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 28 }}>Saques</h1>

            {/* Verification Notice */}
            {needsVerification && (
                <div className="glass-card" style={{
                    padding: 24,
                    marginBottom: 32,
                    border: '1px solid rgba(255, 171, 0, 0.2)',
                    background: 'linear-gradient(135deg, rgba(255, 171, 0, 0.1) 0%, rgba(255, 107, 107, 0.05) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 20,
                    flexWrap: 'wrap'
                }}>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flex: 1 }}>
                        <div style={{
                            width: 48, height: 48, borderRadius: 12,
                            background: 'rgba(255, 171, 0, 0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#ffab00'
                        }}>
                            <FiLock size={24} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>Ative a movimentação do seu saldo</h3>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, maxWidth: 500, fontWeight: 500 }}>
                                Para liberar saques e movimentar seu saldo, o Pagar.me exige a verificação de identidade (foto do documento e rosto). Seus dados são processados com total segurança pelo Pagar.me, uma instituição de pagamentos regulamentada pelo Banco Central do Brasil.
                            </p>
                        </div>
                    </div>
                    <button
                        className="btn-primary"
                        onClick={handleVerify}
                        disabled={verifying}
                        style={{
                            background: '#ffab00',
                            color: '#000',
                            fontWeight: 700,
                            padding: '12px 24px'
                        }}
                    >
                        {verifying ? 'Gerando link...' : 'Fazer Verificação Agora'}
                    </button>
                </div>
            )}

            {/* Balance Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
                {[
                    { label: 'Saldo Disponível', value: balance?.available || '0.00', color: '#00cec9', icon: <FiDollarSign size={20} /> },
                    { label: 'A Receber', value: balance?.pending || '0.00', color: '#fdcb6e', icon: <FiClock size={20} /> },
                    { label: 'Total Vendido', value: balance?.total_sold || '0.00', color: '#6c5ce7', icon: <FiArrowDown size={20} /> },
                    { label: 'Total Sacado', value: balance?.total_withdrawn || '0.00', color: '#74b9ff', icon: <FiCheckCircle size={20} /> },
                ].map((card, i) => (
                    <div key={i} className="stat-card">
                        <div style={{
                            width: 40, height: 40, borderRadius: 10, marginBottom: 16,
                            background: `${card.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: card.color
                        }}>{card.icon}</div>
                        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
                            R$ {Number(card.value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{card.label}</div>
                    </div>
                ))}
            </div>

            {/* Affiliate Balance */}
            <section
                className="glass-card"
                style={{
                    marginBottom: 32,
                    overflow: 'hidden',
                    border: '1px solid rgba(108, 92, 231, 0.2)',
                }}
            >
                <div
                    style={{
                        padding: '22px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16,
                        flexWrap: 'wrap',
                        background: 'linear-gradient(135deg, rgba(108, 92, 231, 0.14), rgba(0, 206, 201, 0.06))',
                        borderBottom: '1px solid var(--border-color)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div
                            style={{
                                width: 44,
                                height: 44,
                                borderRadius: 12,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#8b7cf6',
                                background: 'rgba(108, 92, 231, 0.14)',
                            }}
                        >
                            <FiTrendingUp size={22} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: 18, fontWeight: 750, margin: 0 }}>Saldo afiliado</h2>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                                Acompanhe separadamente as comissões geradas pelas suas vendas como afiliado.
                            </p>
                        </div>
                    </div>
                    <div
                        style={{
                            padding: '7px 11px',
                            borderRadius: 999,
                            background: 'rgba(108, 92, 231, 0.12)',
                            color: '#8b7cf6',
                            fontSize: 12,
                            fontWeight: 700,
                        }}
                    >
                        {Number(affiliateBalance.sales_count || 0)} venda{Number(affiliateBalance.sales_count || 0) === 1 ? '' : 's'} com comissão
                    </div>
                </div>

                <div style={{ padding: 24 }}>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))',
                            gap: 14,
                        }}
                    >
                        {[
                            {
                                label: 'Total confirmado',
                                value: affiliateBalance.total_confirmed,
                                detail: 'Comissões válidas acumuladas',
                                color: '#8b7cf6',
                                icon: <FiTrendingUp size={18} />,
                            },
                            {
                                label: 'Liberado para o saldo',
                                value: affiliateBalance.released,
                                detail: 'Já compõe o saldo disponível geral',
                                color: '#00cec9',
                                icon: <FiCheckCircle size={18} />,
                            },
                            {
                                label: 'Em segurança',
                                value: affiliateBalance.security_hold,
                                detail: 'Será liberado após o prazo',
                                color: '#fdcb6e',
                                icon: <FiShield size={18} />,
                            },
                            {
                                label: 'Aguardando pagamento',
                                value: affiliateBalance.pending_payment,
                                detail: 'Compras ainda não confirmadas',
                                color: '#74b9ff',
                                icon: <FiClock size={18} />,
                            },
                        ].map((card) => (
                            <article
                                key={card.label}
                                style={{
                                    padding: 17,
                                    borderRadius: 13,
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-secondary)',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: card.color, marginBottom: 13 }}>
                                    {card.icon}
                                    <span style={{ fontSize: 12, fontWeight: 700 }}>{card.label}</span>
                                </div>
                                <strong style={{ display: 'block', fontSize: 21, marginBottom: 5 }}>
                                    R$ {formatMoney(card.value)}
                                </strong>
                                <small style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                                    {card.detail}
                                </small>
                            </article>
                        ))}
                    </div>

                    <div
                        style={{
                            marginTop: 16,
                            padding: 16,
                            borderRadius: 13,
                            border: '1px solid rgba(108, 92, 231, 0.18)',
                            background: 'rgba(108, 92, 231, 0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 16,
                            flexWrap: 'wrap',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <FiCalendar size={20} color="#8b7cf6" />
                            <div>
                                <strong style={{ display: 'block', fontSize: 13, marginBottom: 3 }}>Próxima liberação</strong>
                                {hasValidNextRelease ? (
                                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                        <strong style={{ color: 'var(--text-primary)' }}>
                                            R$ {formatMoney(affiliateBalance.next_release_amount)}
                                        </strong>
                                        {' em '}
                                        {nextReleaseAt!.toLocaleDateString('pt-BR', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                        })}
                                    </span>
                                ) : (
                                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                        Nenhuma comissão aguardando prazo de segurança.
                                    </span>
                                )}
                            </div>
                        </div>
                        <a
                            href="/dashboard/affiliates"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 7,
                                color: '#8b7cf6',
                                fontSize: 12,
                                fontWeight: 700,
                                textDecoration: 'none',
                            }}
                        >
                            Ver histórico de comissões <FiExternalLink size={14} />
                        </a>
                    </div>

                    {(Number(affiliateBalance.reversed || 0) > 0 || Number(affiliateBalance.risk_reserve || 0) > 0) && (
                        <div
                            style={{
                                marginTop: 12,
                                padding: '11px 14px',
                                borderRadius: 10,
                                background: 'rgba(255, 107, 107, 0.07)',
                                color: 'var(--text-secondary)',
                                fontSize: 12,
                                lineHeight: 1.5,
                            }}
                        >
                            Estornos e chargebacks: <strong>R$ {formatMoney(affiliateBalance.reversed)}</strong>
                            {Number(affiliateBalance.risk_reserve || 0) > 0 && (
                                <> · Reserva de risco atual: <strong>R$ {formatMoney(affiliateBalance.risk_reserve)}</strong></>
                            )}
                        </div>
                    )}

                    <p style={{ margin: '14px 2px 0', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        Os valores liberados não são somados novamente: eles já fazem parte do
                        <strong> Saldo Disponível</strong> mostrado no início desta página. O saque continua sendo solicitado uma única vez pelo formulário abaixo.
                    </p>
                </div>
            </section>

            {/* Withdraw Form */}
            <div className={`glass-card ${needsVerification ? 'disabled-section' : ''}`} style={{
                padding: 28,
                marginBottom: 32,
                opacity: needsVerification ? 0.6 : 1,
                pointerEvents: needsVerification ? 'none' : 'auto',
                position: 'relative'
            }}>
                {needsVerification && (
                    <div style={{
                        position: 'absolute', inset: 0, zIndex: 10, display: 'flex',
                        alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.1)', borderRadius: 16
                    }}>
                        <div style={{ background: '#1a1a1a', padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600, color: '#ffab00', border: '1px solid #ffab00' }}>
                            <FiLock size={12} style={{ marginRight: 6 }} /> Verificação pendente
                        </div>
                    </div>
                )}
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Solicitar Saque via Pix</h3>
                <div style={{
                    display: 'flex', flexDirection: 'column', gap: 8, padding: 14,
                    background: 'rgba(255, 171, 0, 0.08)', borderRadius: 12, border: '1px solid rgba(255, 171, 0, 0.16)',
                    marginBottom: 18
                }}>
                    <div style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', fontWeight: 750, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FiAlertTriangle size={16} color="#ffab00" /> ⚠️ Atenção na hora do saque!
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                        Toda retirada tem uma taxa fixa de{' '}
                        <strong>R$ {WITHDRAWAL_FEE.toFixed(2).replace('.', ',')}</strong> (cobrada pelo Pagar.me).
                        Então, na hora de sacar, você precisa pedir o valor já descontando essa taxa.
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                        ✅ Exemplo:
                        <ul style={{ margin: '8px 0 0', paddingLeft: 20, lineHeight: 1.55 }}>
                            <li>
                                Se você tem <strong>R$ {exampleBalance.toFixed(2).replace('.', ',')}</strong>, o valor máximo para sacar é{' '}
                                <strong>R$ {exampleMax.toFixed(2).replace('.', ',')}</strong>.
                            </li>
                            <li>Se tentar sacar os <strong>R$ {exampleBalance.toFixed(2).replace('.', ',')}</strong> completos, o saque não será concluído.</li>
                        </ul>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                        👉 Então sempre faça o saque já descontando a taxa de{' '}
                        <strong>R$ {WITHDRAWAL_FEE.toFixed(2).replace('.', ',')}</strong>.
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 20 }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Valor (R$)</label>
                        <input type="number" step="0.01" min="5" className="input-field" placeholder="0.00"
                            value={amount} onChange={e => setAmount(e.target.value)} />
                        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                            Máximo por saque (considerando taxa):{' '}
                            <strong style={{ color: 'var(--text-secondary)' }}>
                                R$ {maxConsideringFee.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </strong>
                        </div>
                    </div>
                    <button className="btn-primary" onClick={handleWithdraw} disabled={requesting || needsVerification}
                        style={{ padding: '14px 32px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FiArrowDown size={16} />
                        {requesting ? 'Processando...' : 'Solicitar Saque'}
                    </button>
                </div>

                <div style={{
                    display: 'flex', flexDirection: 'column', gap: 8, padding: 16,
                    background: 'rgba(255,107,107,0.06)', borderRadius: 12, border: '1px solid rgba(255,107,107,0.1)'
                }}>
                    <p style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FiInfo size={16} color="#ff6b6b" /> Informações Importantes:
                    </p>
                    <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        <li>O valor mínimo para saque é de <strong>R$ 5,00</strong>.</li>
                        <li>Cada transferência possui uma taxa de <strong>R$ 3,67</strong> (cobrada pelo Pagar.me).</li>
                        <li>Para sacar o saldo total, solicite o valor do saque já descontando a taxa (ex.: saldo R$ 2.000,00 → solicite R$ 1.996,33).</li>
                        <li>O valor será transferido para a chave Pix cadastrada no seu perfil.</li>
                    </ul>
                </div>
            </div>

            {/* Withdrawal History */}
            <div className="glass-card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Histórico de Saques</h3>
                {withdrawals.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Valor</th>
                                    <th>Chave Pix</th>
                                    <th>Status</th>
                                    <th>Data</th>
                                </tr>
                            </thead>
                            <tbody>
                                {withdrawals.map((w: any) => {
                                    const st = statusConfig[w.status] || statusConfig.pending;
                                    return (
                                        <tr key={w.id}>
                                            <td style={{ fontWeight: 600 }}>R$ {w.amount_display}</td>
                                            <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{w.pix_key || '—'}</td>
                                            <td>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: st.color, fontSize: 13, fontWeight: 500 }}>
                                                    {st.icon} {st.label}
                                                </span>
                                            </td>
                                            <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                                                {new Date(w.created_at).toLocaleDateString('pt-BR')}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                        <FiArrowDown size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
                        <p>Nenhum saque realizado ainda</p>
                    </div>
                )}
            </div>
        </div>
    );
}
