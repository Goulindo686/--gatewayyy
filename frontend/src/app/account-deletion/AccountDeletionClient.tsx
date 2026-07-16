'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { FiAlertCircle, FiArrowLeft, FiCheckCircle, FiClock, FiLock, FiMail, FiShield, FiTrash2 } from 'react-icons/fi';

type FormState = {
    name: string;
    accountEmail: string;
    contactEmail: string;
    reason: string;
    confirmed: boolean;
    website: string;
};

const initialForm: FormState = {
    name: '',
    accountEmail: '',
    contactEmail: '',
    reason: '',
    confirmed: false,
    website: '',
};

export default function AccountDeletionClient() {
    const [form, setForm] = useState<FormState>(initialForm);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const update = (field: keyof FormState, value: string | boolean) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        setResult(null);

        try {
            const response = await fetch('/api/account-deletion/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data?.error || 'Nao foi possivel enviar a solicitacao.');
            }

            setForm(initialForm);
            setResult({
                type: 'success',
                message: data?.message || 'Solicitacao recebida. A equipe GouPay analisara seu pedido.',
            });
        } catch (error: any) {
            setResult({
                type: 'error',
                message: error?.message || 'Nao foi possivel enviar a solicitacao agora.',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="deletion-page">
            <style jsx>{`
                .deletion-page {
                    min-height: 100vh;
                    color: var(--text-primary);
                    background:
                        radial-gradient(circle at top left, rgba(124,58,237,0.18), transparent 34%),
                        linear-gradient(180deg, var(--bg-primary), var(--bg-secondary));
                    padding: 32px 22px 72px;
                }
                .wrap {
                    width: 100%;
                    max-width: 1120px;
                    margin: 0 auto;
                }
                .topbar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 16px;
                    margin-bottom: 34px;
                }
                .brand {
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    color: var(--text-primary);
                    font-weight: 950;
                    text-decoration: none;
                }
                .brand img {
                    width: 38px;
                    height: 38px;
                    object-fit: contain;
                }
                .back {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    color: var(--text-secondary);
                    text-decoration: none;
                    font-size: 13px;
                    font-weight: 850;
                }
                .hero {
                    display: grid;
                    grid-template-columns: minmax(0, 1.02fr) minmax(340px, 0.98fr);
                    gap: 26px;
                    align-items: start;
                }
                .panel {
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: 18px;
                    box-shadow: 0 18px 44px rgba(15,23,42,0.08);
                }
                .copy {
                    padding: 30px;
                }
                .eyebrow {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 7px 10px;
                    border-radius: 999px;
                    background: rgba(124,58,237,0.11);
                    color: #7c3aed;
                    font-size: 12px;
                    font-weight: 950;
                    margin-bottom: 16px;
                }
                h1 {
                    margin: 0;
                    font-size: 34px;
                    line-height: 1.08;
                    letter-spacing: 0;
                    font-weight: 950;
                }
                .lead {
                    color: var(--text-secondary);
                    font-size: 15px;
                    line-height: 1.75;
                    margin: 16px 0 0;
                }
                .info-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                    margin-top: 24px;
                }
                .info-card {
                    border: 1px solid var(--border-color);
                    background: var(--bg-secondary);
                    border-radius: 14px;
                    padding: 15px;
                }
                .info-card strong {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 13px;
                    margin-bottom: 7px;
                }
                .info-card p {
                    margin: 0;
                    color: var(--text-secondary);
                    font-size: 12.5px;
                    line-height: 1.55;
                }
                .legal {
                    margin-top: 18px;
                    padding: 16px;
                    border-radius: 14px;
                    border: 1px solid rgba(245,158,11,0.25);
                    background: rgba(245,158,11,0.10);
                    color: var(--text-secondary);
                    font-size: 13px;
                    line-height: 1.7;
                }
                .form-panel {
                    padding: 24px;
                }
                .form-title {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 17px;
                    font-weight: 950;
                    margin: 0 0 16px;
                }
                .field {
                    display: grid;
                    gap: 7px;
                    margin-bottom: 13px;
                }
                .field label {
                    font-size: 12px;
                    color: var(--text-secondary);
                    font-weight: 850;
                }
                .field input,
                .field textarea {
                    width: 100%;
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    background: var(--bg-secondary);
                    color: var(--text-primary);
                    padding: 12px 13px;
                    font-size: 14px;
                    outline: none;
                }
                .field textarea {
                    min-height: 104px;
                    resize: vertical;
                }
                .field input:focus,
                .field textarea:focus {
                    border-color: #8b5cf6;
                    box-shadow: 0 0 0 3px rgba(139,92,246,0.14);
                }
                .honeypot {
                    display: none;
                }
                .check {
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                    padding: 13px;
                    border-radius: 12px;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    margin: 10px 0 16px;
                    color: var(--text-secondary);
                    font-size: 12.5px;
                    line-height: 1.55;
                }
                .check input {
                    margin-top: 3px;
                    width: 16px;
                    height: 16px;
                    flex: 0 0 auto;
                }
                .submit {
                    width: 100%;
                    height: 46px;
                    border: 0;
                    border-radius: 13px;
                    background: linear-gradient(135deg, #7c3aed, #5b21b6);
                    color: white;
                    font-weight: 950;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 9px;
                    box-shadow: 0 15px 30px rgba(124,58,237,0.24);
                }
                .submit:disabled {
                    opacity: .62;
                    cursor: not-allowed;
                }
                .result {
                    margin-top: 14px;
                    border-radius: 12px;
                    padding: 13px 14px;
                    display: flex;
                    gap: 9px;
                    align-items: flex-start;
                    font-size: 13px;
                    line-height: 1.55;
                }
                .result.success {
                    color: #166534;
                    background: #dcfce7;
                    border: 1px solid #bbf7d0;
                }
                .result.error {
                    color: #991b1b;
                    background: #fee2e2;
                    border: 1px solid #fecaca;
                }
                .support {
                    margin-top: 16px;
                    color: var(--text-secondary);
                    font-size: 12.5px;
                    line-height: 1.65;
                }
                .support a {
                    color: #7c3aed;
                    font-weight: 850;
                    text-decoration: none;
                }
                @media (max-width: 900px) {
                    .hero {
                        grid-template-columns: 1fr;
                    }
                    .info-grid {
                        grid-template-columns: 1fr;
                    }
                }
                @media (max-width: 560px) {
                    .deletion-page {
                        padding: 24px 14px 54px;
                    }
                    .topbar {
                        align-items: flex-start;
                        flex-direction: column;
                    }
                    .copy,
                    .form-panel {
                        padding: 20px;
                    }
                    h1 {
                        font-size: 27px;
                    }
                }
            `}</style>

            <div className="wrap">
                <div className="topbar">
                    <Link href="/" className="brand">
                        <img src="/logo.png" alt="GouPay" />
                        <span>GouPay</span>
                    </Link>
                    <Link href="/terms/privacy" className="back">
                        <FiArrowLeft size={15} />
                        Politica de Privacidade
                    </Link>
                </div>

                <div className="hero">
                    <section className="panel copy">
                        <div className="eyebrow">
                            <FiShield size={14} />
                            Privacidade e controle de dados
                        </div>
                        <h1>Solicite a exclusao da sua conta GouPay e dos dados elegiveis.</h1>
                        <p className="lead">
                            Use este canal para pedir a exclusao da sua conta e dos dados pessoais associados. A equipe GouPay analisara a solicitacao, confirmara a titularidade quando necessario e removera ou anonimizara os dados que puderem ser excluidos.
                        </p>

                        <div className="info-grid">
                            <div className="info-card">
                                <strong><FiMail size={15} /> Como solicitar</strong>
                                <p>Preencha o formulario com o email da conta GouPay. Voce tambem pode escrever para support@goupay.com.br.</p>
                            </div>
                            <div className="info-card">
                                <strong><FiClock size={15} /> Prazo de resposta</strong>
                                <p>Responderemos em ate 15 dias, conforme previsto na LGPD, usando o email informado no pedido.</p>
                            </div>
                            <div className="info-card">
                                <strong><FiTrash2 size={15} /> Dados excluidos</strong>
                                <p>Dados de perfil, preferencias, acessos e informacoes que nao precisem ser mantidas podem ser excluidos ou anonimizados.</p>
                            </div>
                            <div className="info-card">
                                <strong><FiLock size={15} /> Dados retidos</strong>
                                <p>Registros fiscais, financeiros, antifraude, KYC, disputas e chargebacks podem ser mantidos pelos prazos legais.</p>
                            </div>
                        </div>

                        <div className="legal">
                            A exclusao da conta pode encerrar o acesso ao painel, produtos, historico operacional e funcionalidades da plataforma. Solicitacoes ligadas a saldo, saque, contestacao ou obrigacao legal podem exigir verificacao adicional.
                        </div>
                    </section>

                    <section className="panel form-panel">
                        <h2 className="form-title">
                            <FiTrash2 size={18} />
                            Formulario de solicitacao
                        </h2>
                        <form onSubmit={submit}>
                            <div className="field">
                                <label>Nome completo</label>
                                <input
                                    value={form.name}
                                    onChange={(event) => update('name', event.target.value)}
                                    placeholder="Seu nome"
                                    required
                                />
                            </div>
                            <div className="field">
                                <label>Email da conta GouPay</label>
                                <input
                                    type="email"
                                    value={form.accountEmail}
                                    onChange={(event) => update('accountEmail', event.target.value)}
                                    placeholder="email usado na conta"
                                    required
                                />
                            </div>
                            <div className="field">
                                <label>Email para contato</label>
                                <input
                                    type="email"
                                    value={form.contactEmail}
                                    onChange={(event) => update('contactEmail', event.target.value)}
                                    placeholder="pode ser o mesmo email"
                                    required
                                />
                            </div>
                            <div className="field">
                                <label>Observacao opcional</label>
                                <textarea
                                    value={form.reason}
                                    onChange={(event) => update('reason', event.target.value)}
                                    placeholder="Se quiser, informe detalhes do pedido."
                                    maxLength={900}
                                />
                            </div>
                            <div className="honeypot" aria-hidden="true">
                                <label>Website</label>
                                <input
                                    tabIndex={-1}
                                    autoComplete="off"
                                    value={form.website}
                                    onChange={(event) => update('website', event.target.value)}
                                />
                            </div>
                            <label className="check">
                                <input
                                    type="checkbox"
                                    checked={form.confirmed}
                                    onChange={(event) => update('confirmed', event.target.checked)}
                                    required
                                />
                                <span>
                                    Confirmo que desejo solicitar a exclusao da minha conta GouPay e dos dados pessoais elegiveis, entendendo que alguns registros podem ser retidos por obrigacao legal, fiscal, financeira, antifraude ou regulatoria.
                                </span>
                            </label>
                            <button className="submit" type="submit" disabled={loading}>
                                {loading ? 'Enviando solicitacao...' : 'Solicitar exclusao'}
                            </button>
                        </form>

                        {result && (
                            <div className={`result ${result.type}`}>
                                {result.type === 'success' ? <FiCheckCircle size={16} /> : <FiAlertCircle size={16} />}
                                <span>{result.message}</span>
                            </div>
                        )}

                        <p className="support">
                            Precisa de ajuda? Envie um email para <a href="mailto:support@goupay.com.br">support@goupay.com.br</a>. Veja tambem a <Link href="/terms/privacy">Politica de Privacidade</Link>.
                        </p>
                    </section>
                </div>
            </div>
        </main>
    );
}
