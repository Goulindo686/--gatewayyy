'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import {
    FiAlertTriangle,
    FiArrowLeft,
    FiCheck,
    FiCheckCircle,
    FiKey,
    FiLock,
    FiPackage,
    FiShield,
    FiTrash2,
} from 'react-icons/fi';
import { uniqueDeliveryAPI } from '@/lib/api';

const emptyForm = {
    access: '',
    instructions: '',
    customText: '',
    redirectUrl: '',
    notes: '',
};

function formatDate(value: string | null | undefined) {
    if (!value) return '-';
    return new Date(value).toLocaleString('pt-BR');
}

export default function StoreProductUniqueDeliveriesPage() {
    const params = useParams();
    const productId = String(params.id || '');
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [switching, setSwitching] = useState(false);
    const [mode, setMode] = useState<'single' | 'bulk'>('single');
    const [form, setForm] = useState(emptyForm);
    const [bulkAccess, setBulkAccess] = useState('');

    const load = useCallback(async () => {
        try {
            const response = await uniqueDeliveryAPI.getInventory(productId);
            setData(response.data);
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Erro ao carregar estoque exclusivo.');
        } finally {
            setLoading(false);
        }
    }, [productId]);

    useEffect(() => {
        void load();
    }, [load]);

    const bulkLines = useMemo(
        () => bulkAccess.split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
        [bulkAccess],
    );

    const update = (field: keyof typeof emptyForm, value: string) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const setUniqueEnabled = async (enabled: boolean) => {
        setSwitching(true);
        try {
            await uniqueDeliveryAPI.updateDeliveryMode(productId, enabled ? 'unique' : 'members');
            toast.success(enabled ? 'Entrega unica ativada na loja.' : 'Entrega unica desativada.');
            await load();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Nao foi possivel alterar a entrega.');
        } finally {
            setSwitching(false);
        }
    };

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        const accessValues = mode === 'bulk' ? bulkLines : [form.access.trim()];
        if (!accessValues[0]) {
            toast.error('Informe ao menos uma entrega.');
            return;
        }
        if (mode === 'bulk' && accessValues.length > 250) {
            toast.error('Envie no maximo 250 linhas por lote.');
            return;
        }

        setSaving(true);
        try {
            const items = accessValues.map((access) => ({ ...form, access }));
            const response = await uniqueDeliveryAPI.createItems(productId, items);
            const duplicateCount = Number(response.data.duplicate_count || 0);
            toast.success(`${response.data.created_count || 0} item(ns) adicionados${duplicateCount ? `; ${duplicateCount} duplicado(s) ignorado(s)` : ''}.`);
            setForm(emptyForm);
            setBulkAccess('');
            await load();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Erro ao adicionar estoque.');
        } finally {
            setSaving(false);
        }
    };

    const deleteItem = async (itemId: string) => {
        if (!confirm('Excluir esta entrega disponivel?')) return;
        try {
            await uniqueDeliveryAPI.deleteItem(productId, itemId);
            toast.success('Entrega removida.');
            await load();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Nao foi possivel excluir.');
        }
    };

    if (loading) {
        return <div className="storeUniqueLoading"><span /></div>;
    }

    const enabled = Boolean(data?.settings?.enabled);
    const summary = data?.summary || { total: 0, available: 0, assigned: 0, waiting: 0 };

    return (
        <div className="storeUniquePage">
            <header className="storeUniqueHeader">
                <Link href="/dashboard/store/products" aria-label="Voltar para produtos da loja">
                    <FiArrowLeft size={18} />
                </Link>
                <div>
                    <span>Produto da loja</span>
                    <h2>{data?.product?.name || 'Estoque exclusivo'}</h2>
                    <p>Cadastre uma key, conta, login ou acesso diferente para cada venda aprovada.</p>
                </div>
            </header>

            <section className="storeUniqueMode">
                <div>
                    <span><FiKey size={24} /></span>
                    <div>
                        <p>Entrega unica na loja</p>
                        <h3>{enabled ? 'Ativa para novas compras' : 'Desativada'}</h3>
                        <small>
                            Quando ativa, o checkout so permite comprar se existir estoque disponivel.
                            Cada pedido pago consome uma unica linha do inventario.
                        </small>
                    </div>
                </div>
                <button type="button" onClick={() => setUniqueEnabled(!enabled)} disabled={switching}>
                    {enabled ? 'Desativar' : 'Ativar entrega unica'}
                </button>
            </section>

            <section className="storeUniqueSecurity">
                <FiShield size={18} />
                <div>
                    <strong>Estoque criptografado</strong>
                    <p>O segredo e criptografado no servidor. Depois de salvo, ele nao volta para o painel; somente o comprador certo recebe a entrega em Minhas Entregas.</p>
                </div>
            </section>

            <div className="storeUniqueStats">
                <article><FiPackage /><strong>{summary.total}</strong><span>Total</span></article>
                <article><FiKey /><strong>{summary.available}</strong><span>Disponiveis</span></article>
                <article><FiCheckCircle /><strong>{summary.assigned}</strong><span>Utilizadas</span></article>
                <article><FiAlertTriangle /><strong>{summary.waiting}</strong><span>Sem estoque</span></article>
            </div>

            {enabled && summary.available <= 2 && (
                <section className="storeUniqueWarning">
                    <FiAlertTriangle size={18} />
                    <span>Estoque baixo. Reponha antes de enviar trafego para evitar checkout bloqueado.</span>
                </section>
            )}

            <section className="storeUniqueCreate">
                <header>
                    <div>
                        <h3>Adicionar estoque</h3>
                        <p>Use cadastro completo para um item ou importacao em lote para muitas linhas.</p>
                    </div>
                    <div className="storeUniqueSegment">
                        <button type="button" className={mode === 'single' ? 'active' : ''} onClick={() => setMode('single')}>Completo</button>
                        <button type="button" className={mode === 'bulk' ? 'active' : ''} onClick={() => setMode('bulk')}>Lote</button>
                    </div>
                </header>

                <form onSubmit={submit}>
                    {mode === 'single' ? (
                        <label>
                            <span>Acesso exclusivo *</span>
                            <textarea
                                className="input-field"
                                rows={4}
                                required
                                maxLength={10000}
                                placeholder={'Login: cliente123\nSenha: senha-segura\nKey: XXXX-XXXX-XXXX'}
                                value={form.access}
                                onChange={(event) => update('access', event.target.value)}
                            />
                        </label>
                    ) : (
                        <label>
                            <span>Uma entrega por linha * ({bulkLines.length}/250)</span>
                            <textarea
                                className="input-field"
                                rows={8}
                                required
                                placeholder={'conta1@email.com | senha1\nconta2@email.com | senha2\nKEY-AAAA-BBBB'}
                                value={bulkAccess}
                                onChange={(event) => setBulkAccess(event.target.value)}
                            />
                            <small>Instrucoes, link e observacoes abaixo serao aplicados em todas as linhas.</small>
                        </label>
                    )}

                    <div className="storeUniqueGrid">
                        <label>
                            <span>Instrucoes de uso</span>
                            <textarea className="input-field" rows={4} maxLength={20000} value={form.instructions} onChange={(event) => update('instructions', event.target.value)} />
                        </label>
                        <label>
                            <span>Mensagem personalizada</span>
                            <textarea className="input-field" rows={4} maxLength={20000} value={form.customText} onChange={(event) => update('customText', event.target.value)} />
                        </label>
                    </div>

                    <label>
                        <span>Link de redirecionamento</span>
                        <input className="input-field" type="url" maxLength={2048} placeholder="https://..." value={form.redirectUrl} onChange={(event) => update('redirectUrl', event.target.value)} />
                    </label>

                    <label>
                        <span>Observacoes internas ou extras</span>
                        <textarea className="input-field" rows={3} maxLength={20000} value={form.notes} onChange={(event) => update('notes', event.target.value)} />
                    </label>

                    <button className="btn-primary storeUniqueSubmit" disabled={saving}>
                        <FiLock size={15} />
                        {saving ? 'Criptografando...' : mode === 'bulk' ? `Adicionar ${bulkLines.length || ''} linha(s)` : 'Adicionar ao estoque'}
                    </button>
                </form>
            </section>

            <section className="storeUniqueInventory">
                <header>
                    <h3>Inventario protegido</h3>
                    <p>Itens disponiveis podem ser removidos. Itens utilizados ficam preservados no historico.</p>
                </header>

                {data?.inventory?.length ? (
                    <div className="storeUniqueTableWrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Entrega</th>
                                    <th>Status</th>
                                    <th>Venda vinculada</th>
                                    <th>Cadastro</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {data.inventory.map((item: any) => (
                                    <tr key={item.id}>
                                        <td><strong>#{item.number || item.id.slice(0, 8)}</strong><small><FiLock size={11} /> Protegida</small></td>
                                        <td><span className={`storeUniqueStatus ${item.status}`}>{item.status === 'available' ? 'Disponivel' : 'Utilizada'}</span></td>
                                        <td>
                                            {item.fulfillment ? (
                                                <div className="storeUniqueBuyer">
                                                    <strong>{item.fulfillment.buyer_email}</strong>
                                                    <small>Pedido {item.fulfillment.order_id.slice(0, 8)} {item.fulfillment.first_viewed_at ? '- visualizada' : '- nao visualizada'}</small>
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td>{formatDate(item.created_at)}</td>
                                        <td>
                                            {item.status === 'available' && (
                                                <button type="button" onClick={() => deleteItem(item.id)} aria-label="Excluir entrega">
                                                    <FiTrash2 size={15} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="storeUniqueEmpty">
                        <FiKey size={38} />
                        <strong>Nenhuma entrega cadastrada</strong>
                        <p>Adicione estoque antes de ativar campanhas para este produto.</p>
                    </div>
                )}
            </section>

            <style jsx>{`
                .storeUniquePage { display:grid; gap:16px; }
                .storeUniqueLoading { display:grid; min-height:300px; place-items:center; }
                .storeUniqueLoading span { animation:storeUniqueSpin .8s linear infinite; border:3px solid var(--border-color); border-radius:50%; border-top-color:var(--accent-primary); height:36px; width:36px; }
                @keyframes storeUniqueSpin { to { transform:rotate(360deg); } }
                .storeUniqueHeader { align-items:center; display:flex; gap:13px; }
                .storeUniqueHeader a { align-items:center; background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:11px; color:var(--text-secondary); display:flex; height:40px; justify-content:center; width:40px; }
                .storeUniqueHeader span { color:var(--accent-primary); display:block; font-size:10px; font-weight:900; letter-spacing:.1em; text-transform:uppercase; }
                .storeUniqueHeader h2 { font-size:24px; margin:3px 0; }
                .storeUniqueHeader p { color:var(--text-secondary); font-size:12px; margin:0; }
                .storeUniqueMode,
                .storeUniqueCreate,
                .storeUniqueInventory,
                .storeUniqueSecurity,
                .storeUniqueWarning,
                .storeUniqueStats article { background:var(--card-bg); border:1px solid var(--border-color); border-radius:16px; }
                .storeUniqueMode { align-items:center; display:flex; gap:18px; justify-content:space-between; padding:22px; }
                .storeUniqueMode > div { align-items:center; display:flex; gap:15px; min-width:0; }
                .storeUniqueMode > div > span { align-items:center; background:rgba(108,92,231,.12); border-radius:14px; color:var(--accent-primary); display:flex; height:54px; justify-content:center; width:54px; }
                .storeUniqueMode p { color:var(--accent-primary); font-size:10px; font-weight:850; letter-spacing:.1em; margin:0 0 4px; text-transform:uppercase; }
                .storeUniqueMode h3 { font-size:19px; margin:0 0 5px; }
                .storeUniqueMode small { color:var(--text-secondary); display:block; font-size:11px; line-height:1.5; max-width:680px; }
                .storeUniqueMode button { background:var(--accent-primary); border:0; border-radius:11px; color:#fff; cursor:pointer; flex:0 0 auto; font-size:12px; font-weight:900; min-height:42px; padding:0 16px; }
                .storeUniqueMode button:disabled { cursor:wait; opacity:.65; }
                .storeUniqueSecurity,
                .storeUniqueWarning { align-items:flex-start; display:flex; gap:12px; padding:14px 16px; }
                .storeUniqueSecurity { background:rgba(108,92,231,.07); border-color:rgba(108,92,231,.2); color:var(--accent-primary); }
                .storeUniqueSecurity strong { display:block; font-size:12px; margin-bottom:3px; }
                .storeUniqueSecurity p { color:var(--text-secondary); font-size:11px; line-height:1.55; margin:0; }
                .storeUniqueWarning { background:rgba(253,203,110,.09); border-color:rgba(253,203,110,.28); color:#d97706; font-size:12px; }
                .storeUniqueStats { display:grid; gap:12px; grid-template-columns:repeat(4,minmax(0,1fr)); }
                .storeUniqueStats article { align-items:center; display:grid; gap:4px; grid-template-columns:34px 1fr; padding:15px; }
                .storeUniqueStats svg { color:var(--accent-primary); grid-row:1 / 3; }
                .storeUniqueStats strong { color:var(--text-primary); font-size:22px; line-height:1; }
                .storeUniqueStats span { color:var(--text-muted); font-size:10px; }
                .storeUniqueCreate,
                .storeUniqueInventory { padding:22px; }
                .storeUniqueCreate > header,
                .storeUniqueInventory > header { align-items:flex-start; display:flex; gap:14px; justify-content:space-between; margin-bottom:18px; }
                .storeUniqueCreate h3,
                .storeUniqueInventory h3 { font-size:17px; margin:0 0 4px; }
                .storeUniqueCreate p,
                .storeUniqueInventory p { color:var(--text-muted); font-size:11px; margin:0; }
                .storeUniqueSegment { background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:10px; display:flex; padding:3px; }
                .storeUniqueSegment button { background:transparent; border:0; border-radius:7px; color:var(--text-muted); cursor:pointer; font-size:11px; font-weight:800; padding:8px 12px; }
                .storeUniqueSegment button.active { background:var(--card-bg); color:var(--accent-primary); }
                .storeUniqueCreate form { display:grid; gap:14px; }
                .storeUniqueCreate label { display:grid; gap:6px; }
                .storeUniqueCreate label > span { color:var(--text-secondary); font-size:12px; font-weight:800; }
                .storeUniqueCreate small { color:var(--text-muted); font-size:10px; }
                .storeUniqueGrid { display:grid; gap:14px; grid-template-columns:repeat(2,minmax(0,1fr)); }
                .storeUniqueSubmit { align-items:center; display:flex; gap:8px; justify-content:center; justify-self:end; min-width:210px; }
                .storeUniqueTableWrap { overflow-x:auto; }
                .storeUniqueInventory table { border-collapse:collapse; min-width:780px; width:100%; }
                .storeUniqueInventory th { border-bottom:1px solid var(--border-color); color:var(--text-muted); font-size:10px; padding:10px 12px; text-align:left; text-transform:uppercase; }
                .storeUniqueInventory td { border-bottom:1px solid var(--border-color); color:var(--text-secondary); font-size:11px; padding:13px 12px; }
                .storeUniqueInventory td:first-child strong { color:var(--text-primary); display:block; font-size:12px; }
                .storeUniqueInventory td:first-child small,
                .storeUniqueBuyer small { align-items:center; color:var(--text-muted); display:flex; font-size:9px; gap:4px; margin-top:3px; }
                .storeUniqueStatus { border-radius:999px; display:inline-flex; font-size:9px; font-weight:900; padding:5px 8px; text-transform:uppercase; }
                .storeUniqueStatus.available { background:rgba(0,184,148,.11); color:#00b894; }
                .storeUniqueStatus.assigned { background:rgba(108,92,231,.12); color:var(--accent-primary); }
                .storeUniqueBuyer strong { color:var(--text-primary); font-size:11px; }
                .storeUniqueInventory td:last-child button { align-items:center; background:rgba(225,112,85,.1); border:0; border-radius:8px; color:#e17055; cursor:pointer; display:flex; height:30px; justify-content:center; width:30px; }
                .storeUniqueEmpty { color:var(--text-muted); padding:42px 20px; text-align:center; }
                .storeUniqueEmpty strong { color:var(--text-primary); display:block; margin:12px 0 5px; }
                .storeUniqueEmpty p { font-size:11px; margin:0; }
                @media (max-width:820px) {
                    .storeUniqueMode { align-items:flex-start; flex-direction:column; }
                    .storeUniqueStats { grid-template-columns:repeat(2,minmax(0,1fr)); }
                    .storeUniqueGrid { grid-template-columns:1fr; }
                }
                @media (max-width:560px) {
                    .storeUniqueCreate,
                    .storeUniqueInventory,
                    .storeUniqueMode { padding:16px 13px; }
                    .storeUniqueCreate > header { flex-direction:column; }
                    .storeUniqueSegment { width:100%; }
                    .storeUniqueSegment button { flex:1; }
                    .storeUniqueSubmit { justify-self:stretch; width:100%; }
                }
            `}</style>
        </div>
    );
}
