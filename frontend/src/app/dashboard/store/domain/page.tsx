'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
    FiCheck,
    FiCheckCircle,
    FiClock,
    FiCopy,
    FiExternalLink,
    FiGlobe,
    FiInfo,
    FiLink,
    FiRefreshCw,
    FiShield,
    FiTrash2
} from 'react-icons/fi';
import toast from 'react-hot-toast';

type DnsRecord = {
    type: 'CNAME' | 'TXT';
    name: string;
    value: string;
    purpose: 'routing' | 'verification';
    proxied?: boolean;
};

type StoreDomain = {
    id: string;
    domain: string;
    status: 'pending' | 'active' | 'error';
    verified: boolean;
    verification_records: DnsRecord[];
    dns_records: DnsRecord[];
    last_error?: string | null;
    verified_at?: string | null;
    provider?: 'vercel' | 'cloudflare';
    hostname_status?: string | null;
    ssl_status?: string | null;
};

type DomainResponse = {
    domain: StoreDomain | null;
    integration_configured?: boolean;
    migration_required?: boolean;
    reconnect_required?: boolean;
    message?: string;
    error?: string;
};

function authHeaders(json = false): HeadersInit {
    return {
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        ...(json ? { 'Content-Type': 'application/json' } : {})
    };
}

async function readResponse(response: Response): Promise<DomainResponse> {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Não foi possível concluir esta ação.');
    return data;
}

