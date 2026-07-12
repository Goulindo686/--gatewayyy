'use client';

import { useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiCheckCircle, FiClock, FiLock, FiMail, FiRefreshCw, FiSend, FiShield } from 'react-icons/fi';

export default function ForgotPasswordPage() {
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [email, setEmail] = useState('');
    const brandLogo = 'https://i.imgur.com/vXgH6Mn.png';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post('/api/auth/forgot-password', { email });
            setSent(true);
            toast.success('Email de recuperacao enviado!');
        } catch {
            toast.error('Erro ao enviar email');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="authShell">
            <div className="authLayout">
                <aside className="authShowcase">
                    <div className="authLogoMark">
                        <img src="/favicon.png" alt="GouPay" />
                        <strong>GouPay</strong>
                    </div>

                    <div className="authLockScene" aria-hidden="true">
                        <div className="authLockBody"><FiLock size={76} /></div>
                        <span className="authFloatIcon authFloatIconOne"><FiShield size={22} /></span>
                        <span className="authFloatIcon authFloatIconTwo"><FiMail size={22} /></span>
                        <span className="authFloatIcon authFloatIconThree"><FiRefreshCw size={22} /></span>
                    </div>

                    <div className="authCopy">
                        <div className="authBadge"><FiLock size={13} /> Acesso seguro</div>
                        <h1>Recupere sua conta sem perder o ritmo das <span>vendas.</span></h1>
                        <p>Enviamos um link seguro para o e-mail cadastrado. Depois disso, basta definir uma nova senha e voltar ao painel.</p>
                    </div>

                    <div className="authBenefits">
                        <div><FiShield size={26} /><span><strong>100% Seguro</strong><small>Protegemos seus dados com verificacao segura.</small></span></div>
                        <div><FiSend size={26} /><span><strong>Link por email</strong><small>Voce recebera um link para redefinir sua senha.</small></span></div>
                        <div><FiClock size={26} /><span><strong>Rapido e facil</strong><small>O processo leva menos de 2 minutos.</small></span></div>
                    </div>

                    <div className="authBottomNote">
                        <FiLock size={26} />
                        <span>Protegemos o acesso para que somente o titular consiga alterar a senha da conta.</span>
                    </div>
                </aside>

                <main className="authMain">
                    <section className="authCard">
                        <div className="authBrand">
                            <img
                                src={brandLogo}
                                alt="GouPay"
                                onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src = '/logo.png';
                                }}
                            />
                        </div>

                        <div className="authMailOrb">
                            {sent ? <FiCheckCircle size={38} /> : <FiMail size={38} />}
                        </div>

                        <header className="authHeader">
                            <h2>Recuperar <span>senha</span></h2>
                            <p>{sent ? 'Confira seu email para continuar' : 'Informe o e-mail usado na sua conta para receber o link de recuperacao.'}</p>
                        </header>

                        {!sent ? (
                            <form onSubmit={handleSubmit}>
                                <label className="authField">
                                    <span>Email</span>
                                    <div>
                                        <FiMail size={17} />
                                        <input
                                            type="email"
                                            placeholder="seu@email.com"
                                            required
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                        />
                                    </div>
                                </label>

                                <button type="submit" className="authSubmit" disabled={loading}>
                                    {loading ? 'Enviando...' : <><FiSend size={17} /> Enviar link</>}
                                </button>
                            </form>
                        ) : (
                            <div className="authSuccess">
                                <FiCheckCircle size={34} />
                                <p>Se uma conta existir com este email, voce recebera as instrucoes de recuperacao em alguns minutos.</p>
                            </div>
                        )}

                        <div className="authDivider"><span>ou</span></div>

                        <Link href="/login" className="authBackButton">
                            <FiArrowLeft size={16} /> Voltar para login
                        </Link>
                    </section>
                </main>
            </div>

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
                    grid-template-columns: minmax(560px, 1.15fr) minmax(420px, 0.85fr);
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
                .authLockScene {
                    position: absolute;
                    right: 74px;
                    top: 150px;
                    width: 300px;
                    height: 230px;
                    z-index: 1;
                }
                .authLockScene::before {
                    content: '';
                    position: absolute;
                    inset: 44px 0;
                    border: 2px solid rgba(124,58,237,0.18);
                    border-radius: 50%;
                    transform: rotate(9deg);
                }
                .authLockBody {
                    position: absolute;
                    left: 82px;
                    top: 28px;
                    width: 140px;
                    height: 140px;
                    border-radius: 36px;
                    display: grid;
                    place-items: center;
                    color: #4c1d95;
                    background: linear-gradient(145deg, #ede9fe, #8b5cf6);
                    box-shadow: inset 0 -18px 34px rgba(76,29,149,0.18), 0 28px 60px rgba(91,33,182,0.28);
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
                .authFloatIconOne { left: 28px; top: 48px; }
                .authFloatIconTwo { right: 16px; top: 66px; }
                .authFloatIconThree { right: 56px; bottom: 6px; border-radius: 50%; }
                .authCopy {
                    max-width: 560px;
                    position: relative;
                    z-index: 2;
                    margin-top: 90px;
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
                    font-size: clamp(38px, 4.3vw, 52px);
                    line-height: 1.05;
                    letter-spacing: -1.4px;
                    font-weight: 950;
                }
                .authCopy h1 span,
                .authHeader h2 span { color: #7c3aed; }
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
                    margin-top: 54px;
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
                    margin-top: 54px;
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
                    max-width: 430px;
                    padding: 44px 34px;
                    border-radius: 28px;
                    background: rgba(255,255,255,0.88);
                    border: 1px solid rgba(255,255,255,0.92);
                    box-shadow: 0 30px 90px rgba(91,33,182,0.16);
                }
                .authBrand {
                    display: flex;
                    justify-content: center;
                    margin-bottom: 22px;
                }
                .authBrand img {
                    height: 34px;
                    width: auto;
                    object-fit: contain;
                }
                .authMailOrb {
                    width: 82px;
                    height: 82px;
                    border-radius: 50%;
                    margin: 0 auto 20px;
                    display: grid;
                    place-items: center;
                    color: #7c3aed;
                    background: radial-gradient(circle, rgba(124,58,237,0.18), rgba(124,58,237,0.04));
                    box-shadow: 0 18px 42px rgba(91,33,182,0.14);
                }
                .authHeader {
                    text-align: center;
                    margin-bottom: 28px;
                }
                .authHeader h2 {
                    margin: 0 0 10px;
                    font-size: 30px;
                    color: #111827;
                    font-weight: 950;
                    letter-spacing: -0.7px;
                }
                .authHeader p {
                    margin: 0 auto;
                    color: #64748b;
                    font-size: 14px;
                    font-weight: 600;
                    line-height: 1.65;
                    max-width: 310px;
                }
                .authField {
                    display: block;
                    margin-bottom: 20px;
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
                    height: 52px;
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
                .authSubmit,
                .authBackButton {
                    width: 100%;
                    height: 52px;
                    border-radius: 13px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    font-weight: 900;
                    text-decoration: none;
                }
                .authSubmit {
                    border: 0;
                    color: white;
                    cursor: pointer;
                    background: linear-gradient(135deg, #8b5cf6, #6d28d9);
                    box-shadow: 0 14px 32px rgba(109,40,217,0.28);
                }
                .authSubmit:disabled {
                    opacity: 0.72;
                    cursor: not-allowed;
                }
                .authBackButton {
                    border: 1px solid rgba(124,58,237,0.22);
                    color: #7c3aed;
                    background: rgba(255,255,255,0.68);
                }
                .authDivider {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    color: #94a3b8;
                    font-size: 13px;
                    font-weight: 800;
                    margin: 26px 0;
                }
                .authDivider::before,
                .authDivider::after {
                    content: '';
                    flex: 1;
                    height: 1px;
                    background: rgba(124,58,237,0.14);
                }
                .authSuccess {
                    padding: 22px;
                    border-radius: 20px;
                    background: rgba(124,58,237,0.08);
                    border: 1px solid rgba(124,58,237,0.14);
                    text-align: center;
                    color: #6d28d9;
                }
                .authSuccess p {
                    margin: 10px 0 0;
                    color: #475569;
                    font-size: 14px;
                    line-height: 1.65;
                }
                @media (max-width: 980px) {
                    .authLayout {
                        grid-template-columns: 1fr;
                        padding: 22px;
                    }
                    .authShowcase {
                        display: none;
                    }
                    .authCard {
                        max-width: 460px;
                    }
                }
                @media (max-width: 460px) {
                    .authLayout {
                        padding: 16px;
                    }
                    .authCard {
                        padding: 32px 20px;
                        border-radius: 24px;
                    }
                    .authHeader h2 {
                        font-size: 26px;
                    }
                }
            `}</style>
        </div>
    );
}
