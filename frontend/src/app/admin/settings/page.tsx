'use client';

import { useEffect, useState } from 'react';
import { adminAPI } from '@/lib/api';
import { FiDollarSign, FiInfo, FiCreditCard, FiSmartphone, FiPercent } from 'react-icons/fi';

const PIX_PLATFORM_FEE = 2.00;
const CARD_PLATFORM_PERCENT = 2.00;
const PIX_RATE = 1.09; // taxa Pagar.me no PIX

const CARD_RATES = [
    { label: 'Crédito à vista (1x)', pagarme: 3.19, installments: '1x' },
    { label: 'Crédito parcelado 2–6x', pagarme: 4.49, installments: '2–6x' },
    { label: 'Crédito parcelado 7–12x', pagarme: 4.99, installments: '7–12x' },
    { label: 'Crédito parcelado 13–18x', pagarme: 4.99, installments: '13–18x' },
];

function calcSeller(value: number, pagarmeRate: number) {
    const pagarmeFee = value * (pagarmeRate / 100);
    const platformFee = value * (CARD_PLATFORM_PERCENT / 100);
    return Math.max(0, value - pagarmeFee - platformFee);
}

function calcSellerPix(value: number) {
    const pagarmeFee = value * (PIX_RATE / 100);
    const platformFee = PIX_PLATFORM_FEE;
    return Math.max(0, value - pagarmeFee - platformFee);
}

export default function AdminSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'pix' | 'card'>('pix');
    const [simValue, setSimValue] = useState(100);

    useEffect(() => {
        adminAPI.getSettings()
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                <div style={{ width: 36, height: 36, border: '3px solid var(--border-color)', borderTopColor: '#ff6b6b', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    const fmt = (v: number) => v.toFixed(2).replace('.', ',');

    return (
        <div className="animate-fade-in">
            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Configurações da Plataforma</h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 32 }}>
                Taxas cobradas por venda — plataforma + Pagar.me
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 640 }}>

                {/* Card: Taxa da plataforma */}
                <div className="glass-card" style={{ padding: 28 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,107,107,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}>
                            <FiDollarSign size={20} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Regras de split da GouPay</h3>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>A taxa da plataforma depende do método de pagamento</p>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderRadius: 12, background: 'rgba(108,92,231,0.07)', border: '1px solid rgba(108,92,231,0.15)' }}>
                            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>PIX — taxa GouPay</span>
                            <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--danger)' }}>R$ 2,00</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderRadius: 12, background: 'rgba(108,92,231,0.07)', border: '1px solid rgba(108,92,231,0.15)' }}>
                            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Cartão — taxa GouPay</span>
                            <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--danger)' }}>2%</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 12 }}>
                        <FiInfo size={13} style={{ color: 'var(--text-muted)', marginTop: 2, flexShrink: 0 }} />
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                            As tarifas do Pagar.me são separadas: 1,09% no PIX e a tarifa contratada para cada faixa de parcelamento no cartão.
                        </p>
                    </div>
                </div>

                {/* Card: Taxas por método */}
                <div className="glass-card" style={{ padding: 28 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(0,206,201,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
                            <FiPercent size={20} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Taxas do Pagar.me por Método</h3>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Cobradas pelo processador de pagamentos</p>
                        </div>
                    </div>

                    {/* Tabs PIX / Cartão */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                        {(['pix', 'card'] as const).map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)}
                                style={{
                                    flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                                    background: activeTab === tab ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                                    color: activeTab === tab ? 'white' : 'var(--text-secondary)',
                                    transition: 'all 0.2s',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                                }}>
                                {tab === 'pix' ? <><FiSmartphone size={14} /> PIX</> : <><FiCreditCard size={14} /> Cartão de Crédito</>}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'pix' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderRadius: 10, background: 'rgba(0,206,201,0.06)', border: '1px solid rgba(0,206,201,0.15)', marginBottom: 16 }}>
                                <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Taxa Pagar.me (PIX)</span>
                                <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--success)' }}>1,09%</span>
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>Exemplos — o que o vendedor recebe:</div>
                            {[10, 50, 100, 200, 500].map(val => {
                                const seller = calcSellerPix(val);
                                const totalFee = val - seller;
                                return (
                                    <div key={val} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Venda R$ {fmt(val)}</span>
                                        <div style={{ textAlign: 'right' }}>
                                            <span style={{ color: 'var(--success)', fontWeight: 700 }}>Recebe R$ {fmt(seller)}</span>
                                            <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 8 }}>(taxa R$ {fmt(totalFee)})</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {activeTab === 'card' && (
                        <div>
                            <div style={{ marginBottom: 16 }}>
                                {CARD_RATES.map((rate, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 10, background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent', marginBottom: 4 }}>
                                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{rate.label}</span>
                                        <div style={{ textAlign: 'right' }}>
                                            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--danger)' }}>{rate.pagarme.toFixed(2).replace('.', ',')}%</span>
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>Pagar.me</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ height: 1, background: 'var(--border-color)', margin: '16px 0' }} />
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>Simulador — o que o vendedor recebe:</div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                <span style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Valor da venda:</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>R$</span>
                                    <input
                                        type="number" min={1} value={simValue}
                                        onChange={e => setSimValue(Math.max(1, Number(e.target.value)))}
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}
                                    />
                                </div>
                            </div>

                            {CARD_RATES.map((rate, i) => {
                                const seller = calcSeller(simValue, rate.pagarme);
                                const totalFee = simValue - seller;
                                return (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>{rate.installments}</span>
                                        <div style={{ textAlign: 'right' }}>
                                            <span style={{ color: 'var(--success)', fontWeight: 700 }}>Recebe R$ {fmt(seller)}</span>
                                            <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 8 }}>(taxa R$ {fmt(totalFee)})</span>
                                        </div>
                                    </div>
                                );
                            })}

                            <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(253,203,110,0.08)', border: '1px solid rgba(253,203,110,0.2)' }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                    <FiInfo size={13} style={{ color: '#FDCB6E', marginTop: 2, flexShrink: 0 }} />
                                    <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                                        Taxa total = Pagar.me (%) + 2% da GouPay. O vendedor recebe o valor líquido após todas as deduções.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
