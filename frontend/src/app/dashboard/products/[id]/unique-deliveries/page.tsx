'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import {
    FiAlertTriangle,
    FiBookOpen,
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
    if (!value) return '—';
    return new Date(value).toLocaleString('pt-BR');
}

export default function UniqueDeliveriesPage() {
    const params = useParams();
    const productId = String(params.id || '');
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [switchingMode, setSwitchingMode] = useState(false);
    const [mode, setMode] = useState<'single' | 'bulk'>('single');
    const [form, setForm] = useState(emptyForm);
    const [bulkAccess, setBulkAccess] = useState('');

    const load = useCallback(async () => {
        try {
            const response = await uniqueDeliveryAPI.getInventory(productId);
            setData(response.data);
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Erro ao carregar Entregas Únicas.');
        } finally {
            setLoading(false);
        }
    }, [productId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load();
    }, [load]);

    const bulkLines = useMemo(
        () => bulkAccess.split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
        [bulkAccess],
    );

    const update = (field: keyof typeof emptyForm, value: string) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const selectDeliveryMode = async (nextMode: 'members' | 'unique') => {
        const currentMode = data?.settings?.delivery_mode
            || (data?.settings?.enabled ? 'unique' : 'members');
        if (nextMode === currentMode) return;

        setSwitchingMode(true);
        try {
            await uniqueDeliveryAPI.updateDeliveryMode(productId, nextMode);
            toast.success(
                nextMode === 'unique'
                    ? 'Entrega Única ativada para as próximas vendas.'
                    : 'Área de Membros ativada para as próximas vendas.',
            );
            await load();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Não foi possível alterar a modalidade.');
        } finally {
            setSwitchingMode(false);
        }
    };

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        const accessValues = mode === 'bulk' ? bulkLines : [form.access.trim()];
        if (!accessValues[0]) {
            toast.error('Informe ao menos um acesso exclusivo.');
            return;
        }
        if (mode === 'bulk' && accessValues.length > 250) {
            toast.error('Envie no máximo 250 linhas por lote.');
            return;
        }

        setSaving(true);
        try {
            const items = accessValues.map((access) => ({
                ...form,
                access,
            }));
            const response = await uniqueDeliveryAPI.createItems(productId, items);

            const duplicateCount = Number(response.data.duplicate_count || 0);
            toast.success(
                `${response.data.created_count || 0} entrega(s) protegida(s)${
                    duplicateCount ? `; ${duplicateCount} duplicada(s) ignorada(s)` : ''
                }.`,
            );
            setForm(emptyForm);
            setBulkAccess('');
            await load();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Erro ao proteger as entregas.');
        } finally {
            setSaving(false);
        }
    };

    const deleteItem = async (itemId: string) => {
        if (!confirm('Excluir esta entrega disponível?')) return;
        try {
            await uniqueDeliveryAPI.deleteItem(productId, itemId);
            toast.success('Entrega removida.');
            await load();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Não foi possível excluir.');
        }
    };

    if (loading) {
        return (
            <div className="uniqueDeliveryLoading">
                <span />
                <style>{`
                    .uniqueDeliveryLoading { display:grid; min-height:300px; place-items:center; }
                    .uniqueDeliveryLoading span {
                        animation:uniqueDeliverySpin .8s linear infinite;
                        border:3px solid var(--border-color);
                        border-radius:50%;
                        border-top-color:var(--accent-primary);
                        height:36px;
                        width:36px;
                    }
                    @keyframes uniqueDeliverySpin { to { transform:rotate(360deg); } }
                `}</style>
            </div>
        );
    }

    const enabled = Boolean(data?.settings?.enabled);
    const deliveryMode: 'members' | 'unique' = enabled ? 'unique' : 'members';
    const summary = data?.summary || { total: 0, available: 0, assigned: 0, waiting: 0 };

    return (
        <div className="uniqueDeliveryPage">
            <section className="glass-card deliveryModeSelector">
                <header>
                    <p>Modalidade de entrega</p>
                    <h2>Como você quer entregar este produto?</h2>
                    <span>
                        Escolha uma opção. Somente a modalidade selecionada será
                        liberada automaticamente nas próximas vendas.
                    </span>
                </header>

                <div className="deliveryModeGrid">
                    <button
                        type="button"
                        className={`deliveryModeCard ${deliveryMode === 'members' ? 'active members' : ''}`}
                        onClick={() => selectDeliveryMode('members')}
                        disabled={switchingMode}
                        aria-pressed={deliveryMode === 'members'}
                    >
                        <span className="deliveryModeIcon"><FiBookOpen size={28} /></span>
                        <span className="deliveryModeCardContent">
                            <strong>Área de Membros</strong>
                            <small>
                                Conteúdos compartilhados, módulos e aulas disponíveis
                                para todos os compradores deste produto.
                            </small>
                        </span>
                        <span className="deliveryModeStatus">
                            {deliveryMode === 'members'
                                ? <><FiCheck size={15} /> Ativa</>
                                : 'Selecionar'}
                        </span>
                    </button>

                    <button
                        type="button"
                        className={`deliveryModeCard ${deliveryMode === 'unique' ? 'active unique' : ''}`}
                        onClick={() => selectDeliveryMode('unique')}
                        disabled={switchingMode}
                        aria-pressed={deliveryMode === 'unique'}
                    >
                        <span className="deliveryModeIcon"><FiKey size={28} /></span>
                        <span className="deliveryModeCardContent">
                            <strong>Entrega Única</strong>
                            <small>
                                Uma credencial, conta, key ou código exclusivo para
                                cada venda aprovada.
                            </small>
                        </span>
                        <span className="deliveryModeStatus">
                            {deliveryMode === 'unique'
                                ? <><FiCheck size={15} /> Ativa</>
                                : 'Selecionar'}
                        </span>
                    </button>
                </div>

                <footer>
                    <span>
                        A alteração vale para novas compras. Entregas já realizadas
                        continuam preservadas.
                    </span>
                    {deliveryMode === 'members' && (
                        <Link href={`/dashboard/products/${productId}/content`}>
                            Gerenciar conteúdos da Área de Membros
                        </Link>
                    )}
                </footer>
            </section>

            <section className="glass-card uniqueDeliveryIntro">
                <span><FiKey size={24} /></span>
                <div>
                    <p>Estoque individual por venda</p>
                    <h2>Estoque de Entregas Únicas</h2>
                    <div>
                        Cada aprovação recebe uma única linha. A alocação é atômica e
                        uma entrega utilizada nunca retorna ao estoque. O estoque só
                        é consumido quando Entrega Única está selecionada acima.
                    </div>
                </div>
            </section>

            <section className="uniqueDeliverySecurity">
                <FiShield size={18} />
                <div>
                    <strong>Criptografia forte no armazenamento</strong>
                    <p>
                        Os dados são cifrados no servidor antes de chegar ao Supabase.
                        A chave não é enviada ao navegador. Depois de salvar, o vendedor
                        não consegue revelar ou editar o segredo; apenas removê-lo enquanto disponível.
                    </p>
                </div>
            </section>

            <div className="uniqueDeliveryStats">
                <article className="glass-card">
                    <span><FiPackage /></span><div><strong>{summary.total}</strong><small>Total</small></div>
                </article>
                <article className="glass-card">
                    <span className="available"><FiKey /></span><div><strong>{summary.available}</strong><small>Disponíveis</small></div>
                </article>
                <article className="glass-card">
                    <span className="assigned"><FiCheckCircle /></span><div><strong>{summary.assigned}</strong><small>Utilizadas</small></div>
                </article>
                <article className="glass-card">
                    <span className="waiting"><FiAlertTriangle /></span><div><strong>{summary.waiting}</strong><small>Aguardando estoque</small></div>
                </article>
            </div>

            {enabled && summary.available <= 2 && (
                <section className="uniqueDeliveryWarning">
                    <FiAlertTriangle size={18} />
                    <span>
                        Estoque baixo. O checkout é bloqueado quando não há linha disponível,
                        mas recomendamos repor antes da próxima campanha.
                    </span>
                </section>
            )}

            <section className="glass-card uniqueDeliveryCreate">
                <header>
                    <div>
                        <h3>Adicionar ao estoque</h3>
                        <p>O conteúdo é criptografado assim que você enviar.</p>
                    </div>
                    <div className="uniqueDeliveryMode">
                        <button
                            type="button"
                            className={mode === 'single' ? 'active' : ''}
                            onClick={() => setMode('single')}
                        >
                            Cadastro completo
                        </button>
                        <button
                            type="button"
                            className={mode === 'bulk' ? 'active' : ''}
                            onClick={() => setMode('bulk')}
                        >
                            Importar linhas
                        </button>
                    </div>
                </header>

                <form onSubmit={submit}>
                    {mode === 'single' ? (
                        <label className="uniqueDeliveryField">
                            <span>Acesso exclusivo *</span>
                            <textarea
                                className="input-field"
                                rows={4}
                                required
                                maxLength={10_000}
                                placeholder={'Login: cliente123\nSenha: senha-segura\nKey: XXXX-XXXX-XXXX'}
                                value={form.access}
                                onChange={(event) => update('access', event.target.value)}
                            />
                        </label>
                    ) : (
                        <label className="uniqueDeliveryField">
                            <span>Uma entrega por linha * ({bulkLines.length}/250)</span>
                            <textarea
                                className="input-field"
                                rows={8}
                                required
                                placeholder={'conta1@email.com | senha1\nconta2@email.com | senha2\nKEY-AAAA-BBBB'}
                                value={bulkAccess}
                                onChange={(event) => setBulkAccess(event.target.value)}
                            />
                            <small>
                                Os campos complementares abaixo serão aplicados a todas as linhas deste lote.
                            </small>
                        </label>
                    )}

                    <div className="uniqueDeliveryFormGrid">
                        <label className="uniqueDeliveryField">
                            <span>Instruções de uso</span>
                            <textarea
                                className="input-field"
                                rows={4}
                                maxLength={20_000}
                                placeholder="Explique como usar o acesso."
                                value={form.instructions}
                                onChange={(event) => update('instructions', event.target.value)}
                            />
                        </label>
                        <label className="uniqueDeliveryField">
                            <span>Texto personalizado</span>
                            <textarea
                                className="input-field"
                                rows={4}
                                maxLength={20_000}
                                placeholder="Mensagem exclusiva para o comprador."
                                value={form.customText}
                                onChange={(event) => update('customText', event.target.value)}
                            />
                        </label>
                    </div>

                    <label className="uniqueDeliveryField">
                        <span>Link de redirecionamento</span>
                        <input
                            className="input-field"
                            type="url"
                            maxLength={2_048}
                            placeholder="https://..."
                            value={form.redirectUrl}
                            onChange={(event) => update('redirectUrl', event.target.value)}
                        />
                    </label>

                    <label className="uniqueDeliveryField">
                        <span>Observações</span>
                        <textarea
                            className="input-field"
                            rows={3}
                            maxLength={20_000}
                            placeholder="Informações adicionais."
                            value={form.notes}
                            onChange={(event) => update('notes', event.target.value)}
                        />
                    </label>

                    <button className="btn-primary uniqueDeliverySubmit" disabled={saving}>
                        <FiLock size={15} />
                        {saving
                            ? 'Criptografando...'
                            : mode === 'bulk'
                                ? `Proteger ${bulkLines.length || ''} linha(s)`
                                : 'Proteger e adicionar ao estoque'}
                    </button>
                </form>
            </section>

            <section className="glass-card uniqueDeliveryInventory">
                <header>
                    <div>
                        <h3>Inventário protegido</h3>
                        <p>O conteúdo secreto nunca é retornado nesta tela.</p>
                    </div>
                </header>

                {data?.inventory?.length ? (
                    <div className="uniqueDeliveryTableWrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Entrega</th>
                                    <th>Status</th>
                                    <th>Venda vinculada</th>
                                    <th>Cadastro</th>
                                    <th aria-label="Ações" />
                                </tr>
                            </thead>
                            <tbody>
                                {data.inventory.map((item: any) => (
                                    <tr key={item.id}>
                                        <td>
                                            <strong>#{item.number || item.id.slice(0, 8)}</strong>
                                            <small><FiLock size={11} /> AES-256-GCM</small>
                                        </td>
                                        <td>
                                            <span className={`uniqueDeliveryStatus ${item.status}`}>
                                                {item.status === 'available' ? 'Disponível' : 'Utilizada'}
                                            </span>
                                        </td>
                                        <td>
                                            {item.fulfillment ? (
                                                <div className="uniqueDeliveryBuyer">
                                                    <strong>{item.fulfillment.buyer_email}</strong>
                                                    <small>
                                                        Pedido {item.fulfillment.order_id.slice(0, 8)}
                                                        {item.fulfillment.first_viewed_at
                                                            ? ' · visualizada'
                                                            : ' · ainda não visualizada'}
                                                    </small>
                                                </div>
                                            ) : '—'}
                                        </td>
                                        <td>{formatDate(item.created_at)}</td>
                                        <td>
                                            {item.status === 'available' && (
                                                <button
                                                    type="button"
                                                    onClick={() => deleteItem(item.id)}
                                                    aria-label={`Excluir entrega ${item.number}`}
                                                >
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
                    <div className="uniqueDeliveryEmpty">
                        <FiKey size={38} />
                        <h4>Nenhuma entrega cadastrada</h4>
                        <p>Adicione a primeira linha acima antes de iniciar suas vendas.</p>
                    </div>
                )}
            </section>

            <style>{`
                .uniqueDeliveryPage { display:grid; gap:18px; }
                .deliveryModeSelector {
                    background:
                        radial-gradient(circle at 8% 0,rgba(108,92,231,.16),transparent 34%),
                        var(--card-bg);
                    padding:28px;
                }
                .deliveryModeSelector > header { margin-bottom:20px; text-align:center; }
                .deliveryModeSelector > header p {
                    color:var(--accent-primary);
                    font-size:10px;
                    font-weight:850;
                    letter-spacing:.11em;
                    margin:0 0 5px;
                    text-transform:uppercase;
                }
                .deliveryModeSelector > header h2 {
                    font-size:24px;
                    letter-spacing:-.025em;
                    margin:0 0 7px;
                }
                .deliveryModeSelector > header span {
                    color:var(--text-secondary);
                    display:block;
                    font-size:12px;
                    line-height:1.55;
                }
                .deliveryModeGrid {
                    display:grid;
                    gap:15px;
                    grid-template-columns:repeat(2,minmax(0,1fr));
                }
                .deliveryModeCard {
                    align-items:center;
                    background:var(--bg-secondary);
                    border:2px solid var(--border-color);
                    border-radius:18px;
                    color:var(--text-primary);
                    cursor:pointer;
                    display:grid;
                    gap:14px;
                    grid-template-columns:auto 1fr auto;
                    min-height:142px;
                    padding:22px;
                    text-align:left;
                    transition:border-color .18s ease,box-shadow .18s ease,transform .18s ease;
                }
                .deliveryModeCard:hover:not(:disabled) {
                    border-color:rgba(108,92,231,.42);
                    transform:translateY(-2px);
                }
                .deliveryModeCard:disabled { cursor:wait; opacity:.72; }
                .deliveryModeCard.active {
                    background:linear-gradient(135deg,rgba(108,92,231,.1),rgba(108,92,231,.035));
                    border-color:var(--accent-primary);
                    box-shadow:0 12px 30px rgba(108,92,231,.13);
                }
                .deliveryModeCard.active.members {
                    background:linear-gradient(135deg,rgba(9,132,227,.1),rgba(9,132,227,.035));
                    border-color:#0984e3;
                    box-shadow:0 12px 30px rgba(9,132,227,.12);
                }
                .deliveryModeIcon {
                    align-items:center;
                    background:var(--card-bg);
                    border:1px solid var(--border-color);
                    border-radius:15px;
                    color:var(--text-muted);
                    display:flex;
                    height:58px;
                    justify-content:center;
                    width:58px;
                }
                .deliveryModeCard.active.unique .deliveryModeIcon { color:var(--accent-primary); }
                .deliveryModeCard.active.members .deliveryModeIcon { color:#0984e3; }
                .deliveryModeCardContent { display:block; min-width:0; }
                .deliveryModeCardContent strong {
                    display:block;
                    font-size:17px;
                    margin-bottom:6px;
                }
                .deliveryModeCardContent small {
                    color:var(--text-secondary);
                    display:block;
                    font-size:11px;
                    line-height:1.55;
                }
                .deliveryModeStatus {
                    align-items:center;
                    border:1px solid var(--border-color);
                    border-radius:999px;
                    color:var(--text-muted);
                    display:flex;
                    font-size:10px;
                    font-weight:800;
                    gap:5px;
                    padding:7px 10px;
                    text-transform:uppercase;
                }
                .deliveryModeCard.active .deliveryModeStatus {
                    background:rgba(0,184,148,.1);
                    border-color:rgba(0,184,148,.25);
                    color:#00b894;
                }
                .deliveryModeSelector > footer {
                    align-items:center;
                    display:flex;
                    gap:14px;
                    justify-content:space-between;
                    margin-top:15px;
                }
                .deliveryModeSelector > footer > span {
                    color:var(--text-muted);
                    font-size:10px;
                }
                .deliveryModeSelector > footer a {
                    color:var(--accent-primary);
                    font-size:11px;
                    font-weight:750;
                    text-decoration:none;
                }
                .uniqueDeliveryIntro {
                    align-items:center;
                    background:radial-gradient(circle at 90% 0,rgba(108,92,231,.2),transparent 43%),var(--card-bg);
                    display:flex;
                    gap:16px;
                    padding:24px;
                }
                .uniqueDeliveryIntro > span {
                    align-items:center;
                    background:rgba(108,92,231,.14);
                    border:1px solid rgba(108,92,231,.22);
                    border-radius:14px;
                    color:var(--accent-primary);
                    display:flex;
                    flex:0 0 auto;
                    height:52px;
                    justify-content:center;
                    width:52px;
                }
                .uniqueDeliveryIntro > div { flex:1; min-width:0; }
                .uniqueDeliveryIntro p {
                    color:var(--accent-primary);
                    font-size:10px;
                    font-weight:800;
                    letter-spacing:.1em;
                    margin:0 0 4px;
                    text-transform:uppercase;
                }
                .uniqueDeliveryIntro h2 { font-size:21px; margin:0 0 5px; }
                .uniqueDeliveryIntro > div > div {
                    color:var(--text-secondary);
                    font-size:12px;
                    line-height:1.5;
                }
                .uniqueDeliverySecurity,
                .uniqueDeliveryWarning {
                    align-items:flex-start;
                    border:1px solid rgba(108,92,231,.22);
                    border-radius:13px;
                    display:flex;
                    gap:12px;
                    padding:15px 17px;
                }
                .uniqueDeliverySecurity { background:rgba(108,92,231,.07); color:var(--accent-primary); }
                .uniqueDeliverySecurity strong { display:block; font-size:12px; margin-bottom:3px; }
                .uniqueDeliverySecurity p { color:var(--text-secondary); font-size:11px; line-height:1.55; margin:0; }
                .uniqueDeliveryWarning {
                    background:rgba(253,203,110,.09);
                    border-color:rgba(253,203,110,.28);
                    color:#e1a622;
                    font-size:12px;
                    line-height:1.5;
                }
                .uniqueDeliveryStats {
                    display:grid;
                    gap:12px;
                    grid-template-columns:repeat(4,minmax(0,1fr));
                }
                .uniqueDeliveryStats article {
                    align-items:center;
                    display:flex;
                    gap:12px;
                    padding:16px;
                }
                .uniqueDeliveryStats article > span {
                    align-items:center;
                    background:var(--bg-secondary);
                    border-radius:10px;
                    color:var(--text-muted);
                    display:flex;
                    height:38px;
                    justify-content:center;
                    width:38px;
                }
                .uniqueDeliveryStats span.available { color:#00b894; }
                .uniqueDeliveryStats span.assigned { color:var(--accent-primary); }
                .uniqueDeliveryStats span.waiting { color:#e1a622; }
                .uniqueDeliveryStats strong { display:block; font-size:21px; }
                .uniqueDeliveryStats small { color:var(--text-muted); font-size:10px; }
                .uniqueDeliveryCreate,
                .uniqueDeliveryInventory { padding:24px; }
                .uniqueDeliveryCreate > header,
                .uniqueDeliveryInventory > header {
                    align-items:flex-start;
                    display:flex;
                    gap:16px;
                    justify-content:space-between;
                    margin-bottom:20px;
                }
                .uniqueDeliveryCreate h3,
                .uniqueDeliveryInventory h3 { font-size:17px; margin:0 0 4px; }
                .uniqueDeliveryCreate header p,
                .uniqueDeliveryInventory header p { color:var(--text-muted); font-size:11px; margin:0; }
                .uniqueDeliveryMode {
                    background:var(--bg-secondary);
                    border:1px solid var(--border-color);
                    border-radius:10px;
                    display:flex;
                    padding:3px;
                }
                .uniqueDeliveryMode button {
                    background:none;
                    border:0;
                    border-radius:7px;
                    color:var(--text-muted);
                    cursor:pointer;
                    font-size:11px;
                    font-weight:700;
                    padding:8px 10px;
                }
                .uniqueDeliveryMode button.active {
                    background:var(--card-bg);
                    box-shadow:0 2px 8px rgba(0,0,0,.08);
                    color:var(--accent-primary);
                }
                .uniqueDeliveryCreate form { display:grid; gap:15px; }
                .uniqueDeliveryField { display:grid; gap:6px; }
                .uniqueDeliveryField > span {
                    color:var(--text-secondary);
                    font-size:12px;
                    font-weight:700;
                }
                .uniqueDeliveryField small { color:var(--text-muted); font-size:10px; }
                .uniqueDeliveryFormGrid {
                    display:grid;
                    gap:14px;
                    grid-template-columns:repeat(2,minmax(0,1fr));
                }
                .uniqueDeliverySubmit {
                    align-items:center;
                    display:flex;
                    gap:8px;
                    justify-content:center;
                    justify-self:end;
                    min-width:235px;
                }
                .uniqueDeliveryTableWrap { overflow-x:auto; }
                .uniqueDeliveryInventory table {
                    border-collapse:collapse;
                    min-width:820px;
                    width:100%;
                }
                .uniqueDeliveryInventory th {
                    border-bottom:1px solid var(--border-color);
                    color:var(--text-muted);
                    font-size:10px;
                    letter-spacing:.04em;
                    padding:10px 12px;
                    text-align:left;
                    text-transform:uppercase;
                }
                .uniqueDeliveryInventory td {
                    border-bottom:1px solid var(--border-color);
                    color:var(--text-secondary);
                    font-size:11px;
                    padding:13px 12px;
                }
                .uniqueDeliveryInventory tbody tr:last-child td { border-bottom:0; }
                .uniqueDeliveryInventory td:first-child strong { color:var(--text-primary); display:block; font-size:12px; }
                .uniqueDeliveryInventory td:first-child small,
                .uniqueDeliveryBuyer small {
                    align-items:center;
                    color:var(--text-muted);
                    display:flex;
                    font-size:9px;
                    gap:4px;
                    margin-top:3px;
                }
                .uniqueDeliveryStatus {
                    border-radius:999px;
                    display:inline-flex;
                    font-size:9px;
                    font-weight:800;
                    padding:5px 8px;
                    text-transform:uppercase;
                }
                .uniqueDeliveryStatus.available { background:rgba(0,184,148,.11); color:#00b894; }
                .uniqueDeliveryStatus.assigned { background:rgba(108,92,231,.12); color:var(--accent-primary); }
                .uniqueDeliveryBuyer strong { color:var(--text-primary); font-size:11px; }
                .uniqueDeliveryInventory td:last-child button {
                    align-items:center;
                    background:rgba(225,112,85,.1);
                    border:0;
                    border-radius:8px;
                    color:#e17055;
                    cursor:pointer;
                    display:flex;
                    height:30px;
                    justify-content:center;
                    width:30px;
                }
                .uniqueDeliveryEmpty { color:var(--text-muted); padding:42px 20px; text-align:center; }
                .uniqueDeliveryEmpty svg { opacity:.4; }
                .uniqueDeliveryEmpty h4 { color:var(--text-primary); margin:12px 0 5px; }
                .uniqueDeliveryEmpty p { font-size:11px; margin:0; }
                @media (max-width:820px) {
                    .uniqueDeliveryStats { grid-template-columns:repeat(2,minmax(0,1fr)); }
                    .uniqueDeliveryIntro { align-items:flex-start; flex-wrap:wrap; }
                    .deliveryModeGrid { grid-template-columns:1fr; }
                }
                @media (max-width:600px) {
                    .deliveryModeSelector { padding:22px 14px; }
                    .deliveryModeSelector > header h2 { font-size:21px; }
                    .deliveryModeCard {
                        grid-template-columns:auto 1fr;
                        min-height:0;
                        padding:17px 14px;
                    }
                    .deliveryModeIcon { height:50px; width:50px; }
                    .deliveryModeStatus { grid-column:1 / -1; justify-content:center; }
                    .deliveryModeSelector > footer {
                        align-items:flex-start;
                        flex-direction:column;
                    }
                    .uniqueDeliveryStats { grid-template-columns:1fr 1fr; }
                    .uniqueDeliveryCreate,
                    .uniqueDeliveryInventory { padding:18px 14px; }
                    .uniqueDeliveryCreate > header { flex-direction:column; }
                    .uniqueDeliveryMode { width:100%; }
                    .uniqueDeliveryMode button { flex:1; }
                    .uniqueDeliveryFormGrid { grid-template-columns:1fr; }
                    .uniqueDeliverySubmit { justify-self:stretch; width:100%; }
                }
            `}</style>
        </div>
    );
}
