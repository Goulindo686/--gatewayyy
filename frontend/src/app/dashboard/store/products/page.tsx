'use client';
/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { productsAPI, storeCategoriesAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { FiCheck, FiX, FiRefreshCw, FiPlus, FiImage, FiEdit2, FiEye, FiEyeOff, FiLayers, FiPackage } from 'react-icons/fi';
import axios from 'axios';

export default function StoreProductsPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingParams, setUpdatingParams] = useState<string | null>(null);

    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form, setForm] = useState({ name: '', description: '', image_url: '', type: 'digital', status: 'active' });
    const [plans, setPlans] = useState<Array<{ name: string; price: string }>>([{ name: 'Padrão', price: '' }]);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            productsAPI.list({ limit: 100 }),
            storeCategoriesAPI.list()
        ])
            .then(([prodRes, catRes]) => {
                if (cancelled) return;
                setProducts(prodRes.data.products || []);
                setCategories(catRes.data.categories || []);
            })
            .catch(() => {
                if (!cancelled) toast.error('Erro ao carregar dados');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const loadData = async () => {
        try {
            const [prodRes, catRes] = await Promise.all([
                productsAPI.list({ limit: 100 }),
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
            await productsAPI.update(product.id, { show_in_store: newStatus });
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
            await productsAPI.update(productId, { store_category_id: val });
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
        setForm({ name: '', description: '', image_url: '', type: 'digital', status: 'active' });
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
            status: product.status
        });
        try {
            const { data } = await productsAPI.getById(product.id);
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

    const updateForm = (field: string, value: string) => setForm({ ...form, [field]: value });

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
                show_in_store: editing ? undefined : true
            };

            if (editing) {
                await productsAPI.update(editing.id, productData);
                toast.success('Produto atualizado!');
            } else {
                await productsAPI.create(productData);
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

    if (loading) return <div>Carregando...</div>;

    const visibleCount = products.filter(product => product.show_in_store).length;
    const hiddenCount = products.length - visibleCount;

    return (
        <div className="store-products-page">
            <section className="store-products-overview">
                <div className="store-products-overview-icon"><FiPackage /></div>
                <div className="store-products-overview-copy">
                    <span>CATÁLOGO DA LOJA</span>
                    <h2>Produtos da vitrine</h2>
                    <p>Escolha o que aparece para o público, organize por categoria e mantenha as informações em dia.</p>
                </div>
                <div className="store-products-metrics">
                    <span><FiEye /><strong>{visibleCount}</strong> visíveis</span>
                    <span><FiEyeOff /><strong>{hiddenCount}</strong> ocultos</span>
                    <span><FiLayers /><strong>{categories.length}</strong> categorias</span>
                </div>
                <div className="store-products-actions">
                    <button onClick={loadData} className="store-products-refresh" aria-label="Atualizar produtos"><FiRefreshCw /></button>
                    <button onClick={openCreate} className="btn-primary"><FiPlus /> Novo produto</button>
                </div>
            </section>

            <div className="store-products-list-heading">
                <div><span>INVENTÁRIO</span><h3>Todos os produtos</h3></div>
                <p>Use o status “Na vitrine” para controlar o que seus clientes encontram.</p>
            </div>

            <div className="glass-card store-products-table-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ minWidth: 640 }}>
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
                                <tr key={product.id} style={{ opacity: updatingParams === product.id ? 0.5 : 1 }}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            {product.image_url ? (
                                                <img src={product.image_url} alt={product.name} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📦</div>
                                            )}
                                            <div style={{ fontWeight: 500 }}>{product.name}</div>
                                        </div>
                                    </td>
                                    <td>R$ {product.price_display}</td>
                                    <td>
                                        <select
                                            className="input-field"
                                            style={{ padding: '6px 10px', fontSize: 13, height: 'auto', minWidth: 150 }}
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
                                    <td style={{ textAlign: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                            <button
                                                onClick={() => toggleVisibility(product)}
                                                disabled={updatingParams === product.id}
                                                style={{
                                                    background: product.show_in_store ? 'rgba(0, 206, 201, 0.1)' : 'var(--bg-secondary)',
                                                    color: product.show_in_store ? 'var(--success)' : 'var(--text-muted)',
                                                    border: `1px solid ${product.show_in_store ? 'rgba(0, 206, 201, 0.3)' : 'var(--border-color)'}`,
                                                    padding: '6px 12px', borderRadius: 20, cursor: 'pointer',
                                                    fontWeight: 600, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6
                                                }}
                                            >
                                                {product.show_in_store ? <FiCheck size={14} /> : <FiX size={14} />}
                                                {product.show_in_store ? 'Vitrine' : 'Oculto'}
                                            </button>
                                            <button
                                                onClick={() => openEdit(product)}
                                                aria-label={`Editar ${product.name}`}
                                                style={{
                                                    background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                                                    color: 'var(--text-primary)', padding: '6px 10px', borderRadius: 8,
                                                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                                                }}
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
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                        <p style={{ marginBottom: 16 }}>Nenhum produto cadastrado ainda.</p>
                        <button onClick={openCreate} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, margin: '0 auto' }}>
                            <FiPlus size={16} /> Criar Primeiro Produto
                        </button>
                    </div>
                )}
            </div>

            <style jsx global>{`
                .store-products-page { display: grid; gap: 18px; padding-bottom: 36px; }
                .store-products-overview { min-height: 142px; border: 1px solid var(--border-color); border-radius: 22px; padding: 22px 24px; display: grid; grid-template-columns: auto minmax(0,1fr) auto auto; align-items: center; gap: 16px; background: linear-gradient(125deg, var(--bg-card) 58%, rgba(108,92,231,.09)); }
                .store-products-overview-icon { width: 54px; height: 54px; border-radius: 17px; display: grid; place-items: center; color: var(--accent-primary); background: rgba(108,92,231,.11); font-size: 21px; }
                .store-products-overview-copy > span, .store-products-list-heading span { color: var(--accent-primary); font-size: 9px; font-weight: 900; letter-spacing: .12em; }
                .store-products-overview-copy h2 { margin: 4px 0 6px; color: var(--text-primary); font-size: 23px; }
                .store-products-overview-copy p { max-width: 600px; margin: 0; color: var(--text-secondary); font-size: 11px; line-height: 1.55; }
                .store-products-metrics { display: flex; gap: 6px; }
                .store-products-metrics > span { min-height: 34px; border: 1px solid var(--border-color); border-radius: 11px; padding: 0 9px; display: inline-flex; align-items: center; gap: 5px; color: var(--text-muted); background: var(--bg-secondary); font-size: 8px; white-space: nowrap; }
                .store-products-metrics svg { color: var(--accent-primary); }
                .store-products-metrics strong { color: var(--text-primary); font-size: 10px; }
                .store-products-actions { display: flex; gap: 8px; }
                .store-products-actions .btn-primary { min-height: 42px; padding: 0 14px; display: inline-flex; align-items: center; gap: 7px; font-size: 11px; }
                .store-products-refresh { width: 42px; height: 42px; border: 1px solid var(--border-color); border-radius: 12px; display: grid; place-items: center; color: var(--text-secondary); background: var(--bg-card); cursor: pointer; }
                .store-products-list-heading { padding: 4px 3px 0; display: flex; align-items: end; justify-content: space-between; gap: 18px; }
                .store-products-list-heading h3 { margin: 4px 0 0; color: var(--text-primary); font-size: 17px; }
                .store-products-list-heading p { margin: 0; color: var(--text-muted); font-size: 9px; }
                .store-products-table-card { border-radius: 18px !important; }
                .store-products-table-card .data-table thead { background: var(--bg-secondary); }
                .store-products-table-card .data-table th { color: var(--text-muted); font-size: 9px; letter-spacing: .06em; text-transform: uppercase; }
                .store-products-table-card .data-table td { padding-top: 14px; padding-bottom: 14px; }
                @media (max-width: 768px) {
                    .store-products-overview { grid-template-columns: auto 1fr auto; align-items: start; padding: 20px; }
                    .store-products-metrics { grid-column: 1 / -1; overflow-x: auto; }
                    .store-products-actions { grid-column: 3; grid-row: 1 / 3; }
                    .store-products-actions .btn-primary { width: 42px; padding: 0; font-size: 0; justify-content: center; }
                    .store-products-actions .btn-primary svg { font-size: 16px; }
                    .store-products-list-heading p { display: none; }
                }
                @media (max-width: 520px) { .store-products-overview { grid-template-columns: auto 1fr; } .store-products-overview-icon { width: 44px; height: 44px; border-radius: 14px; } .store-products-overview-copy h2 { font-size: 19px; } .store-products-actions { grid-column: 1 / -1; grid-row: auto; } .store-products-actions .btn-primary { width: auto; padding: 0 14px; font-size: 10px; } }
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
                                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Descrição do produto</label>
                                <textarea className="input-field" rows={3} placeholder="Explique os benefícios ou detalhes do produto"
                                    value={form.description} onChange={e => updateForm('description', e.target.value)} />
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
