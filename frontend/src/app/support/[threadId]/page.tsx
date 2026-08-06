'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
    FiArrowLeft,
    FiCheckCircle,
    FiExternalLink,
    FiMessageCircle,
    FiSend,
    FiShield,
} from 'react-icons/fi';
import { supportAPI } from '@/lib/api';

function formatTime(value: string) {
    return new Date(value).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function BuyerSupportPage() {
    const params = useParams();
    const router = useRouter();
    const threadId = String(params.threadId || '');
    const [thread, setThread] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const load = async (showError = false) => {
        if (!threadId) {
            setLoading(false);
            return;
        }
        if (!localStorage.getItem('token')) {
            router.replace('/login?returnTo=%2Fminhas-entregas');
            return;
        }
        try {
            const { data } = await supportAPI.getBuyerThread(threadId);
            setThread(data.thread);
            setMessages(data.messages || []);
        } catch (error: any) {
            if (showError) {
                toast.error(error.response?.data?.error || 'Nao foi possivel carregar o atendimento.');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load(true);
        const id = window.setInterval(() => void load(false), 5000);
        return () => window.clearInterval(id);
    }, [threadId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        const text = message.trim();
        if (!text || sending) return;
        setSending(true);
        try {
            await supportAPI.sendBuyerMessage(threadId, text);
            setMessage('');
            await load(false);
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Nao foi possivel enviar.');
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return <main className="buyerSupportPage"><div className="buyerSupportLoader" /></main>;
    }

    if (!thread) {
        return (
            <main className="buyerSupportPage">
                <section className="buyerSupportEmpty">
                    <FiMessageCircle size={42} />
                    <h1>Atendimento nao encontrado</h1>
                    <p>Entre na conta GouPay usada na compra e abra o suporte por Minhas Entregas.</p>
                    <button onClick={() => router.push('/minhas-entregas')}>Ir para Minhas Entregas</button>
                </section>
                <SupportStyles />
            </main>
        );
    }

    return (
        <main className="buyerSupportPage">
            <header className="buyerSupportTopbar">
                <button type="button" onClick={() => router.back()} aria-label="Voltar">
                    <FiArrowLeft size={18} />
                </button>
                <div>
                    <span>Suporte da compra</span>
                    <strong>{thread.seller_name}</strong>
                </div>
                {thread.store_slug && (
                    <Link href={`/store/${thread.store_slug}`}>
                        <FiExternalLink size={15} /> Loja
                    </Link>
                )}
            </header>

            <section className="buyerSupportShell">
                <aside className="buyerSupportSummary">
                    <span><FiShield size={23} /></span>
                    <h1>{thread.subject}</h1>
                    <p>{thread.product_name || 'Compra pela loja'} · Pedido #{String(thread.order_id || '').slice(0, 8)}</p>
                    <div>
                        <FiCheckCircle size={15} />
                        Conversa protegida entre comprador e vendedor.
                    </div>
                </aside>

                <section className="buyerSupportChat">
                    <div className="buyerSupportMessages">
                        {messages.length ? messages.map((item) => (
                            <article
                                key={item.id}
                                className={`buyerSupportBubble ${item.sender_type === 'buyer' ? 'buyer' : 'seller'}`}
                            >
                                <strong>{item.sender_name}</strong>
                                <p>{item.body}</p>
                                <time>{formatTime(item.created_at)}</time>
                            </article>
                        )) : (
                            <div className="buyerSupportNoMessages">
                                <FiMessageCircle size={30} />
                                <p>Envie sua primeira mensagem para o vendedor.</p>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={submit} className="buyerSupportComposer">
                        <textarea
                            value={message}
                            onChange={(event) => setMessage(event.target.value)}
                            placeholder="Digite sua mensagem..."
                            maxLength={4000}
                        />
                        <button type="submit" disabled={sending || !message.trim()}>
                            <FiSend size={17} />
                            {sending ? 'Enviando' : 'Enviar'}
                        </button>
                    </form>
                </section>
            </section>
            <SupportStyles />
        </main>
    );
}

function SupportStyles() {
    return (
        <style jsx global>{`
            .buyerSupportPage {
                background:
                    radial-gradient(circle at 10% 0, rgba(0,206,201,.10), transparent 32%),
                    radial-gradient(circle at 95% 12%, rgba(139,92,246,.12), transparent 30%),
                    #0a0a0c;
                color:#e2e8f0;
                min-height:100vh;
                padding:0 18px 42px;
            }
            .buyerSupportTopbar {
                align-items:center;
                border-bottom:1px solid rgba(255,255,255,.08);
                display:flex;
                gap:14px;
                margin:0 auto;
                max-width:1120px;
                padding:18px 0;
            }
            .buyerSupportTopbar button,
            .buyerSupportTopbar a {
                align-items:center;
                background:rgba(255,255,255,.04);
                border:1px solid rgba(255,255,255,.10);
                border-radius:10px;
                color:#e2e8f0;
                display:flex;
                gap:7px;
                height:40px;
                justify-content:center;
                padding:0 12px;
                text-decoration:none;
            }
            .buyerSupportTopbar > div { min-width:0; }
            .buyerSupportTopbar span { color:#64748b; display:block; font-size:11px; font-weight:800; text-transform:uppercase; }
            .buyerSupportTopbar strong { display:block; font-size:16px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
            .buyerSupportTopbar a { margin-left:auto; }
            .buyerSupportShell {
                display:grid;
                gap:18px;
                grid-template-columns:320px minmax(0, 1fr);
                margin:28px auto 0;
                max-width:1120px;
            }
            .buyerSupportSummary,
            .buyerSupportChat,
            .buyerSupportEmpty {
                background:#141417;
                border:1px solid rgba(255,255,255,.08);
                border-radius:18px;
                box-shadow:0 24px 80px rgba(0,0,0,.28);
            }
            .buyerSupportSummary { align-self:start; padding:22px; }
            .buyerSupportSummary > span {
                align-items:center;
                background:rgba(0,206,201,.12);
                border-radius:14px;
                color:#00cec9;
                display:flex;
                height:52px;
                justify-content:center;
                margin-bottom:18px;
                width:52px;
            }
            .buyerSupportSummary h1 { font-size:22px; line-height:1.15; margin:0 0 10px; }
            .buyerSupportSummary p { color:#94a3b8; font-size:13px; line-height:1.5; margin:0 0 18px; }
            .buyerSupportSummary div {
                align-items:flex-start;
                color:#00cec9;
                display:flex;
                font-size:12px;
                font-weight:750;
                gap:8px;
                line-height:1.45;
            }
            .buyerSupportChat { display:flex; flex-direction:column; min-height:650px; overflow:hidden; }
            .buyerSupportMessages {
                display:flex;
                flex:1;
                flex-direction:column;
                gap:12px;
                overflow-y:auto;
                padding:20px;
            }
            .buyerSupportBubble {
                border:1px solid rgba(255,255,255,.08);
                border-radius:14px;
                max-width:min(680px, 86%);
                padding:12px 14px;
            }
            .buyerSupportBubble.buyer { align-self:flex-end; background:#00cec9; color:#081315; }
            .buyerSupportBubble.seller { align-self:flex-start; background:rgba(255,255,255,.045); color:#e2e8f0; }
            .buyerSupportBubble strong { display:block; font-size:11px; margin-bottom:5px; opacity:.8; }
            .buyerSupportBubble p { font-size:14px; line-height:1.55; margin:0; white-space:pre-wrap; }
            .buyerSupportBubble time { display:block; font-size:10px; margin-top:8px; opacity:.62; }
            .buyerSupportNoMessages {
                color:#64748b;
                display:grid;
                flex:1;
                place-items:center;
                text-align:center;
            }
            .buyerSupportComposer {
                border-top:1px solid rgba(255,255,255,.08);
                display:flex;
                gap:12px;
                padding:14px;
            }
            .buyerSupportComposer textarea {
                background:#0a0a0c;
                border:1px solid rgba(255,255,255,.10);
                border-radius:12px;
                color:#e2e8f0;
                flex:1;
                font:inherit;
                min-height:52px;
                outline:none;
                padding:13px 14px;
                resize:none;
            }
            .buyerSupportComposer button,
            .buyerSupportEmpty button {
                align-items:center;
                background:#fff;
                border:0;
                border-radius:12px;
                color:#0a0a0c;
                cursor:pointer;
                display:flex;
                font-weight:900;
                gap:8px;
                justify-content:center;
                padding:0 18px;
            }
            .buyerSupportComposer button:disabled { cursor:not-allowed; opacity:.5; }
            .buyerSupportLoader {
                animation:buyerSupportSpin .8s linear infinite;
                border:3px solid rgba(255,255,255,.1);
                border-radius:50%;
                border-top-color:#00cec9;
                height:42px;
                left:50%;
                position:fixed;
                top:50%;
                width:42px;
            }
            @keyframes buyerSupportSpin { to { transform:rotate(360deg); } }
            .buyerSupportEmpty {
                margin:80px auto 0;
                max-width:470px;
                padding:42px 26px;
                text-align:center;
            }
            .buyerSupportEmpty h1 { font-size:24px; margin:14px 0 8px; }
            .buyerSupportEmpty p { color:#94a3b8; font-size:13px; line-height:1.55; margin:0 0 18px; }
            .buyerSupportEmpty button { height:44px; margin:0 auto; }
            @media (max-width:820px) {
                .buyerSupportShell { grid-template-columns:1fr; }
                .buyerSupportSummary { display:none; }
                .buyerSupportChat { min-height:calc(100vh - 122px); }
                .buyerSupportComposer { align-items:stretch; flex-direction:column; }
                .buyerSupportComposer button { height:46px; }
                .buyerSupportBubble { max-width:94%; }
            }
        `}</style>
    );
}
