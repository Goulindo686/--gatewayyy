'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { ClipboardEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { FiArrowRight, FiCheckCircle, FiClock, FiLock, FiMail, FiRefreshCw, FiShield, FiX } from 'react-icons/fi';
import { authAPI } from '@/lib/api';

export type EmailVerificationSession = {
    verificationToken: string;
    emailMasked: string;
    retryAfter: number;
};

type VerificationResult = {
    token: string;
    user: {
        id: string;
        name: string;
        email: string;
        role: string;
    };
};

export default function EmailVerificationModal({
    session,
    onVerified,
    onClose,
}: {
    session: EmailVerificationSession;
    onVerified: (result: VerificationResult) => void;
    onClose: () => void;
}) {
    const [digits, setDigits] = useState(['', '', '', '', '', '']);
    const [verificationToken, setVerificationToken] = useState(session.verificationToken);
    const [cooldown, setCooldown] = useState(Math.max(0, session.retryAfter || 0));
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState('');
    const inputs = useRef<Array<HTMLInputElement | null>>([]);

    useEffect(() => {
        inputs.current[0]?.focus();
        const intervalId = window.setInterval(() => {
            setCooldown((current) => {
                if (current <= 1) {
                    window.clearInterval(intervalId);
                    return 0;
                }
                return current - 1;
            });
        }, 1000);

        return () => window.clearInterval(intervalId);
    }, []);

    const fillDigits = (value: string) => {
        const numbers = value.replace(/\D/g, '').slice(0, 6).split('');
        const next = Array.from({ length: 6 }, (_, index) => numbers[index] || '');
        setDigits(next);
        inputs.current[Math.min(numbers.length, 5)]?.focus();
        setError('');
    };

    const handleChange = (index: number, value: string) => {
        if (value.length > 1) {
            fillDigits(value);
            return;
        }

        const digit = value.replace(/\D/g, '').slice(-1);
        const next = [...digits];
        next[index] = digit;
        setDigits(next);
        setError('');
        if (digit && index < 5) inputs.current[index + 1]?.focus();
    };

    const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Backspace' && !digits[index] && index > 0) {
            inputs.current[index - 1]?.focus();
        }
        if (event.key === 'ArrowLeft' && index > 0) inputs.current[index - 1]?.focus();
        if (event.key === 'ArrowRight' && index < 5) inputs.current[index + 1]?.focus();
    };

    const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
        event.preventDefault();
        fillDigits(event.clipboardData.getData('text'));
    };

    const handleVerify = async () => {
        const code = digits.join('');
        if (code.length !== 6) {
            setError('Preencha os seis números enviados ao seu e-mail.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const { data } = await authAPI.verifyEmail({ verification_token: verificationToken, code });
            onVerified(data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Não foi possível confirmar o código.');
            setDigits(['', '', '', '', '', '']);
            inputs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (cooldown > 0 || resending) return;
        setResending(true);
        setError('');
        try {
            const { data } = await authAPI.resendEmailVerification(verificationToken);
            setVerificationToken(data.verification_token);
            setCooldown(Math.max(0, Number(data.retry_after) || 60));
            setDigits(['', '', '', '', '', '']);
            inputs.current[0]?.focus();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Não foi possível reenviar o código.');
        } finally {
            setResending(false);
        }
    };

    const formattedCooldown = `00:${String(cooldown).padStart(2, '0')}`;

    return (
        <div className="verificationOverlay" role="presentation">
            <section className="verificationCard" role="dialog" aria-modal="true" aria-labelledby="verification-title">
                <div className="glow glowOne" />
                <div className="glow glowTwo" />
                <button className="closeButton" type="button" onClick={onClose} aria-label="Fechar verificacao">
                    <FiX size={19} />
                </button>

                <div className="securityMark" aria-hidden="true">
                    <div className="securityPulse" />
                    <FiMail size={31} />
                    <span><FiCheckCircle size={15} /></span>
                </div>

                <div className="eyebrow"><FiShield size={13} /> Verificação segura</div>
                <h2 id="verification-title">Confira seu email</h2>
                <p className="intro">
                    Enviamos um código de 6 dígitos para<br />
                    <strong>{session.emailMasked}</strong>
                </p>

                <div className={`codeGrid ${error ? 'hasError' : ''}`} onPaste={handlePaste}>
                    {digits.map((digit, index) => (
                        <input
                            key={index}
                            ref={(element) => { inputs.current[index] = element; }}
                            value={digit}
                            onChange={(event) => handleChange(index, event.target.value)}
                            onKeyDown={(event) => handleKeyDown(index, event)}
                            inputMode="numeric"
                            autoComplete={index === 0 ? 'one-time-code' : 'off'}
                            maxLength={1}
                            aria-label={`Dígito ${index + 1} do código`}
                        />
                    ))}
                </div>

                {error && <div className="errorMessage">{error}</div>}

                <button className="confirmButton" type="button" onClick={handleVerify} disabled={loading}>
                    {loading ? <span className="spinner" /> : <FiLock size={16} />}
                    {loading ? 'Confirmando...' : 'Confirmar e continuar'}
                    {!loading && <FiArrowRight size={17} />}
                </button>

                <div className="resendArea">
                    <span>Não recebeu o código?</span>
                    <button type="button" onClick={handleResend} disabled={cooldown > 0 || resending}>
                        <FiRefreshCw className={resending ? 'rotating' : ''} size={14} />
                        {resending ? 'Enviando...' : cooldown > 0 ? `Reenviar em ${formattedCooldown}` : 'Enviar outro código'}
                    </button>
                </div>

                <div className="securityNote">
                    <FiClock size={15} />
                    <span>O código expira em 10 minutos. A GouPay nunca pedirá esse código fora desta tela.</span>
                </div>
            </section>

            <style jsx>{`
                .verificationOverlay {
                    position: fixed;
                    inset: 0;
                    z-index: 9999;
                    display: grid;
                    place-items: center;
                    padding: 22px;
                    background: rgba(22, 12, 45, 0.58);
                    backdrop-filter: blur(15px) saturate(125%);
                    animation: overlayIn .25s ease-out;
                }
                .verificationCard {
                    width: min(100%, 480px);
                    position: relative;
                    overflow: hidden;
                    padding: 38px 38px 32px;
                    border: 1px solid rgba(255,255,255,.82);
                    border-radius: 30px;
                    background: linear-gradient(155deg, rgba(255,255,255,.98), rgba(250,247,255,.96));
                    box-shadow: 0 36px 110px rgba(28, 9, 72, .38), inset 0 1px 0 #fff;
                    text-align: center;
                    color: #191329;
                    animation: cardIn .36s cubic-bezier(.2,.8,.2,1);
                }
                .glow { position:absolute; border-radius:999px; filter:blur(2px); pointer-events:none; }
                .glowOne { width:180px; height:180px; right:-95px; top:-90px; background:rgba(139,92,246,.18); }
                .glowTwo { width:140px; height:140px; left:-90px; bottom:-85px; background:rgba(168,85,247,.13); }
                .closeButton {
                    position:absolute; right:18px; top:18px; width:38px; height:38px; display:grid; place-items:center;
                    border:1px solid #ece7f5; border-radius:12px; background:rgba(255,255,255,.75); color:#8d849c; cursor:pointer;
                    transition:.2s ease;
                }
                .closeButton:hover { transform:rotate(6deg); color:#5b21b6; border-color:#d8c8f4; }
                .securityMark {
                    width:78px; height:78px; margin:0 auto 19px; position:relative; display:grid; place-items:center;
                    border-radius:24px; color:#fff; background:linear-gradient(145deg,#5b21b6,#8b5cf6 65%,#a855f7);
                    box-shadow:0 18px 38px rgba(109,40,217,.28);
                }
                .securityMark span {
                    position:absolute; right:-6px; bottom:-5px; width:27px; height:27px; display:grid; place-items:center;
                    border:3px solid #fff; border-radius:50%; background:#22c58b; color:#fff;
                }
                .securityPulse { position:absolute; inset:-7px; border:1px solid rgba(124,58,237,.2); border-radius:29px; animation:pulse 2s infinite; }
                .eyebrow {
                    width:max-content; margin:0 auto 10px; padding:6px 10px; display:flex; align-items:center; gap:6px;
                    border-radius:999px; background:#f0e9ff; color:#6d28d9; font-size:10px; font-weight:900; letter-spacing:.9px; text-transform:uppercase;
                }
                h2 { margin:0; font-size:29px; line-height:1.15; letter-spacing:-.8px; font-weight:950; }
                .intro { margin:11px 0 25px; color:#756d82; font-size:14px; line-height:1.65; }
                .intro strong { color:#4c3e5e; }
                .codeGrid { display:grid; grid-template-columns:repeat(6,1fr); gap:9px; }
                .codeGrid input {
                    width:100%; min-width:0; height:59px; box-sizing:border-box; border:1.5px solid #ded6e9; border-radius:15px;
                    outline:none; background:#fff; color:#5b21b6; text-align:center; font-size:25px; font-weight:950;
                    box-shadow:0 6px 16px rgba(51,24,86,.05); transition:.18s ease;
                }
                .codeGrid input:focus { border-color:#8b5cf6; box-shadow:0 0 0 4px rgba(139,92,246,.12), 0 8px 20px rgba(83,38,140,.08); transform:translateY(-2px); }
                .codeGrid.hasError input { border-color:#fb7185; background:#fffafb; }
                .errorMessage { margin:12px 0 -2px; color:#e2435c; font-size:12px; font-weight:750; }
                .confirmButton {
                    width:100%; height:54px; margin-top:21px; display:flex; align-items:center; justify-content:center; gap:9px;
                    border:0; border-radius:15px; background:linear-gradient(100deg,#5b21b6,#7c3aed 58%,#9333ea); color:#fff;
                    box-shadow:0 14px 28px rgba(109,40,217,.25); font-size:14px; font-weight:900; cursor:pointer; transition:.2s ease;
                }
                .confirmButton:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 18px 35px rgba(109,40,217,.32); }
                .confirmButton:disabled { opacity:.72; cursor:not-allowed; }
                .spinner { width:16px; height:16px; border:2px solid rgba(255,255,255,.35); border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite; }
                .resendArea { margin-top:20px; display:flex; flex-wrap:wrap; align-items:center; justify-content:center; gap:6px; color:#8d8498; font-size:12px; }
                .resendArea button { display:flex; align-items:center; gap:5px; border:0; padding:4px; background:transparent; color:#6d28d9; font-weight:850; cursor:pointer; }
                .resendArea button:disabled { color:#aaa1b3; cursor:not-allowed; }
                .securityNote {
                    margin-top:21px; padding:12px 14px; display:flex; align-items:flex-start; gap:9px; border:1px solid #ece7f3;
                    border-radius:13px; background:rgba(247,245,250,.8); color:#888090; text-align:left; font-size:10.5px; line-height:1.5;
                }
                .securityNote svg { flex:0 0 auto; color:#7c3aed; margin-top:1px; }
                .rotating { animation:spin .8s linear infinite; }
                @keyframes overlayIn { from { opacity:0; } to { opacity:1; } }
                @keyframes cardIn { from { opacity:0; transform:translateY(18px) scale(.97); } to { opacity:1; transform:none; } }
                @keyframes spin { to { transform:rotate(360deg); } }
                @keyframes pulse { 0%,100% { transform:scale(1); opacity:.9; } 50% { transform:scale(1.08); opacity:.35; } }
                @media (max-width:560px) {
                    .verificationOverlay { padding:13px; align-items:end; }
                    .verificationCard { padding:34px 20px 25px; border-radius:27px 27px 20px 20px; }
                    .codeGrid { gap:6px; }
                    .codeGrid input { height:52px; border-radius:12px; font-size:22px; }
                    h2 { font-size:26px; }
                }
            `}</style>
        </div>
    );
}
