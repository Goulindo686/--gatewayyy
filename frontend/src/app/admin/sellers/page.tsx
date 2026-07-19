'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { FiSearch, FiLock, FiUnlock, FiUsers, FiLogIn, FiDollarSign, FiX, FiInfo } from 'react-icons/fi';

type PixFeeMode = 'default' | 'exempt' | 'fixed' | 'percentage';

type PixFeeSetting = {
    fee_type: Exclude<PixFeeMode, 'default'>;
    fixed_fee_cents: number | null;
    percentage: number | string | null;
    updated_at?: string;
};

type Seller = {
    id: string;
    name: string;
    email: string;
    cpf_cnpj?: string | null;
    status: string;
    created_at: string;
    pix_fee: PixFeeSetting | null;
};

function getApiError(error: unknown, fallback: string) {
    const apiError = error as { response?: { data?: { error?: string } } };
    return apiError?.response?.data?.error || fallback;
}

function describePixFee(seller: Seller) {
    const fee = seller.pix_fee;
    if (!fee) return 'Padrão: R$ 2,00';
    if (fee.fee_type === 'exempt') return 'Isento';
    if (fee.fee_type === 'fixed') return `Fixa: R$ ${(Number(fee.fixed_fee_cents || 0) / 100).toFixed(2).replace('.', ',')}`;
    return `${Number(fee.percentage || 0).toLocaleString('pt-BR')}%`;
}