export default function StoreDomainPage() {
    const [domain, setDomain] = useState<StoreDomain | null>(null);
    const [domainInput, setDomainInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [action, setAction] = useState<'connect' | 'verify' | 'remove' | null>(null);
    const [integrationConfigured, setIntegrationConfigured] = useState(true);
    const [migrationRequired, setMigrationRequired] = useState(false);
    const [reconnectRequired, setReconnectRequired] = useState(false);

    const loadDomain = useCallback(async () => {
        try {
            const response = await fetch('/api/store-domain', { headers: authHeaders(), cache: 'no-store' });
            const data = await readResponse(response);
            setDomain(data.domain);
            setIntegrationConfigured(data.integration_configured !== false);
            setMigrationRequired(Boolean(data.migration_required));
            setReconnectRequired(Boolean(data.reconnect_required));
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao carregar o domínio.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // The state updates occur only after the request resolves.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadDomain();
    }, [loadDomain]);

    async function connectDomain(event: FormEvent) {
        event.preventDefault();
        if (!domainInput.trim()) return toast.error('Informe o domínio da sua loja.');
        setAction('connect');
        try {
            const response = await fetch('/api/store-domain', {
                method: 'POST',
                headers: authHeaders(true),
                body: JSON.stringify({ domain: domainInput })
            });
            const data = await readResponse(response);
            setDomain(data.domain);
            setDomainInput('');
            setReconnectRequired(false);
            toast.success(data.message || 'Domínio adicionado.');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao conectar domínio.');
        } finally {
            setAction(null);
        }
    }

    async function verifyDomain() {
        setAction('verify');
        try {
            const response = await fetch('/api/store-domain', { method: 'PUT', headers: authHeaders() });
            const data = await readResponse(response);
            setDomain(data.domain);
            if (data.domain?.status === 'active') toast.success(data.message || 'Domínio ativo!');
            else toast(data.message || 'DNS ainda em propagação.', { icon: '⏳' });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao verificar domínio.');
        } finally {
            setAction(null);
        }
    }

    async function removeDomain() {
        if (!window.confirm('Remover este domínio da loja? A URL original continuará funcionando.')) return;
        setAction('remove');
        try {
            const response = await fetch('/api/store-domain', { method: 'DELETE', headers: authHeaders() });
            const data = await readResponse(response);
            setDomain(null);
            setReconnectRequired(false);
            toast.success(data.message || 'Domínio removido.');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao remover domínio.');
        } finally {
            setAction(null);
        }
    }

    async function copy(value: string) {
        await navigator.clipboard.writeText(value);
        toast.success('Copiado!');
    }

    const records = domain
        ? [...(domain.dns_records || []), ...(domain.verification_records || [])]
        : [];
    const active = domain?.provider === 'cloudflare' && domain?.status === 'active' && domain.verified;

    if (loading) {
        return (
            <div className="domain-loading">
                <FiRefreshCw className="spin" /> Carregando domínio...
                <style jsx>{pageStyles}</style>
            </div>
        );
    }

    return (
        <div className="domain-page">
            <section className="domain-hero">
                <div className="domain-hero-icon"><FiGlobe /></div>
                <div>
                    <span className="eyebrow">ENDEREÇO DA SUA MARCA</span>
                    <h2>Use seu próprio domínio</h2>
                    <p>Conecte um domínio ou subdomínio à sua vitrine. O link original da GouPay continua disponível como alternativa.</p>
                </div>
                <div className="security-pill"><FiShield /> Conexão protegida com SSL</div>
            </section>

            {migrationRequired && (
                <div className="notice error"><FiInfo /><div><strong>Banco de dados ainda não preparado</strong><span>Execute a migration <code>031_migrate_store_domains_to_cloudflare.sql</code> no Supabase.</span></div></div>
            )}
            {!integrationConfigured && (
                <div className="notice error"><FiInfo /><div><strong>Integração da Cloudflare pendente</strong><span>Configure o token, Zone ID, CNAME técnico e segredo do Worker nas variáveis do servidor.</span></div></div>
            )}
            {reconnectRequired && (
                <div className="notice warning"><FiRefreshCw /><div><strong>Reconexão necessária</strong><span>Este endereço ainda pertence à integração antiga da Vercel. Remova-o abaixo e conecte novamente para migrar para a Cloudflare.</span></div></div>
            )}

            {!domain ? (
                <div className="domain-grid">
                    <section className="domain-card connect-card">
                        <div className="card-heading">
                            <span className="step-number">01</span>
                            <div><h3>Informe seu endereço</h3><p>Pode ser o domínio principal ou um subdomínio.</p></div>
                        </div>
                        <form onSubmit={connectDomain}>
                            <label htmlFor="custom-domain">Domínio da loja</label>
                            <div className="domain-input">
                                <FiLink />
                                <span>https://</span>
                                <input
                                    id="custom-domain"
                                    value={domainInput}
                                    onChange={event => setDomainInput(event.target.value)}
                                    placeholder="minhaloja.com.br"
                                    maxLength={253}
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    spellCheck={false}
                                    disabled={Boolean(action) || migrationRequired || !integrationConfigured}
                                />
                            </div>
                            <p className="field-help">Informe somente o endereço, sem páginas ou caminhos. Ex.: <strong>loja.seudominio.com.br</strong></p>
                            <button className="primary-button" disabled={Boolean(action) || migrationRequired || !integrationConfigured}>
                                {action === 'connect' ? <FiRefreshCw className="spin" /> : <FiGlobe />}
                                {action === 'connect' ? 'Conectando...' : 'Conectar domínio'}
                            </button>
                        </form>
                    </section>

                    <section className="domain-card process-card">
                        <span className="eyebrow">ANTES DE CONECTAR</span>
                        <h3>Prepare o domínio na Cloudflare</h3>
                        <div className="process-list">
                            <div><span>1</span><p><strong>Adicione o site à Cloudflare</strong>Crie uma conta gratuita e informe o domínio comprado.</p></div>
                            <div><span>2</span><p><strong>Troque os nameservers</strong>Copie os dois servidores fornecidos pela Cloudflare para a GoDaddy ou seu registrador.</p></div>
                            <div><span>3</span><p><strong>Conecte na GouPay</strong>Depois que a Cloudflare mostrar o domínio como ativo, informe-o ao lado.</p></div>
                        </div>
                        <div className="provider-note"><FiCheckCircle /> A hospedagem do domínio pode ser GoDaddy, Registro.br, Hostinger ou qualquer registrador que permita alterar nameservers.</div>
                    </section>
                </div>
            ) : (
                <div className="configured-layout">
                    <section className={`domain-status ${active ? 'active' : 'pending'}`}>
                        <div className="status-icon">{active ? <FiCheck /> : <FiClock />}</div>
                        <div className="status-copy">
                            <span>{active ? 'DOMÍNIO ATIVO' : 'AGUARDANDO CONFIGURAÇÃO'}</span>
                            <h3>{domain.domain}</h3>
                            <p>{active ? 'Sua loja já está respondendo neste endereço.' : 'Adicione os registros abaixo no DNS do domínio e depois verifique.'}</p>
                        </div>
                        <div className="status-actions">
                            {active && <a href={`https://${domain.domain}`} target="_blank" rel="noreferrer"><FiExternalLink /> Abrir loja</a>}
                            {!reconnectRequired && <button onClick={verifyDomain} disabled={Boolean(action)}><FiRefreshCw className={action === 'verify' ? 'spin' : ''} /> Verificar agora</button>}
                        </div>
                    </section>

                    <section className="domain-card dns-card">
                        <div className="dns-heading">
                            <div><span className="eyebrow">ETAPA 02</span><h3>Registros DNS</h3><p>Cadastre exatamente estes valores no local onde o DNS do seu domínio é administrado.</p></div>
                            <div className="dns-badge"><FiShield /> Dados oficiais</div>
                        </div>

                        <div className="dns-table">
                            <div className="dns-table-head"><span>Tipo</span><span>Nome / Host</span><span>Valor / Destino</span><span></span></div>
                            {records.map((record, index) => (
                                <div className="dns-row" key={`${record.type}-${record.name}-${index}`}>
                                    <div className="record-meta">
                                        <span className={`record-type ${record.type.toLowerCase()}`}>{record.type}</span>
                                        {record.purpose === 'routing' && <small>{record.proxied === false ? 'DNS somente' : 'Proxy ligado'}</small>}
                                    </div>
                                    <code>{record.name}</code>
                                    <code className="record-value">{record.value}</code>
                                    <button aria-label={`Copiar registro ${record.type}`} onClick={() => copy(record.value)}><FiCopy /></button>
                                </div>
                            ))}
                        </div>

                        {records.length === 0 && <div className="empty-records">Nenhum registro adicional foi solicitado. Clique em verificar novamente.</div>}
                        <div className="dns-tip"><FiInfo /><span>Adicione estes registros na aba <strong>DNS</strong> da Cloudflare. O nome completo funciona tanto para domínio principal quanto para subdomínio. No CNAME da loja, mantenha a nuvem laranja ativada.</span></div>
                    </section>

                    {domain.last_error && <div className="notice warning"><FiClock /><div><strong>DNS ainda não reconhecido</strong><span>{domain.last_error}</span></div></div>}

                    <section className="danger-zone">
                        <div><strong>Desconectar domínio</strong><p>Isso não apaga sua loja e não altera o link original da GouPay.</p></div>
                        <button onClick={removeDomain} disabled={Boolean(action)}><FiTrash2 /> {action === 'remove' ? 'Removendo...' : 'Remover domínio'}</button>
                    </section>
                </div>
            )}

            <style jsx>{pageStyles}</style>
        </div>
    );
}

const pageStyles = `
    .domain-page { display: grid; gap: 18px; padding-bottom: 36px; }
    .domain-loading { min-height: 260px; display: flex; align-items: center; justify-content: center; gap: 10px; color: var(--text-muted); }
    .domain-hero { position: relative; overflow: hidden; display: flex; align-items: center; gap: 18px; padding: 26px; border: 1px solid var(--border-color); border-radius: 22px; background: linear-gradient(125deg, var(--bg-card) 55%, rgba(108,92,231,.13)); }
    .domain-hero:after { content: ''; position: absolute; width: 220px; height: 220px; right: -80px; top: -120px; border-radius: 50%; background: rgba(108,92,231,.12); filter: blur(8px); }
    .domain-hero-icon { width: 58px; height: 58px; border-radius: 18px; display: grid; place-items: center; flex: 0 0 auto; font-size: 25px; color: #fff; background: linear-gradient(135deg, #6c5ce7, #8b5cf6); box-shadow: 0 12px 28px rgba(108,92,231,.25); }
    .domain-hero h2 { margin: 3px 0 6px; font-size: 23px; color: var(--text-primary); }
    .domain-hero p { max-width: 700px; margin: 0; color: var(--text-secondary); font-size: 13px; line-height: 1.55; }
    .eyebrow { color: var(--accent-primary); font-size: 10px; font-weight: 900; letter-spacing: .12em; }
    .security-pill { position: relative; z-index: 1; margin-left: auto; display: flex; align-items: center; gap: 7px; white-space: nowrap; padding: 9px 12px; border: 1px solid rgba(34,197,94,.2); border-radius: 999px; color: #16a34a; background: rgba(34,197,94,.08); font-size: 11px; font-weight: 750; }
    .domain-grid { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(330px, .8fr); gap: 18px; }
    .domain-card { border: 1px solid var(--border-color); border-radius: 20px; padding: 24px; background: var(--bg-card); }
    .card-heading { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 24px; }
    .step-number { width: 34px; height: 34px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 10px; color: var(--accent-primary); background: rgba(108,92,231,.1); font-size: 11px; font-weight: 900; }
    .domain-card h3 { margin: 0 0 5px; font-size: 17px; color: var(--text-primary); }
    .domain-card p { margin: 0; color: var(--text-muted); font-size: 12px; }
    form label { display: block; margin-bottom: 8px; color: var(--text-secondary); font-size: 11px; font-weight: 750; }
    .domain-input { height: 54px; display: flex; align-items: center; gap: 8px; padding: 0 15px; border: 1px solid var(--border-color); border-radius: 14px; background: var(--bg-secondary); color: var(--text-muted); transition: border-color .2s, box-shadow .2s; }
    .domain-input:focus-within { border-color: var(--accent-primary); box-shadow: 0 0 0 3px rgba(108,92,231,.1); }
    .domain-input input { min-width: 0; flex: 1; border: 0; outline: 0; color: var(--text-primary); background: transparent; font-size: 14px; }
    .field-help { margin: 9px 0 18px !important; line-height: 1.5; }
    .primary-button { width: 100%; height: 46px; border: 0; border-radius: 13px; display: flex; align-items: center; justify-content: center; gap: 8px; color: #fff; background: linear-gradient(135deg, #6c5ce7, #7c3aed); font-weight: 800; cursor: pointer; box-shadow: 0 8px 20px rgba(108,92,231,.2); }
    button:disabled { opacity: .55; cursor: not-allowed; }
    .process-card { background: linear-gradient(150deg, var(--bg-card), rgba(108,92,231,.06)); }
    .process-card > h3 { margin: 5px 0 22px; }
    .process-list { display: grid; gap: 15px; }
    .process-list > div { display: flex; gap: 11px; }
    .process-list > div > span { width: 26px; height: 26px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 8px; background: var(--bg-secondary); color: var(--accent-primary); font-size: 10px; font-weight: 900; }
    .process-list p { line-height: 1.5; }
    .process-list strong { display: block; margin-bottom: 1px; color: var(--text-primary); font-size: 12px; }
    .provider-note { margin-top: 22px; padding: 13px; display: flex; align-items: flex-start; gap: 8px; border-radius: 12px; color: var(--text-secondary); background: var(--bg-secondary); font-size: 11px; line-height: 1.45; }
    .provider-note svg { flex: 0 0 auto; color: #22c55e; }
    .notice { display: flex; gap: 11px; align-items: flex-start; padding: 14px 16px; border-radius: 14px; font-size: 12px; }
    .notice svg { margin-top: 2px; flex: 0 0 auto; }
    .notice strong, .notice span { display: block; }
    .notice strong { margin-bottom: 3px; }
    .notice.error { border: 1px solid rgba(239,68,68,.2); color: #dc2626; background: rgba(239,68,68,.07); }
    .notice.warning { border: 1px solid rgba(245,158,11,.22); color: #d97706; background: rgba(245,158,11,.08); }
    .configured-layout { display: grid; gap: 16px; }
    .domain-status { display: flex; align-items: center; gap: 16px; padding: 21px 23px; border: 1px solid var(--border-color); border-radius: 19px; background: var(--bg-card); }
    .domain-status.active { border-color: rgba(34,197,94,.25); background: linear-gradient(120deg, var(--bg-card), rgba(34,197,94,.07)); }
    .domain-status.pending { border-color: rgba(245,158,11,.25); background: linear-gradient(120deg, var(--bg-card), rgba(245,158,11,.06)); }
    .status-icon { width: 45px; height: 45px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 14px; font-size: 20px; color: #d97706; background: rgba(245,158,11,.11); }
    .active .status-icon { color: #16a34a; background: rgba(34,197,94,.11); }
    .status-copy span { color: #d97706; font-size: 9px; font-weight: 900; letter-spacing: .12em; }
    .active .status-copy span { color: #16a34a; }
    .status-copy h3 { margin: 2px 0 4px; color: var(--text-primary); font-size: 18px; }
    .status-copy p { margin: 0; color: var(--text-muted); font-size: 11px; }
    .status-actions { margin-left: auto; display: flex; gap: 9px; }
    .status-actions a, .status-actions button { height: 38px; padding: 0 13px; border: 1px solid var(--border-color); border-radius: 11px; display: inline-flex; align-items: center; gap: 7px; text-decoration: none; color: var(--text-secondary); background: var(--bg-card); font-size: 11px; font-weight: 750; cursor: pointer; }
    .status-actions a { color: #16a34a; border-color: rgba(34,197,94,.25); }
    .dns-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin-bottom: 20px; }
    .dns-heading h3 { margin-top: 4px; }
    .dns-heading p { max-width: 620px; line-height: 1.5; }
    .dns-badge { display: flex; align-items: center; gap: 6px; padding: 8px 10px; border-radius: 10px; color: var(--accent-primary); background: rgba(108,92,231,.08); font-size: 10px; font-weight: 800; white-space: nowrap; }
    .dns-table { border: 1px solid var(--border-color); border-radius: 14px; overflow: hidden; }
    .dns-table-head, .dns-row { display: grid; grid-template-columns: 80px minmax(130px,.65fr) minmax(220px,1.35fr) 40px; align-items: center; gap: 12px; padding: 11px 13px; }
    .dns-table-head { color: var(--text-muted); background: var(--bg-secondary); font-size: 9px; font-weight: 850; text-transform: uppercase; letter-spacing: .06em; }
    .dns-row + .dns-row { border-top: 1px solid var(--border-color); }
    .dns-row code { overflow: hidden; color: var(--text-secondary); font-size: 11px; white-space: nowrap; text-overflow: ellipsis; }
    .record-type { width: fit-content; padding: 5px 7px; border-radius: 7px; color: #2563eb; background: rgba(59,130,246,.1); font-size: 9px; font-weight: 900; }
    .record-type.txt { color: #7c3aed; background: rgba(124,58,237,.1); }
    .record-meta { min-width: 0; display: grid; justify-items: start; gap: 4px; }
    .record-meta small { color: #16a34a; font-size: 8px; font-weight: 800; white-space: nowrap; }
    .dns-row button { width: 32px; height: 32px; display: grid; place-items: center; border: 1px solid var(--border-color); border-radius: 9px; color: var(--text-muted); background: var(--bg-card); cursor: pointer; }
    .dns-row button:hover { color: var(--accent-primary); border-color: rgba(108,92,231,.35); }
    .dns-tip { margin-top: 14px; display: flex; align-items: flex-start; gap: 8px; color: var(--text-muted); font-size: 10px; line-height: 1.5; }
    .dns-tip svg { margin-top: 2px; flex: 0 0 auto; color: var(--accent-primary); }
    .empty-records { padding: 18px; color: var(--text-muted); text-align: center; font-size: 11px; }
    .danger-zone { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 17px 20px; border: 1px solid rgba(239,68,68,.16); border-radius: 16px; background: var(--bg-card); }
    .danger-zone strong { display: block; margin-bottom: 3px; color: var(--text-primary); font-size: 12px; }
    .danger-zone p { margin: 0; color: var(--text-muted); font-size: 10px; }
    .danger-zone button { height: 36px; padding: 0 12px; border: 1px solid rgba(239,68,68,.2); border-radius: 10px; display: flex; align-items: center; gap: 7px; color: #dc2626; background: rgba(239,68,68,.06); font-size: 10px; font-weight: 800; cursor: pointer; }
    :global(.spin) { animation: domain-spin .8s linear infinite; }
    @keyframes domain-spin { to { transform: rotate(360deg); } }
    @media (max-width: 900px) {
        .domain-grid { grid-template-columns: 1fr; }
        .security-pill { display: none; }
        .dns-table-head { display: none; }
        .dns-row { grid-template-columns: 65px minmax(0,.8fr) minmax(0,1.2fr) 36px; }
    }
    @media (max-width: 640px) {
        .domain-hero { align-items: flex-start; padding: 20px; }
        .domain-hero-icon { width: 45px; height: 45px; border-radius: 14px; }
        .domain-hero h2 { font-size: 19px; }
        .domain-card { padding: 18px; }
        .domain-status { align-items: flex-start; flex-wrap: wrap; }
        .status-actions { width: 100%; margin-left: 0; }
        .status-actions a, .status-actions button { flex: 1; justify-content: center; }
        .dns-heading { display: block; }
        .dns-badge { width: fit-content; margin-top: 12px; }
        .dns-row { position: relative; grid-template-columns: 50px minmax(0,1fr) 34px; gap: 8px; }
        .dns-row code:first-of-type { grid-column: 2; }
        .dns-row .record-value { grid-column: 1 / 4; grid-row: 2; padding-top: 8px; border-top: 1px dashed var(--border-color); }
        .dns-row button { grid-column: 3; grid-row: 1; }
        .danger-zone { align-items: flex-start; flex-direction: column; }
    }
`;
