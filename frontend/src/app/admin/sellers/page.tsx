'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { FiSearch, FiLock, FiUnlock, FiUsers, FiLogIn } from 'react-icons/fi';

export default function AdminSellersPage() {
    const [sellers, setSellers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const router = useRouter();

    useEffect(() => { loadSellers(); }, []);

    const loadSellers = async (s?: string) => {
        try {
            const { data } = await adminAPI.listSellers({ search: s || search });
            setSellers(data.sellers || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const toggleBlock = async (id: string, currentStatus: string) => {
        const block = currentStatus !== 'blocked';
        try {
            await adminAPI.toggleBlock(id, block);
            toast.success(block ? 'Vendedor bloqueado' : 'Vendedor desbloqueado');
            loadSellers();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro');
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
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao entrar como usuário');
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        loadSellers(search);
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
                                <tr><th>Nome</th><th>Email</th><th>CPF/CNPJ</th><th>Status</th><th>Cadastro</th><th>Ações</th></tr>
                            </thead>
                            <tbody>
                                {sellers.map((s: any) => (
                                    <tr key={s.id}>
                                        <td style={{ fontWeight: 500 }}>{s.name}</td>
                                        <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{s.email}</td>
                                        <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{s.cpf_cnpj || '—'}</td>
                                        <td>
                                            <span className={`badge ${s.status === 'active' ? 'badge-success' : s.status === 'blocked' ? 'badge-danger' : 'badge-warning'}`}>
                                                {s.status === 'active' ? 'Ativo' : s.status === 'blocked' ? 'Bloqueado' : s.status}
                                            </span>
                                        </td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{new Date(s.created_at).toLocaleDateString('pt-BR')}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 8 }}>
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
        </div>
    );
}
