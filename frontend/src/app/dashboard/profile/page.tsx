'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    FiCamera,
    FiCheck,
    FiMapPin,
    FiSave,
    FiShield,
    FiUser,
} from 'react-icons/fi';
import { authAPI } from '@/lib/api';
import TwoFactorSettings from '@/components/TwoFactorSettings';

const emptyForm = {
    avatar_url: '',
    name: '',
    email: '',
    phone: '',
    cpf_cnpj: '',
    address_street: '',
    address_number: '',
    address_complement: '',
    address_neighborhood: '',
    address_city: '',
    address_state: '',
    address_zipcode: '',
};

export default function ProfilePage() {
    const [form, setForm] = useState(emptyForm);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        setLoading(true);
        try {
            const { data } = await authAPI.getProfile();
            const user = data.user || {};
            setForm({
                avatar_url: user.avatar_url || '',
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                cpf_cnpj: user.cpf_cnpj || '',
                address_street: user.address_street || '',
                address_number: user.address_number || '',
                address_complement: user.address_complement || '',
                address_neighborhood: user.address_neighborhood || '',
                address_city: user.address_city || '',
                address_state: user.address_state || '',
                address_zipcode: user.address_zipcode || '',
            });
            syncLocalUser(user);
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao carregar perfil.');
        } finally {
            setLoading(false);
        }
    };

    const syncLocalUser = (user: any) => {
        if (typeof window === 'undefined' || !user) return;
        const current = JSON.parse(localStorage.getItem('user') || '{}');
        const next = { ...current, ...user };
        localStorage.setItem('user', JSON.stringify(next));
        window.dispatchEvent(new CustomEvent('goupay:user-updated', { detail: next }));
    };

    const update = (field: keyof typeof emptyForm, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const saveProfile = async (override: Partial<typeof emptyForm> = {}) => {
        const payload = { ...form, ...override };
        setSaving(true);
        try {
            const { data } = await authAPI.updateProfile({
                avatar_url: payload.avatar_url,
                name: payload.name,
                phone: payload.phone,
                cpf_cnpj: payload.cpf_cnpj,
                address_street: payload.address_street,
                address_number: payload.address_number,
                address_complement: payload.address_complement,
                address_neighborhood: payload.address_neighborhood,
                address_city: payload.address_city,
                address_state: payload.address_state,
                address_zipcode: payload.address_zipcode,
            });
            const user = data.user || {};
            setForm((prev) => ({ ...prev, ...payload }));
            syncLocalUser(user);
            toast.success('Perfil atualizado.');
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao salvar perfil.');
        } finally {
            setSaving(false);
        }
    };

    const uploadAvatar = async (file?: File) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error('Envie uma imagem valida.');
            return;
        }

        setUploading(true);
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('file', file);
            const { data } = await axios.post('/api/upload', formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                },
            });
            const avatarUrl = data.url;
            setForm((prev) => ({ ...prev, avatar_url: avatarUrl }));
            await saveProfile({ avatar_url: avatarUrl });
            toast.success('Foto de perfil atualizada.');
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao enviar imagem.');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    if (loading) {
        return (
            <div className="profile-loading">
                <div className="profile-loader" />
                <span>Carregando perfil...</span>
                <style jsx>{`
                    .profile-loading {
                        min-height: 420px;
                        display: grid;
                        place-items: center;
                        gap: 12px;
                        color: var(--text-secondary);
                    }
                    .profile-loader {
                        width: 34px;
                        height: 34px;
                        border-radius: 50%;
                        border: 3px solid rgba(139,92,246,0.18);
                        border-top-color: #8b5cf6;
                        animation: spin 0.8s linear infinite;
                    }
                    @keyframes spin { to { transform: rotate(360deg); } }
                `}</style>
            </div>
        );
    }

    const initials = form.name?.charAt(0)?.toUpperCase() || 'U';

    return (
        <div className="profile-page">
            <style jsx>{`
                .profile-page {
                    --profile-card: var(--bg-card);
                    --profile-border: var(--border-color);
                    --profile-muted: var(--text-secondary);
                    color: var(--text-primary);
                    display: grid;
                    gap: 20px;
                }
                .profile-header {
                    display: flex;
                    align-items: flex-end;
                    justify-content: space-between;
                    gap: 16px;
                    flex-wrap: wrap;
                }
                .profile-title {
                    margin: 0;
                    font-size: 27px;
                    line-height: 1.1;
                    font-weight: 900;
                    letter-spacing: 0;
                }
                .profile-subtitle {
                    margin-top: 7px;
                    color: var(--profile-muted);
                    font-size: 13px;
                }
                .save-button {
                    height: 42px;
                    border: none;
                    border-radius: 13px;
                    padding: 0 18px;
                    background: linear-gradient(135deg, #8b5cf6, #6d28d9);
                    color: white;
                    font-weight: 900;
                    display: inline-flex;
                    align-items: center;
                    gap: 9px;
                    cursor: pointer;
                    box-shadow: 0 14px 28px rgba(124,58,237,0.24);
                }
                .save-button:disabled {
                    opacity: .65;
                    cursor: not-allowed;
                }
                .profile-grid {
                    display: grid;
                    grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
                    gap: 20px;
                    align-items: start;
                }
                .profile-card {
                    background: var(--profile-card);
                    border: 1px solid var(--profile-border);
                    border-radius: 18px;
                    padding: 22px;
                    box-shadow: 0 12px 28px rgba(15,23,42,0.04);
                    min-width: 0;
                }
                .identity-card {
                    display: grid;
                    justify-items: center;
                    text-align: center;
                    gap: 14px;
                    position: sticky;
                    top: 96px;
                }
                .avatar-wrap {
                    width: 128px;
                    height: 128px;
                    border-radius: 32px;
                    overflow: hidden;
                    display: grid;
                    place-items: center;
                    background: linear-gradient(135deg, #8b5cf6, #4c1d95);
                    color: white;
                    font-size: 44px;
                    font-weight: 950;
                    border: 1px solid rgba(139,92,246,0.24);
                    box-shadow: 0 18px 44px rgba(124,58,237,0.24);
                }
                .avatar-wrap img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    display: block;
                }
                .upload-button {
                    height: 38px;
                    border-radius: 12px;
                    border: 1px solid var(--profile-border);
                    background: var(--bg-secondary);
                    color: var(--text-primary);
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 0 14px;
                    font-weight: 800;
                    cursor: pointer;
                }
                .profile-name {
                    font-size: 18px;
                    font-weight: 900;
                    margin: 2px 0 0;
                }
                .profile-email {
                    color: var(--profile-muted);
                    font-size: 13px;
                    word-break: break-all;
                }
                .status-grid {
                    width: 100%;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                    margin-top: 4px;
                }
                .status-box {
                    border: 1px solid var(--profile-border);
                    border-radius: 14px;
                    padding: 12px;
                    text-align: left;
                    background: var(--bg-secondary);
                }
                .status-box strong {
                    display: block;
                    font-size: 13px;
                    margin-bottom: 4px;
                }
                .status-box span {
                    color: var(--profile-muted);
                    font-size: 11px;
                    font-weight: 700;
                }
                .form-stack {
                    display: grid;
                    gap: 18px;
                }
                .section-title {
                    margin: 0 0 16px;
                    font-size: 15px;
                    font-weight: 900;
                    display: flex;
                    align-items: center;
                    gap: 9px;
                }
                .form-grid {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 14px;
                }
                .form-grid.three {
                    grid-template-columns: 1.3fr .7fr 1fr;
                }
                .field {
                    display: grid;
                    gap: 7px;
                    min-width: 0;
                }
                .field.full {
                    grid-column: 1 / -1;
                }
                .field label {
                    font-size: 12px;
                    color: var(--profile-muted);
                    font-weight: 800;
                }
                .field input {
                    width: 100%;
                    height: 42px;
                    border-radius: 12px;
                    border: 1px solid var(--profile-border);
                    background: var(--bg-secondary);
                    color: var(--text-primary);
                    padding: 0 13px;
                    font-size: 13px;
                    font-weight: 700;
                    outline: none;
                }
                .field input:focus {
                    border-color: #8b5cf6;
                    box-shadow: 0 0 0 3px rgba(139,92,246,0.14);
                }
                .field input[disabled] {
                    opacity: .7;
                    cursor: not-allowed;
                }
                @media (max-width: 1120px) {
                    .profile-grid { grid-template-columns: 1fr; }
                    .identity-card { position: static; }
                }
                @media (max-width: 720px) {
                    .profile-card { padding: 18px; }
                    .form-grid, .form-grid.three { grid-template-columns: 1fr; }
                    .profile-header { align-items: flex-start; flex-direction: column; }
                    .save-button { width: 100%; justify-content: center; }
                }
            `}</style>

            <div className="profile-header">
                <div>
                    <h1 className="profile-title">Meu perfil</h1>
                    <div className="profile-subtitle">Gerencie sua foto, dados pessoais e identidade da conta.</div>
                </div>
                <button className="save-button" onClick={() => saveProfile()} disabled={saving || uploading}>
                    {saving ? <FiCheck size={16} /> : <FiSave size={16} />}
                    {saving ? 'Salvando...' : 'Salvar alteracoes'}
                </button>
            </div>

            <div className="profile-grid">
                <aside className="profile-card identity-card">
                    <div className="avatar-wrap">
                        {form.avatar_url ? <img src={form.avatar_url} alt={form.name || 'Perfil'} /> : initials}
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(event) => uploadAvatar(event.target.files?.[0])}
                    />
                    <button className="upload-button" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                        <FiCamera size={15} />
                        {uploading ? 'Enviando...' : 'Alterar foto'}
                    </button>
                    <div>
                        <div className="profile-name">{form.name || 'Usuario GouPay'}</div>
                        <div className="profile-email">{form.email}</div>
                    </div>
                    <div className="status-grid">
                        <div className="status-box">
                            <strong><FiShield size={14} /> Conta</strong>
                            <span>Perfil protegido</span>
                        </div>
                        <div className="status-box">
                            <strong><FiCheck size={14} /> Foto</strong>
                            <span>{form.avatar_url ? 'Personalizada' : 'Inicial do nome'}</span>
                        </div>
                    </div>
                </aside>

                <main className="form-stack">
                    <section className="profile-card">
                        <h2 className="section-title"><FiUser size={16} /> Informacoes pessoais</h2>
                        <div className="form-grid">
                            <div className="field">
                                <label>Nome completo</label>
                                <input value={form.name} onChange={(event) => update('name', event.target.value)} />
                            </div>
                            <div className="field">
                                <label>Email</label>
                                <input value={form.email} disabled />
                            </div>
                            <div className="field">
                                <label>Telefone / WhatsApp</label>
                                <input value={form.phone} onChange={(event) => update('phone', event.target.value)} placeholder="(11) 99999-9999" />
                            </div>
                            <div className="field">
                                <label>CPF/CNPJ</label>
                                <input value={form.cpf_cnpj} onChange={(event) => update('cpf_cnpj', event.target.value)} />
                            </div>
                        </div>
                    </section>

                    <section className="profile-card">
                        <h2 className="section-title"><FiMapPin size={16} /> Endereco</h2>
                        <div className="form-grid">
                            <div className="field full">
                                <label>Rua</label>
                                <input value={form.address_street} onChange={(event) => update('address_street', event.target.value)} />
                            </div>
                            <div className="form-grid three field full">
                                <div className="field">
                                    <label>Numero</label>
                                    <input value={form.address_number} onChange={(event) => update('address_number', event.target.value)} />
                                </div>
                                <div className="field">
                                    <label>UF</label>
                                    <input maxLength={2} value={form.address_state} onChange={(event) => update('address_state', event.target.value.toUpperCase())} />
                                </div>
                                <div className="field">
                                    <label>CEP</label>
                                    <input value={form.address_zipcode} onChange={(event) => update('address_zipcode', event.target.value)} />
                                </div>
                            </div>
                            <div className="field">
                                <label>Bairro</label>
                                <input value={form.address_neighborhood} onChange={(event) => update('address_neighborhood', event.target.value)} />
                            </div>
                            <div className="field">
                                <label>Cidade</label>
                                <input value={form.address_city} onChange={(event) => update('address_city', event.target.value)} />
                            </div>
                            <div className="field full">
                                <label>Complemento</label>
                                <input value={form.address_complement} onChange={(event) => update('address_complement', event.target.value)} />
                            </div>
                        </div>
                    </section>

                    <TwoFactorSettings />

                </main>
            </div>
        </div>
    );
}
