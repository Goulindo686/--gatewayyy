'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import {
    FiCheck,
    FiCheckCircle,
    FiClipboard,
    FiDownload,
    FiKey,
    FiLock,
    FiRefreshCw,
    FiShield,
    FiSmartphone,
    FiTrash2,
    FiX,
} from 'react-icons/fi';
import { authAPI } from '@/lib/api';

type FactorStatus = {
    enabled: boolean;
    confirmed_at: string | null;
    recovery_codes_remaining: number;
};

type SetupData = {
    secret: string;
    otpauth_uri: string;
};

const emptyStatus: FactorStatus = { enabled: false, confirmed_at: null, recovery_codes_remaining: 0 };

export default function TwoFactorSettings() {
    const [status, setStatus] = useState<FactorStatus>(emptyStatus);
    const [loading, setLoading] = useState(true);
    const [setupOpen, setSetupOpen] = useState(false);
    const [setupData, setSetupData] = useState<SetupData | null>(null);
    const [setupPassword, setSetupPassword] = useState('');
    const [setupCode, setSetupCode] = useState('');
    const [setupLoading, setSetupLoading] = useState(false);
    const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
    const [codesSaved, setCodesSaved] = useState(false);
    const [action, setAction] = useState<'disable' | 'recovery' | null>(null);
    const [actionPassword, setActionPassword] = useState('');
    const [actionCode, setActionCode] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [actionRecoveryCodes, setActionRecoveryCodes] = useState<string[]>([]);

    useEffect(() => {
        void loadStatus();
    }, []);

    const loadStatus = async () => {
        try {
            const { data } = await authAPI.getTwoFactorStatus();
            setStatus(data);
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao carregar segurança da conta.');
        } finally {
            setLoading(false);
        }
    };

    const closeSetup = () => {
        if (recoveryCodes.length > 0 && !codesSaved) return;
        setSetupOpen(false);
        setSetupData(null);
        setSetupPassword('');
        setSetupCode('');
        setRecoveryCodes([]);
        setCodesSaved(false);
    };

    const beginSetup = async () => {
        if (!setupPassword) return toast.error('Digite sua senha atual.');
        setSetupLoading(true);
        try {
            const { data } = await authAPI.setupTwoFactor(setupPassword);
            setSetupData(data);
            setSetupPassword('');
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Não foi possível iniciar o 2FA.');
        } finally {
            setSetupLoading(false);
        }
    };

    const confirmSetup = async () => {
        if (setupCode.length !== 6) return toast.error('Digite o código de 6 dígitos.');
        setSetupLoading(true);
        try {
            const { data } = await authAPI.confirmTwoFactor(setupCode);
            setRecoveryCodes(data.recovery_codes || []);
            setStatus({ enabled: true, confirmed_at: data.confirmed_at, recovery_codes_remaining: data.recovery_codes?.length || 0 });
            toast.success('Autenticação em duas etapas ativada!');
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Código inválido.');
            setSetupCode('');
        } finally {
            setSetupLoading(false);
        }
    };

    const copyText = async (value: string, successMessage: string) => {
        try {
            await navigator.clipboard.writeText(value);
            toast.success(successMessage);
        } catch {
            toast.error('Não foi possível copiar automaticamente.');
        }
    };

    const downloadRecoveryCodes = (codes: string[]) => {
        const content = [
            'GouPay - Codigos de recuperacao 2FA',
            'Cada codigo pode ser usado somente uma vez.',
            '',
            ...codes,
        ].join('\n');
        const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'goupay-codigos-recuperacao.txt';
        link.click();
        URL.revokeObjectURL(url);
    };

    const runAction = async () => {
        if (!actionCode) return toast.error('Digite o código do autenticador ou de recuperação.');
        if (action === 'disable' && !actionPassword) return toast.error('Digite sua senha atual.');

        setActionLoading(true);
        try {
            if (action === 'disable') {
                await authAPI.disableTwoFactor({ password: actionPassword, code: actionCode });
                setStatus(emptyStatus);
                setAction(null);
                toast.success('Autenticação em duas etapas desativada.');
            } else {
                const { data } = await authAPI.regenerateTwoFactorRecoveryCodes(actionCode);
                const codes = data.recovery_codes || [];
                setActionRecoveryCodes(codes);
                setStatus((current) => ({ ...current, recovery_codes_remaining: codes.length }));
                toast.success('Novos códigos gerados. Os anteriores foram invalidados.');
            }
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Não foi possível concluir a operação.');
        } finally {
            setActionLoading(false);
            setActionCode('');
            setActionPassword('');
        }
    };

    const closeAction = () => {
        setAction(null);
        setActionCode('');
        setActionPassword('');
        setActionRecoveryCodes([]);
    };

    const enabledDate = status.confirmed_at
        ? new Date(status.confirmed_at).toLocaleDateString('pt-BR')
        : null;

    return (
        <>
            <section className={`factorSettings ${status.enabled ? 'enabled' : ''}`}>
                <div className="factorTop">
                    <div className="factorHeading">
                        <div className="factorShield"><FiShield size={24} /></div>
                        <div>
                            <div className="factorTitleLine">
                                <h2>Autenticação em duas etapas</h2>
                                <span className={status.enabled ? 'activeBadge' : 'optionalBadge'}>
                                    {status.enabled ? <><FiCheckCircle size={12} /> Ativo</> : 'Opcional'}
                                </span>
                            </div>
                            <p>Proteja sua conta com um código temporário além da senha.</p>
                        </div>
                    </div>

                    {!loading && !status.enabled && (
                        <button className="primaryAction" type="button" onClick={() => setSetupOpen(true)}>
                            <FiSmartphone size={16} /> Ativar 2FA
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="factorSkeleton" />
                ) : status.enabled ? (
                    <div className="enabledPanel">
                        <div className="enabledInfo">
                            <div><FiCheck size={16} /><span><strong>Proteção ligada</strong><small>{enabledDate ? `Desde ${enabledDate}` : 'Configurada'}</small></span></div>
                            <div><FiKey size={16} /><span><strong>{status.recovery_codes_remaining} códigos</strong><small>Recuperação restante</small></span></div>
                            <div><FiSmartphone size={16} /><span><strong>Compatível</strong><small>Qualquer app TOTP</small></span></div>
                        </div>
                        <div className="enabledActions">
                            <button type="button" onClick={() => setAction('recovery')}><FiRefreshCw size={14} /> Novos códigos</button>
                            <button type="button" className="dangerAction" onClick={() => setAction('disable')}><FiTrash2 size={14} /> Desativar</button>
                        </div>
                    </div>
                ) : (
                    <div className="compatibilityRow">
                        <span>Google Authenticator</span>
                        <span>Microsoft Authenticator</span>
                        <span>Authy</span>
                        <span>1Password</span>
                    </div>
                )}

                <div className="factorFoot"><FiLock size={13} /> O segredo é criptografado e nunca aparece novamente depois da ativação.</div>
            </section>

            {setupOpen && (
                <div className="modalOverlay">
                    <section className="setupModal" role="dialog" aria-modal="true" aria-label="Configurar autenticação em duas etapas">
                        {recoveryCodes.length === 0 && (
                            <button className="modalClose" type="button" onClick={closeSetup} aria-label="Fechar"><FiX size={18} /></button>
                        )}

                        {!setupData && recoveryCodes.length === 0 && (
                            <div className="setupStep passwordStep">
                                <div className="modalIcon"><FiLock size={27} /></div>
                                <span className="stepBadge">Etapa 1 de 3</span>
                                <h3>Confirme que é você</h3>
                                <p>Digite sua senha atual antes de conectar um aplicativo autenticador.</p>
                                <label>Senha atual</label>
                                <input type="password" value={setupPassword} onChange={(event) => setSetupPassword(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void beginSetup(); }} autoFocus />
                                <button className="modalPrimary" type="button" onClick={beginSetup} disabled={setupLoading}>
                                    {setupLoading ? 'Verificando...' : 'Continuar com segurança'}
                                </button>
                            </div>
                        )}

                        {setupData && recoveryCodes.length === 0 && (
                            <div className="setupStep scanStep">
                                <span className="stepBadge">Etapa 2 de 3</span>
                                <h3>Escaneie o QR Code</h3>
                                <p>Abra o Google Authenticator ou outro aplicativo compatível e adicione uma nova conta.</p>
                                <div className="qrShell"><QRCodeSVG value={setupData.otpauth_uri} size={184} level="M" /></div>
                                <div className="manualKey">
                                    <span>Ou use a chave manual</span>
                                    <code>{setupData.secret}</code>
                                    <button type="button" onClick={() => copyText(setupData.secret.replace(/\s/g, ''), 'Chave copiada.')}><FiClipboard size={14} /> Copiar</button>
                                </div>
                                <label>Código mostrado no aplicativo</label>
                                <input className="totpInput" inputMode="numeric" maxLength={6} value={setupCode} onChange={(event) => setSetupCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000 000" autoFocus />
                                <button className="modalPrimary" type="button" onClick={confirmSetup} disabled={setupLoading}>
                                    {setupLoading ? 'Ativando...' : 'Confirmar e ativar 2FA'}
                                </button>
                            </div>
                        )}

                        {recoveryCodes.length > 0 && (
                            <div className="setupStep recoveryStep">
                                <div className="successIcon"><FiCheckCircle size={31} /></div>
                                <span className="stepBadge success">Etapa 3 de 3</span>
                                <h3>Guarde seus códigos</h3>
                                <p>Eles são a única forma de entrar se você perder o celular. Cada código funciona uma vez.</p>
                                <div className="recoveryGrid">{recoveryCodes.map((code) => <code key={code}>{code}</code>)}</div>
                                <div className="recoveryActions">
                                    <button type="button" onClick={() => copyText(recoveryCodes.join('\n'), 'Códigos copiados.')}><FiClipboard size={14} /> Copiar todos</button>
                                    <button type="button" onClick={() => downloadRecoveryCodes(recoveryCodes)}><FiDownload size={14} /> Baixar .txt</button>
                                </div>
                                <label className="savedCheck"><input type="checkbox" checked={codesSaved} onChange={(event) => setCodesSaved(event.target.checked)} /> Salvei os códigos em um local seguro</label>
                                <button className="modalPrimary" type="button" onClick={closeSetup} disabled={!codesSaved}>Concluir configuração</button>
                            </div>
                        )}
                    </section>
                </div>
            )}

            {action && (
                <div className="modalOverlay">
                    <section className="actionModal" role="dialog" aria-modal="true" aria-label={action === 'disable' ? 'Desativar 2FA' : 'Gerar novos códigos'}>
                        <button className="modalClose" type="button" onClick={closeAction} aria-label="Fechar"><FiX size={18} /></button>
                        {actionRecoveryCodes.length > 0 ? (
                            <>
                                <div className="successIcon"><FiCheckCircle size={28} /></div>
                                <h3>Novos códigos gerados</h3>
                                <p>Os códigos anteriores não funcionam mais.</p>
                                <div className="recoveryGrid compact">{actionRecoveryCodes.map((code) => <code key={code}>{code}</code>)}</div>
                                <div className="recoveryActions">
                                    <button type="button" onClick={() => copyText(actionRecoveryCodes.join('\n'), 'Códigos copiados.')}><FiClipboard size={14} /> Copiar</button>
                                    <button type="button" onClick={() => downloadRecoveryCodes(actionRecoveryCodes)}><FiDownload size={14} /> Baixar</button>
                                </div>
                                <button className="modalPrimary" type="button" onClick={closeAction}>Concluir</button>
                            </>
                        ) : (
                            <>
                                <div className={`modalIcon ${action === 'disable' ? 'danger' : ''}`}>{action === 'disable' ? <FiTrash2 size={25} /> : <FiKey size={25} />}</div>
                                <h3>{action === 'disable' ? 'Desativar proteção?' : 'Gerar novos códigos'}</h3>
                                <p>{action === 'disable' ? 'Sua conta voltará a depender somente da senha.' : 'Os códigos atuais serão invalidados imediatamente.'}</p>
                                {action === 'disable' && <><label>Senha atual</label><input type="password" value={actionPassword} onChange={(event) => setActionPassword(event.target.value)} /></>}
                                <label>Código do autenticador ou de recuperação</label>
                                <input value={actionCode} onChange={(event) => setActionCode(event.target.value.toUpperCase().slice(0, 9))} placeholder="000000 ou XXXX-XXXX" />
                                <button className={`modalPrimary ${action === 'disable' ? 'dangerButton' : ''}`} type="button" onClick={runAction} disabled={actionLoading}>
                                    {actionLoading ? 'Confirmando...' : action === 'disable' ? 'Desativar 2FA' : 'Gerar novos códigos'}
                                </button>
                            </>
                        )}
                    </section>
                </div>
            )}

            <style jsx>{`
                .factorSettings { position:relative; overflow:hidden; padding:24px; border:1px solid var(--profile-border,var(--border-color)); border-radius:20px; background:linear-gradient(145deg,var(--profile-card,var(--bg-card)),color-mix(in srgb,var(--profile-card,var(--bg-card)) 94%,#7c3aed 6%)); box-shadow:0 12px 30px rgba(15,23,42,.05); }
                .factorSettings.enabled { border-color:rgba(34,197,139,.34); background:linear-gradient(145deg,var(--profile-card,var(--bg-card)),color-mix(in srgb,var(--profile-card,var(--bg-card)) 94%,#20bd87 6%)); }
                .factorTop { display:flex; align-items:center; justify-content:space-between; gap:18px; }
                .factorHeading { display:flex; align-items:center; gap:14px; min-width:0; }
                .factorShield { width:52px; height:52px; flex:0 0 auto; display:grid; place-items:center; border-radius:16px; color:#fff; background:linear-gradient(145deg,#5b21b6,#8b5cf6); box-shadow:0 12px 25px rgba(109,40,217,.23); }
                .enabled .factorShield { background:linear-gradient(145deg,#07865c,#22c58b); box-shadow:0 12px 25px rgba(15,157,108,.2); }
                .factorTitleLine { display:flex; align-items:center; gap:9px; flex-wrap:wrap; }
                .factorTitleLine h2 { margin:0; font-size:16px; font-weight:950; }
                .factorHeading p { margin:5px 0 0; color:var(--profile-muted,var(--text-secondary)); font-size:12px; line-height:1.5; }
                .activeBadge,.optionalBadge { display:inline-flex; align-items:center; gap:4px; padding:5px 8px; border-radius:999px; font-size:9px; font-weight:900; letter-spacing:.5px; text-transform:uppercase; }
                .activeBadge { color:#087e58; background:rgba(34,197,139,.14); }.optionalBadge { color:#6d28d9; background:rgba(139,92,246,.12); }
                .primaryAction { height:42px; flex:0 0 auto; padding:0 16px; display:flex; align-items:center; gap:8px; border:0; border-radius:13px; background:linear-gradient(135deg,#7c3aed,#5b21b6); color:#fff; font-weight:900; cursor:pointer; box-shadow:0 12px 24px rgba(109,40,217,.22); }
                .compatibilityRow { display:flex; flex-wrap:wrap; gap:8px; margin-top:20px; }.compatibilityRow span { padding:7px 10px; border:1px solid var(--profile-border,var(--border-color)); border-radius:10px; background:var(--bg-secondary); color:var(--profile-muted,var(--text-secondary)); font-size:10px; font-weight:800; }
                .enabledPanel { margin-top:20px; display:flex; align-items:center; justify-content:space-between; gap:18px; padding:16px; border:1px solid rgba(34,197,139,.18); border-radius:15px; background:rgba(34,197,139,.055); }
                .enabledInfo { display:flex; gap:24px; flex-wrap:wrap; }.enabledInfo>div { display:flex; align-items:center; gap:9px; color:#18a776; }.enabledInfo span { display:grid; gap:2px; }.enabledInfo strong { color:var(--text-primary); font-size:11px; }.enabledInfo small { color:var(--profile-muted,var(--text-secondary)); font-size:9px; }
                .enabledActions { display:flex; gap:8px; flex-wrap:wrap; }.enabledActions button { height:35px; display:flex; align-items:center; gap:6px; padding:0 11px; border:1px solid var(--profile-border,var(--border-color)); border-radius:10px; background:var(--bg-card); color:var(--text-primary); font-size:10px; font-weight:850; cursor:pointer; }.enabledActions .dangerAction { color:#e54861; border-color:rgba(229,72,97,.25); }
                .factorFoot { margin-top:17px; display:flex; align-items:center; gap:7px; color:var(--profile-muted,var(--text-secondary)); font-size:9.5px; }.factorSkeleton { height:68px; margin-top:18px; border-radius:14px; background:linear-gradient(90deg,var(--bg-secondary),rgba(139,92,246,.1),var(--bg-secondary)); background-size:200% 100%; animation:shimmer 1.4s infinite; }
                .modalOverlay { position:fixed; inset:0; z-index:10020; display:grid; place-items:center; padding:18px; background:rgba(14,7,32,.68); backdrop-filter:blur(15px) saturate(120%); }
                .setupModal,.actionModal { width:min(100%,500px); max-height:calc(100vh - 32px); overflow:auto; position:relative; padding:32px; border:1px solid rgba(255,255,255,.8); border-radius:27px; background:linear-gradient(150deg,#fff,#faf8ff); box-shadow:0 36px 110px rgba(17,5,48,.42); color:#191329; text-align:center; }
                .actionModal { width:min(100%,430px); }.modalClose { position:absolute; right:16px; top:16px; width:37px; height:37px; display:grid; place-items:center; border:1px solid #ebe6f2; border-radius:12px; background:#fff; color:#8e8698; cursor:pointer; }
                .setupStep,.actionModal { display:grid; justify-items:stretch; }.modalIcon,.successIcon { width:66px; height:66px; margin:0 auto 14px; display:grid; place-items:center; border-radius:20px; color:#fff; background:linear-gradient(145deg,#5b21b6,#8b5cf6); box-shadow:0 14px 29px rgba(109,40,217,.23); }.successIcon { background:linear-gradient(145deg,#089669,#25c88e); }.modalIcon.danger { background:linear-gradient(145deg,#c92e49,#f15c72); }
                .stepBadge { width:max-content; margin:0 auto 8px; padding:5px 9px; border-radius:999px; background:#efe8ff; color:#6d28d9; font-size:9px; font-weight:900; letter-spacing:.7px; text-transform:uppercase; }.stepBadge.success { color:#087e58; background:#e3faF1; }
                .setupModal h3,.actionModal h3 { margin:0; font-size:24px; font-weight:950; letter-spacing:-.5px; }.setupModal p,.actionModal p { margin:9px auto 20px; max-width:390px; color:#776f83; font-size:12px; line-height:1.55; }
                .setupModal label,.actionModal label { margin:9px 0 7px; color:#665e72; text-align:left; font-size:11px; font-weight:850; }.setupModal input:not([type=checkbox]),.actionModal input { width:100%; height:45px; box-sizing:border-box; border:1px solid #ddd5e7; border-radius:12px; outline:none; padding:0 13px; background:#fff; color:#211831; font-weight:750; }.setupModal input:focus,.actionModal input:focus { border-color:#8b5cf6; box-shadow:0 0 0 3px rgba(139,92,246,.12); }
                .modalPrimary { width:100%; height:49px; margin-top:16px; border:0; border-radius:14px; background:linear-gradient(100deg,#5b21b6,#7c3aed,#9333ea); color:#fff; font-weight:900; cursor:pointer; box-shadow:0 12px 25px rgba(109,40,217,.22); }.modalPrimary:disabled { opacity:.58; cursor:not-allowed; }.dangerButton { background:linear-gradient(100deg,#c52c47,#ef526b); }
                .qrShell { width:max-content; margin:0 auto 13px; padding:13px; border:1px solid #e9e2f2; border-radius:18px; background:#fff; box-shadow:0 10px 25px rgba(46,24,74,.08); }.manualKey { display:grid; gap:6px; padding:12px; border:1px solid #e9e3f1; border-radius:13px; background:#f8f6fa; }.manualKey span { color:#8a8194; font-size:9px; font-weight:850; text-transform:uppercase; }.manualKey code { color:#5b21b6; font-size:12px; font-weight:900; letter-spacing:1px; word-break:break-all; }.manualKey button { width:max-content; margin:auto; display:flex; gap:5px; align-items:center; border:0; background:transparent; color:#6d28d9; font-size:10px; font-weight:850; cursor:pointer; }.totpInput { text-align:center; font:900 23px ui-monospace,monospace!important; letter-spacing:9px; }
                .recoveryGrid { display:grid; grid-template-columns:1fr 1fr; gap:8px; padding:13px; border:1px solid #e6dfef; border-radius:14px; background:#f8f6fa; }.recoveryGrid code { padding:8px; border-radius:8px; background:#fff; color:#4c1d95; font-size:13px; font-weight:900; letter-spacing:1px; }.recoveryGrid.compact { margin-top:4px; }.recoveryActions { display:flex; gap:8px; margin-top:10px; }.recoveryActions button { flex:1; height:36px; display:flex; justify-content:center; align-items:center; gap:6px; border:1px solid #ddd5e7; border-radius:10px; background:#fff; color:#5b21b6; font-size:10px; font-weight:850; cursor:pointer; }.savedCheck { display:flex!important; align-items:center; gap:8px; padding:11px; border-radius:11px; background:#f8f6fa; }.savedCheck input { width:16px!important; height:16px!important; }
                @keyframes shimmer { to { background-position:-200% 0; } }
                @media(max-width:720px) { .factorTop,.enabledPanel { align-items:stretch; flex-direction:column; }.primaryAction { width:100%; justify-content:center; }.enabledActions button { flex:1; justify-content:center; }.setupModal,.actionModal { padding:28px 19px 22px; }.modalOverlay { padding:11px; align-items:end; }.setupModal,.actionModal { border-radius:25px 25px 18px 18px; }.recoveryGrid { gap:6px; }.recoveryGrid code { font-size:11px; } }
            `}</style>
        </>
    );
}
