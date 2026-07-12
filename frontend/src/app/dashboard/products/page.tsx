'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { productsAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiCopy, FiPackage, FiX, FiUpload, FiImage, FiBook, FiSettings, FiSend, FiTag } from 'react-icons/fi';
import axios from 'axios';

export default function ProductsPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showEnrollModal, setShowEnrollModal] = useState(false);
    const [enrollEmail, setEnrollEmail] = useState('');
    const [enrollLoading, setEnrollLoading] = useState(false);
    const [selectedProductForEnroll, setSelectedProductForEnroll] = useState<any>(null);
    const [editing, setEditing] = useState<any>(null);
    const [form, setForm] = useState({
        name: '', description: '', price: '', image_url: '', type: 'digital', status: 'active',
        facebook_pixel_id: '', facebook_api_token: ''
    });
    const [plans, setPlans] = useState<Array<{ name: string; price: string }>>([{ name: 'Padrão', price: '' }]);
    const [isSubscription, setIsSubscription] = useState(false);
    const [subInterval, setSubInterval] = useState<'month' | 'week' | 'year'>('month');
    const [uploading, setUploading] = useState(false);
    const [testingPixel, setTestingPixel] = useState(false);
    const [pixelTestCode, setPixelTestCode] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    useEffect(() => { loadProducts(); }, []);

    const loadProducts = async () => {
        try {
            const { data } = await productsAPI.list();
            setProducts(data.products || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setEditing(null);
        setForm({ name: '', description: '', price: '', image_url: '', type: 'digital', status: 'active', facebook_pixel_id: '', facebook_api_token: '' });
        setPixelTestCode('');
        setSelectedFile(null);
        setImagePreview(null);
        setPlans([{ name: 'Padrão', price: '' }]);
        setIsSubscription(false);
        setSubInterval('month');
        setShowModal(true);
    };

    const openEdit = async (product: any) => {
        setEditing(product);
        try {
            const { data } = await productsAPI.getById(product.id);
            const p = data.product || product;
            setForm({
                name: p.name,
                description: p.description || '',
                price: p.price_display || (p.price / 100).toFixed(2),
                image_url: p.image_url || '',
                type: p.type,
                status: p.status,
                facebook_pixel_id: p.facebook_pixel_id || '',
                facebook_api_token: p.facebook_api_token || ''
            });
            setPixelTestCode('');
            const loadedPlans = Array.isArray(p.plans) && p.plans.length > 0
                ? p.plans.map((pl: any) => ({ name: pl.name, price: pl.price_display || (pl.price / 100).toFixed(2) }))
                : [{ name: 'Padrão', price: p.price_display || (p.price / 100).toFixed(2) }];
            setPlans(loadedPlans);

            // Detecta se é produto de assinatura e carrega o intervalo atual
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            try {
                const subRes = await axios.get(`/api/subscriptions/plans?product_id=${p.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const subPlans = subRes.data?.plans || [];
                if (subPlans.length > 0) {
                    setIsSubscription(true);
                    setSubInterval(subPlans[0].interval || 'month');
                } else {
                    setIsSubscription(false);
                }
            } catch {
                setIsSubscription(false);
            }

            setSelectedFile(null);
            setImagePreview(p.image_url || null);
            setShowModal(true);
        } catch {
            setForm({
                name: product.name,
                description: product.description || '',
                price: product.price_display || (product.price / 100).toFixed(2),
                image_url: product.image_url || '',
                type: product.type,
                status: product.status,
                facebook_pixel_id: product.facebook_pixel_id || '',
                facebook_api_token: product.facebook_api_token || ''
            });
            setPlans([{ name: 'Padrão', price: product.price_display || (product.price / 100).toFixed(2) }]);
            setIsSubscription(false);
            setSelectedFile(null);
            setImagePreview(product.image_url || null);
            setShowModal(true);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploading(true);
        try {
            let finalImageUrl = form.image_url;

            if (selectedFile) {
                const formData = new FormData();
                formData.append('file', selectedFile);
                const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                const { data } = await axios.post('/api/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${token}` }
                });
                finalImageUrl = data.url;
            }

            const normalizedPlans = plans
                .map(p => ({ name: p.name.trim(), price: parseFloat(p.price) }))
                .filter(p => p.name && !isNaN(p.price) && p.price > 0);

            if (normalizedPlans.length === 0) {
                toast.error('Adicione ao menos um plano com preço válido');
                return;
            }

            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const productData: any = { ...form, description: form.description.trim() || null, image_url: finalImageUrl, plans: normalizedPlans };
            if (!editing && normalizedPlans[0]) productData.price = normalizedPlans[0].price;

            let savedProduct: any;
            if (editing) {
                // Usa a Next.js API Route para garantir que product_plans é atualizado
                const { data } = await axios.put(`/api/products/${editing.id}`, productData, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                savedProduct = data.product;

                // Se for assinatura, atualiza os planos no Pagar.me
                // (desativa os antigos e cria novos com o preço atualizado)
                if (isSubscription) {
                    try {
                        // Busca planos existentes no Pagar.me
                        const subRes = await axios.get(`/api/subscriptions/plans?product_id=${editing.id}`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const existingSubPlans = subRes.data?.plans || [];

                        // Desativa os planos antigos
                        for (const oldPlan of existingSubPlans) {
                            await axios.delete(`/api/subscriptions/plans/${oldPlan.id}`, {
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                        }

                        // Cria novos planos com os preços atualizados
                        for (const pl of normalizedPlans) {
                            await axios.post('/api/subscriptions/plans', {
                                name: `${form.name} — ${pl.name}`,
                                amount: pl.price,
                                interval: subInterval,
                                interval_count: 1,
                                product_id: editing.id
                            }, { headers: { 'Authorization': `Bearer ${token}` } });
                        }
                        toast.success('Produto e planos de assinatura atualizados!');
                    } catch (subErr: any) {
                        toast.error('Produto salvo, mas erro ao atualizar planos: ' + (subErr.response?.data?.error || subErr.message));
                    }
                } else {
                    toast.success('Produto atualizado!');
                }
            } else {
                const { data } = await productsAPI.create(productData);
                savedProduct = data.product;
                toast.success('Produto criado!');

                // Se for assinatura, cria plano no Pagar.me para cada plano de preço
                if (isSubscription && savedProduct) {
                    for (const pl of normalizedPlans) {
                        await axios.post('/api/subscriptions/plans', {
                            name: `${form.name} — ${pl.name}`,
                            amount: pl.price,
                            interval: subInterval,
                            interval_count: 1,
                            product_id: savedProduct.id
                        }, { headers: { 'Authorization': `Bearer ${token}` } });
                    }
                    toast.success('Planos de assinatura criados!');
                }
            }

            setShowModal(false);
            loadProducts();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao salvar produto');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este produto?')) return;
        try {
            await productsAPI.delete(id);
            toast.success('Produto excluído!');
            loadProducts();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao excluir');
        }
    };

    const copyCheckoutLink = (product: any) => {
        const url = product.subscription_plan
            ? `${window.location.origin}/subscribe/${product.subscription_plan.id}`
            : `${window.location.origin}/checkout/${product.id}`;
        navigator.clipboard.writeText(url);
        toast.success('Link copiado!');
    };

    const openEnroll = (product: any) => {
        setSelectedProductForEnroll(product);
        setEnrollEmail('');
        setShowEnrollModal(true);
    };

    const handleEnroll = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProductForEnroll || !enrollEmail) return;

        setEnrollLoading(true);
        try {
            const { data } = await productsAPI.enroll(selectedProductForEnroll.id, enrollEmail);
            toast.success(data.message || 'Acesso liberado!');
            setShowEnrollModal(false);
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao liberar acesso');
        } finally {
            setEnrollLoading(false);
        }
    };

    const update = (field: string, value: string) => setForm({ ...form, [field]: value });

    const testFacebookPixel = async () => {
        if (!form.facebook_pixel_id.trim()) return toast.error('Informe o Pixel ID');
        if (!form.facebook_api_token.trim()) return toast.error('Informe o Access Token');

        setTestingPixel(true);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const { data } = await axios.post('/api/products/facebook-test', {
                product_id: editing?.id,
                product_name: form.name || 'Teste de Pixel',
                facebook_pixel_id: form.facebook_pixel_id,
                facebook_api_token: form.facebook_api_token,
                test_event_code: pixelTestCode.trim() || undefined
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(data.message || 'Pixel testado com sucesso!');
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao testar Pixel');
        } finally {
            setTestingPixel(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                <div style={{ width: 36, height: 36, border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Produtos</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{products.length} produtos cadastrados</p>
                </div>
                <button className="btn-primary" onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FiPlus size={16} /> Novo Produto
                </button>
            </div>

            {products.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: 20 }}>
                    {products.map((product) => (
                        <div key={product.id} className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                            {/* Image */}
                            <div style={{
                                height: 160, background: 'linear-gradient(135deg, rgba(108,92,231,0.15) 0%, rgba(162,155,254,0.08) 100%)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
                            }}>
                                {product.image_url ? (
                                    <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <FiPackage size={40} style={{ color: 'var(--accent-secondary)', opacity: 0.5 }} />
                                )}
                                <span className={`badge ${product.status === 'active' ? 'badge-success' : 'badge-neutral'}`}
                                    style={{ position: 'absolute', top: 12, right: 12 }}>
                                    {product.status === 'active' ? 'Ativo' : 'Inativo'}
                                </span>
                            </div>

                            <div style={{ padding: 20 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                    <h3 style={{ fontSize: 16, fontWeight: 600, flex: 1 }}>{product.name}</h3>
                                    <span className={`badge ${product.type === 'digital' ? 'badge-info' : 'badge-warning'}`} style={{ fontSize: 10, flexShrink: 0 }}>
                                        {product.type === 'digital' ? 'Digital' : 'Físico'}
                                    </span>
                                </div>

                                {product.description && (
                                    <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {product.description}
                                    </p>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 22, fontWeight: 700 }} className="gradient-text">
                                        R$ {product.price_display || (product.price / 100).toFixed(2)}
                                    </span>
                                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{product.sales_count || 0} vendas</span>
                                </div>
                                <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                                    <button onClick={() => copyCheckoutLink(product)} className="btn-secondary" style={{ flex: '1 1 auto', minWidth: '120px', padding: '8px 12px', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                        <FiCopy size={13} /> {product.subscription_plan ? 'Link Assinatura' : 'Link Checkout'}
                                    </button>
                                    <Link href={`/dashboard/products/${product.id}/content`} className="btn-secondary" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} title="Gerenciar Conteúdo">
                                        <FiBook size={14} />
                                    </Link>
                                    <Link href={`/dashboard/products/${product.id}/checkout`} className="btn-secondary" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} title="Personalizar Checkout">
                                        <FiSettings size={14} />
                                    </Link>
                                    <Link href={`/dashboard/products/${product.id}/order-bumps`} className="btn-secondary" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} title="Order Bumps">
                                        <FiTag size={14} />
                                    </Link>
                                    <button onClick={() => openEdit(product)} className="btn-secondary" style={{ padding: '8px 12px', flexShrink: 0 }}>
                                        <FiEdit2 size={14} />
                                    </button>
                                    <button onClick={() => handleDelete(product.id)} className="btn-danger" style={{ padding: '8px 12px', flexShrink: 0 }}>
                                        <FiTrash2 size={14} />
                                    </button>
                                </div>
                                <button onClick={() => openEnroll(product)} className="btn-primary" style={{ width: '100%', marginTop: 8, padding: '8px 12px', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                    <FiSend size={13} /> Entregar Produto
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="glass-card" style={{ textAlign: 'center', padding: '60px 24px' }}>
                    <FiPackage size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
                    <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Nenhum produto cadastrado</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>Crie seu primeiro produto para começar a vender</p>
                    <button className="btn-primary" onClick={openCreate} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <FiPlus size={16} /> Criar Produto
                    </button>
                </div>
            )}

            {/* Modal */}
            {showModal && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: 500, padding: 40, maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                            <h3 style={{ fontSize: 18, fontWeight: 700 }}>{editing ? 'Editar Produto' : 'Novo Produto'}</h3>
                            <button type="button" onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <FiX size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Nome do produto</label>
                                <input type="text" className="input-field" placeholder="Ex: Curso de Marketing Digital" required
                                    value={form.name} onChange={e => update('name', e.target.value)} />
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Descricao do produto</label>
                                <textarea
                                    className="input-field"
                                    rows={4}
                                    maxLength={600}
                                    placeholder="Explique o que o cliente vai receber. Opcional."
                                    value={form.description}
                                    onChange={e => update('description', e.target.value)}
                                />
                                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                    Se deixar vazio, nenhuma descricao sera exibida.
                                </p>
                            </div>

                            {/* Toggle Assinatura — aparece na criação ou quando editando produto de assinatura */}
                            {(!editing || isSubscription) && (
                                <div style={{ marginBottom: 16, padding: 14, borderRadius: 12, border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Produto de Assinatura</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Cobra o cliente automaticamente a cada ciclo via cartão</div>
                                        </div>
                                        {/* Na edição de assinatura, o toggle fica fixo como ativo */}
                                        {!editing ? (
                                            <button type="button" onClick={() => setIsSubscription(!isSubscription)} style={{
                                                width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                                                background: isSubscription ? 'var(--accent-primary)' : 'var(--border-color)',
                                                position: 'relative', transition: 'background 0.2s', flexShrink: 0
                                            }}>
                                                <span style={{
                                                    position: 'absolute', top: 3, left: isSubscription ? 23 : 3,
                                                    width: 18, height: 18, borderRadius: '50%', background: 'white',
                                                    transition: 'left 0.2s', display: 'block'
                                                }} />
                                            </button>
                                        ) : (
                                            <span style={{ fontSize: 11, color: 'var(--accent-primary)', fontWeight: 600, background: 'rgba(108,92,231,0.12)', padding: '3px 10px', borderRadius: 20 }}>Ativo</span>
                                        )}
                                    </div>
                                    {isSubscription && (
                                        <div style={{ marginTop: 12 }}>
                                            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Intervalo de cobrança</label>
                                            <select className="input-field" value={subInterval} onChange={e => setSubInterval(e.target.value as any)}>
                                                <option value="week">Semanal</option>
                                                <option value="month">Mensal</option>
                                                <option value="year">Anual</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div style={{ marginBottom: 16 }}>
                                <div style={{ width: '100%' }}>
                                    <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Plano e preço</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {plans.map((pl, idx) => (
                                            <div
                                                key={idx}
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: 8,
                                                    padding: 12,
                                                    borderRadius: 12,
                                                    border: '1px solid var(--border-color)',
                                                    background: 'rgba(255,255,255,0.02)'
                                                }}
                                            >
                                                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                                                    <input
                                                        type="text"
                                                        placeholder="Nome do plano (ex: Diário, Semanal)"
                                                        className="input-field"
                                                        style={{ height: 48, pointerEvents: 'auto', flex: 1, minWidth: 160 }}
                                                        value={pl.name}
                                                        onChange={e => setPlans(prev => prev.map((p, i) => i === idx ? { ...p, name: e.target.value } : p))}
                                                    />
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0.01"
                                                        placeholder="Preço (R$)"
                                                        className="input-field"
                                                        style={{ height: 48, pointerEvents: 'auto', width: 130 }}
                                                        value={pl.price}
                                                        onChange={e => setPlans(prev => prev.map((p, i) => i === idx ? { ...p, price: e.target.value } : p))}
                                                    />
                                                    <button
                                                        type="button"
                                                        className="btn-danger"
                                                        style={{ height: 48, padding: '0 14px', flexShrink: 0 }}
                                                        onClick={() => setPlans(prev => prev.filter((_, i) => i !== idx))}
                                                        disabled={plans.length <= 1}
                                                    >
                                                        Remover
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            className="btn-secondary"
                                            style={{ height: 46, alignSelf: 'flex-start' }}
                                            onClick={() => setPlans(prev => [...prev, { name: '', price: '' }])}
                                        >
                                            Adicionar plano
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Tipo</label>
                                <select className="input-field" value={form.type} onChange={e => update('type', e.target.value)}>
                                    <option value="digital">Digital</option>
                                    <option value="physical">Físico</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Facebook Pixel ID (Opcional)</label>
                                <input type="text" className="input-field" placeholder="Ex: 1234567890"
                                    value={form.facebook_pixel_id} onChange={e => update('facebook_pixel_id', e.target.value.replace(/\D/g, ''))} />
                                <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                                    ID do Pixel para rastreamento de eventos no checkout.
                                </p>
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Facebook Access Token (Opcional)</label>
                                <input type="text" className="input-field" placeholder="Token da API de Conversões"
                                    value={form.facebook_api_token} onChange={e => update('facebook_api_token', e.target.value)} />
                                <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                                    Token de acesso para enviar eventos via API (Server-side) quando o pagamento for aprovado.
                                </p>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="Codigo de teste do Meta (opcional)"
                                    value={pixelTestCode}
                                    onChange={e => setPixelTestCode(e.target.value)}
                                    style={{ marginTop: 10 }}
                                />
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={testFacebookPixel}
                                    disabled={testingPixel || !form.facebook_pixel_id || !form.facebook_api_token}
                                    style={{ marginTop: 10, width: '100%' }}
                                >
                                    {testingPixel ? 'Testando Pixel...' : 'Testar Pixel do Facebook'}
                                </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 24 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Imagem do produto</label>
                                    <div style={{
                                        border: '1px dashed var(--border-color)',
                                        background: 'rgba(255,255,255,0.02)',
                                        borderRadius: 12,
                                        padding: 12,
                                        position: 'relative',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12
                                    }} onClick={() => document.getElementById('fileInput')?.click()}>
                                        {imagePreview ? (
                                            <img src={imagePreview} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} alt="Preview" />
                                        ) : (
                                            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <FiImage size={18} style={{ color: 'var(--text-muted)' }} />
                                            </div>
                                        )}
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                {selectedFile ? selectedFile.name : 'Selecione uma imagem'}
                                            </p>
                                            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>JPG, PNG ou GIF. Máx 2MB.</p>
                                        </div>
                                        <input id="fileInput" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Status</label>
                                    <select className="input-field" value={form.status} onChange={e => update('status', e.target.value)}>
                                        <option value="active">Ativo</option>
                                        <option value="inactive">Inativo</option>
                                    </select>
                                </div>
                            </div>

                            <button type="submit" className="btn-primary" disabled={uploading} style={{ width: '100%' }}>
                                {uploading ? 'Salvando...' : (editing ? 'Salvar Alterações' : 'Criar Produto')}
                            </button>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Manual Delivery Modal */}
            {showEnrollModal && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: 400, padding: 32 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                            <div>
                                <h3 style={{ fontSize: 18, fontWeight: 700 }}>Entregar Produto</h3>
                                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                                    Liberar acesso ao produto <strong>{selectedProductForEnroll?.name}</strong>
                                </p>
                            </div>
                            <button type="button" onClick={() => setShowEnrollModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <FiX size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleEnroll}>
                            <div style={{ marginBottom: 24 }}>
                                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>E-mail do aluno</label>
                                <input
                                    type="email"
                                    className="input-field"
                                    placeholder="exemplo@gmail.com"
                                    required
                                    value={enrollEmail}
                                    onChange={e => setEnrollEmail(e.target.value)}
                                />
                                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                                    O produto aparecerá instantaneamente na Área de Membros deste usuário.
                                </p>
                            </div>

                            <button type="submit" className="btn-primary" disabled={enrollLoading} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                {enrollLoading ? 'Processando...' : <><FiSend size={14} /> Liberar Acesso</>}
                            </button>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
