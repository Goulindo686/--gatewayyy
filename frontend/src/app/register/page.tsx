'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { FiArrowRight } from 'react-icons/fi';

export default function RegisterPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [form, setForm] = useState({
        name: '', email: '', password: '', confirmPassword: '', cpf_cnpj: '', phone: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (form.password !== form.confirmPassword) {
            return toast.error('As senhas não coincidem');
        }
        if (!termsAccepted) {
            return toast.error('Você deve aceitar os termos de uso para criar uma conta.');
        }
        setLoading(true);
        try {
            const { data } = await authAPI.register({
                name: form.name,
                email: form.email,
                password: form.password,
                cpf_cnpj: form.cpf_cnpj,
                phone: form.phone,
                terms_accepted: true
            });
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            toast.success('Conta criada com sucesso!');
            router.push('/dashboard');
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao criar conta');
        } finally {
            setLoading(false);
        }
    };

    const update = (field: string, value: string) => setForm({ ...form, [field]: value });
    const brandLogo = 'https://i.imgur.com/vXgH6Mn.png';

    return (
        <div className="authShell">
            <div className="authBackdrop" />
            <div className="authLayout">
                <div className="authSide">
                    <div className="authSideInner">
                        <div className="authSideBadge">GouPay</div>
                        <div className="authSideTitle">
                            Crie sua conta e comece a vender com checkout profissional.
                        </div>
                        <div className="authSideSub">
                            Configure seus produtos, gere links de pagamento e acompanhe tudo no dashboard.
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
                            <h1 className="authTitle">Criar conta</h1>
                            <p className="authSubtitle">Leva poucos minutos para começar</p>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="authGrid2">
                                <div>
                                    <label className="authLabel">Nome completo</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        placeholder="Seu nome"
                                        required
                                        value={form.name}
                                        onChange={e => update('name', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="authLabel">Telefone</label>
                                    <input
                                        type="tel"
                                        className="input-field"
                                        placeholder="(11) 99999-9999"
                                        value={form.phone}
                                        onChange={e => update('phone', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: 14 }}>
                                <label className="authLabel">Email</label>
                                <input
                                    type="email"
                                    className="input-field"
                                    placeholder="seu@email.com"
                                    required
                                    value={form.email}
                                    onChange={e => update('email', e.target.value)}
                                />
                            </div>

                            <div style={{ marginBottom: 14 }}>
                                <label className="authLabel">CPF ou CNPJ</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="000.000.000-00"
                                    required
                                    value={form.cpf_cnpj}
                                    onChange={e => update('cpf_cnpj', e.target.value)}
                                />
                            </div>

                            <div className="authGrid2" style={{ marginBottom: 18 }}>
                                <div>
                                    <label className="authLabel">Senha</label>
                                    <input
                                        type="password"
                                        className="input-field"
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                        value={form.password}
                                        onChange={e => update('password', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="authLabel">Confirmar</label>
                                    <input
                                        type="password"
                                        className="input-field"
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                        value={form.confirmPassword}
                                        onChange={e => update('confirmPassword', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="authTerms">
                                <input
                                    type="checkbox"
                                    id="terms"
                                    checked={termsAccepted}
                                    onChange={e => setTermsAccepted(e.target.checked)}
                                    className="authCheckbox"
                                />
                                <label htmlFor="terms" className="authTermsLabel">
                                    Li e aceito os <Link href="/terms/use" target="_blank" className="authTermsLink">Termos de Uso</Link>
                                </label>
                            </div>

                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={loading}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 28px' }}
                            >
                                {loading ? 'Criando conta...' : <>Criar Conta <FiArrowRight size={16} /></>}
                            </button>
                        </form>

                        <div className="authFooter">
                            <span>Já possui conta?</span>
                            <Link href="/login" className="authLink">Entrar</Link>
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
                        radial-gradient(900px 500px at 12% 15%, rgba(108,92,231,0.18), transparent 55%),
                        radial-gradient(700px 420px at 88% 70%, rgba(0,206,201,0.10), transparent 60%),
                        radial-gradient(600px 420px at 50% 20%, rgba(255,107,107,0.08), transparent 60%);
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
                    max-width: 520px;
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
                    margin-bottom: 18px;
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
                .authLabel {
                    display: block;
                    font-size: 13px;
                    font-weight: 600;
                    color: var(--text-secondary);
                    margin-bottom: 8px;
                }
                .authGrid2 {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 14px;
                    margin-bottom: 14px;
                }
                .authTerms {
                    margin: 8px 0 18px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .authCheckbox {
                    width: 18px;
                    height: 18px;
                    cursor: pointer;
                    accent-color: var(--accent-primary);
                }
                .authTermsLabel {
                    font-size: 13px;
                    color: var(--text-secondary);
                    cursor: pointer;
                    user-select: none;
                    line-height: 1.4;
                }
                .authTermsLink {
                    color: var(--accent-secondary);
                    text-decoration: underline;
                    font-weight: 800;
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
                @media (max-width: 520px) {
                    .authGrid2 {
                        grid-template-columns: 1fr;
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
