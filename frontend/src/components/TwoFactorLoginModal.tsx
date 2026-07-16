'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState } from 'react';
import { FiArrowRight, FiKey, FiLock, FiShield, FiSmartphone, FiX } from 'react-icons/fi';
import { authAPI } from '@/lib/api';

type AuthenticatedUser = {
    id: string;
    name: string;
    email: string;
    role: string;
};

export default function TwoFactorLoginModal({
    challengeToken,
    onVerified,
    onClose,
}: {
    challengeToken: string;
    onVerified: (result: { token: string; user: AuthenticatedUser; recovery_code_used?: boolean; recovery_codes_remaining?: number }) => void;
    onClose: () => void;
}) {
    const [code, setCode] = useState('');
    const [recoveryMode, setRecoveryMode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const updateCode = (value: string) => {
        const normalized = recoveryMode
            ? value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 9)
            : value.replace(/\D/g, '').slice(0, 6);
        setCode(normalized);
        setError('');
    };

    const toggleMode = () => {
        setRecoveryMode((current) => !current);
        setCode('');
        setError('');
        window.setTimeout(() => inputRef.current?.focus(), 0);
    };

    const verify = async () => {
        if ((!recoveryMode && code.length !== 6) || (recoveryMode && code.replace(/-/g, '').length !== 8)) {
            setError(recoveryMode ? 'Digite um código de recuperação completo.' : 'Digite os 6 números do aplicativo.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const { data } = await authAPI.verifyTwoFactorLogin({ two_factor_token: challengeToken, code });
            onVerified(data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Código inválido. Tente novamente.');
            setCode('');
            inputRef.current?.focus();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="factorOverlay">
            <section className="factorCard" role="dialog" aria-modal="true" aria-labelledby="two-factor-title">
                <div className="factorGlow" />
                <button type="button" className="closeButton" onClick={onClose} aria-label="Fechar verificação em duas etapas">
                    <FiX size={19} />
                </button>

                <div className="factorIcon">
                    {recoveryMode ? <FiKey size={31} /> : <FiSmartphone size={31} />}
                    <span><FiShield size={14} /></span>
                </div>
                <div className="factorBadge"><FiLock size={12} /> Segunda camada de segurança</div>
                <h2 id="two-factor-title">{recoveryMode ? 'Use um código de recuperação' : 'Confirme no seu autenticador'}</h2>
                <p>
                    {recoveryMode
                        ? 'Cada código pode ser usado apenas uma vez.'
                        : 'Abra o Google Authenticator ou outro aplicativo e digite o código atual.'}
                </p>

                <input
                    ref={inputRef}
                    className={`factorInput ${recoveryMode ? 'recovery' : ''} ${error ? 'invalid' : ''}`}
                    value={code}
                    onChange={(event) => updateCode(event.target.value)}
                    onKeyDown={(event) => { if (event.key === 'Enter') void verify(); }}
                    inputMode={recoveryMode ? 'text' : 'numeric'}
                    autoComplete="one-time-code"
                    placeholder={recoveryMode ? 'XXXX-XXXX' : '000 000'}
                    aria-label={recoveryMode ? 'Código de recuperação' : 'Código do autenticador'}
                />

                {error && <div className="factorError">{error}</div>}

                <button className="verifyButton" type="button" onClick={verify} disabled={loading}>
                    {loading ? <span className="spinner" /> : <FiShield size={16} />}
                    {loading ? 'Verificando...' : 'Verificar e entrar'}
                    {!loading && <FiArrowRight size={17} />}
                </button>

                <button className="alternativeButton" type="button" onClick={toggleMode}>
                    {recoveryMode ? <FiSmartphone size={14} /> : <FiKey size={14} />}
                    {recoveryMode ? 'Usar o aplicativo autenticador' : 'Usar código de recuperação'}
                </button>

                <div className="factorNote">O código muda a cada 30 segundos e funciona mesmo sem internet.</div>
            </section>

            <style jsx>{`
                .factorOverlay { position:fixed; inset:0; z-index:10000; display:grid; place-items:center; padding:20px; background:rgba(15,8,35,.66); backdrop-filter:blur(16px) saturate(125%); animation:fade .22s ease-out; }
                .factorCard { width:min(100%,450px); position:relative; overflow:hidden; padding:38px 36px 31px; border:1px solid rgba(255,255,255,.78); border-radius:29px; background:linear-gradient(150deg,#fff,#faf7ff); box-shadow:0 38px 120px rgba(17,5,48,.45); color:#191329; text-align:center; animation:rise .32s cubic-bezier(.2,.8,.2,1); }
                .factorGlow { position:absolute; width:190px; height:190px; right:-95px; top:-105px; border-radius:50%; background:rgba(139,92,246,.17); pointer-events:none; }
                .closeButton { position:absolute; right:17px; top:17px; width:38px; height:38px; display:grid; place-items:center; border:1px solid #ece6f5; border-radius:12px; background:#fff; color:#8f879a; cursor:pointer; }
                .factorIcon { width:76px; height:76px; margin:0 auto 18px; position:relative; display:grid; place-items:center; border-radius:23px; color:#fff; background:linear-gradient(145deg,#4c1d95,#7c3aed 62%,#a855f7); box-shadow:0 17px 36px rgba(109,40,217,.28); }
                .factorIcon span { position:absolute; right:-5px; bottom:-5px; width:27px; height:27px; display:grid; place-items:center; border:3px solid #fff; border-radius:50%; background:#20bd87; }
                .factorBadge { width:max-content; margin:0 auto 10px; padding:6px 10px; display:flex; gap:6px; align-items:center; border-radius:999px; background:#efe8ff; color:#6d28d9; font-size:10px; font-weight:900; letter-spacing:.7px; text-transform:uppercase; }
                h2 { margin:0; font-size:27px; line-height:1.18; letter-spacing:-.7px; font-weight:950; }
                p { min-height:42px; margin:11px auto 22px; max-width:350px; color:#776f83; font-size:13px; line-height:1.6; }
                .factorInput { width:100%; height:64px; box-sizing:border-box; border:1.5px solid #ded5e9; border-radius:16px; outline:none; background:#fff; color:#5b21b6; text-align:center; font:900 27px/1 ui-monospace,SFMono-Regular,Menlo,monospace; letter-spacing:12px; box-shadow:0 7px 20px rgba(49,22,83,.06); transition:.18s; }
                .factorInput.recovery { letter-spacing:5px; font-size:23px; }
                .factorInput:focus { border-color:#8b5cf6; box-shadow:0 0 0 4px rgba(139,92,246,.12); transform:translateY(-1px); }
                .factorInput.invalid { border-color:#fb7185; background:#fffafb; }
                .factorError { margin:11px 0 -3px; color:#df3f59; font-size:12px; font-weight:750; }
                .verifyButton { width:100%; height:54px; margin-top:19px; display:flex; align-items:center; justify-content:center; gap:9px; border:0; border-radius:15px; color:#fff; background:linear-gradient(100deg,#5b21b6,#7c3aed 60%,#9333ea); box-shadow:0 14px 29px rgba(109,40,217,.25); font-size:14px; font-weight:900; cursor:pointer; }
                .verifyButton:disabled { opacity:.68; cursor:not-allowed; }
                .alternativeButton { margin:17px auto 0; display:flex; align-items:center; gap:6px; border:0; background:transparent; color:#6d28d9; font-size:12px; font-weight:850; cursor:pointer; }
                .factorNote { margin-top:21px; padding:11px 13px; border:1px solid #ece7f3; border-radius:12px; background:#f8f6fa; color:#8a8292; font-size:10.5px; line-height:1.5; }
                .spinner { width:16px; height:16px; border:2px solid rgba(255,255,255,.35); border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite; }
                @keyframes spin { to { transform:rotate(360deg); } }
                @keyframes fade { from { opacity:0; } }
                @keyframes rise { from { opacity:0; transform:translateY(16px) scale(.97); } }
                @media(max-width:520px) { .factorOverlay { padding:12px; align-items:end; } .factorCard { padding:34px 20px 25px; border-radius:27px 27px 19px 19px; } .factorInput { height:58px; } h2 { font-size:24px; } }
            `}</style>
        </div>
    );
}
