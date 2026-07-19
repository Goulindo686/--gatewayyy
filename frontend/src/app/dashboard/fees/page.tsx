'use client';

import { useEffect, useState } from 'react';
import { FiZap, FiCreditCard } from 'react-icons/fi';
import { billingAPI } from '@/lib/api';

type PixFeeDisplay = {
    fee_type: 'default' | 'exempt' | 'fixed' | 'percentage';
    fixed_fee_cents: number | null;
    percentage: number | null;
    default_fee_cents?: number;
};

export default function FeesPage() {
    const [pixFee, setPixFee] = useState<PixFeeDisplay | null>(null);

    useEffect(() => {
        billingAPI.getStats()
            .then(({ data }) => setPixFee(data?.stats?.pix_fee || null))
            .catch(() => setPixFee(null));
    }, []);

    const platformPixLabel = !pixFee || pixFee.fee_type === 'default'
        ? `R$ ${(Number(pixFee?.default_fee_cents ?? 200) / 100).toFixed(2).replace('.', ',')}`
        : pixFee.fee_type === 'exempt'
            ? 'Isento GouPay'
            : pixFee.fee_type === 'fixed'
                ? `R$ ${(Number(pixFee.fixed_fee_cents || 0) / 100).toFixed(2).replace('.', ',')}`
                : `${Number(pixFee.percentage || 0).toLocaleString('pt-BR')}%`;

    return (
        <div className="animate-fade-in">
            <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Taxas da Plataforma</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                    Veja exatamente quanto você recebe em cada venda.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }} className="fees-grid">

                {/* ── PIX ── */}
                <div className="glass-card" style={{ padding: 28 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <FiZap size={20} color="#00cec9" />
                        <h2 style={{ fontSize: 18, fontWeight: 700 }}>PIX</h2>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
                        Taxa cobrada por venda
                    </p>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                                <th style={{ textAlign: 'left', padding: '10px 0', color: 'var(--text-muted)', fontWeight: 500 }}>Modalidade</th>
                                <th style={{ textAlign: 'right', padding: '10px 0', color: 'var(--text-muted)', fontWeight: 500 }}>Taxa</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{ padding: '16px 0', fontWeight: 600 }}>À vista</td>
                                <td style={{ padding: '16px 0', textAlign: 'right', fontWeight: 800, fontSize: 16, color: '#00cec9' }}>
                                    {platformPixLabel} + 1,09%
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* ── CARTÃO ── */}
                <div className="glass-card" style={{ padding: 28 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <FiCreditCard size={20} color="#6366f1" />
                        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Cartão de Crédito</h2>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
                        Taxa cobrada por venda
                    </p>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                                <th style={{ textAlign: 'left', padding: '10px 0', color: 'var(--text-muted)', fontWeight: 500 }}>Modalidade</th>
                                <th style={{ textAlign: 'right', padding: '10px 0', color: 'var(--text-muted)', fontWeight: 500 }}>Taxa total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                { label: 'Crédito à vista',   installments: '1x',       rate: '5,19%' },
                                { label: 'Crédito parcelado', installments: '2 – 6x',   rate: '6,49%' },
                                { label: 'Crédito parcelado', installments: '7 – 12x',  rate: '6,99%' },
                                { label: 'Crédito parcelado', installments: '13 – 18x', rate: '6,99%' },
                            ].map((r, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '14px 0', fontWeight: 600 }}>
                                        {r.label}
                                        <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>{r.installments}</span>
                                    </td>
                                    <td style={{ padding: '14px 0', textAlign: 'right', fontWeight: 800, color: '#6366f1', whiteSpace: 'nowrap' }}>
                                        {r.rate}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <style jsx>{`
                @media (max-width: 640px) {
                    .fees-grid { grid-template-columns: 1fr !important; }
                }
            `}</style>
        </div>
    );
}
