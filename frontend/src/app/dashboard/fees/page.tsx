'use client';

import { FiCheckCircle, FiZap, FiCreditCard } from 'react-icons/fi';

export default function FeesPage() {
    const fees = [
        {
            method: 'Pix',
            platform: '2.00%',
            gateway: '1.09%',
            total: '3.09%',
            payout: 'Na hora',
            icon: <FiZap size={24} color="#00cec9" />,
            description: 'O método mais rápido e barato para você e para o cliente.'
        },
        {
            method: 'Cartão de crédito',
            payout: 'D+30',
            icon: <FiCreditCard size={24} color="#6366f1" />,
            description: 'Liberação em D+30. Limite de parcelamento até 12x.'
        }
    ];

    const cardMdr = [
        { label: 'Crédito à vista', value: '3,19%' },
        { label: 'Parcelado 2–6', value: '4,49%' },
        { label: 'Parcelado 7–12', value: '4,99%' }
    ];

    const extraFees = [
        { label: 'Antecipação Autom.', value: '2,89%' },
        { label: 'Pix', value: '1,09%' },
        { label: 'Boleto', value: '3,19%' },
        { label: 'Gateway', value: 'R$ 0,55' },
        { label: 'Antifraude', value: 'R$ 0,44' },
        { label: 'Taxa de saque', value: 'R$ 3,67' }
    ];

    const cet15Days = [
        { label: 'Crédito à vista', value: '4,59%' },
        { label: 'Parcelado em 2x', value: '7,41%' },
        { label: 'Parcelado em 3x', value: '8,79%' },
        { label: 'Parcelado em 4x', value: '10,17%' },
        { label: 'Parcelado em 5x', value: '11,55%' },
        { label: 'Parcelado em 6x', value: '12,93%' },
        { label: 'Parcelado em 7x', value: '14,76%' },
        { label: 'Parcelado em 8x', value: '16,13%' },
        { label: 'Parcelado em 9x', value: '17,50%' },
        { label: 'Parcelado em 10x', value: '18,88%' },
        { label: 'Parcelado em 11x', value: '20,25%' },
        { label: 'Parcelado em 12x', value: '21,62%' }
    ];

    return (
        <div className="animate-fade-in">
            <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Taxas da Plataforma</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Transparência total nos seus recebíveis</p>
            </div>


            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 400px))', gap: 20, marginBottom: 32, justifyContent: 'center' }}>
                {fees.map((fee, i) => (
                    <div key={i} className="glass-card" style={{ padding: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <div style={{ padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.03)' }}>
                                {fee.icon}
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: 20 }}>
                                Receba: {fee.payout}
                            </span>
                        </div>

                        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{fee.method}</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24, height: 40 }}>{fee.description}</p>

                        {fee.method !== 'Cartão de crédito' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Taxa Plataforma</span>
                                    <span style={{ fontWeight: 600 }}>2.00%</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Taxa Gateway</span>
                                    <span style={{ fontWeight: 600 }}>1.09%</span>
                                </div>
                                <div style={{ height: 1, background: 'var(--border-color)', margin: '4px 0' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700 }}>
                                    <span>Total Estimado</span>
                                    <span className="gradient-text">3.09%</span>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Crédito à vista</span>
                                    <span style={{ fontWeight: 700 }}>3,19%</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Crédito parcelado 2–6x</span>
                                    <span style={{ fontWeight: 700 }}>4,49%</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Crédito parcelado 7–12x</span>
                                    <span style={{ fontWeight: 700 }}>4,99%</span>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="glass-card" style={{ padding: 24, textAlign: 'center' }}>
                <FiCheckCircle size={32} color="var(--success)" style={{ marginBottom: 16, opacity: 0.8 }} />
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Sem Taxas Ocultas</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                    Você só paga quando vende. Não cobramos mensalidade, taxa de adesão ou taxas por saque.
                </p>
            </div>

            <div style={{ height: 18 }} />

            <div className="glass-card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Taxa por tipo de transação (Cartão)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {cardMdr.map((row, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                            <span style={{ color: 'var(--text-muted)' }}>{row.label}</span>
                            <span style={{ fontWeight: 700 }}>{row.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ height: 18 }} />

            <div className="glass-card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Custos por transação</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                    {extraFees.map((row, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: 10 }}>
                            <span style={{ color: 'var(--text-muted)' }}>{row.label}</span>
                            <span style={{ fontWeight: 700 }}>{row.value}</span>
                        </div>
                    ))}
                </div>
                <div style={{ marginTop: 10, color: 'var(--text-secondary)', fontSize: 12 }}>
                    Liberação do cartão em D+30. Limite de parcelamento até 12x.
                </div>
            </div>

        </div>
    );
}
