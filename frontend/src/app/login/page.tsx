'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { FiMail, FiLock, FiArrowRight } from 'react-icons/fi';

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ email: '', password: '' });
    const brandLogo = 'https://i.imgur.com/vXgH6Mn.png';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await authAPI.login(form);
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            toast.success('Login realizado com sucesso!');
            if (data.user.role === 'admin') {
                router.push('/admin');
            } else if (data.user.role === 'customer') {
                router.push('/area-membros');
            } else {
                router.push('/dashboard');
            }
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao fazer login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="authShell">
            <div className="authBackdrop" />
            <div className="authLayout">
                <div className="authSide">
                    <div className="authSideInner">
                        <div className="authSideBadge">GouPay</div>
                        <div className="authSideTitle">
                            Entre e gerencie suas vendas com experiência premium.
                        </div>
                        <div className="authSideSub">
                            Checkout otimizado, split automático e saques via Pix — tudo em um só lugar.
                        </div>
                    </div>
                    {/* Vídeo de fundo do painel esquerdo */}
                    <video
                        autoPlay muted loop playsInline
                        style={{ position: 'absolute', inset: 24, width: 'calc(100% - 48px)', height: 'calc(100% - 48px)', objectFit: 'cover', borderRadius: 28, zIndex: 0 }}
                    >
                        <source src="https://i.imgur.com/x6H12bq.mp4" type="video/mp4" />
                    </video>
                </div>

                <div className="authMain">
                    <div className="authCard glass-card animate-fade-in">
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
                            <h1 className="authTitle">Entrar na conta</h1>
                            <p className="authSubtitle">Acesse sua conta para continuar</p>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: 18 }}>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Email</label>
                                <div style={{ position: 'relative' }}>
                                    <FiMail style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
                                    <input
                                        type="email"
                                        className="input-field"
                                        placeholder="seu@email.com"
                                        required
                                        value={form.email}
                                        onChange={e => setForm({ ...form, email: e.target.value })}
                                        style={{ paddingLeft: 44 }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: 22 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, gap: 12, alignItems: 'center' }}>
                                    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Senha</label>
                                    <Link href="/forgot-password" style={{ fontSize: 13, color: 'var(--accent-secondary)', textDecoration: 'none', fontWeight: 700 }}>
                                        Esqueceu a senha?
                                    </Link>
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <FiLock style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
                                    <input
                                        type="password"
                                        className="input-field"
                                        placeholder="••••••••"
                                        required
                                        value={form.password}
                                        onChange={e => setForm({ ...form, password: e.target.value })}
                                        style={{ paddingLeft: 44 }}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={loading}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 28px' }}
                            >
                                {loading ? 'Entrando...' : <>Entrar <FiArrowRight size={16} /></>}
                            </button>
                        </form>

                        <div className="authFooter">
                            <span>Não tem uma conta?</span>
                            <Link href="/register" className="authLink">Criar conta</Link>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .authShell {
                    min-height: 100vh;
                    background: var(--bg-primary);
                    position: relative;
                    overflow: hidden;
                    display: flex;
                    align-items: stretch;
                }
                .authBackdrop {
                    position: absolute;
                    inset: 0;
                    background:
                        radial-gradient(900px 500px at 15% 10%, rgba(108,92,231,0.18), transparent 55%),
                        radial-gradient(700px 420px at 85% 65%, rgba(0,206,201,0.10), transparent 60%),
                        radial-gradient(600px 420px at 60% 15%, rgba(255,107,107,0.08), transparent 60%);
                    pointer-events: none;
                }
                .authLayout {
                    width: 100%;
                    display: grid;
                    grid-template-columns: 1.15fr 1fr;
                    min-height: 100vh;
                    position: relative;
                    z-index: 1;
                }
                .authSide {
                    display: flex;
                    align-items: center;
                    padding: 64px;
                    position: relative;
                }
                .authSide::before {
                    content: '';
                    position: absolute;
                    inset: 24px;
                    border-radius: 28px;
                    background:
                        linear-gradient(135deg, rgba(108,92,231,0.25), rgba(10,10,15,0.0)),
                        radial-gradient(800px 400px at 30% 30%, rgba(108,92,231,0.22), transparent 60%),
                        radial-gradient(700px 360px at 70% 70%, rgba(0,206,201,0.16), transparent 60%);
                    border: 1px solid rgba(255,255,255,0.08);
                    box-shadow: 0 28px 80px rgba(0,0,0,0.40);
                }
                .authSideInner {
                    position: relative;
                    z-index: 2;
                    max-width: 520px;
                    padding: 28px;
                }
                .authSideBadge {
                    display: inline-flex;
                    align-items: center;
                    padding: 8px 14px;
                    border-radius: 999px;
                    border: 1px solid rgba(255,255,255,0.10);
                    background: rgba(0,0,0,0.18);
                    color: rgba(255,255,255,0.86);
                    font-size: 12px;
                    font-weight: 800;
                    letter-spacing: 0.8px;
                    text-transform: uppercase;
                    margin-bottom: 18px;
                }
                .authSideTitle {
                    font-size: 44px;
                    line-height: 1.08;
                    font-weight: 900;
                    color: rgba(255,255,255,0.92);
                    letter-spacing: -1px;
                    margin-bottom: 14px;
                }
                .authSideSub {
                    font-size: 14px;
                    line-height: 1.7;
                    color: rgba(255,255,255,0.72);
                    max-width: 460px;
                }
                .authMain {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 40px 24px;
                }
                .authCard {
                    width: 100%;
                    max-width: 460px;
                    padding: 34px;
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
                }
                .authSubtitle {
                    margin: 0;
                    font-size: 13px;
                    color: var(--text-secondary);
                }
                .authFooter {
                    margin-top: 18px;
                    display: flex;
                    justify-content: center;
                    gap: 8px;
                    font-size: 13px;
                    color: var(--text-secondary);
                }
                .authLink {
                    color: var(--accent-secondary);
                    text-decoration: none;
                    font-weight: 800;
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
