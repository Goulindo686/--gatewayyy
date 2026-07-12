'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    FiCheckCircle,
    FiCode,
    FiCopy,
    FiEye,
    FiEyeOff,
    FiGlobe,
    FiInfo,
    FiPlus,
    FiPower,
    FiRefreshCw,
    FiSave,
    FiSend,
    FiTrash2,
    FiZap,
} from 'react-icons/fi';

export default function IntegrationsPage() {
    const [tab, setTab] = useState<'utmify' | 'api'>('utmify');
    const [loading, setLoading] = useState(true);
    const [savingUtmify, setSavingUtmify] = useState(false);
    const [testingUtmify, setTestingUtmify] = useState(false);
    const [utmify, setUtmify] = useState({
        enabled: false,
        api_token: '',
        has_token: false,
        last_sent_at: '',
        last_error: '',
    });
    const [utmifyEvents, setUtmifyEvents] = useState<any[]>([]);
    const [retryingEvent, setRetryingEvent] = useState<string | null>(null);

    const [apiKeys, setApiKeys] = useState<any[]>([]);
    const [visibleApiKeys, setVisibleApiKeys] = useState<Record<string, boolean>>({});
    const [loadingKeys, setLoadingKeys] = useState(false);
    const [webhookUrl, setWebhookUrl] = useState('');
    const [savingWebhook, setSavingWebhook] = useState(false);
    const [testingWebhook, setTestingWebhook] = useState(false);

    useEffect(() => {
        loadUtmify();
        loadProfile();
    }, []);

    useEffect(() => {
        if (tab === 'api') loadApiKeys();
    }, [tab]);

    const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

    const loadUtmify = async () => {
        try {
            const { data } = await axios.get('/api/integrations/utmify', { headers: headers() });
            setUtmify({
                enabled: !!data.integration?.enabled,
                api_token: data.integration?.api_token || '',
                has_token: !!data.integration?.has_token,
                last_sent_at: data.integration?.last_sent_at || '',
                last_error: data.integration?.last_error || '',
            });
            setUtmifyEvents(data.events || []);
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao carregar UTMify');
        } finally {
            setLoading(false);
        }
    };

    const loadProfile = async () => {
        try {
            const { data } = await axios.get('/api/auth/profile', { headers: headers() });
            setWebhookUrl(data.user?.webhook_url || '');
        } catch {}
    };

    const saveUtmify = async () => {
        setSavingUtmify(true);
        try {
            const { data } = await axios.put('/api/integrations/utmify', utmify, { headers: headers() });
            setUtmify((prev) => ({ ...prev, ...data.integration }));
            toast.success(data.message || 'UTMify salva com sucesso!');
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao salvar UTMify');
        } finally {
            setSavingUtmify(false);
        }
    };

    const retryUtmifyEvent = async (eventId: string) => {
        setRetryingEvent(eventId);
        try {
            const { data } = await axios.post(`/api/integrations/utmify/events/${eventId}/retry`, {}, { headers: headers() });
            toast.success(data.message || 'Evento reenviado!');
            loadUtmify();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao reenviar evento');
            loadUtmify();
        } finally {
            setRetryingEvent(null);
        }
    };

    const testUtmify = async () => {
        setTestingUtmify(true);
        try {
            const { data } = await axios.post('/api/integrations/utmify', {}, { headers: headers() });
            toast.success(data.message || 'Teste enviado para a UTMify!');
            loadUtmify();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao testar UTMify');
        } finally {
            setTestingUtmify(false);
        }
    };

    const loadApiKeys = async () => {
        setLoadingKeys(true);
        try {
            const { data } = await axios.get('/api/auth/api-keys', { headers: headers() });
            setApiKeys(data.keys || []);
        } catch {
            toast.error('Erro ao carregar chaves de API');
        } finally {
            setLoadingKeys(false);
        }
    };

    const generateApiKey = async () => {
        try {
            await axios.post('/api/auth/api-keys', {}, { headers: headers() });
            toast.success('Chave de API gerada!');
            loadApiKeys();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao gerar chave');
        }
    };

    const maskApiKey = (keyValue: string) => {
        if (!keyValue) return '********';
        return `${keyValue.slice(0, 8)}${'*'.repeat(24)}${keyValue.slice(-4)}`;
    };

    const updateApiKeyStatus = async (id: string, isActive: boolean) => {
        try {
            await axios.patch(`/api/auth/api-keys/${id}`, { is_active: isActive }, { headers: headers() });
            toast.success(isActive ? 'Chave reativada!' : 'Chave revogada!');
            loadApiKeys();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao atualizar chave');
        }
    };

    const renewApiKey = async (id: string) => {
        if (!window.confirm('Renovar esta chave? A chave atual deixara de funcionar imediatamente.')) return;
        try {
            const { data } = await axios.put(`/api/auth/api-keys/${id}`, {}, { headers: headers() });
            setVisibleApiKeys(prev => ({ ...prev, [id]: true }));
            setApiKeys(prev => prev.map(key => key.id === id ? data.key : key));
            toast.success('Chave renovada! Copie a nova chave agora.');
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao renovar chave');
        }
    };

    const deleteApiKey = async (id: string) => {
        if (!window.confirm('Apagar esta chave de API? Essa acao nao pode ser desfeita.')) return;
        try {
            await axios.delete(`/api/auth/api-keys/${id}`, { headers: headers() });
            setVisibleApiKeys(prev => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
            toast.success('Chave apagada!');
            loadApiKeys();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao apagar chave');
        }
    };

    const saveWebhook = async () => {
        setSavingWebhook(true);
        try {
            await axios.put('/api/auth/profile', { webhook_url: webhookUrl }, { headers: headers() });
            toast.success('Webhook salvo!');
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao salvar webhook');
        } finally {
            setSavingWebhook(false);
        }
    };

    const testWebhook = async () => {
        if (!webhookUrl) return toast.error('Configure uma URL primeiro');
        setTestingWebhook(true);
        try {
            const { data } = await axios.post('/api/webhooks/test', {}, { headers: headers() });
            toast.success(data.message || 'Teste enviado com sucesso!');
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao testar webhook');
        } finally {
            setTestingWebhook(false);
        }
    };

    if (loading) {
        return <div style={{ height: 260, display: 'grid', placeItems: 'center' }}>Carregando integracoes...</div>;
    }

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 26 }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Integracoes</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                        Conecte ferramentas externas, acompanhe vendas de anuncios e use a API Pix.
                    </p>
                </div>
            </div>

            <div className="settings-tabs" style={{ display: 'flex', gap: 6, padding: 4, borderRadius: 14, background: 'var(--bg-card)', marginBottom: 24, overflowX: 'auto' }}>
                {[
                    { key: 'utmify', label: 'UTMify', icon: <FiZap size={16} /> },
                    { key: 'api', label: 'API Pix', icon: <FiCode size={16} /> },
                ].map((item: any) => (
                    <button
                        key={item.key}
                        onClick={() => setTab(item.key)}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            border: 'none',
                            borderRadius: 12,
                            padding: '11px 18px',
                            cursor: 'pointer',
                            background: tab === item.key ? 'rgba(108,92,231,0.15)' : 'transparent',
                            color: tab === item.key ? 'var(--accent-secondary)' : 'var(--text-secondary)',
                            fontWeight: 700,
                            fontSize: 13,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {item.icon} {item.label}
                    </button>
                ))}
            </div>

            {tab === 'utmify' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 24 }} className="integrations-grid">
                    <section className="glass-card" style={{ padding: 28 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                            <div style={{ width: 48, height: 48, borderRadius: 16, background: 'rgba(108,92,231,0.14)', color: 'var(--accent-secondary)', display: 'grid', placeItems: 'center' }}>
                                <FiZap size={22} />
                            </div>
                            <div>
                                <h2 style={{ fontSize: 19, fontWeight: 800, marginBottom: 4 }}>UTMify para vendas de anuncios</h2>
                                <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Envie vendas pagas com UTMs para acompanhar campanhas e pixels.</p>
                            </div>
                        </div>

                        <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, borderRadius: 14, background: 'var(--bg-hover)', border: '1px solid var(--border-color)', marginBottom: 18, cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={utmify.enabled}
                                onChange={(e) => setUtmify(prev => ({ ...prev, enabled: e.target.checked }))}
                                style={{ width: 18, height: 18, accentColor: 'var(--accent-primary)' }}
                            />
                            <span style={{ fontWeight: 800 }}>Ativar envio automatico para UTMify</span>
                        </label>

                        <div style={{ marginBottom: 18 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 7 }}>Credencial API da UTMify</label>
                            <input
                                className="input-field"
                                type="password"
                                placeholder={utmify.has_token ? 'Token salvo. Preencha somente se quiser trocar.' : 'Cole aqui o x-api-token da UTMify'}
                                value={utmify.api_token}
                                onChange={(e) => setUtmify(prev => ({ ...prev, api_token: e.target.value }))}
                            />
                            {utmify.has_token && (
                                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 7 }}>
                                    Token já salvo com proteção no servidor. Por segurança, ele não é exibido novamente.
                                </p>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <button className="btn-primary" onClick={saveUtmify} disabled={savingUtmify} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                <FiSave /> {savingUtmify ? 'Salvando...' : 'Salvar UTMify'}
                            </button>
                            <button className="btn-secondary" onClick={testUtmify} disabled={testingUtmify || !utmify.enabled || !utmify.api_token} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                <FiSend /> {testingUtmify ? 'Testando...' : 'Enviar teste'}
                            </button>
                        </div>

                        {(utmify.last_sent_at || utmify.last_error) && (
                            <div style={{ marginTop: 18, fontSize: 13, color: 'var(--text-secondary)' }}>
                                {utmify.last_sent_at && <p>Ultimo envio: {new Date(utmify.last_sent_at).toLocaleString()}</p>}
                                {utmify.last_error && <p style={{ color: 'var(--danger)' }}>Ultimo erro: {utmify.last_error}</p>}
                            </div>
                        )}
                    </section>

                    <aside className="glass-card" style={{ padding: 28 }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 800, marginBottom: 14 }}>
                            <FiInfo /> Como funciona
                        </h3>
                        <div style={{ display: 'grid', gap: 14, color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.65 }}>
                            <p>O checkout captura automaticamente <strong>UTMs, src, sck, fbclid, gclid, ttclid, msclkid</strong> e dados de campanha quando eles chegam pelo clique do anuncio.</p>
                            <p>Quando o pagamento for aprovado, o GouPay envia o evento <strong>paid</strong> para a UTMify com produto, cliente, valor e comissao.</p>
                            <p>Na UTMify, crie sua credencial em <strong>Integracoes &gt; Webhooks &gt; Credenciais API</strong>, cole o token aqui e use seus links de checkout nos anuncios normalmente.</p>
                        </div>
                    </aside>

                    <section className="glass-card" style={{ padding: 28, gridColumn: '1 / -1' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
                            <div>
                                <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Historico de eventos UTMify</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Acompanhe os envios recentes e reenvie manualmente quando houver falha.</p>
                            </div>
                            <button className="btn-secondary" onClick={loadUtmify} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                <FiRefreshCw /> Atualizar
                            </button>
                        </div>

                        <div style={{ display: 'grid', gap: 10 }}>
                            {utmifyEvents.map((event) => (
                                <div key={event.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center', padding: 14, borderRadius: 14, border: '1px solid var(--border-color)', background: 'var(--bg-hover)' }} className="utmify-event-row">
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 5 }}>
                                            <strong style={{ fontSize: 13 }}>{event.order_id ? `Pedido ${String(event.order_id).slice(0, 8)}` : 'Evento de teste'}</strong>
                                            <span style={{
                                                fontSize: 10,
                                                fontWeight: 800,
                                                borderRadius: 999,
                                                padding: '3px 7px',
                                                background: event.status === 'sent' ? '#dcfce7' : event.status === 'failed' ? '#fee2e2' : 'rgba(148,163,184,0.18)',
                                                color: event.status === 'sent' ? '#166534' : event.status === 'failed' ? '#991b1b' : 'var(--text-secondary)'
                                            }}>
                                                {event.status === 'sent' ? 'ENVIADO' : event.status === 'failed' ? 'FALHOU' : String(event.status || '').toUpperCase()}
                                            </span>
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tentativas: {event.attempt_count || 0}</span>
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {event.error_message || (event.sent_at ? `Enviado em ${new Date(event.sent_at).toLocaleString()}` : `Criado em ${new Date(event.created_at).toLocaleString()}`)}
                                        </div>
                                    </div>
                                    <div>
                                        {event.status === 'failed' && (
                                            <button
                                                className="btn-secondary"
                                                onClick={() => retryUtmifyEvent(event.id)}
                                                disabled={retryingEvent === event.id}
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}
                                            >
                                                <FiRefreshCw /> {retryingEvent === event.id ? 'Reenviando...' : 'Reenviar'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {utmifyEvents.length === 0 && (
                                <div style={{ padding: 24, borderRadius: 14, border: '1px dashed var(--border-color)', color: 'var(--text-secondary)', textAlign: 'center', fontSize: 13 }}>
                                    Nenhum evento UTMify registrado ainda.
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            )}

            {tab === 'api' && (
                <div className="glass-card settings-api" style={{ padding: 28 }}>
                    <div className="api-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                        <div>
                            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>API Pix</h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Gere cobranças Pix em sistemas externos usando suas chaves.</p>
                        </div>
                        <button onClick={generateApiKey} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
                            <FiPlus size={16} /> Gerar Nova Chave
                        </button>
                    </div>

                    {loadingKeys ? (
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Carregando chaves...</p>
                    ) : (
                        <div className="api-keys-list" style={{ display: 'grid', gap: 12 }}>
                            {apiKeys.map(key => (
                                <div key={key.id} className="api-key-row" style={{ padding: 16, background: 'var(--bg-hover)', borderRadius: 12, border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                    <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                                            <code style={{ background: 'rgba(0,0,0,0.1)', padding: '3px 7px', borderRadius: 6, fontSize: 13, fontFamily: 'monospace', color: 'var(--text-primary)', wordBreak: 'break-all', display: 'inline-block' }}>
                                                {visibleApiKeys[key.id] ? key.api_key : maskApiKey(key.api_key)}
                                            </code>
                                            <span style={{ fontSize: 10, background: key.is_active ? '#dcfce7' : '#fee2e2', color: key.is_active ? '#166534' : '#991b1b', padding: '2px 6px', borderRadius: 99 }}>
                                                {key.is_active ? 'ATIVA' : 'INATIVA'}
                                            </span>
                                        </div>
                                        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                            Criada em: {new Date(key.created_at).toLocaleDateString()}
                                            {key.last_used_at ? ` - Ultimo uso: ${new Date(key.last_used_at).toLocaleDateString()}` : ''}
                                        </p>
                                    </div>
                                    <div className="api-key-actions" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                        <button onClick={() => setVisibleApiKeys(prev => ({ ...prev, [key.id]: !prev[key.id] }))} className="icon-action" title={visibleApiKeys[key.id] ? 'Esconder chave' : 'Mostrar chave'}>
                                            {visibleApiKeys[key.id] ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                        </button>
                                        <button onClick={() => { navigator.clipboard.writeText(key.api_key); toast.success('Copiada!'); }} className="icon-action" title="Copiar chave"><FiCopy size={18} /></button>
                                        <button onClick={() => updateApiKeyStatus(key.id, !key.is_active)} className="icon-action" style={{ color: key.is_active ? '#f59e0b' : '#16a34a' }} title={key.is_active ? 'Revogar chave' : 'Reativar chave'}><FiPower size={18} /></button>
                                        <button onClick={() => renewApiKey(key.id)} className="icon-action" style={{ color: '#2563eb' }} title="Renovar chave"><FiRefreshCw size={18} /></button>
                                        <button onClick={() => deleteApiKey(key.id)} className="icon-action" style={{ color: '#ef4444' }} title="Apagar chave"><FiTrash2 size={18} /></button>
                                    </div>
                                </div>
                            ))}
                            {apiKeys.length === 0 && (
                                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13, background: 'var(--bg-hover)', borderRadius: 12, border: '1px dashed var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                                    <FiCode size={28} />
                                    <p>Nenhuma chave de API gerada. Gere uma para comecar a integrar.</p>
                                    <button onClick={generateApiKey} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                        <FiPlus size={18} /> Gerar Minha Primeira Chave
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{ marginTop: 28, padding: 20, background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-color)' }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FiGlobe /> Webhook da API Pix
                        </h3>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
                            Receba POSTs no seu sistema quando uma venda mudar de status.
                        </p>
                        <div className="webhook-row" style={{ display: 'flex', gap: 8 }}>
                            <input className="input-field" placeholder="https://seu-sistema.com/webhook" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} />
                            <button onClick={saveWebhook} disabled={savingWebhook} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                <FiSave /> {savingWebhook ? 'Salvando...' : 'Salvar'}
                            </button>
                            <button onClick={testWebhook} disabled={testingWebhook || !webhookUrl} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                <FiZap /> {testingWebhook ? 'Enviando...' : 'Testar'}
                            </button>
                        </div>
                    </div>

                    <div style={{ marginTop: 28, padding: 20, background: 'rgba(59, 130, 246, 0.05)', borderRadius: 14, border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                        <h4 style={{ fontSize: 14, fontWeight: 700, color: '#2563eb', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FiCheckCircle /> Documentacao
                        </h4>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            A documentacao completa continua disponivel em <Link href="/docs" style={{ color: '#2563eb', fontWeight: 800 }}>Documentacao da API Pix</Link>.
                        </p>
                    </div>
                </div>
            )}

            <style jsx>{`
                .icon-action {
                    background: transparent;
                    border: none;
                    color: var(--text-secondary);
                    cursor: pointer;
                    padding: 8px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                }
                @media (max-width: 920px) {
                    .integrations-grid {
                        grid-template-columns: 1fr !important;
                    }
                }
                @media (max-width: 640px) {
                    .api-header,
                    .webhook-row {
                        flex-direction: column !important;
                        align-items: stretch !important;
                    }
                    .utmify-event-row {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </div>
    );
}
