'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
    FiArrowLeft,
    FiCheck,
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
    const [focusedSupportOrderId, setFocusedSupportOrderId] = useState('');
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
                    const focusedOrderId = requestedOrderId
                        && orders.some((order: any) => order.id === requestedOrderId)
                        ? requestedOrderId
                        : '';
                    setFocusedSupportOrderId(focusedOrderId);
                    if (focusedOrderId && new URLSearchParams(window.location.search).get('view') === 'support') {
                        window.setTimeout(() => {
                            document.getElementById(`support-${focusedOrderId}`)?.scrollIntoView({
                                behavior: 'smooth',
                                block: 'center',
                            });
                        }, 100);
                    }
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
            setFocusedSupportOrderId('');
        };
    }, [router]);

    const copy = async (id: string, value: string) => {
        await navigator.clipboard.writeText(value);
        setCopied(id);
        toast.success('Copiado com segurança.');
        window.setTimeout(() => setCopied((current) => current === id ? null : current), 2500);
    };

    const openSupport = async (order: any) => {
        if (order.support_thread_id) {
            router.push(`/support/${order.support_thread_id}`);
            return;
        }

        const orderId = order.id;
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
                    <section className="mySupportArea">
                        <header className="mySupportAreaTitle">
                            <div>
                                <p>Atendimento das suas compras</p>
                                <h2>Suporte por produto</h2>
                            </div>
                            <small>Cada conversa fica vinculada ao pedido e ao vendedor corretos.</small>
                        </header>

                        <div className="mySupportHubList">
                            {supportOrders.map((order) => (
                                <article
                                    id={`support-${order.id}`}
                                    key={order.id}
                                    className={`mySupportHub${focusedSupportOrderId === order.id ? ' focused' : ''}`}
                                >
                                    <div className="mySupportHubIntro">
                                        <span><FiMessageCircle size={21} /></span>
                                        <div>
                                            <p>Central de atendimento</p>
                                            <h2>{order.product?.name || 'Compra na loja'}</h2>
                                            <small>Atendimento com {order.seller?.name || 'Vendedor'}</small>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => openSupport(order)}
                                        disabled={openingSupport === order.id}
                                    >
                                        <FiMessageCircle size={17} />
                                        {openingSupport === order.id
                                            ? 'Abrindo...'
                                            : order.support_thread_id
                                                ? 'Abrir conversa'
                                                : 'Iniciar conversa'}
                                    </button>

                                    <div className="mySupportHubStatus">
                                        <strong>Pedido #{String(order.id).slice(0, 8)}</strong>
                                        <span>{new Date(order.created_at).toLocaleDateString('pt-BR')}</span>
                                        <small>
                                            {order.support_thread_id
                                                ? 'Seu histórico está salvo e pronto para continuar.'
                                                : 'Uma nova conversa será vinculada a esta compra.'}
                                        </small>
                                    </div>
                                </article>
                            ))}
                        </div>
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
                .mySupportArea { margin-bottom:26px; }
                .mySupportAreaTitle {
                    align-items:end;
                    display:flex;
                    gap:18px;
                    justify-content:space-between;
                    margin:0 2px 13px;
                }
                .mySupportAreaTitle p {
                    color:#00b894;
                    font-size:9px;
                    font-weight:900;
                    letter-spacing:.08em;
                    margin:0 0 3px;
                    text-transform:uppercase;
                }
                .mySupportAreaTitle h2 { color:var(--text-primary); font-size:18px; margin:0; }
                .mySupportAreaTitle small { color:var(--text-muted); font-size:10px; }
                .mySupportHubList { display:grid; gap:14px; }
                .mySupportHub {
                    background:var(--card-bg);
                    border:1px solid var(--border-color);
                    border-radius:14px;
                    box-shadow:0 18px 50px rgba(20,15,45,.06);
                    display:grid;
                    gap:16px;
                    grid-template-columns:minmax(0,1fr) auto;
                    padding:20px;
                    scroll-margin-top:90px;
                    transition:border-color .2s,box-shadow .2s;
                }
                .mySupportHub.focused {
                    border-color:rgba(0,184,148,.55);
                    box-shadow:0 0 0 3px rgba(0,184,148,.08),0 18px 50px rgba(20,15,45,.08);
                }
                .mySupportHubIntro {
                    align-items:center;
                    display:flex;
                    gap:13px;
                    min-width:0;
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
                    overflow-wrap:anywhere;
                }
                .mySupportHubIntro small {
                    color:var(--text-muted);
                    font-size:10px;
                }
                .mySupportHub > button {
                    align-self:center;
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
                .mySupportHub > button:disabled {
                    cursor:not-allowed;
                    opacity:.65;
                }
                .mySupportHubStatus {
                    border-top:1px solid var(--border-color);
                    display:grid;
                    gap:12px;
                    grid-column:1 / -1;
                    grid-template-columns:auto auto minmax(0,1fr);
                    padding-top:14px;
                }
                .mySupportHubStatus strong { color:var(--text-primary); font-size:12px; }
                .mySupportHubStatus span,
                .mySupportHubStatus small { color:var(--text-muted); font-size:10px; }
                .mySupportHubStatus small { text-align:right; }
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
                    .mySupportAreaTitle { align-items:flex-start; flex-direction:column; gap:4px; }
                    .mySupportHub { grid-template-columns:1fr; padding:17px 14px; }
                    .mySupportHub > button { width:100%; }
                    .mySupportHubStatus {
                        display:flex;
                        flex-direction:column;
                        gap:3px;
                    }
                    .mySupportHubStatus small { margin-top:4px; text-align:left; }
                }
            `}</style>
        </main>
    );
}
