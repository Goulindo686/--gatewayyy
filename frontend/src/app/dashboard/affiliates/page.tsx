'use client';

/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */

import { useEffect, useMemo, useState } from 'react';
import {
    FiCheck,
    FiClipboard,
    FiDollarSign,
    FiExternalLink,
    FiLink,
    FiRefreshCw,
    FiSearch,
    FiSettings,
    FiShoppingBag,
    FiUserCheck,
    FiX,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { affiliatesAPI } from '@/lib/api';

type Tab = 'producer' | 'affiliate' | 'marketplace';

const emptyDraft = {
    status: 'active',
    enrollment_mode: 'manual',
    commission_rate_bps: 3000,
    attribution_model: 'last_click',
    cookie_days: 60,
    marketplace_visible: false,
    commission_on_bumps: true,
    commission_on_renewals: true,
    hold_days: 7,
    terms_text: '',
};

function formatBRL(cents: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(cents || 0) / 100);
}

function formatDate(value: string) {
    return value ? new Date(value).toLocaleDateString('pt-BR') : '-';
}

function statusLabel(status: string) {
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
    return labels[status] || status;
}

export default function AffiliatesPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [tab, setTab] = useState<Tab>('producer');
    const [editingProduct, setEditingProduct] = useState<any>(null);
    const [draft, setDraft] = useState<any>(emptyDraft);
    const [saving, setSaving] = useState(false);
    const [query, setQuery] = useState('');
    const [inviteCode, setInviteCode] = useState('');

    const load = async (quiet = false) => {
        if (!quiet) setLoading(true);
        setRefreshing(true);
        try {
            const response = await affiliatesAPI.getOverview();
            setData(response.data);
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Erro ao carregar afiliados');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        load();
        const invite = new URLSearchParams(window.location.search).get('invite')
            || localStorage.getItem('pending_affiliate_invite');
        if (invite) {
            setInviteCode(invite);
            setTab('affiliate');
        }
    }, []);

    const openProgram = (product: any) => {
        setEditingProduct(product);
        setDraft({
            ...emptyDraft,
            ...(product.program || {}),
            terms_text: product.program?.terms_text || '',
        });
    };

    const saveProgram = async () => {
        if (!editingProduct) return;
        setSaving(true);
        try {
            await affiliatesAPI.saveProgram(editingProduct.id, {
                ...draft,
                commission_rate_bps: Math.round(Number(draft.commission_rate_bps)),
                cookie_days: Math.round(Number(draft.cookie_days)),
                hold_days: Math.round(Number(draft.hold_days)),
            });
            toast.success('Programa de afiliados salvo');
            setEditingProduct(null);
            await load(true);
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Erro ao salvar programa');
        } finally {
            setSaving(false);
        }
    };

    const requestAffiliation = async (programId?: string, invitation?: string) => {
        if (!data?.recipient?.ready) {
            toast.error('Configure sua conta de recebimento nas configuracoes antes de se afiliar.');
            return;
        }
        if (!window.confirm('Ao continuar, voce aceita os termos atuais deste programa de afiliados.')) return;
        try {
            await affiliatesAPI.requestAffiliation({
                program_id: programId,
                invite_code: invitation,
                terms_accepted: true,
            });
            toast.success('Solicitacao registrada');
            setInviteCode('');
            localStorage.removeItem('pending_affiliate_invite');
            window.history.replaceState({}, '', '/dashboard/affiliates');
            await load(true);
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Erro ao solicitar afiliacao');
        }
    };

    const updateAffiliation = async (id: string, action: string, customRate?: number | null) => {
        try {
            await affiliatesAPI.updateAffiliation(id, {
                action,
                ...(customRate !== undefined ? { custom_commission_rate_bps: customRate } : {}),
            });
            toast.success('Afiliacao atualizada');
            await load(true);
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Erro ao atualizar afiliacao');
        }
    };

    const editCustomRate = (affiliation: any) => {
        const current = affiliation.custom_commission_rate_bps
            ? Number(affiliation.custom_commission_rate_bps) / 100
            : '';
        const input = window.prompt('Comissao personalizada em % (deixe vazio para usar o padrao):', String(current));
        if (input === null) return;
        if (!input.trim()) {
            updateAffiliation(affiliation.id, affiliation.status === 'approved' ? 'approve' : 'approve', null);
            return;
        }
        const percentage = Number(input.replace(',', '.'));
        if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 90) {
            toast.error('Informe um percentual entre 0,01% e 90%.');
            return;
        }
        updateAffiliation(affiliation.id, 'approve', Math.round(percentage * 100));
    };

    const copy = async (value: string, message = 'Link copiado') => {
        await navigator.clipboard.writeText(value);
        toast.success(message);
    };
    const invitationUrl = (code: string) => `${window.location.origin}/affiliate-invite/${code}`;

    const marketplace = useMemo(() => {
        const term = query.trim().toLowerCase();
        return (data?.marketplace || []).filter((program: any) => !term || [
            program.product?.name,
            program.product?.description,
            program.producer?.name,
        ].some((value) => String(value || '').toLowerCase().includes(term)));
    }, [data, query]);

    if (loading) {
        return <div className="affiliate-loading"><span /></div>;
    }

    return (
        <div className="affiliate-shell">
            <header className="affiliate-header">
                <div>
                    <span className="eyebrow">Crescimento compartilhado</span>
                    <h1>Afiliados</h1>
                    <p>Configure programas, divulgue produtos e acompanhe cada comissao.</p>
                </div>
                <button className="ghost-button" onClick={() => load(true)} disabled={refreshing}>
                    <FiRefreshCw className={refreshing ? 'spin' : ''} /> Atualizar
                </button>
            </header>

            {!data?.recipient?.ready && (
                <div className="warning-banner">
                    <FiDollarSign />
                    <div>
                        <strong>Conta de recebimento necessaria</strong>
                        <span>Para atuar como afiliado, conclua seus dados bancarios e a validacao do recebedor.</span>
                    </div>
                    <a href="/dashboard/settings">Configurar agora <FiExternalLink /></a>
                </div>
            )}

            {inviteCode && (
                <div className="invite-banner">
                    <FiLink />
                    <div>
                        <strong>Voce recebeu um convite de afiliacao</strong>
                        <span>Revise e aceite os termos para gerar seu link exclusivo.</span>
                    </div>
                    <button onClick={() => requestAffiliation(undefined, inviteCode)}>Aceitar convite</button>
                </div>
            )}

            <nav className="affiliate-tabs">
                <button className={tab === 'producer' ? 'active' : ''} onClick={() => setTab('producer')}>
                    <FiShoppingBag /> Como produtor
                </button>
                <button className={tab === 'affiliate' ? 'active' : ''} onClick={() => setTab('affiliate')}>
                    <FiUserCheck /> Como afiliado
                </button>
                <button className={tab === 'marketplace' ? 'active' : ''} onClick={() => setTab('marketplace')}>
                    <FiSearch /> Marketplace
                </button>
            </nav>

            {tab === 'producer' && (
                <>
                    <section className="metric-grid">
                        <article><span>Cliques</span><strong>{data?.producer?.stats?.clicks || 0}</strong></article>
                        <article><span>Vendas atribuidas</span><strong>{data?.producer?.stats?.sales || 0}</strong></article>
                        <article><span>Comissoes geradas</span><strong>{formatBRL(data?.producer?.stats?.commissions_amount || 0)}</strong></article>
                    </section>

                    <section className="panel">
                        <div className="panel-title">
                            <div><h2>Programas por produto</h2><p>Novos programas comecam desativados ate voce salvar a configuracao.</p></div>
                        </div>
                        <div className="product-grid">
                            {(data?.producer?.products || []).map((product: any) => (
                                <article className="product-card" key={product.id}>
                                    <div className="product-summary">
                                        <div className="product-image">
                                            {product.image_url ? <img src={product.image_url} alt="" /> : <FiShoppingBag />}
                                        </div>
                                        <div className="product-copy">
                                            <div className="title-row">
                                                <strong>{product.name}</strong>
                                                <span className={`status ${product.program?.status || 'inactive'}`}>
                                                    {product.program?.status === 'active' ? 'Programa ativo' : 'Programa inativo'}
                                                </span>
                                            </div>
                                            <span>{formatBRL(product.price)}</span>
                                            {product.program && (
                                                <small>
                                                    {(product.program.commission_rate_bps / 100).toFixed(2).replace('.', ',')}% de comissao
                                                    {' · '}{product.program.cookie_days} dias de cookie
                                                </small>
                                            )}
                                        </div>
                                    </div>
                                    <div className="product-actions">
                                        <button className="primary-button" onClick={() => openProgram(product)}>
                                            <FiSettings /> {product.program ? 'Editar programa' : 'Criar programa'}
                                        </button>
                                        {product.program?.invite_code && (
                                            <button
                                                className="invite-button"
                                                onClick={() => copy(invitationUrl(product.program.invite_code), 'Link de convite copiado')}
                                            >
                                                <FiLink /> Copiar convite
                                            </button>
                                        )}
                                    </div>
                                </article>
                            ))}
                            {(data?.producer?.products || []).length === 0 && <div className="empty">Crie um produto antes de abrir um programa.</div>}
                        </div>
                    </section>

                    <section className="panel">
                        <div className="panel-title"><div><h2>Solicitacoes e afiliados</h2><p>Controle quem pode divulgar seus produtos.</p></div></div>
                        <div className="table-wrap">
                            <table>
                                <thead><tr><th>Afiliado</th><th>Produto</th><th>Comissao</th><th>Status</th><th>Solicitado em</th><th>Acoes</th></tr></thead>
                                <tbody>
                                    {(data?.producer?.affiliations || []).map((affiliation: any) => {
                                        const programProduct = (data?.producer?.products || []).find((p: any) => p.id === affiliation.program?.product_id);
                                        const rate = affiliation.custom_commission_rate_bps || affiliation.program?.commission_rate_bps || 0;
                                        return (
                                            <tr key={affiliation.id}>
                                                <td><strong>{affiliation.affiliate?.name || 'Usuario'}</strong><small>{affiliation.affiliate?.email}</small></td>
                                                <td>{programProduct?.name || '-'}</td>
                                                <td>{(rate / 100).toFixed(2).replace('.', ',')}%</td>
                                                <td><span className={`status ${affiliation.status}`}>{statusLabel(affiliation.status)}</span></td>
                                                <td>{formatDate(affiliation.requested_at)}</td>
                                                <td><div className="row-actions">
                                                    {affiliation.status !== 'approved' && <button className="approve" onClick={() => updateAffiliation(affiliation.id, 'approve')}><FiCheck /> Aprovar</button>}
                                                    {affiliation.status === 'approved' && <button onClick={() => editCustomRate(affiliation)}>Editar %</button>}
                                                    {affiliation.status === 'pending' && <button onClick={() => updateAffiliation(affiliation.id, 'reject')}><FiX /> Recusar</button>}
                                                    {affiliation.status === 'approved' && <button onClick={() => updateAffiliation(affiliation.id, 'suspend')}><FiX /> Suspender</button>}
                                                </div></td>
                                            </tr>
                                        );
                                    })}
                                    {(data?.producer?.affiliations || []).length === 0 && <tr><td colSpan={6}><div className="empty">Nenhuma solicitacao recebida.</div></td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </>
            )}

            {tab === 'affiliate' && (
                <>
                    <section className="metric-grid four">
                        <article><span>Cliques</span><strong>{data?.affiliate?.stats?.clicks || 0}</strong></article>
                        <article><span>Vendas</span><strong>{data?.affiliate?.stats?.sales || 0}</strong></article>
                        <article><span>Em processamento</span><strong>{formatBRL(data?.affiliate?.stats?.pending_amount || 0)}</strong></article>
                        <article><span>Disponivel</span><strong>{formatBRL(data?.affiliate?.stats?.available_amount || 0)}</strong></article>
                    </section>

                    <section className="panel">
                        <div className="panel-title"><div><h2>Meus programas</h2><p>Use apenas o link exclusivo para preservar a atribuicao.</p></div></div>
                        <div className="program-list">
                            {(data?.affiliate?.affiliations || []).map((affiliation: any) => {
                                const link = affiliation.link?.code ? `${window.location.origin}/a/${affiliation.link.code}` : '';
                                const rate = affiliation.custom_commission_rate_bps || affiliation.program?.commission_rate_bps || 0;
                                return (
                                    <article className="program-card" key={affiliation.id}>
                                        <div className="program-main">
                                            <div className="product-image small">
                                                {affiliation.product?.image_url ? <img src={affiliation.product.image_url} alt="" /> : <FiShoppingBag />}
                                            </div>
                                            <div>
                                                <strong>{affiliation.product?.name || 'Produto'}</strong>
                                                <span>{affiliation.producer?.name || 'Produtor'} · {(rate / 100).toFixed(2).replace('.', ',')}%</span>
                                            </div>
                                        </div>
                                        <span className={`status ${affiliation.status}`}>{statusLabel(affiliation.status)}</span>
                                        {link && <button className="link-button" onClick={() => copy(link)}><FiLink /> Copiar link</button>}
                                        {!link && <span className="muted">Aguardando aprovacao</span>}
                                        {!['cancelled', 'rejected'].includes(affiliation.status) && (
                                            <button className="text-danger" onClick={() => updateAffiliation(affiliation.id, 'cancel')}>Sair</button>
                                        )}
                                    </article>
                                );
                            })}
                            {(data?.affiliate?.affiliations || []).length === 0 && <div className="empty">Voce ainda nao participa de nenhum programa.</div>}
                        </div>
                    </section>

                    <section className="panel">
                        <div className="panel-title"><div><h2>Historico de comissoes</h2><p>Valores de compradores nao sao exibidos ao afiliado.</p></div></div>
                        <div className="table-wrap">
                            <table>
                                <thead><tr><th>Data</th><th>Origem</th><th>Venda</th><th>Comissao</th><th>Status</th><th>Disponivel em</th></tr></thead>
                                <tbody>
                                    {(data?.affiliate?.commissions || []).map((commission: any) => (
                                        <tr key={commission.id}>
                                            <td>{formatDate(commission.created_at)}</td>
                                            <td>{commission.source_type === 'subscription_renewal' ? 'Renovacao' : commission.source_type === 'subscription_initial' ? 'Assinatura' : 'Venda'}</td>
                                            <td>{formatBRL(commission.gross_amount)}</td>
                                            <td><strong>{formatBRL(commission.commission_amount)}</strong></td>
                                            <td><span className={`status ${commission.status}`}>{statusLabel(commission.status)}</span></td>
                                            <td>{formatDate(commission.available_at)}</td>
                                        </tr>
                                    ))}
                                    {(data?.affiliate?.commissions || []).length === 0 && <tr><td colSpan={6}><div className="empty">Nenhuma comissao registrada.</div></td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </>
            )}

            {tab === 'marketplace' && (
                <section className="panel">
                    <div className="marketplace-heading">
                        <div><h2>Marketplace de afiliacao</h2><p>Encontre produtos que aceitam divulgadores.</p></div>
                        <label><FiSearch /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar produto ou produtor" /></label>
                    </div>
                    <div className="marketplace-note">
                        Seus produtos publicados aparecem com a etiqueta <strong>Seu programa</strong>. Programas configurados como
                        <strong> Somente por convite</strong> ficam visiveis, mas o afiliado precisa receber seu link para entrar.
                    </div>
                    <div className="market-grid">
                        {marketplace.map((program: any) => {
                            const rate = program.commission_rate_bps / 100;
                            return (
                                <article className="market-card" key={program.id}>
                                    <div className="market-image">
                                        {program.product?.image_url ? <img src={program.product.image_url} alt="" /> : <FiShoppingBag />}
                                        <span>{rate.toFixed(2).replace('.', ',')}%</span>
                                    </div>
                                    <div>
                                        <small>{program.producer?.name || 'Produtor'}</small>
                                        <h3>{program.product?.name}</h3>
                                        <p>{program.product?.description || 'Produto digital disponivel para afiliacao.'}</p>
                                    </div>
                                    <div className="market-footer">
                                        <div className="market-meta">
                                            <span>Cookie de {program.cookie_days} dias</span>
                                            <span>
                                                {program.enrollment_mode === 'invite'
                                                    ? 'Somente por convite'
                                                    : program.enrollment_mode === 'automatic'
                                                        ? 'Aprovacao automatica'
                                                        : 'Aprovacao manual'}
                                            </span>
                                        </div>
                                        {program.is_own_program ? (
                                            <span className="status own">Seu programa</span>
                                        ) : program.affiliation ? (
                                            <span className={`status ${program.affiliation.status}`}>{statusLabel(program.affiliation.status)}</span>
                                        ) : program.enrollment_mode === 'invite' ? (
                                            <span className="status invite-only">Requer convite</span>
                                        ) : (
                                            <button className="primary-button" onClick={() => requestAffiliation(program.id)}>
                                                Solicitar afiliacao
                                            </button>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                        {marketplace.length === 0 && <div className="empty">Nenhum programa encontrado.</div>}
                    </div>
                </section>
            )}

            {editingProduct && (
                <div className="modal-backdrop" onMouseDown={() => setEditingProduct(null)}>
                    <div className="modal-card" onMouseDown={(event) => event.stopPropagation()}>
                        <header>
                            <div><span>Programa de afiliados</span><h2>{editingProduct.name}</h2></div>
                            <button className="icon-button" onClick={() => setEditingProduct(null)}><FiX /></button>
                        </header>
                        <div className="form-grid">
                            <label className="toggle-row full">
                                <div><strong>Programa ativo</strong><span>Quando inativo, nenhum novo checkout sera atribuido.</span></div>
                                <input type="checkbox" checked={draft.status === 'active'} onChange={(event) => setDraft({ ...draft, status: event.target.checked ? 'active' : 'inactive' })} />
                            </label>
                            <label><span>Comissao padrao (%)</span><input type="number" min="0.01" max="90" step="0.01" value={draft.commission_rate_bps / 100} onChange={(event) => setDraft({ ...draft, commission_rate_bps: Number(event.target.value) * 100 })} /></label>
                            <label><span>Entrada de afiliados</span><select value={draft.enrollment_mode} onChange={(event) => setDraft({ ...draft, enrollment_mode: event.target.value })}><option value="manual">Aprovacao manual</option><option value="automatic">Aprovacao automatica</option><option value="invite">Somente por convite</option></select></label>
                            <label><span>Modelo de atribuicao</span><select value={draft.attribution_model} onChange={(event) => setDraft({ ...draft, attribution_model: event.target.value })}><option value="last_click">Ultimo clique</option><option value="first_click">Primeiro clique</option></select></label>
                            <label><span>Duracao do cookie (dias)</span><input type="number" min="1" max="365" value={draft.cookie_days} onChange={(event) => setDraft({ ...draft, cookie_days: Number(event.target.value) })} /></label>
                            <label><span>Prazo de seguranca (dias)</span><input type="number" min="0" max="180" value={draft.hold_days} onChange={(event) => setDraft({ ...draft, hold_days: Number(event.target.value) })} /></label>
                            <label className="toggle-row"><div><strong>Exibir no marketplace</strong><span>Publica o produto na vitrine. No modo convite, a pessoa ainda precisara do seu link.</span></div><input type="checkbox" checked={draft.marketplace_visible} onChange={(event) => setDraft({ ...draft, marketplace_visible: event.target.checked })} /></label>
                            <label className="toggle-row"><div><strong>Comissao em order bumps</strong><span>Aplica a taxa ao carrinho completo.</span></div><input type="checkbox" checked={draft.commission_on_bumps} onChange={(event) => setDraft({ ...draft, commission_on_bumps: event.target.checked })} /></label>
                            <label className="toggle-row"><div><strong>Comissao nas renovacoes</strong><span>Mantem o split nas recorrencias.</span></div><input type="checkbox" checked={draft.commission_on_renewals} onChange={(event) => setDraft({ ...draft, commission_on_renewals: event.target.checked })} /></label>
                            {draft.invite_code && (
                                <div className="invite-box full">
                                    <div>
                                        <strong>Link de convite</strong>
                                        <span>Envie este link para a pessoa criar a conta e aceitar sua afiliacao.</span>
                                    </div>
                                    <div className="invite-link-row">
                                        <input readOnly value={invitationUrl(draft.invite_code)} />
                                        <button type="button" onClick={() => copy(invitationUrl(draft.invite_code), 'Link de convite copiado')}>
                                            <FiClipboard /> Copiar
                                        </button>
                                    </div>
                                </div>
                            )}
                            <label className="full"><span>Termos do programa</span><textarea rows={5} value={draft.terms_text} onChange={(event) => setDraft({ ...draft, terms_text: event.target.value })} placeholder="Regras de divulgacao, uso de marca e politicas do produto." /></label>
                        </div>
                        <footer><button className="ghost-button" onClick={() => setEditingProduct(null)}>Cancelar</button><button className="primary-button" onClick={saveProgram} disabled={saving}>{saving ? 'Salvando...' : 'Salvar programa'}</button></footer>
                    </div>
                </div>
            )}

            <style jsx>{`
                .affiliate-shell{display:grid;gap:22px;color:var(--text-primary)}
                .affiliate-header,.panel-title,.marketplace-heading{display:flex;align-items:center;justify-content:space-between;gap:20px}
                .affiliate-header h1{font-size:30px;margin:3px 0 5px}.affiliate-header p,.panel-title p,.marketplace-heading p{color:var(--text-muted);margin:0}
                .eyebrow{color:var(--accent-primary);font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.1em}
                button,a{font:inherit}.ghost-button,.primary-button,.link-button,.row-actions button{display:inline-flex;align-items:center;justify-content:center;gap:7px;border-radius:10px;padding:10px 14px;cursor:pointer;font-weight:700}
                .ghost-button{background:var(--bg-card);border:1px solid var(--border-color);color:var(--text-primary)}.primary-button{border:0;background:var(--accent-primary);color:white}
                .warning-banner,.invite-banner{display:flex;align-items:center;gap:14px;padding:16px 18px;border-radius:14px}.warning-banner{background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3)}.invite-banner{background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.3)}
                .warning-banner>svg,.invite-banner>svg{font-size:24px;flex:none}.warning-banner div,.invite-banner div{display:grid;gap:3px;flex:1}.warning-banner span,.invite-banner span{font-size:13px;color:var(--text-muted)}
                .warning-banner a,.invite-banner button{display:inline-flex;align-items:center;gap:6px;color:var(--accent-primary);font-weight:800;text-decoration:none;background:none;border:0;cursor:pointer}
                .affiliate-tabs{display:flex;gap:6px;padding:5px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:13px;width:max-content}
                .affiliate-tabs button{display:flex;align-items:center;gap:8px;border:0;border-radius:9px;background:transparent;color:var(--text-muted);padding:10px 16px;cursor:pointer;font-weight:700}.affiliate-tabs button.active{background:var(--accent-primary);color:#fff}
                .metric-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.metric-grid.four{grid-template-columns:repeat(4,1fr)}.metric-grid article{background:var(--bg-card);border:1px solid var(--border-color);border-radius:15px;padding:20px;display:grid;gap:8px}.metric-grid span{font-size:13px;color:var(--text-muted)}.metric-grid strong{font-size:25px}
                .panel{background:var(--bg-card);border:1px solid var(--border-color);border-radius:17px;padding:20px;display:grid;gap:18px}.panel h2,.marketplace-heading h2{margin:0 0 4px;font-size:18px}
                .product-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,350px),1fr));gap:14px}.market-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,290px),1fr));gap:14px}.product-card{display:grid;align-content:space-between;gap:16px;min-width:0;border:1px solid var(--border-color);border-radius:15px;padding:15px;background:var(--bg-card)}.product-summary{display:flex;align-items:flex-start;gap:13px;min-width:0}.product-image{width:60px;height:60px;flex:0 0 60px;border-radius:12px;display:grid;place-items:center;background:var(--bg-secondary);overflow:hidden;color:var(--text-muted);font-size:22px}.product-image.small{width:46px;height:46px;flex-basis:46px}.product-image img,.market-image img{width:100%;height:100%;object-fit:cover}.product-copy{display:grid;gap:5px;min-width:0;flex:1}.product-copy strong{overflow-wrap:anywhere;line-height:1.35}.product-copy>span,.product-copy small{color:var(--text-muted)}.title-row{display:flex;gap:7px;align-items:flex-start;flex-direction:column}.product-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.product-actions button{width:100%;min-width:0;padding:10px 9px;white-space:nowrap}.invite-button{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid color-mix(in srgb,var(--accent-primary) 35%,var(--border-color));background:color-mix(in srgb,var(--accent-primary) 8%,transparent);color:var(--accent-primary);border-radius:10px;cursor:pointer;font-weight:800}.icon-button{display:grid;place-items:center;border:1px solid var(--border-color);background:transparent;color:var(--text-primary);border-radius:9px;padding:9px;cursor:pointer}
                .status{display:inline-flex;width:max-content;border-radius:999px;padding:4px 8px;font-size:11px;font-weight:800;background:rgba(148,163,184,.13);color:#94a3b8}.status.active,.status.approved,.status.available{background:rgba(34,197,94,.13);color:#16a34a}.status.pending{background:rgba(245,158,11,.13);color:#d97706}.status.rejected,.status.suspended,.status.cancelled,.status.refunded,.status.chargeback,.status.failed{background:rgba(239,68,68,.12);color:#ef4444}.status.own{background:rgba(124,58,237,.12);color:#7c3aed}.status.invite-only{background:rgba(59,130,246,.12);color:#2563eb}
                .table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;min-width:760px}th,td{text-align:left;padding:12px;border-bottom:1px solid var(--border-color);font-size:13px}th{color:var(--text-muted);font-size:11px;text-transform:uppercase;letter-spacing:.05em}td strong,td small{display:block}td small{color:var(--text-muted);margin-top:3px}.row-actions{display:flex;gap:6px;flex-wrap:wrap}.row-actions button{padding:7px 9px;border:1px solid var(--border-color);background:transparent;color:var(--text-primary);font-size:11px}.row-actions .approve{background:rgba(34,197,94,.12);border-color:rgba(34,197,94,.2);color:#16a34a}
                .program-list{display:grid;gap:10px}.program-card{display:grid;grid-template-columns:minmax(220px,1fr) auto auto auto;align-items:center;gap:14px;border:1px solid var(--border-color);padding:13px;border-radius:13px}.program-main{display:flex;align-items:center;gap:12px}.program-main>div:last-child{display:grid;gap:4px}.program-main span,.muted{color:var(--text-muted);font-size:12px}.link-button{border:1px solid var(--border-color);background:transparent;color:var(--accent-primary)}.text-danger{border:0;background:transparent;color:#ef4444;cursor:pointer}
                .marketplace-heading label{display:flex;align-items:center;gap:8px;border:1px solid var(--border-color);border-radius:10px;padding:9px 12px;min-width:280px}.marketplace-heading input{border:0;outline:0;background:transparent;color:var(--text-primary);width:100%}.marketplace-note{padding:11px 13px;border-radius:10px;background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.16);color:var(--text-muted);font-size:12px;line-height:1.5}.marketplace-note strong{color:var(--text-primary)}.market-card{display:grid;grid-template-rows:170px auto auto;gap:15px;border:1px solid var(--border-color);border-radius:14px;padding:12px}.market-image{position:relative;border-radius:10px;background:var(--bg-secondary);display:grid;place-items:center;overflow:hidden;font-size:30px;color:var(--text-muted)}.market-image span{position:absolute;right:10px;top:10px;padding:6px 9px;border-radius:999px;background:var(--accent-primary);color:#fff;font-weight:900;font-size:13px}.market-card h3{margin:4px 0}.market-card p{margin:0;color:var(--text-muted);font-size:13px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.market-footer{display:flex;align-items:flex-end;justify-content:space-between;gap:10px}.market-meta{display:grid;gap:3px;color:var(--text-muted);font-size:11px}
                .empty{padding:28px;text-align:center;color:var(--text-muted);grid-column:1/-1}.affiliate-loading{height:320px;display:grid;place-items:center}.affiliate-loading span{width:38px;height:38px;border:3px solid var(--border-color);border-top-color:var(--accent-primary);border-radius:50%;animation:spin .8s linear infinite}.spin{animation:spin .8s linear infinite}
                .modal-backdrop{position:fixed;inset:0;z-index:100;background:rgba(15,23,42,.66);display:grid;place-items:center;padding:20px}.modal-card{width:min(760px,100%);max-height:92vh;overflow:auto;background:var(--bg-card);border:1px solid var(--border-color);border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.3)}.modal-card header,.modal-card footer{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid var(--border-color)}.modal-card footer{border-top:1px solid var(--border-color);border-bottom:0;justify-content:flex-end}.modal-card header span{font-size:12px;color:var(--text-muted)}.modal-card header h2{margin:3px 0 0}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:20px}.form-grid label{display:grid;gap:7px}.form-grid label>span{font-size:12px;font-weight:700;color:var(--text-muted)}.form-grid input:not([type=checkbox]),.form-grid select,.form-grid textarea{width:100%;box-sizing:border-box;border:1px solid var(--border-color);background:var(--bg-secondary);color:var(--text-primary);border-radius:9px;padding:10px;outline:none}.form-grid .full{grid-column:1/-1}.toggle-row{display:flex!important;align-items:center;justify-content:space-between;gap:14px;border:1px solid var(--border-color);border-radius:10px;padding:12px}.toggle-row>div{display:grid;gap:3px}.toggle-row>div span{font-size:11px;color:var(--text-muted)}.toggle-row input{width:18px;height:18px}.invite-box{display:grid;gap:10px;border:1px solid rgba(124,58,237,.25);background:rgba(124,58,237,.06);border-radius:12px;padding:13px}.invite-box>div:first-child{display:grid;gap:3px}.invite-box span{font-size:11px;color:var(--text-muted)}.invite-link-row{display:grid;grid-template-columns:1fr auto;gap:8px}.invite-link-row input{min-width:0}.invite-link-row button{display:inline-flex;align-items:center;gap:6px;border:0;border-radius:9px;padding:0 14px;background:var(--accent-primary);color:#fff;font-weight:800;cursor:pointer}
                @keyframes spin{to{transform:rotate(360deg)}}@media(max-width:900px){.metric-grid,.metric-grid.four{grid-template-columns:1fr 1fr}.program-card{grid-template-columns:1fr auto}.form-grid{grid-template-columns:1fr}.form-grid .full{grid-column:auto}}@media(max-width:620px){.affiliate-header,.panel-title,.marketplace-heading{align-items:flex-start;flex-direction:column}.affiliate-tabs{width:100%;overflow:auto}.affiliate-tabs button{white-space:nowrap}.metric-grid,.metric-grid.four{grid-template-columns:1fr}.marketplace-heading label{min-width:0;width:100%;box-sizing:border-box}.warning-banner,.invite-banner{align-items:flex-start;flex-wrap:wrap}.product-actions{grid-template-columns:1fr}.invite-link-row{grid-template-columns:1fr}.invite-link-row button{min-height:42px}}
            `}</style>
        </div>
    );
}
