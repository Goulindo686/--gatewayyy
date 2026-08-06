'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
    FiArrowLeft,
    FiCheck,
    FiChevronDown,
    FiCopy,
    FiExternalLink,
    FiKey,
    FiLock,
    FiMessageCircle,
    FiPackage,
    FiShield,
} from 'react-icons/fi';
import { myUniqueDeliveryAPI, supportAPI } from '@/lib/api';
import { buildAuthUrl } from '@/lib/auth-return';

function formatDate(value: string) {
    return new Date(value).toLocaleString('pt-BR');
}

export default function MyUniqueDeliveriesPage() {
    const router = useRouter();
    const [deliveries, setDeliveries] = useState<any[]>([]);
    const [supportOrders, setSupportOrders] = useState<any[]>([]);
    const [selectedSupportOrderId, setSelectedSupportOrderId] = useState('');
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState<string | null>(null);
    const [openingSupport, setOpeningSupport] = useState<string | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.replace(buildAuthUrl(
                '/login',
                `${window.location.pathname}${window.location.search}`,
            ));
            return;
        }

        let cancelled = false;
        myUniqueDeliveryAPI.list()
            .then(({ data }) => {
                if (!cancelled) {
                    setDeliveries(data.deliveries || []);
                    const orders = data.support_orders || [];
                    const requestedOrderId = new URLSearchParams(window.location.search).get('order');
                    setSupportOrders(orders);
                    setSelectedSupportOrderId((current) => {
                        if (current && orders.some((order: any) => order.id === current)) return current;
                        if (requestedOrderId && orders.some((order: any) => order.id === requestedOrderId)) {
                            return requestedOrderId;
                        }
                        return orders.find((order: any) => order.support_thread_id)?.id || orders[0]?.id || '';
                    });
                }
            })
            .catch((error: any) => {
                if (error.response?.status !== 401) {
                    toast.error(
                        error.response?.data?.error
                        || 'Não foi possível abrir suas entregas.',
                    );
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
            setDeliveries([]);
            setSupportOrders([]);
            setSelectedSupportOrderId('');
        };
    }, [router]);

    const copy = async (id: string, value: string) => {
        await navigator.clipboard.writeText(value);
        setCopied(id);
        toast.success('Copiado com segurança.');
        window.setTimeout(() => setCopied((current) => current === id ? null : current), 2500);
    };

    const selectedSupportOrder = supportOrders.find((order) => order.id === selectedSupportOrderId);

    const openSupport = async () => {
        if (!selectedSupportOrder) return;
        if (selectedSupportOrder.support_thread_id) {
            router.push(`/support/${selectedSupportOrder.support_thread_id}`);
            return;
        }

        const orderId = selectedSupportOrder.id;
        setOpeningSupport(orderId);
        try {
            const { data } = await supportAPI.createBuyerThread(orderId);
            router.push(`/support/${data.thread.id}`);
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Nao foi possivel abrir o suporte.');
        } finally {
            setOpeningSupport(null);
        }
    };

    return (
        <main className="myDeliveriesPage">
            <header className="myDeliveriesTopbar">
                <Link href="/dashboard" aria-label="Voltar">
                    <FiArrowLeft size={18} />
                </Link>
                <div className="myDeliveriesBrand">
                    <img src="/favicon.png" alt="" />
                    <strong>GouPay</strong>
                </div>
                <span><FiShield size={15} /> Ambiente protegido</span>
            </header>

            <div className="myDeliveriesContainer">
                <section className="myDeliveriesHero">
                    <span><FiKey size={30} /></span>
                    <div>
                        <p>Acessos exclusivos das suas compras</p>
                        <h1>Minhas Entregas</h1>
                        <div>
                            Somente compras aprovadas com o mesmo e-mail verificado
                            desta conta aparecem aqui.
                        </div>
                    </div>
                </section>

                <section className="myDeliveriesSecurityNote">
                    <FiLock size={18} />
                    <div>
                        <strong>Seus dados são descriptografados apenas para esta sessão autenticada.</strong>
                        <p>Não compartilhe senhas ou keys. A GouPay não envia essas credenciais por APIs públicas.</p>
                    </div>
                </section>

                {supportOrders.length > 0 && (
                    <section className="mySupportHub">
                        <div className="mySupportHubIntro">
                            <span><FiMessageCircle size={21} /></span>
                            <div>
                                <p>Central de atendimento</p>
                                <h2>Converse com seus vendedores</h2>
                                <small>Escolha uma compra para abrir ou continuar o atendimento.</small>
                            </div>
                        </div>

                        <div className="mySupportHubControls">
                            <label>
                                <span>Compra para atendimento</span>
                                <div className="mySupportSelect">
                                    <select
                                        value={selectedSupportOrderId}
                                        onChange={(event) => setSelectedSupportOrderId(event.target.value)}
                                    >
                                        {supportOrders.map((order) => (
                                            <option key={order.id} value={order.id}>
                                                {order.product?.name || 'Compra na loja'} - {order.seller?.name || 'Vendedor'} - #{String(order.id).slice(0, 8)}
                                            </option>
                                        ))}
                                    </select>
                                    <FiChevronDown size={17} aria-hidden="true" />
                                </div>
                            </label>
                            <button
                                type="button"
                                onClick={openSupport}
                                disabled={!selectedSupportOrder || openingSupport === selectedSupportOrderId}
                            >
                                <FiMessageCircle size={17} />
                                {openingSupport === selectedSupportOrderId
                                    ? 'Abrindo...'
                                    : selectedSupportOrder?.support_thread_id
                                        ? 'Abrir conversa'
                                        : 'Iniciar conversa'}
                            </button>
                        </div>

                        {selectedSupportOrder && (
                            <div className="mySupportHubStatus">
                                <strong>{selectedSupportOrder.product?.name || 'Compra na loja'}</strong>
                                <span>
                                    {selectedSupportOrder.seller?.name || 'Vendedor'} · Pedido #{String(selectedSupportOrder.id).slice(0, 8)}
                                </span>
                                <small>
                                    {selectedSupportOrder.support_thread_id
                                        ? 'Seu histórico está salvo e pronto para continuar.'
                                        : 'Uma nova conversa será vinculada a esta compra.'}
                                </small>
                            </div>
                        )}
                    </section>
                )}

                {loading ? (
                    <div className="myDeliveriesLoading"><span /></div>
                ) : deliveries.length ? (
                    <div className="myDeliveriesList">
                        {deliveries.map((delivery) => (
                            <article className="myDeliveryCard" key={delivery.id}>
                                <header>
                                    <span className="myDeliveryProductIcon">
                                        <FiPackage size={20} />
                                    </span>
                                    <div>
                                        <p>Produto</p>
                                        <h2>{delivery.product.name}</h2>
                                        <small>
                                            Entregue em {formatDate(delivery.assigned_at)}
                                            {' · '}Pedido {delivery.order_id.slice(0, 8)}
                                        </small>
                                    </div>
                                    <span className="myDeliveryBadge">
                                        <FiCheck size={13} /> Exclusiva
                                    </span>
                                </header>

                                <section className="myDeliverySecret">
                                    <div className="myDeliverySectionTitle">
                                        <span><FiKey size={14} /> Seu acesso</span>
                                        <button
                                            type="button"
                                            onClick={() => copy(
                                                `${delivery.id}:access`,
                                                delivery.access,
                                            )}
                                        >
                                            {copied === `${delivery.id}:access`
                                                ? <><FiCheck size={13} /> Copiado</>
                                                : <><FiCopy size={13} /> Copiar</>}
                                        </button>
                                    </div>
                                    <pre>{delivery.access}</pre>
                                </section>

                                {delivery.instructions && (
                                    <section className="myDeliveryText">
                                        <h3>Instruções de uso</h3>
                                        <p>{delivery.instructions}</p>
                                    </section>
                                )}
                                {delivery.custom_text && (
                                    <section className="myDeliveryText">
                                        <h3>Mensagem do vendedor</h3>
                                        <p>{delivery.custom_text}</p>
                                    </section>
                                )}
                                {delivery.redirect_url && (
                                    <a
                                        className="myDeliveryRedirect"
                                        href={delivery.redirect_url}
                                        target="_blank"
                                        rel="noreferrer noopener"
                                    >
                                        <FiExternalLink size={15} />
                                        Abrir link de acesso
                                    </a>
                                )}
                                {delivery.notes && (
                                    <section className="myDeliveryText myDeliveryNotes">
                                        <h3>Observações</h3>
                                        <p>{delivery.notes}</p>
                                    </section>
                                )}

                            </article>
                        ))}
                    </div>
                ) : !supportOrders.length ? (
                    <section className="myDeliveriesEmpty">
                        <FiKey size={45} />
                        <h2>Nenhuma entrega exclusiva encontrada</h2>
                        <p>
                            Quando uma compra com Entrega Única for aprovada usando o
                            e-mail desta conta, ela aparecerá aqui automaticamente.
                        </p>
                        <div>
                            <Link href="/area-membros">Acessar Área de Membros</Link>
                            <Link href="/dashboard">Ir para o painel</Link>
                        </div>
                    </section>
                ) : null}
            </div>

            <style>{`
                .myDeliveriesPage {
                    background:
                        radial-gradient(circle at 10% 0,rgba(108,92,231,.12),transparent 32%),
                        radial-gradient(circle at 95% 15%,rgba(0,184,148,.08),transparent 29%),
                        var(--bg-primary);
                    color:var(--text-primary);
                    min-height:100vh;
                    padding-bottom:60px;
                }
                .myDeliveriesTopbar {
                    align-items:center;
                    backdrop-filter:blur(16px);
                    background:color-mix(in srgb,var(--bg-primary) 88%,transparent);
                    border-bottom:1px solid var(--border-color);
                    display:flex;
                    gap:14px;
                    height:68px;
                    padding:0 max(20px,calc((100vw - 1040px)/2));
                    position:sticky;
                    top:0;
                    z-index:10;
                }
                .myDeliveriesTopbar > a {
                    align-items:center;
                    border:1px solid var(--border-color);
                    border-radius:10px;
                    color:var(--text-secondary);
                    display:flex;
                    height:38px;
                    justify-content:center;
                    width:38px;
                }
                .myDeliveriesBrand { align-items:center; display:flex; gap:9px; }
                .myDeliveriesBrand img { border-radius:8px; height:31px; width:31px; }
                .myDeliveriesBrand strong { font-size:16px; }
                .myDeliveriesTopbar > span {
                    align-items:center;
                    color:#00b894;
                    display:flex;
                    font-size:11px;
                    font-weight:700;
                    gap:6px;
                    margin-left:auto;
                }
                .myDeliveriesContainer { margin:0 auto; max-width:1040px; padding:38px 20px; }
                .myDeliveriesHero {
                    align-items:center;
                    display:flex;
                    gap:19px;
                    margin-bottom:22px;
                }
                .myDeliveriesHero > span {
                    align-items:center;
                    background:linear-gradient(135deg,var(--accent-primary),var(--accent-secondary));
                    border-radius:18px;
                    box-shadow:0 14px 34px rgba(108,92,231,.25);
                    color:#fff;
                    display:flex;
                    height:68px;
                    justify-content:center;
                    width:68px;
                }
                .myDeliveriesHero p {
                    color:var(--accent-primary);
                    font-size:10px;
                    font-weight:850;
                    letter-spacing:.11em;
                    margin:0 0 4px;
                    text-transform:uppercase;
                }
                .myDeliveriesHero h1 { font-size:32px; letter-spacing:-.03em; margin:0 0 5px; }
                .myDeliveriesHero div > div { color:var(--text-secondary); font-size:13px; }
                .myDeliveriesSecurityNote {
                    align-items:flex-start;
                    background:rgba(0,184,148,.07);
                    border:1px solid rgba(0,184,148,.19);
                    border-radius:14px;
                    color:#00b894;
                    display:flex;
                    gap:12px;
                    margin-bottom:24px;
                    padding:15px 17px;
                }
                .myDeliveriesSecurityNote strong { display:block; font-size:12px; margin-bottom:3px; }
                .myDeliveriesSecurityNote p { color:var(--text-secondary); font-size:11px; line-height:1.5; margin:0; }
                .myDeliveriesLoading { display:grid; min-height:360px; place-items:center; }
                .myDeliveriesLoading span {
                    animation:myDeliveriesSpin .8s linear infinite;
                    border:3px solid var(--border-color);
                    border-radius:50%;
                    border-top-color:var(--accent-primary);
                    height:40px;
                    width:40px;
                }
                @keyframes myDeliveriesSpin { to { transform:rotate(360deg); } }
                .myDeliveriesList { display:grid; gap:20px; }
                .myDeliveryCard {
                    background:var(--card-bg);
                    border:1px solid var(--border-color);
                    border-radius:20px;
                    box-shadow:0 18px 50px rgba(20,15,45,.07);
                    overflow:hidden;
                    padding:24px;
                }
                .myDeliveryCard > header {
                    align-items:center;
                    display:flex;
                    gap:13px;
                    margin-bottom:20px;
                }
                .myDeliveryProductIcon {
                    align-items:center;
                    background:rgba(108,92,231,.12);
                    border-radius:12px;
                    color:var(--accent-primary);
                    display:flex;
                    height:44px;
                    justify-content:center;
                    width:44px;
                }
                .myDeliveryCard > header > div { min-width:0; }
                .myDeliveryCard > header p {
                    color:var(--text-muted);
                    font-size:9px;
                    font-weight:800;
                    letter-spacing:.08em;
                    margin:0 0 2px;
                    text-transform:uppercase;
                }
                .myDeliveryCard > header h2 { font-size:18px; margin:0 0 3px; }
                .myDeliveryCard > header small { color:var(--text-muted); font-size:9px; }
                .myDeliveryBadge {
                    align-items:center;
                    background:rgba(0,184,148,.1);
                    border-radius:999px;
                    color:#00b894;
                    display:flex;
                    font-size:9px;
                    font-weight:800;
                    gap:4px;
                    margin-left:auto;
                    padding:6px 9px;
                    text-transform:uppercase;
                }
                .myDeliverySecret {
                    background:linear-gradient(135deg,rgba(108,92,231,.09),rgba(108,92,231,.035));
                    border:1px solid rgba(108,92,231,.18);
                    border-radius:14px;
                    margin-bottom:16px;
                    padding:15px;
                }
                .myDeliverySectionTitle {
                    align-items:center;
                    display:flex;
                    justify-content:space-between;
                    margin-bottom:10px;
                }
                .myDeliverySectionTitle > span {
                    align-items:center;
                    color:var(--accent-primary);
                    display:flex;
                    font-size:11px;
                    font-weight:800;
                    gap:6px;
                    text-transform:uppercase;
                }
                .myDeliverySectionTitle button {
                    align-items:center;
                    background:var(--card-bg);
                    border:1px solid var(--border-color);
                    border-radius:8px;
                    color:var(--text-secondary);
                    cursor:pointer;
                    display:flex;
                    font-size:10px;
                    font-weight:700;
                    gap:5px;
                    padding:7px 9px;
                }
                .myDeliverySecret pre {
                    color:var(--text-primary);
                    font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
                    font-size:13px;
                    line-height:1.65;
                    margin:0;
                    overflow-wrap:anywhere;
                    white-space:pre-wrap;
                }
                .myDeliveryText { border-top:1px solid var(--border-color); padding:15px 2px; }
                .myDeliveryText h3 {
                    color:var(--text-primary);
                    font-size:12px;
                    margin:0 0 7px;
                }
                .myDeliveryText p {
                    color:var(--text-secondary);
                    font-size:12px;
                    line-height:1.65;
                    margin:0;
                    white-space:pre-wrap;
                }
                .myDeliveryNotes { background:rgba(253,203,110,.055); border-radius:10px; padding:13px; }
                .myDeliveryRedirect {
                    align-items:center;
                    background:var(--accent-primary);
                    border-radius:10px;
                    color:#fff;
                    display:inline-flex;
                    font-size:11px;
                    font-weight:750;
                    gap:7px;
                    margin:4px 0 14px;
                    padding:10px 13px;
                    text-decoration:none;
                }
                .mySupportHub {
                    background:var(--card-bg);
                    border:1px solid var(--border-color);
                    border-radius:16px;
                    box-shadow:0 18px 50px rgba(20,15,45,.06);
                    margin-bottom:26px;
                    padding:20px;
                }
                .mySupportHubIntro {
                    align-items:center;
                    display:flex;
                    gap:13px;
                }
                .mySupportHubIntro > span {
                    align-items:center;
                    background:rgba(0,184,148,.1);
                    border-radius:12px;
                    color:#00b894;
                    display:flex;
                    flex:0 0 auto;
                    height:48px;
                    justify-content:center;
                    width:48px;
                }
                .mySupportHubIntro p {
                    color:#00b894;
                    font-size:9px;
                    font-weight:900;
                    letter-spacing:.08em;
                    margin:0 0 3px;
                    text-transform:uppercase;
                }
                .mySupportHubIntro h2 {
                    color:var(--text-primary);
                    font-size:17px;
                    margin:0 0 3px;
                }
                .mySupportHubIntro small {
                    color:var(--text-muted);
                    font-size:10px;
                }
                .mySupportHubControls {
                    align-items:end;
                    display:grid;
                    gap:12px;
                    grid-template-columns:minmax(0,1fr) auto;
                    margin-top:18px;
                }
                .mySupportHubControls label > span {
                    color:var(--text-secondary);
                    display:block;
                    font-size:10px;
                    font-weight:800;
                    margin-bottom:7px;
                    text-transform:uppercase;
                }
                .mySupportSelect { position:relative; }
                .mySupportSelect select {
                    appearance:none;
                    background:var(--bg-secondary);
                    border:1px solid var(--border-color);
                    border-radius:10px;
                    color:var(--text-primary);
                    cursor:pointer;
                    font-size:12px;
                    font-weight:700;
                    min-height:46px;
                    padding:0 42px 0 13px;
                    text-overflow:ellipsis;
                    width:100%;
                }
                .mySupportSelect svg {
                    color:var(--text-muted);
                    pointer-events:none;
                    position:absolute;
                    right:14px;
                    top:50%;
                    transform:translateY(-50%);
                }
                .mySupportHubControls > button {
                    align-items:center;
                    background:#00b894;
                    border:0;
                    border-radius:10px;
                    color:#fff;
                    cursor:pointer;
                    display:flex;
                    font-size:12px;
                    font-weight:900;
                    gap:8px;
                    justify-content:center;
                    min-height:46px;
                    padding:0 18px;
                    white-space:nowrap;
                }
                .mySupportHubControls > button:disabled {
                    cursor:not-allowed;
                    opacity:.65;
                }
                .mySupportHubStatus {
                    border-top:1px solid var(--border-color);
                    display:grid;
                    gap:2px;
                    margin-top:16px;
                    padding-top:14px;
                }
                .mySupportHubStatus strong { color:var(--text-primary); font-size:12px; }
                .mySupportHubStatus span,
                .mySupportHubStatus small { color:var(--text-muted); font-size:10px; }
                .myDeliveriesEmpty {
                    background:var(--card-bg);
                    border:1px solid var(--border-color);
                    border-radius:20px;
                    color:var(--text-muted);
                    padding:65px 25px;
                    text-align:center;
                }
                .myDeliveriesEmpty > svg { opacity:.4; }
                .myDeliveriesEmpty h2 { color:var(--text-primary); font-size:20px; margin:15px 0 7px; }
                .myDeliveriesEmpty p {
                    font-size:12px;
                    line-height:1.6;
                    margin:0 auto 20px;
                    max-width:500px;
                }
                .myDeliveriesEmpty > div { display:flex; gap:9px; justify-content:center; }
                .myDeliveriesEmpty a {
                    border:1px solid var(--border-color);
                    border-radius:9px;
                    color:var(--text-secondary);
                    font-size:11px;
                    font-weight:700;
                    padding:9px 12px;
                    text-decoration:none;
                }
                @media (max-width:600px) {
                    .myDeliveriesTopbar { padding:0 14px; }
                    .myDeliveriesContainer { padding:28px 14px; }
                    .myDeliveriesHero { align-items:flex-start; }
                    .myDeliveriesHero > span { height:56px; width:56px; }
                    .myDeliveriesHero h1 { font-size:27px; }
                    .myDeliveryCard { padding:18px 14px; }
                    .myDeliveryBadge { display:none; }
                    .myDeliveriesEmpty > div { flex-direction:column; }
                    .mySupportHub { padding:17px 14px; }
                    .mySupportHubControls { grid-template-columns:1fr; }
                    .mySupportHubControls > button { width:100%; }
                }
            `}</style>
        </main>
    );
}
