'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from 'react';
import { FiCheck, FiDollarSign, FiRefreshCw, FiSearch, FiShield, FiUsers, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { adminAPI, affiliatesAPI } from '@/lib/api';

function brl(cents: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(cents || 0) / 100);
}

const labels: Record<string, string> = {
    active: 'Ativo',
    inactive: 'Inativo',
    pending: 'Pendente',
    approved: 'Aprovado',
    available: 'Disponivel',
    rejected: 'Recusado',
    suspended: 'Suspenso',
    cancelled: 'Encerrado',
    refunded: 'Estornado',
    chargeback: 'Chargeback',
    failed: 'Falhou',
};

export default function AdminAffiliatesPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [query, setQuery] = useState('');
    const [view, setView] = useState<'affiliations' | 'programs' | 'commissions'>('affiliations');

    const load = async () => {
        setRefreshing(true);
        try {
            const response = await adminAPI.getAffiliates();
            setData(response.data);
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Erro ao carregar afiliados');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { load(); }, []);

    const update = async (id: string, action: string) => {
        try {
            await affiliatesAPI.updateAffiliation(id, { action });
            toast.success('Afiliacao atualizada');
            await load();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Erro ao atualizar');
        }
    };

    const filtered = useMemo(() => {
        const term = query.toLowerCase().trim();
        const rows = data?.[view] || [];
        if (!term) return rows;
        return rows.filter((row: any) => JSON.stringify(row).toLowerCase().includes(term));
    }, [data, query, view]);

    if (loading) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Carregando modulo de afiliados...</div>;

    return (
        <div className="admin-affiliates">
            <header>
                <div><span>Governanca</span><h1>Sistema de afiliados</h1><p>Visao global de programas, participantes e comissoes.</p></div>
                <button onClick={load} disabled={refreshing}><FiRefreshCw className={refreshing ? 'spin' : ''} /> Atualizar</button>
            </header>

            <section className="stats">
                <article><FiShield /><div><span>Programas ativos</span><strong>{data?.stats?.active_programs || 0}</strong><small>{data?.stats?.programs || 0} no total</small></div></article>
                <article><FiUsers /><div><span>Afiliados</span><strong>{data?.stats?.affiliates || 0}</strong><small>Participantes unicos</small></div></article>
                <article><FiCheck /><div><span>Vendas atribuidas</span><strong>{data?.stats?.sales || 0}</strong><small>Aprovadas ou disponiveis</small></div></article>
                <article><FiDollarSign /><div><span>Comissoes</span><strong>{brl(data?.stats?.commission_amount || 0)}</strong><small>Volume atribuido</small></div></article>
            </section>

            <section className="panel">
                <div className="toolbar">
                    <nav>
                        <button className={view === 'affiliations' ? 'active' : ''} onClick={() => setView('affiliations')}>Afiliacoes</button>
                        <button className={view === 'programs' ? 'active' : ''} onClick={() => setView('programs')}>Programas</button>
                        <button className={view === 'commissions' ? 'active' : ''} onClick={() => setView('commissions')}>Comissoes</button>
                    </nav>
                    <label><FiSearch /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar" /></label>
                </div>

                <div className="table-wrap">
                    {view === 'affiliations' && (
                        <table>
                            <thead><tr><th>Afiliado</th><th>Programa</th><th>Status</th><th>Solicitado em</th><th>Acoes</th></tr></thead>
                            <tbody>
                                {filtered.map((row: any) => (
                                    <tr key={row.id}>
                                        <td><strong>{row.affiliate?.name || '-'}</strong><small>{row.affiliate?.email}</small></td>
                                        <td>{data?.programs?.find((program: any) => program.id === row.program_id)?.product?.name || '-'}</td>
                                        <td><span className={`status ${row.status}`}>{labels[row.status] || row.status}</span></td>
                                        <td>{new Date(row.requested_at).toLocaleDateString('pt-BR')}</td>
                                        <td><div className="actions">
                                            {row.status !== 'approved' && <button className="approve" onClick={() => update(row.id, 'approve')}><FiCheck /> Aprovar</button>}
                                            {row.status === 'approved' && <button className="danger" onClick={() => update(row.id, 'suspend')}><FiX /> Suspender</button>}
                                            {row.status === 'pending' && <button onClick={() => update(row.id, 'reject')}>Recusar</button>}
                                        </div></td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && <tr><td colSpan={5} className="empty">Nenhum registro encontrado.</td></tr>}
                            </tbody>
                        </table>
                    )}

                    {view === 'programs' && (
                        <table>
                            <thead><tr><th>Produto</th><th>Produtor</th><th>Entrada</th><th>Comissao</th><th>Cookie</th><th>Status</th></tr></thead>
                            <tbody>
                                {filtered.map((row: any) => (
                                    <tr key={row.id}>
                                        <td><strong>{row.product?.name || '-'}</strong><small>{row.product?.status}</small></td>
                                        <td><strong>{row.producer?.name || '-'}</strong><small>{row.producer?.email}</small></td>
                                        <td>{row.enrollment_mode}</td>
                                        <td>{(Number(row.commission_rate_bps) / 100).toFixed(2).replace('.', ',')}%</td>
                                        <td>{row.cookie_days} dias</td>
                                        <td><span className={`status ${row.status}`}>{labels[row.status] || row.status}</span></td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && <tr><td colSpan={6} className="empty">Nenhum programa encontrado.</td></tr>}
                            </tbody>
                        </table>
                    )}

                    {view === 'commissions' && (
                        <table>
                            <thead><tr><th>Data</th><th>Origem</th><th>Venda</th><th>Base</th><th>Comissao</th><th>Status</th></tr></thead>
                            <tbody>
                                {filtered.map((row: any) => (
                                    <tr key={row.id}>
                                        <td>{new Date(row.created_at).toLocaleDateString('pt-BR')}</td>
                                        <td>{row.source_type}</td>
                                        <td>{brl(row.gross_amount)}</td>
                                        <td>{brl(row.commission_base_amount)}</td>
                                        <td><strong>{brl(row.commission_amount)}</strong></td>
                                        <td><span className={`status ${row.status}`}>{labels[row.status] || row.status}</span></td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && <tr><td colSpan={6} className="empty">Nenhuma comissao encontrada.</td></tr>}
                            </tbody>
                        </table>
                    )}
                </div>
            </section>

            <style jsx>{`
                .admin-affiliates{display:grid;gap:22px}.admin-affiliates>header{display:flex;align-items:center;justify-content:space-between}.admin-affiliates h1{margin:4px 0;font-size:28px}.admin-affiliates header span{color:#8b5cf6;font-size:12px;text-transform:uppercase;font-weight:900;letter-spacing:.1em}.admin-affiliates header p{margin:0;color:var(--text-muted)}.admin-affiliates header button{display:flex;align-items:center;gap:7px;border:1px solid var(--border-color);background:var(--bg-card);color:var(--text-primary);padding:10px 14px;border-radius:10px;cursor:pointer}
                .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.stats article{display:flex;align-items:flex-start;gap:14px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:14px;padding:18px}.stats article>svg{font-size:22px;color:#8b5cf6}.stats article div{display:grid;gap:4px}.stats span,.stats small{color:var(--text-muted);font-size:12px}.stats strong{font-size:22px}
                .panel{background:var(--bg-card);border:1px solid var(--border-color);border-radius:15px;overflow:hidden}.toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px;border-bottom:1px solid var(--border-color)}nav{display:flex;gap:5px}nav button{border:0;background:transparent;color:var(--text-muted);font-weight:700;padding:9px 12px;border-radius:8px;cursor:pointer}nav button.active{background:#8b5cf6;color:#fff}.toolbar label{display:flex;align-items:center;gap:7px;border:1px solid var(--border-color);border-radius:9px;padding:8px 10px}.toolbar input{border:0;outline:0;background:transparent;color:var(--text-primary)}
                .table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;min-width:760px}th,td{text-align:left;padding:13px 15px;border-bottom:1px solid var(--border-color);font-size:13px}th{font-size:11px;text-transform:uppercase;color:var(--text-muted)}td strong,td small{display:block}td small{color:var(--text-muted);margin-top:3px}.status{display:inline-flex;padding:4px 8px;border-radius:999px;font-size:11px;font-weight:800;background:rgba(148,163,184,.12);color:#94a3b8}.status.active,.status.approved,.status.available{background:rgba(34,197,94,.12);color:#16a34a}.status.pending{background:rgba(245,158,11,.12);color:#d97706}.status.suspended,.status.rejected,.status.cancelled,.status.refunded,.status.chargeback,.status.failed{background:rgba(239,68,68,.12);color:#ef4444}.actions{display:flex;gap:6px}.actions button{display:flex;align-items:center;gap:5px;border:1px solid var(--border-color);background:transparent;color:var(--text-primary);border-radius:7px;padding:6px 8px;cursor:pointer;font-size:11px}.actions .approve{color:#16a34a}.actions .danger{color:#ef4444}.empty{text-align:center;color:var(--text-muted);padding:30px}.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:1000px){.stats{grid-template-columns:1fr 1fr}}@media(max-width:650px){.admin-affiliates>header,.toolbar{align-items:flex-start;flex-direction:column}.stats{grid-template-columns:1fr}.toolbar label{width:100%;box-sizing:border-box}.toolbar input{width:100%}}
            `}</style>
        </div>
    );
}
