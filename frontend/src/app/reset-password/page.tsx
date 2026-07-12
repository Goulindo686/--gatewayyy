'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiArrowRight, FiEye, FiEyeOff, FiLock } from 'react-icons/fi';

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [token, setToken] = useState('');
    const brandLogo = 'https://i.imgur.com/vXgH6Mn.png';

    useEffect(() => {
        const tokenParam = searchParams.get('token');

        if (!tokenParam) {
            toast.error('Token invalido ou ausente');
            router.push('/login');
        } else {
            setToken(tokenParam);
        }
    }, [searchParams, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password.length < 6) {
            return toast.error('A senha deve ter no minimo 6 caracteres');
        }

        if (password !== confirmPassword) {
            return toast.error('As senhas nao coincidem');
        }

        setLoading(true);
        try {
            await axios.post('/api/auth/reset-password', { token, password });
            toast.success('Senha alterada com sucesso!');
            setTimeout(() => router.push('/login'), 2000);
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao redefinir senha');
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return null;
    }

    return (
        <div className="authShell">
            <div className="authBackdrop" />
            <div className="authLayout">
                <div className="authSide">
                    <div className="authSideInner">
                        <div className="authSideBadge">Nova senha</div>
                        <div className="authSideTitle">Defina uma senha forte e volte para sua conta.</div>
                        <div className="authSideSub">
                            Use uma senha segura para proteger seu painel, suas vendas e os dados da sua operacao.
                        </div>
                    </div>
                </div>

                <div className="authMain">
                    <div className="authCard animate-fade-in">
                        <div className="authBrand">
                            <img
                                src={brandLogo}
                                alt="GouPay"
                                onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src = '/logo.png';
                                }}
                                className="authBrandLogo"
                            />
                        </div>

                        <div className="authHeader">
                            <h1 className="authTitle">Redefinir senha</h1>
                            <p className="authSubtitle">Digite sua nova senha abaixo</p>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: 18 }}>
                                <label className="authLabel">Nova senha</label>
                                <div style={{ position: 'relative' }}>
                                    <FiLock style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={16} />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className="input-field"
                                        placeholder="Minimo 6 caracteres"
                                        required
                                        minLength={6}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        style={{ paddingLeft: 44, paddingRight: 45 }}
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="authEyeButton">
                                        {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div style={{ marginBottom: 24 }}>
                                <label className="authLabel">Confirmar senha</label>
                                <div style={{ position: 'relative' }}>
                                    <FiLock style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={16} />
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        className="input-field"
                                        placeholder="Digite a senha novamente"
                                        required
                                        minLength={6}
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        style={{ paddingLeft: 44, paddingRight: 45 }}
                                    />
                                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="authEyeButton">
                                        {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 28px' }}>
                                {loading ? 'Redefinindo...' : <>Redefinir senha <FiArrowRight size={16} /></>}
                            </button>
                        </form>

                        <div className="authFooter">
                            <Link href="/login" className="authLinkBack">
                                <FiArrowLeft size={14} /> Voltar para login
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .authShell {
                    min-height: 100vh;
                    background: #fbfaff;
                    color: #0f172a;
                    position: relative;
                    overflow: hidden;
                    display: flex;
                    align-items: stretch;
                }
                .authBackdrop {
                    position: absolute;
                    inset: 0;
                    background:
                        radial-gradient(760px 460px at 8% 10%, rgba(124,58,237,0.14), transparent 62%),
                        radial-gradient(620px 380px at 92% 80%, rgba(139,92,246,0.10), transparent 60%),
                        linear-gradient(180deg, #ffffff 0%, #f8f5ff 100%);
                    pointer-events: none;
                }
                .authLayout {
                    width: 100%;
                    display: grid;
                    grid-template-columns: minmax(420px, 0.95fr) minmax(420px, 1fr);
                    min-height: 100vh;
                    position: relative;
                    z-index: 1;
                }
                .authSide {
                    display: flex;
                    align-items: center;
                    padding: 52px;
                    position: relative;
                }
                .authSide::before {
                    content: '';
                    position: absolute;
                    inset: 32px;
                    border-radius: 30px;
                    background:
                        linear-gradient(135deg, rgba(255,255,255,0.94), rgba(250,247,255,0.86)),
                        radial-gradient(620px 340px at 20% 18%, rgba(124,58,237,0.16), transparent 58%);
                    border: 1px solid rgba(124,58,237,0.12);
                    box-shadow: 0 28px 80px rgba(88,28,135,0.12);
                }
                .authSide::after {
                    content: 'Depois de redefinir, voce sera direcionado para entrar novamente com a nova senha.';
                    position: absolute;
                    left: 88px;
                    right: 88px;
                    bottom: 88px;
                    padding: 18px 20px;
                    border-radius: 20px;
                    background: rgba(255,255,255,0.82);
                    border: 1px solid rgba(124,58,237,0.12);
                    box-shadow: 0 18px 50px rgba(88,28,135,0.12);
                    color: #475569;
                    font-size: 13px;
                    line-height: 1.55;
                    font-weight: 700;
                    z-index: 2;
                }
                .authSideInner {
                    position: relative;
                    z-index: 2;
                    max-width: 500px;
                    padding: 28px;
                }
                .authSideBadge {
                    display: inline-flex;
                    align-items: center;
                    padding: 8px 14px;
                    border-radius: 999px;
                    background: rgba(124,58,237,0.09);
                    border: 1px solid rgba(124,58,237,0.15);
                    color: #6d28d9;
                    font-size: 12px;
                    font-weight: 800;
                    letter-spacing: 0.8px;
                    text-transform: uppercase;
                    margin-bottom: 18px;
                }
                .authSideTitle {
                    color: #0f172a;
                    font-size: 42px;
                    line-height: 1.08;
                    font-weight: 900;
                    letter-spacing: -1px;
                    margin-bottom: 14px;
                }
                .authSideSub {
                    color: #64748b;
                    font-size: 15px;
                    line-height: 1.7;
                    max-width: 460px;
                }
                .authMain {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 48px 24px;
                }
                .authCard {
                    width: 100%;
                    max-width: 460px;
                    padding: 34px;
                    border-radius: 30px;
                    background: rgba(255,255,255,0.9);
                    border: 1px solid rgba(124,58,237,0.12);
                    box-shadow: 0 30px 90px rgba(88,28,135,0.14);
                }
                .authBrand {
                    display: flex;
                    justify-content: center;
                    margin-bottom: 18px;
                }
                .authBrandLogo {
                    height: 46px;
                    width: auto;
                    object-fit: contain;
                    display: block;
                }
                .authHeader {
                    text-align: center;
                    margin-bottom: 22px;
                }
                .authTitle {
                    font-size: 22px;
                    font-weight: 900;
                    letter-spacing: -0.3px;
                    margin: 0 0 8px;
                    color: #0f172a;
                }
                .authSubtitle,
                .authLabel {
                    color: #64748b;
                    font-size: 13px;
                }
                .authLabel {
                    display: block;
                    font-weight: 700;
                    margin-bottom: 8px;
                }
                .input-field {
                    background: #ffffff !important;
                    border: 1px solid rgba(124,58,237,0.14) !important;
                    color: #0f172a !important;
                    border-radius: 16px !important;
                    box-shadow: 0 10px 24px rgba(88,28,135,0.05);
                }
                .input-field:focus {
                    border-color: rgba(124,58,237,0.46) !important;
                    box-shadow: 0 0 0 4px rgba(124,58,237,0.10) !important;
                }
                .authEyeButton {
                    position: absolute;
                    right: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    color: #64748b;
                    padding: 4px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                }
                .authFooter {
                    margin-top: 20px;
                    display: flex;
                    justify-content: center;
                }
                .authLinkBack {
                    color: #6d28d9;
                    text-decoration: none;
                    font-size: 14px;
                    font-weight: 800;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                }
                @media (max-width: 980px) {
                    .authLayout {
                        grid-template-columns: 1fr;
                    }
                    .authSide {
                        display: none;
                    }
                    .authMain {
                        padding: 36px 18px;
                    }
                    .authCard {
                        padding: 30px;
                    }
                }
                @media (max-width: 420px) {
                    .authCard {
                        padding: 26px 18px;
                    }
                    .authBrandLogo {
                        height: 42px;
                    }
                }
            `}</style>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div style={{
                minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#fbfaff'
            }}>
                <div style={{ width: 36, height: 36, border: '3px solid rgba(124,58,237,0.14)', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
        }>
            <ResetPasswordForm />
        </Suspense>
    );
}