export default function AdminSellersPage() {
    const [sellers, setSellers] = useState<Seller[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [feeSeller, setFeeSeller] = useState<Seller | null>(null);
    const [feeMode, setFeeMode] = useState<PixFeeMode>('default');
    const [feeValue, setFeeValue] = useState('');
    const [savingFee, setSavingFee] = useState(false);
    const router = useRouter();

    const loadSellers = useCallback(async (searchTerm = '') => {
        try {
            const { data } = await adminAPI.listSellers({ search: searchTerm });
            setSellers(data.sellers || []);
        } catch (error: unknown) { console.error(error); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { void loadSellers(); }, [loadSellers]);

    const toggleBlock = async (id: string, currentStatus: string) => {
        const block = currentStatus !== 'blocked';
        try {
            await adminAPI.toggleBlock(id, block);
            toast.success(block ? 'Vendedor bloqueado' : 'Vendedor desbloqueado');
            loadSellers(search);
        } catch (error: unknown) {
            toast.error(getApiError(error, 'Erro'));
        }
    };

    const impersonate = async (id: string, name: string) => {
        const reason = window.prompt(`Informe o motivo para acessar a conta de ${name}:`)?.trim();
        if (!reason) return;
        if (reason.length < 8) {
            toast.error('Informe um motivo com pelo menos 8 caracteres.');
            return;
        }

        try {
            const { data } = await adminAPI.impersonate(id, reason);
            // Salva token admin para poder voltar depois
            localStorage.setItem('admin_token', localStorage.getItem('token') || '');
            localStorage.setItem('admin_user', localStorage.getItem('user') || '');
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            toast.success(`Entrando como ${name}...`);
            router.push('/dashboard');
        } catch (error: unknown) {
            toast.error(getApiError(error, 'Erro ao entrar como usuário'));
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        loadSellers(search);
    };

    const openPixFee = (seller: Seller) => {
        const setting = seller.pix_fee;
        const mode = (setting?.fee_type || 'default') as PixFeeMode;
        setFeeSeller(seller);
        setFeeMode(mode);
        setFeeValue(
            mode === 'fixed'
                ? (Number(setting?.fixed_fee_cents || 0) / 100).toFixed(2).replace('.', ',')
                : mode === 'percentage'
                    ? String(setting?.percentage || '').replace('.', ',')
                    : ''
        );
    };

    const savePixFee = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!feeSeller) return;

        const value = Number(feeValue.replace(',', '.'));
        if ((feeMode === 'fixed' || feeMode === 'percentage') && (!Number.isFinite(value) || value <= 0)) {
            toast.error('Informe uma taxa maior que zero ou escolha a opção Isento.');
            return;
        }

        setSavingFee(true);
        try {
            const { data } = await adminAPI.updateSellerPixFee(feeSeller.id, {
                mode: feeMode,
                value: feeMode === 'fixed' || feeMode === 'percentage' ? value : undefined,
            });
            setSellers(current => current.map(seller => seller.id === feeSeller.id
                ? { ...seller, pix_fee: data.pix_fee }
                : seller));
            toast.success(data.message || 'Taxa Pix atualizada');
            setFeeSeller(null);
        } catch (error: unknown) {
            toast.error(getApiError(error, 'Erro ao atualizar a taxa Pix'));
        } finally {
            setSavingFee(false);
        }
    };

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
                <h1 style={{ fontSize: 28, fontWeight: 700 }}>Vendedores</h1>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
                    <div style={{ position: 'relative' }}>
                        <FiSearch style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={15} />
                        <input className="input-field" placeholder="Buscar por nome ou email" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 40, width: 280 }} />
                    </div>
                    <button type="submit" className="btn-secondary" style={{ padding: '10px 20px' }}>Buscar</button>
                </form>
            </div>

            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                {sellers.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr><th>Nome</th><th>Email</th><th>CPF/CNPJ</th><th>Taxa Pix</th><th>Status</th><th>Cadastro</th><th>Ações</th></tr>
                            </thead>
                            <tbody>
                                {sellers.map(s => (
                                    <tr key={s.id}>
                                        <td style={{ fontWeight: 500 }}>{s.name}</td>
                                        <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{s.email}</td>
                                        <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{s.cpf_cnpj || '—'}</td>
                                        <td>
                                            <span className={`badge ${s.pix_fee?.fee_type === 'exempt' ? 'badge-success' : 'badge-warning'}`}>
                                                {describePixFee(s)}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${s.status === 'active' ? 'badge-success' : s.status === 'blocked' ? 'badge-danger' : 'badge-warning'}`}>
                                                {s.status === 'active' ? 'Ativo' : s.status === 'blocked' ? 'Bloqueado' : s.status}
                                            </span>
                                        </td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{new Date(s.created_at).toLocaleDateString('pt-BR')}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                <button onClick={() => openPixFee(s)}
                                                    className="btn-secondary"
                                                    style={{ padding: '6px 14px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                                    <FiDollarSign size={13} /> Taxa Pix
                                                </button>
                                                <button onClick={() => toggleBlock(s.id, s.status)}
                                                    className={s.status === 'blocked' ? 'btn-secondary' : 'btn-danger'}
                                                    style={{ padding: '6px 14px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                                    {s.status === 'blocked' ? <><FiUnlock size={13} /> Desbloquear</> : <><FiLock size={13} /> Bloquear</>}
                                                </button>
                                                <button onClick={() => impersonate(s.id, s.name)}
                                                    className="btn-secondary"
                                                    style={{ padding: '6px 14px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                                    <FiLogIn size={13} /> Entrar como
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-muted)' }}>
                        <FiUsers size={36} style={{ opacity: 0.4, marginBottom: 12 }} />
                        <p>Nenhum vendedor encontrado</p>
                    </div>
                )}
            </div>

            {feeSeller && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Configurar taxa Pix de ${feeSeller.name}`}
                    onMouseDown={event => { if (event.target === event.currentTarget && !savingFee) setFeeSeller(null); }}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 1000, padding: 20,
                        background: 'rgba(0,0,0,0.68)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                    <form onSubmit={savePixFee} className="glass-card" style={{ width: '100%', maxWidth: 520, maxHeight: 'calc(100vh - 40px)', overflowY: 'auto', padding: 28 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 8 }}>
                            <div>
                                <h2 style={{ fontSize: 20, fontWeight: 700 }}>Taxa de vendas no Pix</h2>
                                <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>{feeSeller.name} · {feeSeller.email}</p>
                            </div>
                            <button type="button" aria-label="Fechar" disabled={savingFee} onClick={() => setFeeSeller(null)}
                                style={{ border: 0, background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, height: 32 }}>
                                <FiX size={22} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: 12, margin: '18px 0', borderRadius: 10, background: 'rgba(0,206,201,0.08)', border: '1px solid rgba(0,206,201,0.2)' }}>
                            <FiInfo size={15} style={{ color: 'var(--success)', marginTop: 2, flexShrink: 0 }} />
                            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                Esta regra altera somente a taxa da GouPay para este vendedor e apenas no Pix. A tarifa de 1,09% do Pagar.me continua sendo cobrada dele em todas as opções.
                            </p>
                        </div>

                        <div style={{ display: 'grid', gap: 10 }}>
                            {([
                                ['default', 'Taxa padrão do site', 'Mantém R$ 2,00 por venda Pix.'],
                                ['exempt', 'Isento da taxa GouPay', 'A taxa da plataforma fica zerada.'],
                                ['fixed', 'Valor fixo personalizado', 'Cobra o mesmo valor em reais em cada venda.'],
                                ['percentage', 'Porcentagem personalizada', 'Calcula a taxa sobre o valor bruto da venda.'],
                            ] as Array<[PixFeeMode, string, string]>).map(([mode, title, description]) => (
                                <label key={mode} style={{
                                    display: 'flex', alignItems: 'flex-start', gap: 12, padding: 14, cursor: 'pointer', borderRadius: 10,
                                    border: `1px solid ${feeMode === mode ? 'var(--accent)' : 'var(--border-color)'}`,
                                    background: feeMode === mode ? 'rgba(108,92,231,0.08)' : 'transparent'
                                }}>
                                    <input type="radio" name="feeMode" value={mode} checked={feeMode === mode}
                                        onChange={() => { setFeeMode(mode); setFeeValue(''); }} style={{ marginTop: 3 }} />
                                    <span>
                                        <strong style={{ display: 'block', fontSize: 14 }}>{title}</strong>
                                        <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{description}</span>
                                    </span>
                                </label>
                            ))}
                        </div>

                        {(feeMode === 'fixed' || feeMode === 'percentage') && (
                            <label style={{ display: 'block', marginTop: 18 }}>
                                <span style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 7 }}>
                                    {feeMode === 'fixed' ? 'Valor por venda' : 'Percentual por venda'}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {feeMode === 'fixed' && <span style={{ fontWeight: 700 }}>R$</span>}
                                    <input className="input-field" inputMode="decimal" autoFocus required value={feeValue}
                                        placeholder={feeMode === 'fixed' ? 'Ex.: 1,50' : 'Ex.: 1,25'}
                                        onChange={event => setFeeValue(event.target.value.replace(/[^0-9,.]/g, ''))}
                                        style={{ flex: 1 }} />
                                    {feeMode === 'percentage' && <span style={{ fontWeight: 700 }}>%</span>}
                                </div>
                            </label>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                            <button type="button" className="btn-secondary" disabled={savingFee} onClick={() => setFeeSeller(null)}>Cancelar</button>
                            <button type="submit" className="btn-primary" disabled={savingFee}>
                                {savingFee ? 'Salvando...' : 'Salvar taxa Pix'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
