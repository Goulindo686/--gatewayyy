'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, withdrawalsAPI } from '@/lib/api';
import { FiArrowRight, FiCheckCircle, FiUser, FiShield } from 'react-icons/fi';

export default function OnboardingBar() {
    const router = useRouter();
    const [step1Done, setStep1Done] = useState<boolean | null>(null);
    const [step2Done, setStep2Done] = useState<boolean | null>(null);

    useEffect(() => {
        const check = async () => {
            try {
                const { data: profileData } = await authAPI.getProfile();
                const u = profileData.user;

                // Admin não precisa de onboarding
                if (u.role === 'admin') { setStep1Done(true); setStep2Done(true); return; }

                // Passo 1: dados básicos preenchidos
                const hasProfile = !!(u.name && u.cpf_cnpj && u.pix_key && u.bank_name && u.bank_agency && u.bank_account);
                setStep1Done(hasProfile);

                // Passo 2: verificação de identidade concluída
                try {
                    const { data: balanceData } = await withdrawalsAPI.getBalance();
                    setStep2Done(balanceData?.recipient_status === 'active');
                } catch {
                    setStep2Done(false);
                }
            } catch {
                // silencioso
            }
        };
        check();
    }, []);

    // Ainda carregando
    if (step1Done === null || step2Done === null) return null;

    // Tudo concluído — some
    if (step1Done && step2Done) return null;

    return (
        <div style={{
            borderBottom: '1px solid rgba(108,92,231,0.2)',
            background: 'rgba(108,92,231,0.06)',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
        }}>
            {/* Título */}
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', flexShrink: 0 }}>
                Complete seu cadastro:
            </span>

            {/* Passo 1 */}
            <button
                onClick={() => !step1Done && router.push('/dashboard/settings')}
                style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 14px', borderRadius: 10, border: 'none',
                    cursor: step1Done ? 'default' : 'pointer',
                    background: step1Done ? 'rgba(85,239,196,0.12)' : 'rgba(108,92,231,0.15)',
                    color: step1Done ? '#55efc4' : '#a29bfe',
                    fontWeight: 600, fontSize: 13,
                    transition: 'opacity 0.2s',
                    opacity: step1Done ? 0.8 : 1,
                }}
            >
                {step1Done
                    ? <FiCheckCircle size={15} />
                    : <FiUser size={15} />
                }
                {step1Done ? 'Dados preenchidos' : 'Preencher dados e banco'}
                {!step1Done && <FiArrowRight size={13} />}
            </button>

            {/* Separador */}
            <span style={{ color: 'var(--text-muted)', fontSize: 16, flexShrink: 0 }}>→</span>

            {/* Passo 2 */}
            <button
                onClick={() => !step2Done && router.push('/dashboard/withdrawals')}
                style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 14px', borderRadius: 10, border: 'none',
                    cursor: step2Done ? 'default' : 'pointer',
                    background: step2Done
                        ? 'rgba(85,239,196,0.12)'
                        : step1Done
                            ? 'rgba(255,171,0,0.15)'
                            : 'rgba(255,255,255,0.04)',
                    color: step2Done
                        ? '#55efc4'
                        : step1Done
                            ? '#fdcb6e'
                            : 'var(--text-muted)',
                    fontWeight: 600, fontSize: 13,
                    transition: 'opacity 0.2s',
                    opacity: (!step1Done && !step2Done) ? 0.5 : 1,
                }}
            >
                {step2Done
                    ? <FiCheckCircle size={15} />
                    : <FiShield size={15} />
                }
                {step2Done ? 'Identidade verificada' : 'Verificar identidade'}
                {!step2Done && step1Done && <FiArrowRight size={13} />}
            </button>
        </div>
    );
}
