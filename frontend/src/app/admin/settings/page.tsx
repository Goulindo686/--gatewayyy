'use client';

import { useEffect, useState } from 'react';
import { adminAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { FiDollarSign, FiInfo } from 'react-icons/fi';

export default function AdminSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<any>(null);

    useEffect(() => {
        adminAPI.getSettings()
            .then(res => setSettings(res.data.settings))
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

    return (
        <div className="animate-fade-in">
            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 28 }}>Configurações da Plataforma</h1>

            <div className="glass-card" style={{ padding: 32, maxWidth: 500 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 12, background: 'rgba(255,107,107,0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)'
                    }}>
                        <FiDollarSign size={20} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: 16, fontWeight: 600 }}>Taxa da Plataforma</h3>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Valor fixo retido em cada venda</p>
                    </div>
                </div>

                <div style={{
                    padding: 20, borderRadius: 12, background: 'rgba(108,92,231,0.06)',
                    border: '1px solid rgba(108,92,231,0.12)', marginBottom: 24
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Taxa fixa por venda</span>
                        <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--danger)' }}>R$ 1,50 + 1,09%</span>
                    </div>
                    <div style={{ height: 1, background: 'var(--border-color)', margin: '12px 0' }} />
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <FiInfo size={14} style={{ color: 'var(--text-muted)', marginTop: 2, flexShrink: 0 }} />
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                            A taxa cobrada por venda é R$1,50 fixo + 1,09% sobre o valor total da transação.
                        </p>
                    </div>
                </div>

                <div style={{ padding: 16, borderRadius: 12, background: 'rgba(0,206,201,0.06)', border: '1px solid rgba(0,206,201,0.12)' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Exemplos de divisão por venda (PIX)</div>
                    {[10, 50, 100, 500].map(val => {
                        const pagarme = (val * 0.0109).toFixed(2);
                        const seller = (val - 1.50 - parseFloat(pagarme)).toFixed(2);
                        return (
                            <div key={val} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                                <span style={{ color: 'var(--text-muted)' }}>Venda R${val},00</span>
                                <span style={{ color: 'var(--success)', fontWeight: 600 }}>Vendedor recebe R${seller}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
