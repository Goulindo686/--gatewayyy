'use client';

/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FiArrowRight, FiCheckCircle, FiClock, FiDollarSign, FiShield, FiUsers } from 'react-icons/fi';

function formatBRL(cents: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(cents || 0) / 100);
}

export default function AffiliateInvitePage() {
    const params = useParams<{ code: string }>();
    const router = useRouter();
    const code = String(params?.code || '');
    const [invitation, setInvitation] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [signedIn, setSignedIn] = useState(false);

    useEffect(() => {
        if (!code) return;
        const hasToken = Boolean(localStorage.getItem('token'));
        fetch(`/api/affiliates/invite/${encodeURIComponent(code)}`, { cache: 'no-store' })
            .then(async (response) => {
                const body = await response.json();
                if (!response.ok) throw new Error(body.error || 'Convite indisponivel.');
                return body;
            })
            .then((body) => {
                setInvitation(body.invitation);
                setSignedIn(hasToken);
            })
            .catch((requestError) => setError(requestError.message))
            .finally(() => setLoading(false));
    }, [code]);

    const continueInvitation = (destination: '/login' | '/register' | '/dashboard/affiliates') => {
        localStorage.setItem('pending_affiliate_invite', code);
        router.push(destination === '/dashboard/affiliates'
            ? `/dashboard/affiliates?invite=${encodeURIComponent(code)}`
            : destination);
    };

    if (loading) {
        return <main className="invite-page"><div className="loading"><span /></div><style jsx>{styles}</style></main>;
    }

    if (error || !invitation) {
        return (
            <main className="invite-page">
                <section className="error-card">
                    <FiShield />
                    <h1>Convite indisponivel</h1>
                    <p>{error || 'Este convite expirou ou o programa foi desativado.'}</p>
                    <button onClick={() => router.push('/')}>Voltar para a GouPay</button>
                </section>
                <style jsx>{styles}</style>
            </main>
        );
    }

    const rate = (Number(invitation.commission_rate_bps) / 100).toFixed(2).replace('.', ',');

    return (
        <main className="invite-page">
            <section className="invite-card">
                <div className="brand"><img src="/favicon.png" alt="GouPay" /><strong>GouPay</strong></div>
                <div className="hero">
                    <div className="product-image">
                        {invitation.product?.image_url
                            ? <img src={invitation.product.image_url} alt={invitation.product.name} />
                            : <FiUsers />}
                    </div>
                    <span className="eyebrow">Convite para afiliacao</span>
                    <h1>Divulgue {invitation.product?.name}</h1>
                    <p>Convite enviado por <strong>{invitation.producer?.name}</strong> para voce promover este produto pela GouPay.</p>
                </div>

                <div className="facts">
                    <article><FiDollarSign /><span><small>Comissao por venda</small><strong>{rate}%</strong></span></article>
                    <article><FiClock /><span><small>Duracao do cookie</small><strong>{invitation.cookie_days} dias</strong></span></article>
                    <article><FiCheckCircle /><span><small>Preco do produto</small><strong>{formatBRL(invitation.product?.price)}</strong></span></article>
                </div>

                {invitation.terms_text && (
                    <div className="terms"><strong>Termos do produtor</strong><p>{invitation.terms_text}</p></div>
                )}

                <div className="actions">
                    {signedIn ? (
                        <button className="primary" onClick={() => continueInvitation('/dashboard/affiliates')}>
                            Ver convite no meu painel <FiArrowRight />
                        </button>
                    ) : (
                        <>
                            <button className="primary" onClick={() => continueInvitation('/register')}>
                                Criar conta e aceitar <FiArrowRight />
                            </button>
                            <button className="secondary" onClick={() => continueInvitation('/login')}>
                                Ja tenho conta
                            </button>
                        </>
                    )}
                </div>
                <small className="legal">A afiliacao somente e concluida depois que voce aceita os termos no painel.</small>
            </section>
            <style jsx>{styles}</style>
        </main>
    );
}

const styles = `
    .invite-page{min-height:100vh;display:grid;place-items:center;padding:28px;background:
        radial-gradient(circle at 12% 15%,rgba(124,58,237,.18),transparent 30%),
        radial-gradient(circle at 88% 80%,rgba(79,70,229,.14),transparent 34%),#f5f6fa;color:#111827}
    .invite-card,.error-card{width:min(680px,100%);box-sizing:border-box;background:#fff;border:1px solid #e5e7eb;border-radius:24px;padding:30px;box-shadow:0 28px 80px rgba(30,41,59,.16)}
    .brand{display:flex;align-items:center;gap:9px;font-size:17px}.brand img{width:34px;height:34px;object-fit:contain}
    .hero{text-align:center;padding:28px 15px 20px}.product-image{width:96px;height:96px;margin:0 auto 18px;border-radius:22px;overflow:hidden;display:grid;place-items:center;background:#f3f0ff;color:#7c3aed;font-size:36px;box-shadow:0 12px 30px rgba(124,58,237,.16)}.product-image img{width:100%;height:100%;object-fit:cover}
    .eyebrow{display:block;color:#7c3aed;text-transform:uppercase;letter-spacing:.12em;font-size:11px;font-weight:900}.hero h1{font-size:31px;line-height:1.15;margin:8px 0 10px}.hero p{max-width:510px;margin:0 auto;color:#64748b;line-height:1.6}
    .facts{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.facts article{display:flex;align-items:center;gap:10px;padding:14px;border:1px solid #e5e7eb;border-radius:13px;color:#7c3aed}.facts span{display:grid;gap:3px}.facts small{color:#64748b}.facts strong{color:#111827}
    .terms{margin-top:14px;padding:15px;border-radius:13px;background:#f8fafc;border:1px solid #e5e7eb}.terms p{margin:7px 0 0;white-space:pre-wrap;color:#64748b;font-size:13px;line-height:1.55;max-height:130px;overflow:auto}
    .actions{display:grid;gap:9px;margin-top:20px}.actions button,.error-card button{min-height:48px;border-radius:12px;font:inherit;font-weight:800;cursor:pointer}.primary{display:flex;align-items:center;justify-content:center;gap:8px;border:0;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff}.secondary,.error-card button{border:1px solid #d1d5db;background:#fff;color:#111827}.legal{display:block;text-align:center;color:#94a3b8;margin-top:14px}
    .error-card{text-align:center}.error-card>svg{font-size:40px;color:#7c3aed}.error-card h1{margin:12px 0 5px}.error-card p{color:#64748b}.error-card button{padding:0 18px}
    .loading{width:44px;height:44px;border:4px solid #ddd6fe;border-top-color:#7c3aed;border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
    @media(max-width:620px){.invite-page{padding:14px}.invite-card,.error-card{padding:20px;border-radius:19px}.hero{padding:22px 0 17px}.hero h1{font-size:25px}.facts{grid-template-columns:1fr}.facts article{padding:12px}}
`;
