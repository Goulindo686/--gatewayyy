'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { FiArrowRight, FiCreditCard, FiDollarSign, FiFileText, FiHeadphones, FiLock, FiMail, FiPhone, FiShield, FiShoppingBag, FiUser, FiZap } from 'react-icons/fi';
import EmailVerificationModal, { EmailVerificationSession } from '@/components/EmailVerificationModal';

export default function RegisterPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [verification, setVerification] = useState<EmailVerificationSession | null>(null);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [form, setForm] = useState({
        name: '', email: '', password: '', confirmPassword: '', cpf_cnpj: '', phone: ''
    });

    const finishRegistration = (data: any) => {
        if (!data.token || !data.user) {
            toast.error('Não foi possível concluir o cadastro. Entre novamente.');
            router.push('/login');
            return;
        }
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        toast.success('Email confirmado. Sua conta esta pronta!');
        router.push('/dashboard');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (form.password !== form.confirmPassword) {
            return toast.error('As senhas nao coincidem');
        }
        if (!termsAccepted) {
            return toast.error('Voce deve aceitar os termos de uso para criar uma conta.');
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
            setVerification({
                verificationToken: data.verification_token,
                emailMasked: data.email_masked,
                retryAfter: Number(data.retry_after) || 0,
            });
            toast.success('Conta criada. Enviamos o código de verificação!');
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao criar conta');
        } finally {
            setLoading(false);
        }
    };

    const update = (field: string, value: string) => setForm({ ...form, [field]: value });

    return (
        <div className="authShell">
            <div className="authLayout">
                <aside className="authShowcase">
                    <div className="authLogoMark">
                        <img src="/favicon.png" alt="GouPay" />
                        <strong>GouPay</strong>
                    </div>

                    <div className="authOrbit authOrbitTop" aria-hidden="true">
                        <div className="authOrbitRing" />
                        <div className="authOrbitCore">G</div>
                        <span className="authFloatIcon authFloatIconOne"><FiShield size={22} /></span>
                        <span className="authFloatIcon authFloatIconTwo"><FiCreditCard size={22} /></span>
                        <span className="authFloatIcon authFloatIconThree"><FiDollarSign size={22} /></span>
                    </div>

                    <div className="authCopy">
                        <div className="authBadge"><FiZap size={13} /> Gateway de pagamentos completo</div>
                        <h1>Crie sua conta e comece a vender com <span>checkout profissional.</span></h1>
                        <p>Configure seus produtos, gere links de pagamento e acompanhe tudo no dashboard completo.</p>
                    </div>

                    <div className="authBenefits">
                        <div><FiShield size={26} /><span><strong>100% Seguro</strong><small>Protecao avancada dos dados.</small></span></div>
                        <div><FiZap size={26} /><span><strong>Aprovacao rapida</strong><small>Pagamentos aprovados em segundos.</small></span></div>
                        <div><FiHeadphones size={26} /><span><strong>Suporte 24/7</strong><small>Equipe especializada para ajudar.</small></span></div>
                    </div>

                    <div className="authBottomNote">
                        <FiShoppingBag size={26} />
                        <span>Tudo que voce precisa para vender mais: checkout, loja, recuperacao de vendas e gestao de produtos.</span>
                    </div>
                </aside>

                <main className="authMain">
                    <section className="authCard authCardRegister">
                        <div className="authBrand">
                            <img src="/favicon.png" alt="GouPay" />
                            <strong>GouPay</strong>
                        </div>

                        <header className="authHeader">
                            <h2>Criar conta</h2>
                            <p>Leva poucos minutos para comecar</p>
                        </header>

                        <form onSubmit={handleSubmit}>
                            <div className="authGrid2">
                                <label className="authField">
                                    <span>Nome completo</span>
                                    <div><FiUser size={17} /><input type="text" placeholder="Seu nome" required value={form.name} onChange={e => update('name', e.target.value)} /></div>
                                </label>
                                <label className="authField">
                                    <span>Telefone</span>
                                    <div><FiPhone size={17} /><input type="tel" placeholder="(11) 99999-9999" value={form.phone} onChange={e => update('phone', e.target.value)} /></div>
                                </label>
                            </div>

                            <label className="authField">
                                <span>Email</span>
                                <div><FiMail size={17} /><input type="email" placeholder="seu@email.com" required value={form.email} onChange={e => update('email', e.target.value)} /></div>
                            </label>

                            <label className="authField">
                                <span>CPF ou CNPJ</span>
                                <div><FiFileText size={17} /><input type="text" placeholder="000.000.000-00" required value={form.cpf_cnpj} onChange={e => update('cpf_cnpj', e.target.value)} /></div>
                            </label>

                            <div className="authGrid2">
                                <label className="authField">
                                    <span>Senha</span>
                                    <div><FiLock size={17} /><input type="password" placeholder="********" required minLength={6} value={form.password} onChange={e => update('password', e.target.value)} /></div>
                                </label>
                                <label className="authField">
                                    <span>Confirmar senha</span>
                                    <div><FiLock size={17} /><input type="password" placeholder="********" required minLength={6} value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} /></div>
                                </label>
                            </div>

                            <label className="authTerms">
                                <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} />
                                <span>Li e aceito os <Link href="/terms/use" target="_blank">Termos de Uso</Link></span>
                            </label>

                            <button type="submit" className="authSubmit" disabled={loading}>
                                {loading ? 'Criando conta...' : <>Criar Conta <FiArrowRight size={17} /></>}
                            </button>
                        </form>

                        <footer className="authFooter">
                            <span>Ja possui conta?</span>
                            <Link href="/login">Entrar</Link>
                        </footer>
                    </section>
                </main>
            </div>

            {verification && (
                <EmailVerificationModal
                    key={verification.verificationToken}
                    session={verification}
                    onVerified={finishRegistration}
                    onClose={() => router.push('/login')}
                />
            )}

            <style>{`
                .authShell {
                    min-height: 100vh;
                    background:
                        radial-gradient(900px 560px at 0% 0%, rgba(124,58,237,0.44), transparent 48%),
                        radial-gradient(760px 520px at 100% 100%, rgba(124,58,237,0.34), transparent 46%),
                        linear-gradient(135deg, #fbf9ff 0%, #ffffff 46%, #f3eaff 100%);
                    color: #111827;
                    overflow: hidden;
                }
                .authShell::before {
                    content: '';
                    position: fixed;
                    inset: 0;
                    pointer-events: none;
                    background:
                        radial-gradient(circle at 94% 12%, rgba(124,58,237,0.22) 0 1px, transparent 2px) 0 0 / 18px 18px,
                        repeating-radial-gradient(ellipse at 52% 100%, transparent 0 26px, rgba(124,58,237,0.14) 27px 28px, transparent 29px 48px);
                    opacity: 0.55;
                    mask-image: linear-gradient(180deg, black, transparent 88%);
                }
                .authLayout {
                    min-height: 100vh;
                    display: grid;
                    grid-template-columns: minmax(560px, 1.15fr) minmax(480px, 0.85fr);
                    gap: 56px;
                    align-items: center;
                    padding: 36px 64px;
                    position: relative;
                    z-index: 1;
                }
                .authShowcase {
                    min-height: calc(100vh - 72px);
                    border-radius: 28px;
                    border: 1px solid rgba(255,255,255,0.84);
                    background: linear-gradient(135deg, rgba(255,255,255,0.82), rgba(246,240,255,0.72));
                    box-shadow: 0 30px 100px rgba(91,33,182,0.16);
                    position: relative;
                    overflow: hidden;
                    padding: 44px 42px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }
                .authShowcase::after {
                    content: '';
                    position: absolute;
                    left: -10%;
                    right: -10%;
                    bottom: -90px;
                    height: 240px;
                    background: repeating-radial-gradient(ellipse at 50% 0%, transparent 0 22px, rgba(124,58,237,0.18) 23px 24px, transparent 25px 42px);
                    opacity: 0.8;
                }
                .authLogoMark {
                    position: absolute;
                    top: 34px;
                    left: 36px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 22px;
                    z-index: 2;
                }
                .authLogoMark img { width: 32px; height: 32px; }
                .authOrbit {
                    position: absolute;
                    right: 64px;
                    top: 98px;
                    width: 280px;
                    height: 210px;
                    z-index: 1;
                }
                .authOrbitRing {
                    position: absolute;
                    inset: 28px 0;
                    border: 2px solid rgba(124,58,237,0.18);
                    border-radius: 50%;
                    transform: rotate(9deg);
                }
                .authOrbitCore {
                    position: absolute;
                    left: 76px;
                    top: 38px;
                    width: 134px;
                    height: 134px;
                    border-radius: 34px;
                    display: grid;
                    place-items: center;
                    color: white;
                    font-size: 78px;
                    font-weight: 950;
                    background: linear-gradient(145deg, #8b5cf6, #5b21b6);
                    box-shadow: inset 0 -16px 32px rgba(35,16,88,0.24), 0 28px 60px rgba(91,33,182,0.34);
                    transform: rotate(6deg);
                }
                .authFloatIcon {
                    position: absolute;
                    width: 50px;
                    height: 50px;
                    border-radius: 16px;
                    display: grid;
                    place-items: center;
                    color: #7c3aed;
                    background: rgba(255,255,255,0.9);
                    box-shadow: 0 18px 38px rgba(91,33,182,0.18);
                }
                .authFloatIconOne { left: 22px; top: 34px; }
                .authFloatIconTwo { right: 8px; top: 24px; transform: rotate(8deg); }
                .authFloatIconThree { right: 18px; bottom: 4px; border-radius: 50%; }
                .authCopy {
                    max-width: 560px;
                    position: relative;
                    z-index: 2;
                    margin-top: 126px;
                }
                .authBadge {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 9px 14px;
                    border-radius: 999px;
                    background: rgba(124,58,237,0.09);
                    border: 1px solid rgba(124,58,237,0.15);
                    color: #6d28d9;
                    font-size: 12px;
                    font-weight: 900;
                    text-transform: uppercase;
                    margin-bottom: 18px;
                }
                .authCopy h1 {
                    margin: 0 0 18px;
                    font-size: clamp(38px, 4.4vw, 54px);
                    line-height: 1.05;
                    letter-spacing: -1.4px;
                    font-weight: 950;
                }
                .authCopy h1 span { color: #7c3aed; }
                .authCopy p {
                    margin: 0;
                    max-width: 450px;
                    color: #64748b;
                    font-size: 16px;
                    line-height: 1.75;
                }
                .authBenefits {
                    position: relative;
                    z-index: 2;
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 18px;
                    margin-top: 48px;
                }
                .authBenefits div {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    min-width: 0;
                }
                .authBenefits svg,
                .authBottomNote svg {
                    flex: 0 0 auto;
                    color: #7c3aed;
                    padding: 12px;
                    width: 50px;
                    height: 50px;
                    border-radius: 15px;
                    background: rgba(255,255,255,0.9);
                    box-shadow: 0 14px 32px rgba(91,33,182,0.12);
                }
                .authBenefits strong {
                    display: block;
                    font-size: 13px;
                    color: #5b21b6;
                    margin-bottom: 4px;
                }
                .authBenefits small {
                    display: block;
                    color: #64748b;
                    line-height: 1.45;
                    font-size: 12px;
                }
                .authBottomNote {
                    position: relative;
                    z-index: 2;
                    display: flex;
                    align-items: center;
                    gap: 18px;
                    margin-top: 42px;
                    padding: 20px 22px;
                    border-radius: 20px;
                    background: rgba(255,255,255,0.72);
                    border: 1px solid rgba(255,255,255,0.9);
                    box-shadow: 0 20px 60px rgba(91,33,182,0.12);
                    font-weight: 800;
                    color: #334155;
                    font-size: 14px;
                }
                .authMain {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .authCard {
                    width: 100%;
                    max-width: 520px;
                    padding: 38px 34px;
                    border-radius: 28px;
                    background: rgba(255,255,255,0.88);
                    border: 1px solid rgba(255,255,255,0.92);
                    box-shadow: 0 30px 90px rgba(91,33,182,0.16);
                }
                .authBrand {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    justify-content: center;
                    margin-bottom: 24px;
                }
                .authBrand img {
                    height: 24px;
                    width: 24px;
                    object-fit: contain;
                }
                .authBrand strong {
                    color: #6d28d9;
                    font-size: 15px;
                    font-weight: 900;
                    letter-spacing: -0.2px;
                }
                .authHeader {
                    text-align: center;
                    margin-bottom: 24px;
                }
                .authHeader h2 {
                    margin: 0 0 10px;
                    font-size: 30px;
                    color: #7c3aed;
                    font-weight: 950;
                    letter-spacing: -0.7px;
                }
                .authHeader p {
                    margin: 0;
                    color: #64748b;
                    font-size: 14px;
                    font-weight: 600;
                }
                .authGrid2 {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 14px;
                }
                .authField {
                    display: block;
                    margin-bottom: 16px;
                }
                .authField > span {
                    display: block;
                    margin-bottom: 8px;
                    color: #334155;
                    font-size: 13px;
                    font-weight: 800;
                }
                .authField div {
                    position: relative;
                    display: flex;
                    align-items: center;
                }
                .authField div svg {
                    position: absolute;
                    left: 16px;
                    color: #7c3aed;
                }
                .authField input {
                    width: 100%;
                    height: 50px;
                    border: 1px solid rgba(124,58,237,0.18);
                    border-radius: 14px;
                    background: rgba(246,240,255,0.62);
                    color: #111827;
                    padding: 0 16px 0 46px;
                    outline: none;
                    font-size: 14px;
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.82);
                    transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
                }
                .authField input:focus {
                    background: #fff;
                    border-color: rgba(124,58,237,0.5);
                    box-shadow: 0 0 0 4px rgba(124,58,237,0.10);
                }
                .authTerms {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin: 2px 0 18px;
                    color: #64748b;
                    font-size: 13px;
                    font-weight: 700;
                }
                .authTerms input {
                    width: 18px;
                    height: 18px;
                    accent-color: #7c3aed;
                }
                .authTerms a {
                    color: #7c3aed;
                    text-decoration: none;
                    font-weight: 900;
                }
                .authSubmit {
                    width: 100%;
                    height: 52px;
                    border: 0;
                    border-radius: 13px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    color: white;
                    font-weight: 900;
                    cursor: pointer;
                    background: linear-gradient(135deg, #8b5cf6, #6d28d9);
                    box-shadow: 0 14px 32px rgba(109,40,217,0.28);
                }
                .authSubmit:disabled {
                    opacity: 0.72;
                    cursor: not-allowed;
                }
                .authFooter {
                    display: flex;
                    justify-content: center;
                    gap: 7px;
                    color: #64748b;
                    font-size: 14px;
                    margin-top: 24px;
                }
                .authFooter a {
                    color: #7c3aed;
                    text-decoration: none;
                    font-weight: 900;
                }
                @media (max-width: 1080px) {
                    .authLayout {
                        grid-template-columns: 1fr;
                        padding: 22px;
                    }
                    .authShowcase {
                        display: none;
                    }
                    .authCard {
                        max-width: 520px;
                    }
                }
                @media (max-width: 560px) {
                    .authLayout {
                        padding: 16px;
                    }
                    .authCard {
                        padding: 32px 20px;
                        border-radius: 24px;
                    }
                    .authGrid2 {
                        grid-template-columns: 1fr;
                        gap: 0;
                    }
                    .authHeader h2 {
                        font-size: 26px;
                    }
                }
            `}</style>
        </div>
    );
}
