'use client';

import { FiZap, FiCreditCard, FiInfo, FiCheckCircle } from 'react-icons/fi';

export default function FeesPage() {

    const pixExamples = [
        { sale: 10 },
        { sale: 30 },
        { sale: 50 },
        { sale: 100 },
        { sale: 250 },
        { sale: 500 },
    ];

    return (
        <div className="animate-fade-in">
            <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Taxas da Plataforma</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Transparência total nos seus recebíveis</p>
            </div>

            {/* Cards de métodos */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 400px))', gap: 20, marginBottom: 32, justifyContent: 'center' }}>

                {/* PIX */}
                <div className="glass-card" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <div style={{ padding: 12, borderRadius: 12, background: 'rgba(0,206,201,0.08)' }}>
                            <FiZap size={24} color="#00cec9" />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#00cec9', background: 'rgba(0,206,201,0.1)', padding: '4px 10px', borderRadius: 20 }}>
                            Receba: Na hora
                        </span>
                    </div>

                    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Pix</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24 }}>
                        O método mais rápido. Recebimento instantâneo após confirmação do pagamento.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 15 }}>
                            <span style={{ color: 'var(--text-muted)' }}>Taxa por venda</span>
                            <span style={{ fontWeight: 700, fontSize: 18 }}>R$ 2,00 <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 14 }}>+ 1,09%</span></span>
                        </div>
                        <div style={{ height: 1, background: 'var(--border-color)', margin: '4px 0' }} />
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                            <FiInfo size={13} style={{ color: 'var(--text-muted)', marginTop: 2, flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                R$2,00 fixo + 1,09% sobre o valor da venda. Sem taxas ocultas.
                            </span>
                        </div>
                    </div>
                </div>

                {/* Cartão — OFF */}
                <div className="glass-card" style={{ padding: 24, opacity: 0.6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <div style={{ padding: 12, borderRadius: 12, background: 'rgba(99,102,241,0.08)' }}>
                            <FiCreditCard size={24} color="#6366f1" />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: 20 }}>
                            Em breve
                        </span>
                    </div>

                    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Cartão de Crédito</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24 }}>
                        Pagamento via cartão de crédito. Disponível em breve.
                    </p>

                    <div style={{
                        padding: 16, borderRadius: 10, background: 'rgba(255,255,255,0.03)',
                        border: '1px dashed var(--border-color)', textAlign: 'center'
                    }}>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                            🚧 Método temporariamente desativado
                        </span>
                    </div>
                </div>
            </div>

            {/* Tabela de exemplos PIX */}
            <div className="glass-card" style={{ padding: 28 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Simulador de recebimento — PIX</h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 500 }}>Valor da venda</th>
                                <th style={{ textAlign: 'right', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 500 }}>Taxa plataforma</th>
                                <th style={{ textAlign: 'right', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 500 }}>1,09%</th>
                                <th style={{ textAlign: 'right', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 500 }}>Você recebe</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pixExamples.map(({ sale }) => {
                                const pagarme = sale * 0.0109;
                                const seller = sale - 2.0 - pagarme;
                                return (
                                    <tr key={sale} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                        <td style={{ padding: '12px 12px', fontWeight: 600 }}>R$ {sale.toFixed(2)}</td>
                                        <td style={{ padding: '12px 12px', textAlign: 'right', color: 'var(--danger)' }}>R$ 2,00</td>
                                        <td style={{ padding: '12px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>R$ {pagarme.toFixed(2)}</td>
                                        <td style={{ padding: '12px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>R$ {seller.toFixed(2)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div style={{ marginTop: 20, display: 'flex', alignItems: 'flex-start', gap: 10, padding: 16, borderRadius: 10, background: 'rgba(0,206,201,0.05)', border: '1px solid rgba(0,206,201,0.1)' }}>
                    <FiCheckCircle size={16} color="#00cec9" style={{ marginTop: 2, flexShrink: 0 }} />
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        A taxa é sempre <strong>R$2,00 fixo + 1,09%</strong> sobre o valor da venda. Simples, transparente e sem surpresas.
                    </p>
                </div>
            </div>
        </div>
    );
}
