'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { FiLogIn, FiShield, FiUserPlus, FiX } from 'react-icons/fi';
import { buildAuthUrl } from '@/lib/auth-return';

export default function BuyerAuthChoiceModal({
    actionLabel,
    returnTo,
    onClose,
}: {
    actionLabel: string;
    returnTo: string;
    onClose: () => void;
}) {
    useEffect(() => {
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', closeOnEscape);
        return () => document.removeEventListener('keydown', closeOnEscape);
    }, [onClose]);

    return (
        <div
            className="buyerAuthBackdrop"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <section
                className="buyerAuthModal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="buyer-auth-title"
            >
                <button type="button" className="buyerAuthClose" onClick={onClose} aria-label="Fechar">
                    <FiX size={19} />
                </button>

                <span className="buyerAuthIcon"><FiShield size={24} /></span>
                <p>Conta GouPay</p>
                <h2 id="buyer-auth-title">{actionLabel}</h2>
                <div className="buyerAuthDescription">
                    Entre ou crie uma conta usando o mesmo e-mail informado na compra.
                </div>

                <div className="buyerAuthActions">
                    <Link href={buildAuthUrl('/login', returnTo)}>
                        <FiLogIn size={18} /> Entrar
                    </Link>
                    <Link href={buildAuthUrl('/register', returnTo)}>
                        <FiUserPlus size={18} /> Criar conta
                    </Link>
                </div>
            </section>

            <style jsx>{`
                .buyerAuthBackdrop {
                    align-items:center;
                    background:rgba(5,7,14,.72);
                    display:flex;
                    inset:0;
                    justify-content:center;
                    padding:20px;
                    position:fixed;
                    z-index:1000;
                }
                .buyerAuthModal {
                    background:#fff;
                    border:1px solid rgba(15,23,42,.1);
                    border-radius:8px;
                    box-shadow:0 28px 90px rgba(0,0,0,.3);
                    color:#111827;
                    max-width:430px;
                    padding:30px;
                    position:relative;
                    text-align:center;
                    width:100%;
                }
                .buyerAuthClose {
                    align-items:center;
                    background:#f1f5f9;
                    border:0;
                    border-radius:50%;
                    color:#64748b;
                    cursor:pointer;
                    display:flex;
                    height:36px;
                    justify-content:center;
                    position:absolute;
                    right:16px;
                    top:16px;
                    width:36px;
                }
                .buyerAuthIcon {
                    align-items:center;
                    background:#ecfdf5;
                    border-radius:8px;
                    color:#059669;
                    display:flex;
                    height:54px;
                    justify-content:center;
                    margin:0 auto 15px;
                    width:54px;
                }
                .buyerAuthModal p {
                    color:#059669;
                    font-size:10px;
                    font-weight:900;
                    letter-spacing:.08em;
                    margin:0 0 5px;
                    text-transform:uppercase;
                }
                .buyerAuthModal h2 { font-size:24px; margin:0 0 9px; }
                .buyerAuthDescription {
                    color:#64748b;
                    font-size:13px;
                    line-height:1.55;
                    margin:0 auto 22px;
                    max-width:330px;
                }
                .buyerAuthActions { display:grid; gap:10px; grid-template-columns:1fr 1fr; }
                .buyerAuthActions :global(a) {
                    align-items:center;
                    border:1px solid #dbe2ea;
                    border-radius:8px;
                    color:#334155;
                    display:flex;
                    font-size:13px;
                    font-weight:900;
                    gap:8px;
                    justify-content:center;
                    min-height:48px;
                    padding:0 14px;
                    text-decoration:none;
                }
                .buyerAuthActions :global(a:last-child) {
                    background:#059669;
                    border-color:#059669;
                    color:#fff;
                }
                @media (max-width:480px) {
                    .buyerAuthModal { padding:28px 18px 20px; }
                    .buyerAuthModal h2 { font-size:21px; }
                    .buyerAuthActions { grid-template-columns:1fr; }
                }
            `}</style>
        </div>
    );
}
