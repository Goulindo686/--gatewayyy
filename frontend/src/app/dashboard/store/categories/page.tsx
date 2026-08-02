'use client';

import { useEffect, useState } from 'react';
import { storeCategoriesAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { FiEdit2, FiTrash2, FiPlus } from 'react-icons/fi';

export default function StoreCategoriesPage() {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState<any>(null);
    const [form, setForm] = useState({ name: '', slug: '' });

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            const { data } = await storeCategoriesAPI.list();
            setCategories(data.categories);
        } catch (error) {
            toast.error('Erro ao carregar categorias');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!form.name || !form.slug) return toast.error('Preencha nome e slug');

        try {
            if (isEditing) {
                await storeCategoriesAPI.update(isEditing.id, form);
                toast.success('Categoria atualizada');
            } else {
                await storeCategoriesAPI.create(form);
                toast.success('Categoria criada');
            }
            setForm({ name: '', slug: '' });
            setIsEditing(null);
            loadCategories();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Erro ao salvar categoria');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta categoria? Os produtos vinculados a ela ficarão sem categoria.')) return;
        try {
            await storeCategoriesAPI.delete(id);
            toast.success('Categoria excluída');
            loadCategories();
        } catch (error) {
            toast.error('Erro ao excluir');
        }
    };

    const editCategory = (cat: any) => {
        setIsEditing(cat);
        setForm({ name: cat.name, slug: cat.slug });
    };

    if (loading) return <div>Carregando...</div>;

    return (
        <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }} className="store-categories-layout">
            <div style={{ flex: 1, minWidth: 0 }} className="store-categories-list">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 600 }} className="store-categories-title">Categorias Existentes</h2>
                </div>

                {categories.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border-color)' }}>
                        <p style={{ color: 'var(--text-secondary)' }}>Você ainda não criou nenhuma categoria.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {categories.map(cat => (
                            <div key={cat.id} className="glass-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{cat.name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>/{cat.slug}</div>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button onClick={() => editCategory(cat)} className="btn-secondary" style={{ padding: 8 }}>
                                        <FiEdit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(cat.id)} className="btn-secondary" style={{ padding: 8, color: 'var(--danger)', borderColor: 'rgba(255,107,107,0.2)' }}>
                                        <FiTrash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="glass-card store-categories-form" style={{ width: 350, position: 'sticky', top: 100 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>
                    {isEditing ? 'Editar Categoria' : 'Nova Categoria'}
                </h3>

                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Nome</label>
                    <input className="input-field" placeholder="Ex: E-books" value={form.name} onChange={e => {
                        const name = e.target.value;
                        setForm({
                            name,
                            slug: isEditing ? form.slug : name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
                        });
                    }} />
                </div>

                <div style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Slug</label>
                    <input className="input-field" placeholder="ex: e-books" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} />
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                    {isEditing && (
                        <button onClick={() => { setIsEditing(null); setForm({ name: '', slug: '' }); }} className="btn-secondary" style={{ flex: 1 }}>
                            Cancelar
                        </button>
                    )}
                    <button onClick={handleSave} className="btn-primary" style={{ flex: isEditing ? 1 : '1 1 auto', width: isEditing ? 'auto' : '100%' }}>
                        {isEditing ? 'Atualizar' : 'Criar Categoria'}
                    </button>
                </div>
            </div>

            <style jsx global>{`
        @media (max-width: 768px) {
          .store-categories-layout {
            flex-direction: column !important;
            gap: 18px !important;
            align-items: stretch !important;
          }
          .store-categories-title {
            width: 100%;
            text-align: center !important;
          }
          .store-categories-list {
            width: 100% !important;
            max-width: 560px !important;
            margin: 0 auto !important;
          }
          .store-categories-form {
            width: 100% !important;
            max-width: 560px !important;
            margin: 0 auto !important;
            position: static !important;
            top: auto !important;
          }
        }
      `}</style>
        </div>
    );
}
