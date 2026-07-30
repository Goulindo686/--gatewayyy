'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useId, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FiImage } from 'react-icons/fi';
import { productManagementAPI } from '@/lib/api';

type ProductEditorProps = {
    productId?: string;
    onSaved?: (product: any) => void;
    onCancel?: () => void;
};

const emptyForm = {
    name: '',
    description: '',
    price: '',
    image_url: '',
    type: 'digital',
    status: 'active',
    facebook_pixel_id: '',
    facebook_api_token: '',
};

export default function ProductEditor({
    productId,
    onSaved,
    onCancel,
}: ProductEditorProps) {
    const isEditing = Boolean(productId);
    const fileInputId = useId();
    const [form, setForm] = useState(emptyForm);
    const [plans, setPlans] = useState<Array<{ name: string; price: string }>>([
        { name: 'Padrão', price: '' },
    ]);
    const [isSubscription, setIsSubscription] = useState(false);
    const [subInterval, setSubInterval] = useState<'month' | 'week' | 'year'>('month');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [pixelTestCode, setPixelTestCode] = useState('');
    const [testingPixel, setTestingPixel] = useState(false);
    const [loading, setLoading] = useState(isEditing);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!productId) return;
        let cancelled = false;

        const load = async () => {
            try {
                const { data } = await productManagementAPI.getById(productId);
                if (cancelled) return;
                const product = data.product;
                setForm({
                    name: product.name || '',
                    description: product.description || '',
                    price: product.price_display || '',
                    image_url: product.image_url || '',
                    type: product.type || 'digital',
                    status: product.status || 'active',
                    facebook_pixel_id: product.facebook_pixel_id || '',
                    facebook_api_token: product.facebook_api_token || '',
                });
                setPlans(
                    Array.isArray(product.plans) && product.plans.length
                        ? product.plans.map((plan: any) => ({
                            name: plan.name,
                            price: plan.price_display || (plan.price / 100).toFixed(2),
                        }))
                        : [{
                            name: 'Padrão',
                            price: product.price_display || (product.price / 100).toFixed(2),
                        }],
                );
                setImagePreview(product.image_url || null);

                const token = localStorage.getItem('token');
                try {
                    const subscriptionResponse = await axios.get(
                        `/api/subscriptions/plans?product_id=${productId}`,
                        { headers: { Authorization: `Bearer ${token}` } },
                    );
                    const subscriptionPlans = subscriptionResponse.data?.plans || [];
                    setIsSubscription(subscriptionPlans.length > 0);
                    if (subscriptionPlans[0]?.interval) {
                        setSubInterval(subscriptionPlans[0].interval);
                    }
                } catch {
                    setIsSubscription(false);
                }
            } catch {
                toast.error('Não foi possível carregar o produto.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => { cancelled = true; };
    }, [productId]);

    const update = (field: string, value: string) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;
        setSelectedFile(file);
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const syncSubscriptionPlans = async (
        savedProductId: string,
        normalizedPlans: Array<{ name: string; price: number }>,
    ) => {
        const token = localStorage.getItem('token');
        if (isEditing) {
            const existing = await axios.get(
                `/api/subscriptions/plans?product_id=${savedProductId}`,
                { headers: { Authorization: `Bearer ${token}` } },
            );
            for (const oldPlan of existing.data?.plans || []) {
                await axios.delete(`/api/subscriptions/plans/${oldPlan.id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
            }
        }
        for (const plan of normalizedPlans) {
            await axios.post('/api/subscriptions/plans', {
                name: `${form.name} — ${plan.name}`,
                amount: plan.price,
                interval: subInterval,
                interval_count: 1,
                product_id: savedProductId,
            }, { headers: { Authorization: `Bearer ${token}` } });
        }
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setSaving(true);

        try {
            let imageUrl = form.image_url;
            const token = localStorage.getItem('token');
            if (selectedFile) {
                const upload = new FormData();
                upload.append('file', selectedFile);
                const { data } = await axios.post('/api/upload', upload, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                imageUrl = data.url;
            }

            const normalizedPlans = plans
                .map((plan) => ({
                    name: plan.name.trim(),
                    price: Number.parseFloat(plan.price),
                }))
                .filter((plan) => plan.name && Number.isFinite(plan.price) && plan.price > 0);
            if (!normalizedPlans.length) {
                toast.error('Adicione ao menos um plano com preço válido.');
                return;
            }

            const payload: any = {
                ...form,
                description: form.description.trim() || null,
                image_url: imageUrl,
                plans: normalizedPlans,
                price: normalizedPlans[0].price,
            };

            const { data } = isEditing && productId
                ? await productManagementAPI.update(productId, payload)
                : await productManagementAPI.create(payload);
            const savedProduct = data.product;

            if (isSubscription && savedProduct?.id) {
                try {
                    await syncSubscriptionPlans(savedProduct.id, normalizedPlans);
                } catch (error: any) {
                    toast.error(
                        `Produto salvo, mas os planos de assinatura falharam: ${
                            error.response?.data?.error || error.message
                        }`,
                    );
                    onSaved?.(savedProduct);
                    return;
                }
            }

            toast.success(isEditing ? 'Produto atualizado!' : 'Produto criado!');
            onSaved?.(savedProduct);
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Erro ao salvar produto.');
        } finally {
            setSaving(false);
        }
    };

    const testFacebookPixel = async () => {
        if (!form.facebook_pixel_id.trim()) return toast.error('Informe o Pixel ID.');
        if (!form.facebook_api_token.trim()) return toast.error('Informe o Access Token.');

        setTestingPixel(true);
        try {
            const token = localStorage.getItem('token');
            const { data } = await axios.post('/api/products/facebook-test', {
                product_id: productId,
                product_name: form.name || 'Teste de Pixel',
                facebook_pixel_id: form.facebook_pixel_id,
                facebook_api_token: form.facebook_api_token,
                test_event_code: pixelTestCode.trim() || undefined,
            }, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(data.message || 'Pixel testado com sucesso!');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Erro ao testar Pixel.');
        } finally {
            setTestingPixel(false);
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: 260, display: 'grid', placeItems: 'center' }}>
                <div className="productEditorSpinner" />
                <style>{`
                    .productEditorSpinner {
                        width: 36px;
                        height: 36px;
                        border: 3px solid var(--border-color);
                        border-top-color: var(--accent-primary);
                        border-radius: 50%;
                        animation: productEditorSpin .8s linear infinite;
                    }
                    @keyframes productEditorSpin { to { transform: rotate(360deg); } }
                `}</style>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="productEditorForm">
            <div className="productEditorField">
                <label>Nome do produto</label>
                <input
                    className="input-field"
                    required
                    maxLength={255}
                    placeholder="Ex: Curso de Marketing Digital"
                    value={form.name}
                    onChange={(event) => update('name', event.target.value)}
                />
            </div>

            <div className="productEditorField">
                <label>Descrição do produto</label>
                <textarea
                    className="input-field"
                    rows={4}
                    maxLength={600}
                    placeholder="Explique o que o cliente vai receber. Opcional."
                    value={form.description}
                    onChange={(event) => update('description', event.target.value)}
                />
                <small>Se deixar vazio, nenhuma descrição será exibida.</small>
            </div>

            {(!isEditing || isSubscription) && (
                <section className="productEditorPanel">
                    <div className="productEditorToggleRow">
                        <div>
                            <strong>Produto de assinatura</strong>
                            <small>Cobra o cliente automaticamente a cada ciclo via cartão.</small>
                        </div>
                        {!isEditing ? (
                            <button
                                type="button"
                                className={`productEditorToggle ${isSubscription ? 'active' : ''}`}
                                onClick={() => setIsSubscription((current) => !current)}
                                aria-pressed={isSubscription}
                            >
                                <span />
                            </button>
                        ) : (
                            <span className="badge badge-info">Ativo</span>
                        )}
                    </div>
                    {isSubscription && (
                        <div className="productEditorField productEditorNestedField">
                            <label>Intervalo de cobrança</label>
                            <select
                                className="input-field"
                                value={subInterval}
                                onChange={(event) => setSubInterval(event.target.value as any)}
                            >
                                <option value="week">Semanal</option>
                                <option value="month">Mensal</option>
                                <option value="year">Anual</option>
                            </select>
                        </div>
                    )}
                </section>
            )}

            <div className="productEditorField">
                <label>Planos e preços</label>
                <div className="productEditorPlans">
                    {plans.map((plan, index) => (
                        <div className="productEditorPlan" key={`${index}-${plans.length}`}>
                            <input
                                className="input-field"
                                placeholder="Nome do plano"
                                value={plan.name}
                                onChange={(event) => setPlans((current) => current.map(
                                    (entry, entryIndex) => entryIndex === index
                                        ? { ...entry, name: event.target.value }
                                        : entry,
                                ))}
                            />
                            <input
                                className="input-field"
                                type="number"
                                step="0.01"
                                min="0.01"
                                placeholder="Preço (R$)"
                                value={plan.price}
                                onChange={(event) => setPlans((current) => current.map(
                                    (entry, entryIndex) => entryIndex === index
                                        ? { ...entry, price: event.target.value }
                                        : entry,
                                ))}
                            />
                            <button
                                type="button"
                                className="btn-danger"
                                disabled={plans.length <= 1}
                                onClick={() => setPlans((current) => current.filter(
                                    (_, entryIndex) => entryIndex !== index,
                                ))}
                            >
                                Remover
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setPlans((current) => [
                            ...current,
                            { name: '', price: '' },
                        ])}
                    >
                        Adicionar plano
                    </button>
                </div>
            </div>

            <div className="productEditorGrid">
                <div className="productEditorField">
                    <label>Tipo</label>
                    <select
                        className="input-field"
                        value={form.type}
                        onChange={(event) => update('type', event.target.value)}
                    >
                        <option value="digital">Digital</option>
                        <option value="physical">Físico</option>
                    </select>
                </div>
                <div className="productEditorField">
                    <label>Status</label>
                    <select
                        className="input-field"
                        value={form.status}
                        onChange={(event) => update('status', event.target.value)}
                    >
                        <option value="active">Ativo</option>
                        <option value="inactive">Inativo</option>
                    </select>
                </div>
            </div>

            <section className="productEditorPanel">
                <div className="productEditorField">
                    <label>Facebook Pixel ID (opcional)</label>
                    <input
                        className="input-field"
                        placeholder="Ex: 1234567890"
                        value={form.facebook_pixel_id}
                        onChange={(event) => update(
                            'facebook_pixel_id',
                            event.target.value.replace(/\D/g, ''),
                        )}
                    />
                </div>
                <div className="productEditorField">
                    <label>Facebook Access Token (opcional)</label>
                    <input
                        className="input-field"
                        type="password"
                        autoComplete="off"
                        placeholder="Token da API de Conversões"
                        value={form.facebook_api_token}
                        onChange={(event) => update('facebook_api_token', event.target.value)}
                    />
                </div>
                <div className="productEditorField">
                    <label>Código de teste do Meta (opcional)</label>
                    <input
                        className="input-field"
                        value={pixelTestCode}
                        onChange={(event) => setPixelTestCode(event.target.value)}
                    />
                </div>
                <button
                    type="button"
                    className="btn-secondary"
                    disabled={
                        testingPixel
                        || !form.facebook_pixel_id
                        || !form.facebook_api_token
                    }
                    onClick={testFacebookPixel}
                >
                    {testingPixel ? 'Testando Pixel...' : 'Testar Pixel do Facebook'}
                </button>
            </section>

            <div className="productEditorField">
                <label>Imagem do produto</label>
                <button
                    type="button"
                    className="productEditorUpload"
                    onClick={() => document.getElementById(fileInputId)?.click()}
                >
                    {imagePreview ? (
                        <img src={imagePreview} alt="Prévia do produto" />
                    ) : (
                        <span className="productEditorImagePlaceholder">
                            <FiImage size={19} />
                        </span>
                    )}
                    <span>
                        <strong>{selectedFile?.name || 'Selecione uma imagem'}</strong>
                        <small>JPG, PNG, GIF ou WebP. Máximo 5 MB.</small>
                    </span>
                </button>
                <input
                    id={fileInputId}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleFileChange}
                />
            </div>

            <div className="productEditorActions">
                {onCancel && (
                    <button type="button" className="btn-secondary" onClick={onCancel}>
                        Cancelar
                    </button>
                )}
                <button type="submit" className="btn-primary" disabled={saving}>
                    {saving
                        ? 'Salvando...'
                        : isEditing
                            ? 'Salvar alterações'
                            : 'Criar produto'}
                </button>
            </div>

            <style>{`
                .productEditorForm { display: grid; gap: 18px; }
                .productEditorField { display: grid; gap: 7px; }
                .productEditorField label {
                    color: var(--text-secondary);
                    font-size: 13px;
                    font-weight: 650;
                }
                .productEditorField small,
                .productEditorToggleRow small {
                    color: var(--text-muted);
                    display: block;
                    font-size: 11px;
                    line-height: 1.45;
                }
                .productEditorPanel {
                    background: rgba(255,255,255,.025);
                    border: 1px solid var(--border-color);
                    border-radius: 14px;
                    display: grid;
                    gap: 14px;
                    padding: 16px;
                }
                .productEditorToggleRow {
                    align-items: center;
                    display: flex;
                    gap: 16px;
                    justify-content: space-between;
                }
                .productEditorToggleRow strong {
                    color: var(--text-primary);
                    display: block;
                    font-size: 13px;
                    margin-bottom: 3px;
                }
                .productEditorToggle {
                    background: var(--border-color);
                    border: 0;
                    border-radius: 999px;
                    cursor: pointer;
                    flex: 0 0 auto;
                    height: 26px;
                    padding: 3px;
                    transition: background .2s;
                    width: 48px;
                }
                .productEditorToggle span {
                    background: #fff;
                    border-radius: 50%;
                    display: block;
                    height: 20px;
                    transform: translateX(0);
                    transition: transform .2s;
                    width: 20px;
                }
                .productEditorToggle.active { background: var(--accent-primary); }
                .productEditorToggle.active span { transform: translateX(22px); }
                .productEditorNestedField { margin-top: 2px; }
                .productEditorPlans { display: grid; gap: 10px; }
                .productEditorPlan {
                    align-items: center;
                    display: grid;
                    gap: 10px;
                    grid-template-columns: minmax(160px, 1fr) 150px auto;
                }
                .productEditorPlans > .btn-secondary { justify-self: start; }
                .productEditorGrid {
                    display: grid;
                    gap: 16px;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
                .productEditorUpload {
                    align-items: center;
                    background: rgba(255,255,255,.025);
                    border: 1px dashed var(--border-color);
                    border-radius: 14px;
                    color: var(--text-primary);
                    cursor: pointer;
                    display: flex;
                    gap: 12px;
                    padding: 12px;
                    text-align: left;
                    width: 100%;
                }
                .productEditorUpload img,
                .productEditorImagePlaceholder {
                    align-items: center;
                    background: var(--bg-secondary);
                    border-radius: 9px;
                    color: var(--text-muted);
                    display: flex;
                    height: 46px;
                    justify-content: center;
                    object-fit: cover;
                    width: 46px;
                }
                .productEditorUpload strong {
                    display: block;
                    font-size: 13px;
                    margin-bottom: 3px;
                }
                .productEditorActions {
                    display: flex;
                    gap: 10px;
                    justify-content: flex-end;
                    margin-top: 4px;
                }
                .productEditorActions .btn-primary { min-width: 170px; }
                @media (max-width: 680px) {
                    .productEditorPlan { grid-template-columns: 1fr; }
                    .productEditorGrid { grid-template-columns: 1fr; }
                    .productEditorActions { flex-direction: column-reverse; }
                    .productEditorActions button { width: 100%; }
                }
            `}</style>
        </form>
    );
}

