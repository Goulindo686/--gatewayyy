'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiCheckCircle, FiClock, FiExternalLink, FiMail, FiMessageCircle, FiPackage, FiSave, FiSend, FiShield, FiZap } from 'react-icons/fi';

type RecoverySetting = {
    enabled: boolean;
    delay_minutes: number;
};

type RecoveryProduct = {
    id: string;
    name: string;
    price_display: string;
    reminders_sent: number;
    recovery: RecoverySetting;
};

type WhatsappRecovery = {
    id: string;
    product_id: string;
    product_name: string;
    buyer_name?: string | null;
    buyer_email?: string | null;
    buyer_phone?: string | null;
    amount_display: string;
    pix_expires_at?: string | null;
    created_at: string;
};

function errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
}

export default function SalesRecoveryPage() {
    const [products, setProducts] = useState<RecoveryProduct[]>([]);
    const [whatsappRecoveries, setWhatsappRecoveries] = useState<WhatsappRecovery[]>([]);
    const [activeTab, setActiveTab] = useState<'whatsapp' | 'gmail'>('whatsapp');
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);

    const loadProducts = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/sales-recovery', { headers: { Authorization: `Bearer ${token}` } });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            setProducts(data.products || []);
            setWhatsappRecoveries(data.whatsapp_recoveries || []);
        } catch (error: unknown) {
            toast.error(errorMessage(error) || 'Erro ao carregar produtos');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (value?: string | null) => {
        if (!value) return 'Sem data';
        try { return new Date(value).toLocaleString('pt-BR'); } catch { return value; }
    };

    const formatPhone = (phone?: string | null) => {
        const digits = String(phone || '').replace(/\D/g, '');
        if (!digits) return 'Sem WhatsApp';
        if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
        if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
        return phone || digits;
    };

    const whatsappUrl = (recovery: WhatsappRecovery) => {
        const digits = String(recovery.buyer_phone || '').replace(/\D/g, '');
        const brNumber = digits.startsWith('55') ? digits : `55${digits}`;
        const message = [
            `Oi ${recovery.buyer_name || 'tudo bem'}!`,
            `Vi que seu Pix do produto ${recovery.product_name} ainda esta pendente.`,
            `Valor: R$ ${String(recovery.amount_display).replace('.', ',')}.`,
            'Se quiser finalizar a compra, e so usar o Pix gerado no checkout.'
        ].join('\n\n');
        return `https://wa.me/${brNumber}?text=${encodeURIComponent(message)}`;
    };

    useEffect(() => { loadProducts(); }, []);

    useEffect(() => {
        if (activeTab !== 'whatsapp') return;
        const timer = setInterval(() => {
            if (document.visibilityState === 'visible') loadProducts();
        }, 120000);
        return () => clearInterval(timer);
    }, [activeTab]);

    const updateRecovery = (productId: string, field: string, value: boolean | number) => {
        setProducts(current => current.map(product => product.id === productId
            ? { ...product, recovery: { ...product.recovery, [field]: value } }
            : product));
    };

    const save = async (product: RecoveryProduct) => {
        setSavingId(product.id);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/sales-recovery', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ product_id: product.id, enabled: product.recovery.enabled, delay_minutes: Number(product.recovery.delay_minutes) }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            toast.success('Recuperacao de vendas atualizada');
            setProducts(current => current.map(item => item.id === product.id ? { ...item, recovery: data.setting } : item));
        } catch (error: unknown) {
            toast.error(errorMessage(error) || 'Erro ao salvar configuracao');
        } finally {
            setSavingId(null);
        }
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>Carregando...</div>;

    const enabledCount = products.filter(product => product.recovery.enabled).length;
    const totalReminders = products.reduce((sum, product) => sum + (product.reminders_sent || 0), 0);

    return (
        <div className="animate-fade-in">
            <div className="recovery-tabs">
                <button className={activeTab === 'whatsapp' ? 'active' : ''} onClick={() => setActiveTab('whatsapp')}>
                    <FiMessageCircle size={16} /> WhatsApp
                    {whatsappRecoveries.length > 0 && <span>{whatsappRecoveries.length}</span>}
                </button>
                <button className={activeTab === 'gmail' ? 'active' : ''} onClick={() => setActiveTab('gmail')}>
                    <FiMail size={16} /> Gmail
                </button>
            </div>

            {activeTab === 'gmail' ? <>
            <div className="recovery-hero">
                <div className="recovery-hero-copy">
                    <div className="hero-kicker"><FiMail size={15} /> Recuperacao via Gmail</div>
                    <h1>Recuperacao de Vendas</h1>
                    <p>
                        Quando o cliente gera um Pix e nao finaliza a compra, o sistema envia automaticamente um Gmail com o QR Code Pix original para tentar recuperar o pagamento pendente.
                    </p>
                </div>
                <div className="hero-steps">
                    <div><span><FiPackage size={15} /></span> Cliente gera Pix</div>
                    <div><span><FiClock size={15} /></span> Sistema aguarda o prazo</div>
                    <div><span><FiSend size={15} /></span> Gmail e enviado</div>
                </div>
            </div>

            <div className="recovery-summary">
                <div className="summary-card">
                    <span><FiCheckCircle size={18} /></span>
                    <div>
                        <strong>{enabledCount}</strong>
                        <small>produtos com recuperacao ativa</small>
                    </div>
                </div>
                <div className="summary-card">
                    <span><FiMail size={18} /></span>
                    <div>
                        <strong>{totalReminders}</strong>
                        <small>Gmails de recuperacao enviados</small>
                    </div>
                </div>
                <div className="summary-card">
                    <span><FiShield size={18} /></span>
                    <div>
                        <strong>1x</strong>
                        <small>um lembrete por pedido pendente</small>
                    </div>
                </div>
            </div>

            <div className="gmail-notice">
                <FiZap size={20} />
                <div>
                    <strong>Como funciona</strong>
                    <p>
                        Ative por produto e escolha depois de quanto tempo o Gmail sera enviado. Pedidos pagos ou expirados sao ignorados automaticamente.
                    </p>
                </div>
            </div>

            {products.length === 0 ? (
                <div className="glass-card empty-state">
                    <FiPackage size={42} />
                    <h3>Nenhum produto disponivel</h3>
                    <p>Crie um produto na aba Produtos para ativar a recuperacao por Gmail.</p>
                </div>
            ) : <div style={{ display: 'grid', gap: 14 }}>
                {products.map(product => (
                    <div key={product.id} className="glass-card recovery-card">
                        <div className="product-main">
                            <div className="product-icon">
                                <FiPackage size={18} />
                            </div>
                            <div>
                                <div className="product-title-row">
                                    <h3>{product.name}</h3>
                                    <span className={product.recovery.enabled ? 'status-pill enabled' : 'status-pill'}>
                                        {product.recovery.enabled ? 'Ativada' : 'Desativada'}
                                    </span>
                                </div>
                                <div className="product-meta">
                                    <span>R$ {String(product.price_display).replace('.', ',')}</span>
                                    <span><FiMail size={12} /> {product.reminders_sent} Gmails enviados</span>
                                </div>
                            </div>
                        </div>
                        <div className="product-actions">
                            <label className="delay-control">
                                <span><FiClock size={15} /> Enviar apos</span>
                                <select className="input-field" value={product.recovery.delay_minutes} onChange={event => updateRecovery(product.id, 'delay_minutes', Number(event.target.value))}>
                                    <option value={15}>apos 15 minutos</option><option value={30}>apos 30 minutos</option><option value={60}>apos 1 hora</option><option value={180}>apos 3 horas</option><option value={360}>apos 6 horas</option><option value={720}>apos 12 horas</option><option value={1440}>apos 24 horas</option>
                                </select>
                            </label>
                            <label className="toggle-control">
                                <input type="checkbox" checked={product.recovery.enabled} onChange={event => updateRecovery(product.id, 'enabled', event.target.checked)} />
                                <span>{product.recovery.enabled ? 'Recuperacao ativa' : 'Ativar recuperacao'}</span>
                            </label>
                            <button className="btn-primary save-button" onClick={() => save(product)} disabled={savingId === product.id}>
                                <FiSave size={14} /> {savingId === product.id ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>}
            </> : <>
            <div className="recovery-hero whatsapp-hero">
                <div className="recovery-hero-copy">
                    <div className="hero-kicker whatsapp-kicker"><FiMessageCircle size={15} /> Recuperacao manual via WhatsApp</div>
                    <h1>Recuperacao por WhatsApp</h1>
                    <p>
                        Quando um produto pede o campo WhatsApp no checkout e o cliente gera um Pix sem pagar, o numero aparece aqui para voce chamar manualmente.
                    </p>
                </div>
                <div className="hero-steps">
                    <div><span><FiPackage size={15} /></span> Produto pede WhatsApp</div>
                    <div><span><FiClock size={15} /></span> Pix fica pendente</div>
                    <div><span><FiMessageCircle size={15} /></span> Voce chama o cliente</div>
                </div>
            </div>

            <div className="recovery-summary">
                <div className="summary-card">
                    <span><FiMessageCircle size={18} /></span>
                    <div>
                        <strong>{whatsappRecoveries.length}</strong>
                        <small>Pix pendentes com WhatsApp</small>
                    </div>
                </div>
                <div className="summary-card">
                    <span><FiShield size={18} /></span>
                    <div>
                        <strong>Manual</strong>
                        <small>sem custo de API ou template Meta</small>
                    </div>
                </div>
                <div className="summary-card">
                    <span><FiCheckCircle size={18} /></span>
                    <div>
                        <strong>Auto</strong>
                        <small>sai da lista quando o Pix for pago</small>
                    </div>
                </div>
            </div>

            <div className="gmail-notice whatsapp-notice">
                <FiZap size={20} />
                <div>
                    <strong>Importante</strong>
                    <p>
                        Esta recuperacao nao envia mensagem sozinha. O botao abre o WhatsApp com uma mensagem pronta para voce revisar e enviar ao cliente.
                    </p>
                </div>
            </div>

            {whatsappRecoveries.length === 0 ? (
                <div className="glass-card empty-state">
                    <FiMessageCircle size={42} />
                    <h3>Nenhum Pix pendente com WhatsApp</h3>
                    <p>Quando um cliente gerar Pix em um produto com campo WhatsApp ativo, ele aparecera aqui enquanto estiver pendente.</p>
                </div>
            ) : <div className="whatsapp-list">
                {whatsappRecoveries.map(recovery => (
                    <div key={recovery.id} className="glass-card whatsapp-card">
                        <div className="whatsapp-buyer">
                            <div className="whatsapp-icon">
                                <FiMessageCircle size={19} />
                            </div>
                            <div>
                                <div className="product-title-row">
                                    <h3>{recovery.buyer_name || 'Cliente sem nome'}</h3>
                                    <span className="status-pill enabled">Pix pendente</span>
                                </div>
                                <div className="product-meta">
                                    <span>{formatPhone(recovery.buyer_phone)}</span>
                                    <span>{recovery.product_name}</span>
                                    <span>R$ {String(recovery.amount_display).replace('.', ',')}</span>
                                    <span>Gerado em {formatDate(recovery.created_at)}</span>
                                </div>
                                {recovery.buyer_email && <div className="buyer-email">{recovery.buyer_email}</div>}
                            </div>
                        </div>
                        <a className="btn-primary whatsapp-button" href={whatsappUrl(recovery)} target="_blank" rel="noopener noreferrer">
                            <FiExternalLink size={14} /> Chamar no WhatsApp
                        </a>
                    </div>
                ))}
            </div>}
            </>}
            <style jsx>{`
                .recovery-tabs {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px;
                    margin-bottom: 18px;
                    border: 1px solid rgba(255,255,255,0.10);
                    border-radius: 14px;
                    background: rgba(255,255,255,0.04);
                }
                .recovery-tabs button {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    min-height: 40px;
                    padding: 0 16px;
                    border: 0;
                    border-radius: 10px;
                    color: var(--text-secondary);
                    background: transparent;
                    font-size: 13px;
                    font-weight: 900;
                    cursor: pointer;
                    transition: all 0.18s ease;
                }
                .recovery-tabs button.active {
                    color: var(--text-primary);
                    background: rgba(108,92,231,0.24);
                }
                .recovery-tabs button span {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 22px;
                    height: 22px;
                    padding: 0 7px;
                    border-radius: 999px;
                    background: #25d366;
                    color: #07120b;
                    font-size: 11px;
                    font-weight: 900;
                }
                .recovery-hero {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) 340px;
                    gap: 22px;
                    align-items: stretch;
                    padding: 28px;
                    margin-bottom: 18px;
                    border: 1px solid rgba(255,255,255,0.10);
                    border-radius: 18px;
                    background:
                        linear-gradient(135deg, rgba(108,92,231,0.20), rgba(0,206,201,0.08)),
                        var(--bg-secondary);
                    box-shadow: 0 22px 60px rgba(0,0,0,0.22);
                    overflow: hidden;
                }
                .recovery-hero-copy h1 {
                    font-size: 32px;
                    line-height: 1.1;
                    font-weight: 800;
                    margin: 10px 0 10px;
                    color: var(--text-primary);
                }
                .recovery-hero-copy p {
                    color: var(--text-secondary);
                    font-size: 15px;
                    line-height: 1.7;
                    max-width: 780px;
                    margin: 0;
                }
                .hero-kicker {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 7px 11px;
                    border-radius: 999px;
                    background: rgba(255,255,255,0.08);
                    color: var(--accent-secondary);
                    font-size: 12px;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0;
                }
                .whatsapp-kicker {
                    color: #25d366;
                }
                .whatsapp-hero {
                    background:
                        linear-gradient(135deg, rgba(37,211,102,0.18), rgba(108,92,231,0.10)),
                        var(--bg-secondary);
                }
                .hero-steps {
                    display: grid;
                    gap: 10px;
                    align-content: center;
                }
                .hero-steps div {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 13px 14px;
                    border: 1px solid rgba(255,255,255,0.10);
                    border-radius: 12px;
                    background: rgba(10,10,14,0.34);
                    color: var(--text-primary);
                    font-size: 13px;
                    font-weight: 700;
                }
                .hero-steps span,
                .summary-card span,
                .product-icon {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 34px;
                    height: 34px;
                    border-radius: 10px;
                    background: rgba(108,92,231,0.16);
                    color: var(--accent-secondary);
                    flex-shrink: 0;
                }
                .recovery-summary {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 14px;
                    margin-bottom: 16px;
                }
                .summary-card {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 16px;
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 14px;
                    background: rgba(255,255,255,0.035);
                }
                .summary-card strong {
                    display: block;
                    color: var(--text-primary);
                    font-size: 20px;
                    line-height: 1;
                    margin-bottom: 4px;
                }
                .summary-card small {
                    color: var(--text-muted);
                    font-size: 12px;
                }
                .gmail-notice {
                    display: flex;
                    gap: 14px;
                    align-items: flex-start;
                    padding: 18px 20px;
                    margin-bottom: 22px;
                    border: 1px solid rgba(0,206,201,0.18);
                    border-radius: 14px;
                    background: rgba(0,206,201,0.055);
                    color: var(--text-secondary);
                }
                .whatsapp-notice {
                    border-color: rgba(37,211,102,0.22);
                    background: rgba(37,211,102,0.055);
                }
                .whatsapp-list {
                    display: grid;
                    gap: 14px;
                }
                .whatsapp-card {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) auto;
                    gap: 18px;
                    align-items: center;
                    padding: 18px;
                    border-radius: 14px;
                }
                .whatsapp-buyer {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    min-width: 0;
                }
                .whatsapp-icon {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 42px;
                    height: 42px;
                    border-radius: 13px;
                    background: rgba(37,211,102,0.14);
                    color: #25d366;
                    flex-shrink: 0;
                }
                .buyer-email {
                    color: var(--text-muted);
                    font-size: 12px;
                    margin-top: 6px;
                }
                .whatsapp-button {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 7px;
                    min-height: 42px;
                    padding: 10px 14px;
                    text-decoration: none;
                    white-space: nowrap;
                }
                .gmail-notice > svg {
                    color: var(--accent-secondary);
                    flex-shrink: 0;
                    margin-top: 2px;
                }
                .gmail-notice strong {
                    display: block;
                    color: var(--text-primary);
                    margin-bottom: 4px;
                }
                .gmail-notice p {
                    margin: 0;
                    font-size: 13px;
                    line-height: 1.6;
                }
                .empty-state {
                    text-align: center;
                    padding: 58px 24px;
                }
                .empty-state svg {
                    color: var(--text-muted);
                    opacity: 0.45;
                    margin-bottom: 14px;
                }
                .empty-state h3 {
                    margin: 0 0 6px;
                    color: var(--text-primary);
                    font-size: 18px;
                }
                .empty-state p {
                    margin: 0;
                    color: var(--text-secondary);
                }
                .recovery-card {
                    padding: 18px;
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) auto;
                    gap: 18px;
                    align-items: center;
                    border-radius: 14px;
                    transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
                }
                .recovery-card:hover {
                    transform: translateY(-1px);
                    border-color: rgba(108,92,231,0.28);
                    background: rgba(255,255,255,0.045);
                }
                .product-main {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    min-width: 0;
                }
                .product-title-row {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    flex-wrap: wrap;
                    margin-bottom: 7px;
                }
                .product-title-row h3 {
                    margin: 0;
                    color: var(--text-primary);
                    font-size: 16px;
                    font-weight: 800;
                    line-height: 1.25;
                }
                .status-pill {
                    display: inline-flex;
                    align-items: center;
                    padding: 4px 9px;
                    border-radius: 999px;
                    background: rgba(255,255,255,0.06);
                    color: var(--text-muted);
                    font-size: 11px;
                    font-weight: 800;
                }
                .status-pill.enabled {
                    background: rgba(85,239,196,0.12);
                    color: #55efc4;
                }
                .product-meta {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    flex-wrap: wrap;
                    color: var(--text-muted);
                    font-size: 12px;
                }
                .product-meta span {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                }
                .product-actions {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    flex-wrap: wrap;
                    justify-content: flex-end;
                }
                .delay-control {
                    display: grid;
                    gap: 6px;
                    color: var(--text-secondary);
                    font-size: 12px;
                    font-weight: 700;
                }
                .delay-control span {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                }
                .delay-control select {
                    width: 165px;
                    padding: 9px;
                }
                .toggle-control {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    min-height: 40px;
                    padding: 0 12px;
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 10px;
                    color: var(--text-primary);
                    background: rgba(255,255,255,0.03);
                    font-size: 13px;
                    font-weight: 800;
                    white-space: nowrap;
                }
                .toggle-control input {
                    width: 18px;
                    height: 18px;
                    accent-color: var(--accent-primary);
                }
                .save-button {
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                    min-height: 40px;
                    padding: 10px 14px;
                    white-space: nowrap;
                }
                @media (max-width: 980px) {
                    .recovery-hero {
                        grid-template-columns: 1fr;
                    }
                    .recovery-summary {
                        grid-template-columns: 1fr;
                    }
                }
                @media (max-width: 780px) {
                    .recovery-card {
                        grid-template-columns: 1fr;
                    }
                    .whatsapp-card {
                        grid-template-columns: 1fr;
                    }
                    .whatsapp-button {
                        width: 100%;
                    }
                    .recovery-tabs {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                    }
                    .product-actions {
                        justify-content: stretch;
                    }
                    .delay-control,
                    .delay-control select,
                    .toggle-control,
                    .save-button {
                        width: 100%;
                    }
                    .recovery-hero {
                        padding: 22px;
                    }
                    .recovery-hero-copy h1 {
                        font-size: 26px;
                    }
                }
            `}</style>
        </div>
    );
}
