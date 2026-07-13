'use client';

import { useEffect, useState } from 'react';
import { authAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { FiSave, FiUser, FiCreditCard, FiKey, FiBell, FiCheckCircle, FiCode, FiCopy, FiPlus, FiGlobe, FiZap, FiSmartphone, FiXCircle, FiSend, FiEye, FiEyeOff, FiRefreshCw, FiTrash2, FiPower } from 'react-icons/fi';
import axios from 'axios';

// Converte a VAPID public key de base64url para Uint8Array (necessario para subscribe)
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testingWebhook, setTestingWebhook] = useState(false);
    const [tab, setTab] = useState('profile');
    const [apiKeys, setApiKeys] = useState<any[]>([]);
    const [visibleApiKeys, setVisibleApiKeys] = useState<Record<string, boolean>>({});
    const [loadingKeys, setLoadingKeys] = useState(false);
    const [pushSubscribed, setPushSubscribed] = useState(false);
    const [pushLoading, setPushLoading] = useState(false);
    const [pushSubscription, setPushSubscription] = useState<PushSubscription | null>(null);
    const [testPushAmount, setTestPushAmount] = useState('10.00');
    const [testingPush, setTestingPush] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [form, setForm] = useState({
        id: '', telegram_chat_id: '', webhook_url: '', webhook_urls: [''],
        name: '', phone: '', cpf_cnpj: '',
        address_street: '', address_number: '', address_complement: '',
        address_neighborhood: '', address_city: '', address_state: '', address_zipcode: '',
        pix_key: '', pix_key_type: 'cpf',
        bank_name: '', bank_agency: '', bank_agency_digit: '', bank_account: '', bank_account_digit: '', bank_account_type: 'checking'
    });

    useEffect(() => {
        loadProfile();
        checkPushStatus();
    }, []);

    useEffect(() => {
        if (tab === 'api') loadApiKeys();
    }, [tab]);

    const checkPushStatus = async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
        try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            if (sub) {
                setPushSubscribed(true);
                setPushSubscription(sub);
            }
        } catch {}
    };

    const enablePush = async () => {
        // Detecta iOS
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        
        // Verifica suporte básico
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            if (isIOS) {
                return toast.error('Notificações push requerem iOS 16.4+ e Safari. Certifique-se de estar usando o Safari e que seu iOS está atualizado.', { duration: 6000 });
            }
            return toast.error('Seu navegador não suporta notificações push.');
        }

        // No iOS, precisa adicionar à tela inicial primeiro
        if (isIOS) {
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                               (window.navigator as any).standalone === true;
            
            if (!isStandalone) {
                return toast.error('No iOS, você precisa adicionar este site à tela inicial primeiro. Toque no botão de compartilhar e selecione "Adicionar à Tela de Início".', { duration: 8000 });
            }
        }

        setPushLoading(true);
        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                toast.error('Permissão de notificação negada.');
                return;
            }

            const { data: vapidData } = await axios.get('/api/push/vapid-public-key');
            const applicationServerKey = urlBase64ToUint8Array(vapidData.publicKey);

            const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
            await navigator.serviceWorker.ready;

            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: applicationServerKey as BufferSource,
            });

            const token = localStorage.getItem('token');
            await axios.post('/api/push/subscribe', sub.toJSON(), {
                headers: { Authorization: `Bearer ${token}` },
            });

            setPushSubscribed(true);
            setPushSubscription(sub);
            toast.success('Notificações push ativadas!');
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.error || 'Erro ao ativar notificações push.');
        } finally {
            setPushLoading(false);
        }
    };

    const disablePush = async () => {
        setPushLoading(true);
        try {
            if (pushSubscription) {
                await pushSubscription.unsubscribe();
                const token = localStorage.getItem('token');
                await axios.delete('/api/push/subscribe', {
                    headers: { Authorization: `Bearer ${token}` },
                    data: { endpoint: pushSubscription.endpoint },
                });
            }
            setPushSubscribed(false);
            setPushSubscription(null);
            toast.success('Notificacoes push desativadas.');
        } catch (err: any) {
            toast.error('Erro ao desativar notificacoes push.');
        } finally {
            setPushLoading(false);
        }
    };

    const testPushNotification = async () => {
        if (!pushSubscribed) {
            return toast.error('Ative as notificações push primeiro.');
        }
        setTestingPush(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/push/test', { amount: parseFloat(testPushAmount) || 10 }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            toast.success('Notificação de teste enviada!');
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao enviar notificação de teste.');
        } finally {
            setTestingPush(false);
        }
    };

    const loadApiKeys = async () => {
        setLoadingKeys(true);
        try {
            const token = localStorage.getItem('token');
            const { data } = await axios.get('/api/auth/api-keys', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setApiKeys(data.keys || []);
        } catch (err) {
            console.error('Erro ao carregar chaves:', err);
        } finally {
            setLoadingKeys(false);
        }
    };

    const generateApiKey = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/auth/api-keys', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Chave de API gerada com sucesso!');
            loadApiKeys();
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.error || err.message || 'Erro ao gerar chave de API');
        }
    };

    const toggleApiKeyVisibility = (id: string) => {
        setVisibleApiKeys(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const maskApiKey = (keyValue: string) => {
        if (!keyValue) return '********';
        const prefix = keyValue.slice(0, 8);
        const suffix = keyValue.slice(-4);
        return `${prefix}${'*'.repeat(24)}${suffix}`;
    };

    const updateApiKeyStatus = async (id: string, isActive: boolean) => {
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`/api/auth/api-keys/${id}`, { is_active: isActive }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(isActive ? 'Chave reativada!' : 'Chave revogada!');
            loadApiKeys();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao atualizar chave');
        }
    };

    const renewApiKey = async (id: string) => {
        if (!window.confirm('Renovar esta chave? A chave atual deixara de funcionar imediatamente.')) return;
        try {
            const token = localStorage.getItem('token');
            const { data } = await axios.put(`/api/auth/api-keys/${id}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setVisibleApiKeys(prev => ({ ...prev, [id]: true }));
            toast.success('Chave renovada! Copie a nova chave agora.');
            setApiKeys(prev => prev.map(key => key.id === id ? data.key : key));
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao renovar chave');
        }
    };

    const deleteApiKey = async (id: string) => {
        if (!window.confirm('Apagar esta chave de API? Essa acao nao pode ser desfeita.')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/auth/api-keys/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
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

    const testWebhook = async () => {
        if (!form.webhook_urls.some(url => url.trim())) return toast.error('Configure uma URL primeiro');
        setTestingWebhook(true);
        try {
            const token = localStorage.getItem('token');
            const { data } = await axios.post('/api/webhooks/test', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(data.message || 'Teste enviado com sucesso!');
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao testar webhook');
        } finally {
            setTestingWebhook(false);
        }
    };

    const loadProfile = async () => {
        try {
            const { data } = await authAPI.getProfile();
            const u = data.user;
            setIsAdmin(u.role === 'admin');
            setForm({
                id: u.id,
                telegram_chat_id: u.telegram_chat_id || '',
                webhook_url: u.webhook_url || '',
                webhook_urls: Array.isArray(u.webhook_urls) && u.webhook_urls.length > 0
                    ? u.webhook_urls
                    : (u.webhook_url ? [u.webhook_url] : ['']),
                name: u.name || '', phone: u.phone || '', cpf_cnpj: u.cpf_cnpj || '',
                address_street: u.address_street || '', address_number: u.address_number || '',
                address_complement: u.address_complement || '', address_neighborhood: u.address_neighborhood || '',
                address_city: u.address_city || '', address_state: u.address_state || '', address_zipcode: u.address_zipcode || '',
                pix_key: u.pix_key || '', pix_key_type: u.pix_key_type || 'cpf',
                bank_name: u.bank_name || '', bank_agency: u.bank_agency || '',
                bank_agency_digit: u.bank_agency_digit || '',
                bank_account: u.bank_account || '',
                bank_account_digit: u.bank_account_digit || '',
                bank_account_type: u.bank_account_type || 'checking'
            });
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { data } = await authAPI.updateProfile(form);

            if (data.syncError) {
                const details = data.syncError.details?.map((d: any) => d.message).join(', ') || '';
                toast.error(`Perfil salvo, mas erro no Pagar.me: ${data.syncError.message} ${details}`, { duration: 6000 });
            } else {
                toast.success('Perfil e sincronização atualizados!');
            }
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao salvar');
        } finally { setSaving(false); }
    };

    const update = (field: string, value: string) => setForm({ ...form, [field]: value });

    const updateWebhookUrl = (index: number, value: string) => {
        setForm(prev => ({
            ...prev,
            webhook_urls: prev.webhook_urls.map((url, i) => i === index ? value : url),
        }));
    };

    const addWebhookUrl = () => {
        setForm(prev => ({ ...prev, webhook_urls: [...prev.webhook_urls, ''] }));
    };

    const removeWebhookUrl = (index: number) => {
        setForm(prev => {
            const next = prev.webhook_urls.filter((_, i) => i !== index);
            return { ...prev, webhook_urls: next.length > 0 ? next : [''] };
        });
    };

    const tabs = [
        { key: 'profile', label: 'Perfil', icon: <FiUser size={16} /> },
        { key: 'bank', label: 'Dados Bancários', icon: <FiCreditCard size={16} /> },
        { key: 'pix', label: 'Chave Pix', icon: <FiKey size={16} /> },
        { key: 'notifications', label: 'Notificações', icon: <FiBell size={16} /> },
    ];

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                <div style={{ width: 36, height: 36, border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 28 }}>Configurações</h1>

            {/* Tabs */}
            <div className="settings-tabs" style={{ 
                display: 'flex', 
                gap: 4, 
                marginBottom: 28, 
                background: 'var(--bg-card)', 
                borderRadius: 12, 
                padding: 4, 
                width: '100%',
                overflowX: 'auto',
                whiteSpace: 'nowrap',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
            }}>
                {tabs.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)} style={{
                        padding: '10px 20px', 
                        borderRadius: 10, 
                        border: 'none', 
                        cursor: 'pointer',
                        background: tab === t.key ? 'rgba(108,92,231,0.15)' : 'transparent',
                        color: tab === t.key ? 'var(--accent-secondary)' : 'var(--text-secondary)',
                        fontWeight: 500, 
                        fontSize: 13, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 8,
                        transition: 'all 0.2s ease', 
                        fontFamily: 'Inter, sans-serif',
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                        minWidth: 'fit-content'
                    }}>
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            <div className={`glass-card ${tab === 'api' ? 'settings-api' : ''}`} style={{ padding: 32, maxWidth: 600, margin: '0 auto' }}>
                {tab === 'profile' && (
                    <div>
                        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Informações Pessoais</h3>
                        <div style={{ display: 'grid', gap: 16 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Nome completo</label>
                                <input className="input-field" value={form.name} onChange={e => update('name', e.target.value)} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Telefone</label>
                                    <input className="input-field" value={form.phone} onChange={e => update('phone', e.target.value)} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>CPF/CNPJ</label>
                                    <input className="input-field" value={form.cpf_cnpj} onChange={e => update('cpf_cnpj', e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Rua</label>
                                <input className="input-field" value={form.address_street} onChange={e => update('address_street', e.target.value)} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Número</label>
                                    <input className="input-field" value={form.address_number} onChange={e => update('address_number', e.target.value)} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Cidade</label>
                                    <input className="input-field" value={form.address_city} onChange={e => update('address_city', e.target.value)} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>UF</label>
                                    <input className="input-field" maxLength={2} value={form.address_state} onChange={e => update('address_state', e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'api' && (
                    <div>
                        <div className="api-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Chaves de API</h3>
                            <button 
                                onClick={generateApiKey} 
                                style={{ 
                                    background: '#2563eb', 
                                    color: 'white', 
                                    border: 'none', 
                                    padding: '8px 16px', 
                                    borderRadius: 8, 
                                    fontSize: 13, 
                                    fontWeight: 500, 
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <FiPlus size={16} /> Gerar Nova Chave
                            </button>
                        </div>

                        {loadingKeys ? (
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Carregando chaves...</p>
                        ) : (
                            <div className="api-keys-list" style={{ display: 'grid', gap: 12 }}>
                                {apiKeys.map(key => (
                                    <div key={key.id} className="api-key-row" style={{ 
                                        padding: 16, 
                                        background: 'var(--bg-hover)', 
                                        borderRadius: 8, 
                                        border: '1px solid var(--border)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: 12,
                                        flexWrap: 'wrap'
                                    }}>
                                        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                                                <code style={{ 
                                                    background: 'rgba(0,0,0,0.1)', 
                                                    padding: '2px 6px', 
                                                    borderRadius: 4, 
                                                    fontSize: 13, 
                                                    fontFamily: 'monospace',
                                                    color: 'var(--text-primary)',
                                                    wordBreak: 'break-all',
                                                    overflowWrap: 'break-word',
                                                    maxWidth: '100%',
                                                    display: 'inline-block'
                                                }}>{visibleApiKeys[key.id] ? key.api_key : maskApiKey(key.api_key)}</code>
                                                {key.is_active ? (
                                                    <span style={{ fontSize: 10, background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: 99, whiteSpace: 'nowrap' }}>ATIVA</span>
                                                ) : (
                                                    <span style={{ fontSize: 10, background: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: 99, whiteSpace: 'nowrap' }}>INATIVA</span>
                                                )}
                                            </div>
                                            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                Criada em: {new Date(key.created_at).toLocaleDateString()}
                                                {key.last_used_at ? ` • Ultimo uso: ${new Date(key.last_used_at).toLocaleDateString()}` : ''}
                                            </p>
                                        </div>
                                        <div className="api-key-actions" style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
                                            <button
                                                onClick={() => toggleApiKeyVisibility(key.id)}
                                                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 8 }}
                                                title={visibleApiKeys[key.id] ? 'Esconder chave' : 'Mostrar chave'}
                                            >
                                                {visibleApiKeys[key.id] ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(key.api_key);
                                                    toast.success('Copiada!');
                                                }}
                                                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 8 }}
                                                title="Copiar chave"
                                            >
                                                <FiCopy size={18} />
                                            </button>
                                            <button
                                                onClick={() => updateApiKeyStatus(key.id, !key.is_active)}
                                                style={{ background: 'transparent', border: 'none', color: key.is_active ? '#f59e0b' : '#16a34a', cursor: 'pointer', padding: 8 }}
                                                title={key.is_active ? 'Revogar chave' : 'Reativar chave'}
                                            >
                                                <FiPower size={18} />
                                            </button>
                                            <button
                                                onClick={() => renewApiKey(key.id)}
                                                style={{ background: 'transparent', border: 'none', color: '#2563eb', cursor: 'pointer', padding: 8 }}
                                                title="Renovar chave"
                                            >
                                                <FiRefreshCw size={18} />
                                            </button>
                                            <button
                                                onClick={() => deleteApiKey(key.id)}
                                                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 8 }}
                                                title="Apagar chave"
                                            >
                                                <FiTrash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {apiKeys.length === 0 && (
                                    <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13, background: 'var(--bg-hover)', borderRadius: 8, border: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                                        <p>Nenhuma chave de API gerada. Gere uma para começar a integrar.</p>
                                        <button 
                                            onClick={generateApiKey} 
                                            style={{ 
                                                background: '#2563eb', 
                                                color: 'white', 
                                                border: 'none', 
                                                padding: '10px 20px', 
                                                borderRadius: 8, 
                                                fontSize: 14, 
                                                fontWeight: 600, 
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
                                            }}
                                        >
                                            <FiPlus size={18} /> Gerar Minha Primeira Chave
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}


                        <div style={{ marginTop: 32, padding: 20, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
                            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <FiGlobe /> Configuração de Webhook
                            </h3>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                                Receba notificações automáticas no seu sistema sempre que uma venda for atualizada (paga, recusada, estornada).
                            </p>
                            
                            <div>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>URLs de Webhook</label>
                                <div style={{ display: 'grid', gap: 10 }}>
                                    {form.webhook_urls.map((url, index) => (
                                        <div key={index} className="webhook-row" style={{ display: 'flex', gap: 8 }}>
                                            <input
                                                className="input-field"
                                                placeholder="https://seu-sistema.com/webhook"
                                                value={url}
                                                onChange={e => updateWebhookUrl(index, e.target.value)}
                                            />
                                            <button
                                                onClick={() => removeWebhookUrl(index)}
                                                disabled={form.webhook_urls.length === 1 && !url}
                                                style={{
                                                    background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)',
                                                    borderRadius: 8, padding: '0 16px', cursor: 'pointer', fontWeight: 500,
                                                    display: 'flex', alignItems: 'center', gap: 8
                                                }}
                                                title="Remover webhook"
                                            >
                                                <FiTrash2 /> Remover
                                            </button>
                                        </div>
                                    ))}
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        <button
                                            onClick={addWebhookUrl}
                                            style={{
                                                background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)',
                                                borderRadius: 8, padding: '10px 16px', cursor: 'pointer', fontWeight: 500,
                                                display: 'flex', alignItems: 'center', gap: 8
                                            }}
                                        >
                                            <FiPlus /> Adicionar Webhook
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            disabled={saving}
                                            style={{
                                                background: '#2563eb', color: 'white', border: 'none',
                                                borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 500,
                                                display: 'flex', alignItems: 'center', gap: 8
                                            }}
                                        >
                                            <FiSave /> {saving ? 'Salvando...' : 'Salvar'}
                                        </button>
                                        <button
                                            onClick={testWebhook}
                                            disabled={testingWebhook || !form.webhook_urls.some(url => url.trim())}
                                            style={{
                                                background: form.webhook_urls.some(url => url.trim()) ? '#f59e0b' : '#d1d5db', color: 'white', border: 'none',
                                                borderRadius: 8, padding: '10px 20px', cursor: form.webhook_urls.some(url => url.trim()) ? 'pointer' : 'not-allowed', fontWeight: 500,
                                                display: 'flex', alignItems: 'center', gap: 8
                                            }}
                                            title="Enviar teste para todos os Webhooks"
                                        >
                                            <FiZap /> {testingWebhook ? 'Enviando...' : 'Testar Todos'}
                                        </button>
                                    </div>
                                </div>
                                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                                    Enviaremos um POST JSON com os dados da venda para todas as URLs cadastradas.
                                </p>
                            </div>
                        </div>

                        <div style={{ marginTop: 32, padding: 20, background: 'rgba(59, 130, 246, 0.05)', borderRadius: 12, border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                            <h4 style={{ fontSize: 14, fontWeight: 600, color: '#2563eb', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <FiCode /> Como integrar?
                            </h4>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
                                Use sua chave de API para gerar Pix em seus projetos externos. O dinheiro cairá na sua conta GouPay com o split já aplicado.
                            </p>
                            
                            <div className="integration-code" style={{ background: '#1e293b', padding: 16, borderRadius: 8, overflowX: 'auto' }}>
                                <code style={{ color: '#e2e8f0', fontSize: 12, fontFamily: 'monospace', whiteSpace: 'pre' }}>
{`// Exemplo de requisição (POST)
const response = await fetch('https://www.goupay.com.br/api/v1/pix', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'SUA_CHAVE_AQUI'
  },
  body: JSON.stringify({
    amount: 1000, // R$ 10,00 (em centavos)
    description: "Venda Loja X",
    customer: {
      name: "Cliente Teste",
      email: "cliente@email.com",
      cpf: "12345678900"
    }
  })
});

const data = await response.json();
console.log(data.pix.qr_code); // Pix Copia e Cola`}
                                </code>
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'bank' && (
                    <div>
                        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Dados Bancários</h3>
                        <div style={{ display: 'grid', gap: 16 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Banco (Código)</label>
                                <input className="input-field" placeholder="Ex: 001" value={form.bank_name} onChange={e => update('bank_name', e.target.value)} />
                                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Use apenas os números do código do banco (ex: 001 para BB, 260 para NuBank).</p>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Agência / Dígito</label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input className="input-field" placeholder="0001" style={{ flex: 1 }} value={form.bank_agency} onChange={e => update('bank_agency', e.target.value)} />
                                        <input className="input-field" placeholder="D" style={{ width: 50, textAlign: 'center' }} maxLength={1} value={form.bank_agency_digit} onChange={e => update('bank_agency_digit', e.target.value)} />
                                    </div>
                                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Alguns bancos possuem dígito na agência</p>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Conta / Dígito</label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input className="input-field" placeholder="12345" style={{ flex: 1 }} value={form.bank_account} onChange={e => update('bank_account', e.target.value)} />
                                        <input className="input-field" placeholder="D" style={{ width: 50, textAlign: 'center' }} maxLength={1} value={form.bank_account_digit} onChange={e => update('bank_account_digit', e.target.value)} />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Tipo de Conta</label>
                                <select className="input-field" value={form.bank_account_type} onChange={e => update('bank_account_type', e.target.value)}>
                                    <option value="checking">Corrente</option>
                                    <option value="savings">Poupança</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'pix' && (
                    <div>
                        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Chave Pix para Saques</h3>
                        <div style={{ display: 'grid', gap: 16 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Tipo de chave</label>
                                <select className="input-field" value={form.pix_key_type} onChange={e => update('pix_key_type', e.target.value)}>
                                    <option value="cpf">CPF</option>
                                    <option value="cnpj">CNPJ</option>
                                    <option value="email">Email</option>
                                    <option value="phone">Telefone</option>
                                    <option value="random">Aleatória</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Chave Pix</label>
                                <input className="input-field" placeholder="Sua chave Pix" value={form.pix_key} onChange={e => update('pix_key', e.target.value)} />
                            </div>
                        </div>
                    </div>
                )}

                

                {tab === 'notifications' && (
                    <div>
                        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Notificações</h3>

                        {/* Telegram */}
                        <div style={{ padding: 24, background: 'rgba(0, 136, 204, 0.05)', borderRadius: 12, border: '1px solid rgba(0, 136, 204, 0.1)', marginBottom: 16 }}>
                            <div style={{ display: 'flex', gap: 20 }}>
                                <div style={{ width: 56, height: 56, background: '#0088cc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                                    <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"></path></svg>
                                </div>
                                <div>
                                    <h4 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Notificações via Telegram</h4>
                                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 20 }}>
                                        Conecte sua conta ao Telegram para receber notificações instantâneas de cada venda realizada, incluindo valor e nome do produto.
                                    </p>

                                    {form.telegram_chat_id ? (
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(74, 222, 128, 0.15)', color: '#4ade80', padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14 }}>
                                            <FiCheckCircle size={18} /> Conectado com sucesso
                                        </div>
                                    ) : (
                                        <a 
                                            href={`https://t.me/GouPay_Notifica_Bot?start=${form.id}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            style={{ 
                                                display: 'inline-flex', alignItems: 'center', gap: 10, 
                                                background: '#0088cc', color: '#fff', 
                                                padding: '12px 24px', borderRadius: 8, 
                                                fontWeight: 600, fontSize: 14, textDecoration: 'none',
                                                transition: 'transform 0.2s'
                                            }}
                                        >
                                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"></path></svg>
                                            Conectar Telegram Agora
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Web Push */}
                        <div style={{ padding: 24, background: 'rgba(108, 92, 231, 0.05)', borderRadius: 12, border: '1px solid rgba(108, 92, 231, 0.15)' }}>
                            <div style={{ display: 'flex', gap: 20 }}>
                                <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                                    <FiSmartphone size={26} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Notificações Push no Celular</h4>
                                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 16 }}>
                                        Receba notificações nativas no seu celular ou computador. Funciona em Chrome, Edge, Firefox e Safari (iOS 16.4+).
                                    </p>

                                    {/* Aviso iOS */}
                                    {(/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) && (
                                        <div style={{ 
                                            padding: 12, 
                                            background: 'rgba(245, 158, 11, 0.1)', 
                                            border: '1px solid rgba(245, 158, 11, 0.3)',
                                            borderRadius: 8, 
                                            marginBottom: 16,
                                            fontSize: 11,
                                            color: '#d97706',
                                            lineHeight: 1.5
                                        }}>
                                            <strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>📱 iPhone/iPad - Como Ativar</strong>
                                            <ol style={{ marginTop: 6, marginLeft: 16, marginBottom: 0, fontSize: 11, paddingLeft: 4 }}>
                                                <li style={{ marginBottom: 3 }}>Abra no <strong>Safari</strong></li>
                                                <li style={{ marginBottom: 3 }}>Toque em <strong>Compartilhar</strong></li>
                                                <li style={{ marginBottom: 3 }}><strong>"Adicionar à Tela de Início"</strong></li>
                                                <li style={{ marginBottom: 3 }}>Abra o app pela <strong>tela inicial</strong></li>
                                                <li>Ative as notificações aqui</li>
                                            </ol>
                                        </div>
                                    )}

                                    {pushSubscribed ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(74, 222, 128, 0.15)', color: '#4ade80', padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14 }}>
                                                <FiCheckCircle size={18} /> Push ativo neste dispositivo
                                            </div>
                                            <button
                                                onClick={disablePush}
                                                disabled={pushLoading}
                                                style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: 8,
                                                    background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
                                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                                    padding: '10px 20px', borderRadius: 8,
                                                    fontWeight: 600, fontSize: 13, cursor: 'pointer',
                                                    opacity: pushLoading ? 0.6 : 1
                                                }}
                                            >
                                                <FiXCircle size={16} /> {pushLoading ? 'Desativando...' : 'Desativar'}
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={enablePush}
                                            disabled={pushLoading}
                                            style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 10,
                                                background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
                                                color: '#fff', border: 'none',
                                                padding: '12px 24px', borderRadius: 8,
                                                fontWeight: 600, fontSize: 14, cursor: 'pointer',
                                                opacity: pushLoading ? 0.7 : 1,
                                                transition: 'opacity 0.2s'
                                            }}
                                        >
                                            <FiSmartphone size={18} />
                                            {pushLoading ? 'Ativando...' : 'Ativar Notificações Push'}
                                        </button>
                                    )}

                                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12, lineHeight: 1.5 }}>
                                        Compativel com Chrome, Edge e Firefox (desktop e Android). No iPhone, requer Safari e iOS 16.4+. Voce precisara aceitar a permissao de notificacao no navegador.
                                    </p>

                                    {/* Teste de notificação - apenas admins */}
                                    {pushSubscribed && isAdmin && (
                                        <div style={{
                                            marginTop: 20,
                                            padding: 16,
                                            background: 'rgba(108, 92, 231, 0.06)',
                                            border: '1px solid rgba(108, 92, 231, 0.2)',
                                            borderRadius: 10,
                                        }}>
                                            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>
                                                🧪 Testar Notificação
                                            </p>
                                            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
                                                Simule uma venda para verificar se as notificações estão funcionando.
                                            </p>
                                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '8px 12px', flex: 1, minWidth: 120 }}>
                                                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>R$</span>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        step="0.01"
                                                        value={testPushAmount}
                                                        onChange={e => setTestPushAmount(e.target.value)}
                                                        style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', width: '100%' }}
                                                        placeholder="10.00"
                                                    />
                                                </div>
                                                <button
                                                    onClick={testPushNotification}
                                                    disabled={testingPush}
                                                    style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: 8,
                                                        background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
                                                        color: '#fff', border: 'none',
                                                        padding: '10px 20px', borderRadius: 8,
                                                        fontWeight: 600, fontSize: 13, cursor: 'pointer',
                                                        opacity: testingPush ? 0.7 : 1,
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    <FiSend size={14} />
                                                    {testingPush ? 'Enviando...' : 'Testar Notificação'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <button className="btn-primary" onClick={handleSave} disabled={saving}
                    style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 8, padding: '14px 32px' }}>
                    <FiSave size={16} /> {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
            </div>
            <style jsx global>{`
              @media (max-width: 768px) {
                .settings-api { width: 90% !important; }
                .api-header { flex-direction: column !important; gap: 12px !important; align-items: stretch !important; }
                .api-header h3 { text-align: center !important; }
                .api-keys-list { max-width: 640px; margin: 0 auto; }
                .api-key-row { flex-direction: column !important; gap: 10px !important; align-items: stretch !important; }
                .api-key-row > div { width: 100% !important; }
                .api-key-row > button { align-self: center !important; }
                .webhook-row { flex-direction: column !important; }
                .webhook-row .input-field { width: 100% !important; }
                .webhook-row button { width: 100% !important; justify-content: center !important; }
                .integration-code code { font-size: 11px !important; }
              }
              /* hide scrollbar across browsers */
              .settings-tabs { -ms-overflow-style: none; scrollbar-width: none; }
              .settings-tabs::-webkit-scrollbar { display: none; }
            `}</style>
        </div>
    );
}
