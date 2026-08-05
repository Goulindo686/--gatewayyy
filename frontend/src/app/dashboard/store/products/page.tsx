'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { storeCategoriesAPI, storeProductsAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { FiCheck, FiEdit2, FiEye, FiEyeOff, FiImage, FiLayers, FiPlus, FiRefreshCw, FiX } from 'react-icons/fi';
import axios from 'axios';

export default function StoreProductsPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingParams, setUpdatingParams] = useState<string | null>(null);

    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form, setForm] = useState({
        name: '',
        description: '',
        image_url: '',
        type: 'digital',
        status: 'active',
        store_category_id: '',
        store_description_format: 'plain' as 'plain' | 'html',
    });
    const [plans, setPlans] = useState<Array<{ name: string; price: string }>>([{ name: 'Padrão', price: '' }]);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [prodRes, catRes] = await Promise.all([
                storeProductsAPI.list(),
                storeCategoriesAPI.list()
            ]);
            setProducts(prodRes.data.products || []);
            setCategories(catRes.data.categories || []);
        } catch {
            toast.error('Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    };

    const toggleVisibility = async (product: any) => {
        setUpdatingParams(product.id);
        try {
            const newStatus = !product.show_in_store;
            await storeProductsAPI.update(product.id, { show_in_store: newStatus });
            setProducts(products.map(p => p.id === product.id ? { ...p, show_in_store: newStatus } : p));
            toast.success(newStatus ? 'Produto adicionado à loja' : 'Produto removido da loja');
        } catch {
            toast.error('Erro ao atualizar visibilidade');
        } finally {
            setUpdatingParams(null);
        }
    };

    const changeCategory = async (productId: string, categoryId: string) => {
        setUpdatingParams(productId);
        try {
            const val = categoryId === '' ? null : categoryId;
            await storeProductsAPI.update(productId, { store_category_id: val });
            setProducts(products.map(p => p.id === productId ? { ...p, store_category_id: val } : p));
            toast.success('Categoria atualizada');
        } catch {
            toast.error('Erro ao mudar categoria');
        } finally {
            setUpdatingParams(null);
        }
    };

    const openCreate = () => {
        setEditing(null);
        setForm({
            name: '',
            description: '',
            image_url: '',
            type: 'digital',
            status: 'active',
            store_category_id: '',
            store_description_format: 'plain',
        });
        setPlans([{ name: 'Padrão', price: '' }]);
        setSelectedFile(null);
        setImagePreview(null);
        setShowModal(true);
    };

    const openEdit = async (product: any) => {
        setEditing(product);
        setForm({
            name: product.name,
            description: product.description || '',
            image_url: product.image_url || '',
            type: product.type,
            status: product.status,
            store_category_id: product.store_category_id || '',
            store_description_format: product.store_description_format === 'html' ? 'html' : 'plain',
        });
        try {
            const { data } = await storeProductsAPI.getById(product.id);
            const p = data.product || product;
            const loadedPlans = Array.isArray(p.plans) && p.plans.length > 0
                ? p.plans.map((pl: any) => ({ name: pl.name, price: pl.price_display || (pl.price / 100).toFixed(2) }))
                : [{ name: 'Padrão', price: p.price_display || (p.price / 100).toFixed(2) }];
            setPlans(loadedPlans);
        } catch {
            setPlans([{ name: 'Padrão', price: product.price_display || (product.price / 100).toFixed(2) }]);
        }
        setSelectedFile(null);
        setImagePreview(product.image_url || null);
        setShowModal(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const updateForm = <K extends keyof typeof form>(field: K, value: (typeof form)[K]) => {
        setForm(current => ({ ...current, [field]: value }));
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

            const productData: any = {
                ...form,
                type: 'digital',
                image_url: finalImageUrl,
                plans: normalizedPlans,
                show_in_store: editing ? undefined : true,
                store_category_id: form.store_category_id || null,
                store_description_format: form.store_description_format,
            };

            if (editing) {
                await storeProductsAPI.update(editing.id, productData);
                toast.success('Produto atualizado!');
            } else {
                await storeProductsAPI.create(productData);
                toast.success('Produto criado e adicionado à loja!');
            }
            setShowModal(false);
            loadData();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao salvar produto');
        } finally {
            setUploading(false);
        }
    };

    if (loading) return <div className="store-products-loading">Carregando produtos...</div>;

    const visibleProducts = products.filter(product => product.show_in_store).length;
    const hiddenProducts = products.length - visibleProducts;

    return (
        <div className="store-products-page">
            <section className="store-products-intro">
                <div className="store-products-intro-icon"><FiLayers /></div>
                <div className="store-products-intro-copy">
                    <span>CONTEÚDO DA VITRINE</span>
                    <h2>Produtos da loja</h2>
                    <p>Crie produtos, escolha a categoria e controle o que aparece para seus clientes.</p>
                </div>
                <div className="store-products-summary">
                    <span><FiEye /><strong>{visibleProducts}</strong><small>visíveis</small></span>
                    <span><FiEyeOff /><strong>{hiddenProducts}</strong><small>ocultos</small></span>
                </div>
            </section>

            <section className="store-products-panel">
                <div className="store-products-header">
                    <div><span>GERENCIAMENTO</span><h3>Todos os produtos</h3><p>{products.length} produto{products.length === 1 ? '' : 's'} cadastrado{products.length === 1 ? '' : 's'}</p></div>
                    <div className="store-products-actions">
                    <button onClick={loadData} className="btn-secondary">
                        <FiRefreshCw size={14} /> Atualizar
                    </button>
                    <button onClick={openCreate} className="btn-primary">
                        <FiPlus size={16} /> Novo Produto
                    </button>
                </div>
            </div>

                <div className="store-products-guide"><FiCheck /><span>Use o botão <strong>Vitrine</strong> para exibir ou ocultar rapidamente cada produto na loja pública.</span></div>

                <div className="store-products-table-wrap">
                    <table className="data-table store-products-table">
                        <thead>
                            <tr>
                                <th>Produto</th>
                                <th>Preço</th>
                                <th>Categoria na Loja</th>
                                <th style={{ textAlign: 'center' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map(product => (
                                <tr key={product.id} className={updatingParams === product.id ? 'updating' : ''}>
                                    <td>
                                        <div className="store-product-cell">
                                            {product.image_url ? (
                                                <img src={product.image_url} alt={product.name} />
                                            ) : (
                                                <div className="store-product-placeholder">📦</div>
                                            )}
                                            <strong>{product.name}</strong>
                                        </div>
                                    </td>
                                    <td><span className="store-product-price">R$ {product.price_display}</span></td>
                                    <td>
                                        <select
                                            className="input-field store-product-category-select"
                                            value={product.store_category_id || ''}
                                            onChange={e => changeCategory(product.id, e.target.value)}
                                            disabled={updatingParams === product.id}
                                        >
                                            <option value="">-- Sem Categoria --</option>
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td>
                                        <div className="store-product-actions-cell">
                                            <button
                                                className={`store-product-visibility ${product.show_in_store ? 'visible' : ''}`}
                                                onClick={() => toggleVisibility(product)}
                                                disabled={updatingParams === product.id}
                                            >
                                                {product.show_in_store ? <FiCheck size={14} /> : <FiX size={14} />}
                                                {product.show_in_store ? 'Vitrine' : 'Oculto'}
                                            </button>
                                            <button
                                                className="store-product-edit"
                                                onClick={() => openEdit(product)}
                                                aria-label={`Editar ${product.name}`}
                                            >
                                                <FiEdit2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {products.length === 0 && (
                    <div className="store-products-empty">
                        <FiLayers />
                        <strong>Nenhum produto cadastrado</strong>
                        <p>Crie seu primeiro produto para começar a montar a vitrine.</p>
                        <button onClick={openCreate} className="btn-primary">
                            <FiPlus size={16} /> Criar Primeiro Produto
                        </button>
                    </div>
                )}
            </section>

            <style jsx global>{`
                .store-products-loading { min-height: 240px; display: grid; place-items: center; color: var(--text-muted); font-size: 13px; }
                .store-products-page { display: grid; gap: 16px; }
                .store-products-intro { border: 1px solid var(--border-color); border-radius: 18px; padding: 19px 21px; display: flex; align-items: center; gap: 14px; background: var(--bg-card); }
                .store-products-intro-icon { width: 44px; height: 44px; border-radius: 13px; display: grid; place-items: center; flex: 0 0 auto; color: var(--accent-primary); background: rgba(108,92,231,.11); font-size: 19px; }
                .store-products-intro-copy { min-width: 0; }
                .store-products-intro-copy > span { display: block; color: var(--accent-primary); font-size: 8px; font-weight: 900; letter-spacing: .13em; margin-bottom: 3px; }
                .store-products-intro h2 { color: var(--text-primary); font-size: 20px; font-weight: 850; margin-bottom: 4px; }
                .store-products-intro p { color: var(--text-secondary); font-size: 11px; line-height: 1.5; }
                .store-products-summary { margin-left: auto; display: flex; gap: 8px; }
                .store-products-summary > span { min-width: 88px; border: 1px solid var(--border-color); border-radius: 12px; padding: 9px 10px; display: grid; grid-template-columns: 20px 1fr; align-items: center; color: var(--text-muted); background: var(--bg-secondary); }
                .store-products-summary svg { grid-row: 1 / 3; font-size: 15px; }
                .store-products-summary strong { color: var(--text-primary); font-size: 14px; line-height: 1; }
                .store-products-summary small { font-size: 8px; margin-top: 2px; }
                .store-products-panel { min-width: 0; border: 1px solid var(--border-color); border-radius: 18px; padding: 18px; background: var(--bg-card); overflow: hidden; }
                .store-products-header { display: flex; align-items: center; justify-content: space-between; gap: 18px; border-bottom: 1px solid var(--border-color); padding: 0 2px 14px; }
                .store-products-header > div:first-child > span { display: block; color: var(--accent-primary); font-size: 8px; font-weight: 900; letter-spacing: .12em; margin-bottom: 3px; }
                .store-products-header h3 { color: var(--text-primary); font-size: 15px; font-weight: 800; margin-bottom: 3px; }
                .store-products-header p { color: var(--text-muted); font-size: 9px; }
                .store-products-actions { display: flex; gap: 8px; }
                .store-products-actions button, .store-products-empty button { min-height: 39px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 0 13px; }
                .store-products-guide { border: 1px solid rgba(108,92,231,.18); border-radius: 11px; padding: 9px 11px; display: flex; align-items: center; gap: 8px; color: var(--accent-primary); background: rgba(108,92,231,.055); font-size: 9px; margin: 12px 0; }
                .store-products-guide span { color: var(--text-secondary); line-height: 1.4; }
                .store-products-table-wrap { overflow-x: auto; }
                .store-products-table { min-width: 700px; }
                .store-products-table tr.updating { opacity: .5; }
                .store-products-table th:last-child, .store-products-table td:last-child { text-align: center; }
                .store-product-cell { display: flex; align-items: center; gap: 11px; min-width: 190px; }
                .store-product-cell img, .store-product-placeholder { width: 40px; height: 40px; border-radius: 10px; flex: 0 0 auto; }
                .store-product-cell img { object-fit: cover; }
                .store-product-placeholder { display: grid; place-items: center; background: var(--bg-secondary); }
                .store-product-cell strong { overflow: hidden; color: var(--text-primary); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
                .store-product-price { color: var(--text-primary); font-size: 12px; font-weight: 800; white-space: nowrap; }
                .store-product-category-select { min-width: 160px; height: 38px !important; padding: 6px 10px !important; font-size: 11px !important; }
                .store-product-actions-cell { display: flex; align-items: center; justify-content: center; gap: 7px; }
                .store-product-visibility { min-height: 32px; border: 1px solid var(--border-color); border-radius: 999px; padding: 0 10px; display: inline-flex; align-items: center; gap: 5px; color: var(--text-muted); background: var(--bg-secondary); font-size: 10px; font-weight: 750; cursor: pointer; }
                .store-product-visibility.visible { border-color: rgba(0,206,201,.3); color: var(--success); background: rgba(0,206,201,.1); }
                .store-product-edit { width: 32px; height: 32px; border: 1px solid var(--border-color); border-radius: 9px; display: grid; place-items: center; color: var(--text-primary); background: var(--bg-secondary); cursor: pointer; }
                .store-products-empty { min-height: 230px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: var(--text-muted); }
                .store-products-empty > svg { font-size: 30px; opacity: .55; margin-bottom: 10px; }
                .store-products-empty strong { color: var(--text-primary); font-size: 13px; margin-bottom: 5px; }
                .store-products-empty p { font-size: 10px; margin-bottom: 15px; }
                .store-description-format { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; margin-bottom: 9px; padding: 4px; border: 1px solid var(--border-color); border-radius: 11px; background: var(--bg-secondary); }
                .store-description-format button { min-height: 36px; border: 1px solid transparent; border-radius: 8px; color: var(--text-muted); background: transparent; font-size: 11px; font-weight: 750; cursor: pointer; }
                .store-description-format button.active { border-color: rgba(108,92,231,.28); color: var(--accent-primary); background: rgba(108,92,231,.12); box-shadow: 0 4px 12px rgba(18,24,40,.08); }
                .store-description-editor { width: 100%; min-height: 118px; resize: vertical; line-height: 1.55; }
                .store-description-editor.html { min-height: 230px; font-family: Consolas, 'Courier New', monospace; font-size: 12px; tab-size: 2; }
                .store-description-help { margin-top: 7px; color: var(--text-muted); font-size: 10px; line-height: 1.5; }
                @media (max-width: 768px) {
                    .store-products-intro { align-items: flex-start; padding: 16px; }
                    .store-products-summary { display: none; }
                    .store-products-header { align-items: stretch; flex-direction: column; gap: 12px; }
                    .store-products-actions { display: grid; grid-template-columns: 1fr 1fr; }
                    .store-products-actions button { width: 100%; }
                    .store-products-panel { padding: 13px; }
                }
                @media (max-width: 420px) { .store-products-actions { grid-template-columns: 1fr; } }
            `}</style>

            {showModal && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
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
                                <input type="text" className="input-field" placeholder="Ex: E-book de Vendas" required
                                    value={form.name} onChange={e => updateForm('name', e.target.value)} />
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Descrição do produto</label>
                                <div className="store-description-format" role="group" aria-label="Formato da descrição">
                                    <button
                                        type="button"
                                        className={form.store_description_format === 'plain' ? 'active' : ''}
                                        onClick={() => updateForm('store_description_format', 'plain')}
                                    >
                                        Texto normal
                                    </button>
                                    <button
                                        type="button"
                                        className={form.store_description_format === 'html' ? 'active' : ''}
                                        onClick={() => updateForm('store_description_format', 'html')}
                                    >
                                        Código HTML
                                    </button>
                                </div>
                                <textarea
                                    className={`input-field store-description-editor ${form.store_description_format === 'html' ? 'html' : ''}`}
                                    rows={form.store_description_format === 'html' ? 10 : 5}
                                    placeholder={form.store_description_format === 'html'
                                        ? '<h2>Sobre o produto</h2>\n<p>Descreva os benefícios com <strong>destaque</strong>.</p>\n<ul><li>Benefício 1</li></ul>'
                                        : 'Explique os benefícios ou detalhes do produto'}
                                    value={form.description}
                                    onChange={e => updateForm('description', e.target.value)}
                                />
                                <p className="store-description-help">
                                    {form.store_description_format === 'html'
                                        ? 'HTML seguro: títulos, parágrafos, listas, links, tabelas e formatação. Scripts, estilos e eventos são removidos automaticamente.'
                                        : 'O texto será exibido respeitando parágrafos e quebras de linha.'}
                                </p>
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Planos e preços</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {plans.map((pl, idx) => (
                                        <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                                            <input
                                                type="text"
                                                placeholder="Nome do plano (ex: Diário, Mensal)"
                                                className="input-field"
                                                style={{ height: 48, flex: 1, minWidth: 160 }}
                                                value={pl.name}
                                                onChange={e => setPlans(prev => prev.map((p, i) => i === idx ? { ...p, name: e.target.value } : p))}
                                            />
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0.01"
                                                placeholder="Preço (R$)"
                                                className="input-field"
                                                style={{ height: 48, width: 130 }}
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
                                    ))}
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        style={{ height: 46, alignSelf: 'flex-start' }}
                                        onClick={() => setPlans(prev => [...prev, { name: '', price: '' }])}
                                    >
                                        + Adicionar plano
                                    </button>
                                </div>
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Categoria na loja</label>
                                <select
                                    className="input-field"
                                    value={form.store_category_id}
                                    onChange={e => updateForm('store_category_id', e.target.value)}
                                >
                                    <option value="">Sem categoria</option>
                                    {categories.map(category => (
                                        <option key={category.id} value={category.id}>{category.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Entrega</label>
                                    <select className="input-field" value="digital" disabled>
                                        <option value="digital">Digital</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Status</label>
                                    <select className="input-field" value={form.status} onChange={e => updateForm('status', e.target.value)}>
                                        <option value="active">Ativo</option>
                                        <option value="inactive">Inativo</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ marginBottom: 24 }}>
                                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Imagem do produto</label>
                                <div style={{
                                    border: '1px dashed var(--border-color)', background: 'rgba(255,255,255,0.02)',
                                    borderRadius: 12, padding: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12
                                }} onClick={() => document.getElementById('storeFileInput')?.click()}>
                                    {imagePreview ? (
                                        <img src={imagePreview} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} alt="Preview" />
                                    ) : (
                                        <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <FiImage size={18} style={{ color: 'var(--text-muted)' }} />
                                        </div>
                                    )}
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>
                                            {selectedFile ? selectedFile.name : 'Selecione uma imagem'}
                                        </p>
                                        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>JPG, PNG ou GIF. Máx 2MB.</p>
                                    </div>
                                    <input id="storeFileInput" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
                                </div>
                            </div>

                            <button type="submit" className="btn-primary" disabled={uploading} style={{ width: '100%' }}>
                                {uploading ? 'Salvando...' : (editing ? 'Salvar Alterações' : 'Criar Produto na Loja')}
                            </button>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
