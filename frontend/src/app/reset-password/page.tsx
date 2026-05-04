'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { FiLock, FiArrowLeft, FiEye, FiEyeOff } from 'react-icons/fi';

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [token, setToken] = useState('');

    useEffect(() => {
        // Supabase Auth sends token as hash fragment (#access_token=...)
        // Our custom system sends token as query param (?token=...)
        
        // Check for Supabase Auth token (hash fragment)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const type = hashParams.get('type');
        
        // Check for custom token (query param)
        const tokenParam = searchParams.get('token');
        
        if (type === 'recovery' && accessToken) {
            // Supabase Auth recovery token
            setToken(accessToken);
            console.log('[RESET PASSWORD] Using Supabase Auth token');
        } else if (tokenParam) {
            // Custom token
            setToken(tokenParam);
            console.log('[RESET PASSWORD] Using custom token');
        } else {
            toast.error('Token inválido ou ausente');
            router.push('/login');
        }
    }, [searchParams, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password.length < 6) {
            return toast.error('A senha deve ter no mínimo 6 caracteres');
        }

        if (password !== confirmPassword) {
            return toast.error('As senhas não coincidem');
        }

        setLoading(true);
        try {
            await authAPI.resetPassword({ token, password });
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
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-primary)', padding: 24
        }}>
            <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: 440, padding: 40 }}>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: 14, margin: '0 auto 16px',
                        background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 22, fontWeight: 800, color: 'white'
                    }}>
                        <FiLock size={24} />
                    </div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Redefinir senha</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                        Digite sua nova senha abaixo
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: 20 }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8 }}>
                            Nova senha
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="input-field"
                                placeholder="Mínimo 6 caracteres"
                                required
                                minLength={6}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                style={{ paddingRight: 45 }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: 12,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--text-secondary)',
                                    padding: 4
                                }}
                            >
                                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8 }}>
                            Confirmar senha
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                className="input-field"
                                placeholder="Digite a senha novamente"
                                required
                                minLength={6}
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                style={{ paddingRight: 45 }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                style={{
                                    position: 'absolute',
                                    right: 12,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--text-secondary)',
                                    padding: 4
                                }}
                            >
                                {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={loading}
                        style={{ width: '100%', padding: '14px 28px' }}
                    >
                        {loading ? 'Redefinindo...' : 'Redefinir Senha'}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: 24 }}>
                    <Link href="/login" style={{
                        color: 'var(--accent-secondary)',
                        textDecoration: 'none',
                        fontSize: 14,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6
                    }}>
                        <FiArrowLeft size={14} /> Voltar para login
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div style={{
                minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg-primary)'
            }}>
                <div style={{ width: 36, height: 36, border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
        }>
            <ResetPasswordForm />
        </Suspense>
    );
}
