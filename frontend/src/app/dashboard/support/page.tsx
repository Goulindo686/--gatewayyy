'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
    FiCheckCircle,
    FiClock,
    FiExternalLink,
    FiInbox,
    FiMessageCircle,
    FiRefreshCw,
    FiSend,
    FiUser,
} from 'react-icons/fi';
import { supportAPI } from '@/lib/api';

const statusLabels: Record<string, string> = {
    all: 'Todos',
    open: 'Abertos',
    pending_seller: 'Responder',
    pending_buyer: 'Aguardando cliente',
    resolved: 'Resolvidos',
    archived: 'Arquivados',
};

function formatTime(value: string) {
    return new Date(value).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function SellerSupportPage() {
    const [threads, setThreads] = useState<any[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedThread, setSelectedThread] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [statusFilter, setStatusFilter] = useState('all');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [threadLoading, setThreadLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const selected = useMemo(
        () => threads.find((thread) => thread.id === selectedId) || selectedThread,
        [threads, selectedId, selectedThread],
    );

    const loadThreads = async (preserveSelection = true) => {
        try {
            const { data } = await supportAPI.listSellerThreads(statusFilter);
            const nextThreads = data.threads || [];
            setThreads(nextThreads);
            if (!preserveSelection || (!selectedId && nextThreads.length)) {
                setSelectedId(nextThreads[0]?.id || null);
            } else if (selectedId && !nextThreads.some((thread: any) => thread.id === selectedId)) {
                setSelectedId(nextThreads[0]?.id || null);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Nao foi possivel carregar atendimentos.');
        } finally {
            setLoading(false);
        }
    };

    const loadThread = async (threadId: string, showLoading = true) => {
        if (showLoading) setThreadLoading(true);
        try {
            const { data } = await supportAPI.getSellerThread(threadId);
            setSelectedThread(data.thread);
            setMessages(data.messages || []);
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Nao foi possivel abrir o atendimento.');
        } finally {
            setThreadLoading(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        void loadThreads(false);
    }, [statusFilter]);

    useEffect(() => {
        if (!selectedId) {
            setSelectedThread(null);
            setMessages([]);
            return;
        }
        void loadThread(selectedId);
    }, [selectedId]);

    useEffect(() => {
        const id = window.setInterval(() => {
            void loadThreads(true);
            if (selectedId) void loadThread(selectedId, false);
        }, 7000);
        return () => window.clearInterval(id);
    }, [selectedId, statusFilter]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        const text = message.trim();
        if (!selectedId || !text || sending) return;
        setSending(true);
        try {
            await supportAPI.sendSellerMessage(selectedId, text);
            setMessage('');
            await Promise.all([loadThread(selectedId, false), loadThreads(true)]);
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Nao foi possivel enviar.');
        } finally {
            setSending(false);
        }
    };

    const updateStatus = async (status: string) => {
        if (!selectedId) return;
        try {
            await supportAPI.updateSellerThread(selectedId, { status });
            await Promise.all([loadThread(selectedId, false), loadThreads(true)]);
            toast.success('Status atualizado.');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Nao foi possivel atualizar.');
        }
    };

    const counts = threads.reduce((acc: Record<string, number>, thread) => {
        acc[thread.status] = (acc[thread.status] || 0) + 1;
        return acc;
    }, {});

    return (
        <div className="supportDashboard">
            <header className="supportHeader">
                <div>
                    <span>Central do vendedor</span>
                    <h1>Suporte aos clientes</h1>
                    <p>Converse com compradores, acompanhe pedidos e marque atendimentos como resolvidos.</p>
                </div>
                <button type="button" onClick={() => void loadThreads(true)}>
                    <FiRefreshCw size={16} /> Atualizar
                </button>
            </header>

            <section className="supportMetrics">
                <article>
                    <FiInbox size={20} />
                    <div><strong>{threads.length}</strong><span>na lista atual</span></div>
                </article>
                <article>
                    <FiClock size={20} />
                    <div><strong>{counts.pending_seller || 0}</strong><span>precisam de resposta</span></div>
                </article>
                <article>
                    <FiCheckCircle size={20} />
                    <div><strong>{counts.resolved || 0}</strong><span>resolvidos</span></div>
                </article>
            </section>

            <nav className="supportFilters">
                {Object.entries(statusLabels).map(([key, label]) => (
                    <button
                        key={key}
                        type="button"
                        className={statusFilter === key ? 'active' : ''}
                        onClick={() => setStatusFilter(key)}
                    >
                        {label}
                    </button>
                ))}
            </nav>

            <section className="supportWorkspace">
                <aside className="supportThreadList">
                    {loading ? (
                        <div className="supportLoading" />
                    ) : threads.length ? threads.map((thread) => (
                        <button
                            key={thread.id}
                            type="button"
                            className={`supportThreadItem ${selectedId === thread.id ? 'active' : ''}`}
                            onClick={() => setSelectedId(thread.id)}
                        >
                            <span className="supportAvatar"><FiUser size={16} /></span>
                            <div>
                                <strong>{thread.buyer_name || 'Cliente'}</strong>
                                <small>{thread.product?.name || thread.subject}</small>
                                <p>{thread.last_message_preview || 'Nenhuma mensagem ainda.'}</p>
                            </div>
                            <em className={thread.unread ? 'unread' : ''}>{statusLabels[thread.status] || thread.status}</em>
                        </button>
                    )) : (
                        <div className="supportEmptyList">
                            <FiInbox size={32} />
                            <p>Nenhum atendimento neste filtro.</p>
                        </div>
                    )}
                </aside>

                <main className="supportChatPanel">
                    {selected ? (
                        <>
                            <header className="supportChatHeader">
                                <div>
                                    <strong>{selected.buyer_name}</strong>
                                    <span>{selected.buyer_email}</span>
                                </div>
                                <div className="supportActions">
                                    {selected.store_slug && (
                                        <a href={`/store/${selected.store_slug}`} target="_blank" rel="noreferrer">
                                            <FiExternalLink size={14} /> Loja
                                        </a>
                                    )}
                                    <select value={selectedThread?.status || selected.status} onChange={(event) => updateStatus(event.target.value)}>
                                        <option value="open">Aberto</option>
                                        <option value="pending_seller">Responder</option>
                                        <option value="pending_buyer">Aguardando cliente</option>
                                        <option value="resolved">Resolvido</option>
                                        <option value="archived">Arquivado</option>
                                    </select>
                                </div>
                            </header>

                            <div className="supportOrderStrip">
                                <span>Pedido #{String(selected.order_id || '').slice(0, 8)}</span>
                                <span>{selected.order?.amount_display ? `R$ ${selected.order.amount_display}` : 'Valor indisponivel'}</span>
                                <span>{selected.product?.name || selected.subject}</span>
                            </div>

                            <div className="supportMessages">
                                {threadLoading ? (
                                    <div className="supportLoading" />
                                ) : messages.length ? messages.map((item) => (
                                    <article
                                        key={item.id}
                                        className={`supportMessage ${item.sender_type === 'buyer' ? 'buyer' : 'seller'}`}
                                    >
                                        <strong>{item.sender_name}</strong>
                                        <p>{item.body}</p>
                                        <time>{formatTime(item.created_at)}</time>
                                    </article>
                                )) : (
                                    <div className="supportNoMessages">
                                        <FiMessageCircle size={34} />
                                        <p>Nenhuma mensagem ainda. Envie uma resposta para iniciar o atendimento.</p>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <form className="supportComposer" onSubmit={submit}>
                                <textarea
                                    value={message}
                                    onChange={(event) => setMessage(event.target.value)}
                                    placeholder="Responder cliente..."
                                    maxLength={4000}
                                />
                                <button type="submit" disabled={sending || !message.trim()}>
                                    <FiSend size={17} /> {sending ? 'Enviando' : 'Enviar'}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="supportNoThread">
                            <FiMessageCircle size={42} />
                            <h2>Selecione um atendimento</h2>
                            <p>Quando um comprador abrir suporte, a conversa aparecerá aqui.</p>
                        </div>
                    )}
                </main>
            </section>

            <style jsx>{`
                .supportDashboard { display:grid; gap:18px; }
                .supportHeader {
                    align-items:flex-end;
                    display:flex;
                    gap:18px;
                    justify-content:space-between;
                }
                .supportHeader span {
                    color:var(--accent-primary);
                    font-size:11px;
                    font-weight:850;
                    letter-spacing:.08em;
                    text-transform:uppercase;
                }
                .supportHeader h1 { font-size:28px; letter-spacing:-.03em; margin:5px 0 6px; }
                .supportHeader p { color:var(--text-secondary); font-size:13px; margin:0; }
                .supportHeader button,
                .supportComposer button {
                    align-items:center;
                    background:var(--accent-primary);
                    border:0;
                    border-radius:10px;
                    color:#fff;
                    cursor:pointer;
                    display:flex;
                    font-weight:850;
                    gap:8px;
                    height:42px;
                    justify-content:center;
                    padding:0 15px;
                }
                .supportMetrics { display:grid; gap:12px; grid-template-columns:repeat(3, minmax(0, 1fr)); }
                .supportMetrics article {
                    align-items:center;
                    background:var(--card-bg);
                    border:1px solid var(--border-color);
                    border-radius:12px;
                    display:flex;
                    gap:12px;
                    padding:15px;
                }
                .supportMetrics svg { color:var(--accent-primary); }
                .supportMetrics strong { display:block; font-size:21px; }
                .supportMetrics span { color:var(--text-secondary); font-size:11px; }
                .supportFilters {
                    background:var(--card-bg);
                    border:1px solid var(--border-color);
                    border-radius:12px;
                    display:flex;
                    gap:6px;
                    overflow-x:auto;
                    padding:7px;
                }
                .supportFilters button {
                    background:transparent;
                    border:0;
                    border-radius:9px;
                    color:var(--text-secondary);
                    cursor:pointer;
                    flex-shrink:0;
                    font-size:12px;
                    font-weight:800;
                    padding:10px 12px;
                }
                .supportFilters button.active { background:var(--accent-primary); color:#fff; }
                .supportWorkspace {
                    background:var(--card-bg);
                    border:1px solid var(--border-color);
                    border-radius:16px;
                    display:grid;
                    grid-template-columns:360px minmax(0, 1fr);
                    min-height:680px;
                    overflow:hidden;
                }
                .supportThreadList {
                    border-right:1px solid var(--border-color);
                    display:flex;
                    flex-direction:column;
                    max-height:760px;
                    overflow-y:auto;
                }
                .supportThreadItem {
                    align-items:flex-start;
                    background:transparent;
                    border:0;
                    border-bottom:1px solid var(--border-color);
                    color:var(--text-primary);
                    cursor:pointer;
                    display:grid;
                    gap:10px;
                    grid-template-columns:38px minmax(0, 1fr);
                    padding:15px;
                    position:relative;
                    text-align:left;
                }
                .supportThreadItem.active { background:rgba(108,92,231,.09); }
                .supportAvatar {
                    align-items:center;
                    background:rgba(108,92,231,.12);
                    border-radius:10px;
                    color:var(--accent-primary);
                    display:flex;
                    height:38px;
                    justify-content:center;
                    width:38px;
                }
                .supportThreadItem strong { display:block; font-size:13px; margin-bottom:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
                .supportThreadItem small { color:var(--text-muted); display:block; font-size:10px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
                .supportThreadItem p { color:var(--text-secondary); font-size:11px; line-height:1.45; margin:8px 0 0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
                .supportThreadItem em {
                    border:1px solid var(--border-color);
                    border-radius:999px;
                    color:var(--text-muted);
                    font-size:9px;
                    font-style:normal;
                    font-weight:850;
                    padding:4px 7px;
                    position:absolute;
                    right:12px;
                    top:12px;
                }
                .supportThreadItem em.unread { background:rgba(0,184,148,.12); border-color:rgba(0,184,148,.25); color:#00b894; }
                .supportChatPanel { display:flex; flex-direction:column; min-width:0; }
                .supportChatHeader {
                    align-items:center;
                    border-bottom:1px solid var(--border-color);
                    display:flex;
                    gap:12px;
                    justify-content:space-between;
                    padding:15px 18px;
                }
                .supportChatHeader strong { display:block; font-size:16px; }
                .supportChatHeader span { color:var(--text-secondary); display:block; font-size:12px; margin-top:3px; }
                .supportActions { align-items:center; display:flex; gap:8px; }
                .supportActions a,
                .supportActions select {
                    background:var(--bg-secondary);
                    border:1px solid var(--border-color);
                    border-radius:9px;
                    color:var(--text-primary);
                    font-size:12px;
                    font-weight:750;
                    height:38px;
                    padding:0 10px;
                    text-decoration:none;
                }
                .supportActions a { align-items:center; display:flex; gap:6px; }
                .supportOrderStrip {
                    background:rgba(108,92,231,.06);
                    border-bottom:1px solid var(--border-color);
                    color:var(--text-secondary);
                    display:flex;
                    flex-wrap:wrap;
                    gap:9px;
                    padding:10px 18px;
                }
                .supportOrderStrip span {
                    background:var(--card-bg);
                    border:1px solid var(--border-color);
                    border-radius:999px;
                    font-size:10px;
                    font-weight:800;
                    padding:6px 9px;
                }
                .supportMessages {
                    display:flex;
                    flex:1;
                    flex-direction:column;
                    gap:12px;
                    overflow-y:auto;
                    padding:18px;
                }
                .supportMessage {
                    border:1px solid var(--border-color);
                    border-radius:13px;
                    max-width:min(680px, 86%);
                    padding:12px 14px;
                }
                .supportMessage.buyer { align-self:flex-start; background:var(--bg-secondary); }
                .supportMessage.seller { align-self:flex-end; background:var(--accent-primary); color:#fff; }
                .supportMessage strong { display:block; font-size:11px; margin-bottom:5px; opacity:.75; }
                .supportMessage p { font-size:13px; line-height:1.55; margin:0; white-space:pre-wrap; }
                .supportMessage time { display:block; font-size:10px; margin-top:8px; opacity:.62; }
                .supportComposer {
                    border-top:1px solid var(--border-color);
                    display:flex;
                    gap:12px;
                    padding:14px;
                }
                .supportComposer textarea {
                    background:var(--bg-secondary);
                    border:1px solid var(--border-color);
                    border-radius:11px;
                    color:var(--text-primary);
                    flex:1;
                    font:inherit;
                    min-height:52px;
                    outline:none;
                    padding:13px;
                    resize:none;
                }
                .supportComposer button:disabled { cursor:not-allowed; opacity:.55; }
                .supportEmptyList,
                .supportNoMessages,
                .supportNoThread {
                    color:var(--text-muted);
                    display:grid;
                    flex:1;
                    place-items:center;
                    padding:28px;
                    text-align:center;
                }
                .supportNoThread h2 { color:var(--text-primary); font-size:20px; margin:12px 0 6px; }
                .supportNoThread p,
                .supportNoMessages p,
                .supportEmptyList p { font-size:12px; line-height:1.55; margin:0; }
                .supportLoading {
                    animation:supportSpin .8s linear infinite;
                    border:3px solid var(--border-color);
                    border-radius:50%;
                    border-top-color:var(--accent-primary);
                    height:34px;
                    margin:40px auto;
                    width:34px;
                }
                @keyframes supportSpin { to { transform:rotate(360deg); } }
                @media (max-width:960px) {
                    .supportHeader { align-items:flex-start; flex-direction:column; }
                    .supportMetrics { grid-template-columns:1fr; }
                    .supportWorkspace { grid-template-columns:1fr; }
                    .supportThreadList { border-right:0; max-height:340px; }
                    .supportChatPanel { min-height:620px; }
                }
                @media (max-width:620px) {
                    .supportChatHeader { align-items:flex-start; flex-direction:column; }
                    .supportActions { width:100%; }
                    .supportActions select { flex:1; }
                    .supportComposer { flex-direction:column; }
                    .supportComposer button { height:44px; }
                    .supportMessage { max-width:95%; }
                }
            `}</style>
        </div>
    );
}
