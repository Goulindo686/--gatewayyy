'use client';

import { useEffect, useState } from 'react';
import { storeCategoriesAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { FiEdit2, FiGrid, FiLink, FiPlus, FiTag, FiTrash2 } from 'react-icons/fi';

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

    if (loading) return <div className="store-subpage-loading">Carregando categorias...</div>;

    return (
        <div className="store-categories-page">
            <section className="store-subpage-intro">
                <div className="store-subpage-intro-icon"><FiGrid /></div>
                <div className="store-subpage-intro-copy">
                    <span>ORGANIZAÇÃO DO CATÁLOGO</span>
                    <h2>Categorias da loja</h2>
                    <p>Crie grupos simples para ajudar seus clientes a encontrar os produtos certos.</p>
                </div>
                <div className="store-subpage-stat">
                    <strong>{categories.length}</strong>
                    <span>categoria{categories.length === 1 ? '' : 's'} criada{categories.length === 1 ? '' : 's'}</span>
                </div>
            </section>

            <div className="store-categories-layout">
                <section className="store-categories-list-panel">
                    <div className="store-panel-heading">
                        <div><span>VISÃO GERAL</span><h3>Categorias existentes</h3></div>
                        <small>Edite o nome ou o endereço quando precisar.</small>
                    </div>

                    {categories.length === 0 ? (
                        <div className="store-categories-empty">
                            <FiTag />
                            <strong>Nenhuma categoria criada</strong>
                            <p>Use o formulário ao lado para criar a primeira organização do seu catálogo.</p>
                        </div>
                    ) : (
                        <div className="store-category-list">
                            {categories.map((cat, index) => (
                                <article key={cat.id} className={`store-category-item ${isEditing?.id === cat.id ? 'editing' : ''}`}>
                                    <span className="store-category-order">{String(index + 1).padStart(2, '0')}</span>
                                    <span className="store-category-symbol"><FiTag /></span>
                                    <div className="store-category-info">
                                        <strong>{cat.name}</strong>
                                        <small><FiLink /> /{cat.slug}</small>
                                    </div>
                                    <div className="store-category-actions">
                                        <button onClick={() => editCategory(cat)} aria-label={`Editar ${cat.name}`}><FiEdit2 /></button>
                                        <button className="danger" onClick={() => handleDelete(cat.id)} aria-label={`Excluir ${cat.name}`}><FiTrash2 /></button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>

                <aside className="store-categories-form">
                    <div className="store-form-heading">
                        <span className="store-form-heading-icon">{isEditing ? <FiEdit2 /> : <FiPlus />}</span>
                        <div><small>{isEditing ? 'MODO DE EDIÇÃO' : 'NOVA ORGANIZAÇÃO'}</small><h3>{isEditing ? 'Editar categoria' : 'Nova categoria'}</h3></div>
                    </div>
                    <p className="store-form-description">Defina um nome fácil de entender e um endereço curto para o link.</p>

                    <div className="store-category-field">
                    <label>Nome da categoria</label>
                    <input className="input-field" placeholder="Ex: E-books" value={form.name} onChange={e => {
                        const name = e.target.value;
                        setForm({
                            name,
                            slug: isEditing ? form.slug : name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
                        });
                    }} />
                </div>

                    <div className="store-category-field">
                    <label>Endereço da categoria</label>
                    <input className="input-field" placeholder="ex: e-books" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} />
                    <small>Será usado como <code>?category={form.slug || 'nome-da-categoria'}</code></small>
                </div>

                    <div className="store-category-form-actions">
                    {isEditing && (
                        <button onClick={() => { setIsEditing(null); setForm({ name: '', slug: '' }); }} className="btn-secondary">
                            Cancelar
                        </button>
                    )}
                    <button onClick={handleSave} className="btn-primary">
                        {isEditing ? 'Atualizar' : 'Criar Categoria'}
                    </button>
                </div>
                </aside>
            </div>

            <style jsx global>{`
                .store-subpage-loading { min-height: 240px; display: grid; place-items: center; color: var(--text-muted); font-size: 13px; }
                .store-categories-page { display: grid; gap: 16px; }
                .store-subpage-intro { border: 1px solid var(--border-color); border-radius: 18px; padding: 19px 21px; display: flex; align-items: center; gap: 14px; background: var(--bg-card); }
                .store-subpage-intro-icon { width: 44px; height: 44px; border-radius: 13px; display: grid; place-items: center; flex: 0 0 auto; color: var(--accent-primary); background: rgba(108,92,231,.11); font-size: 19px; }
                .store-subpage-intro-copy { min-width: 0; }
                .store-subpage-intro-copy > span { display: block; color: var(--accent-primary); font-size: 8px; font-weight: 900; letter-spacing: .13em; margin-bottom: 3px; }
                .store-subpage-intro h2 { color: var(--text-primary); font-size: 20px; font-weight: 850; margin-bottom: 4px; }
                .store-subpage-intro p { color: var(--text-secondary); font-size: 11px; line-height: 1.5; }
                .store-subpage-stat { margin-left: auto; border-left: 1px solid var(--border-color); padding-left: 22px; min-width: 130px; }
                .store-subpage-stat strong, .store-subpage-stat span { display: block; }
                .store-subpage-stat strong { color: var(--text-primary); font-size: 23px; line-height: 1; margin-bottom: 5px; }
                .store-subpage-stat span { color: var(--text-muted); font-size: 9px; }
                .store-categories-layout { display: grid; grid-template-columns: minmax(0, 1fr) 350px; gap: 16px; align-items: start; }
                .store-categories-list-panel, .store-categories-form { border: 1px solid var(--border-color); border-radius: 18px; background: var(--bg-card); }
                .store-categories-list-panel { min-width: 0; padding: 18px; }
                .store-panel-heading { display: flex; align-items: end; justify-content: space-between; gap: 16px; border-bottom: 1px solid var(--border-color); padding: 0 2px 14px; margin-bottom: 12px; }
                .store-panel-heading span { display: block; color: var(--accent-primary); font-size: 8px; font-weight: 900; letter-spacing: .12em; margin-bottom: 3px; }
                .store-panel-heading h3 { color: var(--text-primary); font-size: 15px; font-weight: 800; }
                .store-panel-heading small { color: var(--text-muted); font-size: 9px; text-align: right; }
                .store-category-list { display: grid; gap: 8px; }
                .store-category-item { position: relative; min-width: 0; border: 1px solid var(--border-color); border-radius: 13px; padding: 11px 12px; display: flex; align-items: center; gap: 11px; background: var(--bg-secondary); transition: border-color .2s, background .2s; }
                .store-category-item.editing { border-color: rgba(108,92,231,.42); background: rgba(108,92,231,.07); }
                .store-category-order { color: var(--text-muted); font-size: 9px; font-weight: 900; }
                .store-category-symbol { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; flex: 0 0 auto; color: var(--accent-primary); background: rgba(108,92,231,.10); }
                .store-category-info { min-width: 0; }
                .store-category-info strong { display: block; overflow: hidden; color: var(--text-primary); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 4px; }
                .store-category-info small { display: flex; align-items: center; gap: 4px; color: var(--text-muted); font-size: 9px; }
                .store-category-actions { display: flex; gap: 6px; margin-left: auto; }
                .store-category-actions button { width: 32px; height: 32px; border: 1px solid var(--border-color); border-radius: 9px; display: grid; place-items: center; color: var(--text-secondary); background: var(--bg-card); cursor: pointer; }
                .store-category-actions button.danger { color: var(--danger); border-color: rgba(255,107,107,.22); }
                .store-categories-empty { min-height: 210px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: var(--text-muted); }
                .store-categories-empty > svg { font-size: 28px; margin-bottom: 10px; opacity: .6; }
                .store-categories-empty strong { color: var(--text-primary); font-size: 13px; margin-bottom: 5px; }
                .store-categories-empty p { max-width: 330px; font-size: 10px; line-height: 1.5; }
                .store-categories-form { position: sticky; top: 86px; padding: 19px; }
                .store-form-heading { display: flex; align-items: center; gap: 10px; margin-bottom: 9px; }
                .store-form-heading-icon { width: 36px; height: 36px; border-radius: 11px; display: grid; place-items: center; color: var(--accent-primary); background: rgba(108,92,231,.11); }
                .store-form-heading small { display: block; color: var(--accent-primary); font-size: 7px; font-weight: 900; letter-spacing: .11em; margin-bottom: 2px; }
                .store-form-heading h3 { color: var(--text-primary); font-size: 14px; font-weight: 800; }
                .store-form-description { color: var(--text-muted); font-size: 10px; line-height: 1.5; margin-bottom: 18px; }
                .store-category-field { margin-bottom: 15px; }
                .store-category-field label { display: block; color: var(--text-secondary); font-size: 11px; font-weight: 750; margin-bottom: 6px; }
                .store-category-field > small { display: block; color: var(--text-muted); font-size: 8px; line-height: 1.45; margin-top: 6px; }
                .store-category-field code { color: var(--accent-primary); }
                .store-category-form-actions { display: flex; gap: 8px; border-top: 1px solid var(--border-color); padding-top: 15px; margin-top: 19px; }
                .store-category-form-actions button { flex: 1; min-height: 42px; }
                @media (max-width: 860px) { .store-categories-layout { grid-template-columns: 1fr; } .store-categories-form { position: static; } }
                @media (max-width: 600px) { .store-subpage-intro { align-items: flex-start; padding: 16px; } .store-subpage-stat { display: none; } .store-panel-heading { display: block; } .store-panel-heading small { display: block; margin-top: 5px; text-align: left; } .store-categories-list-panel { padding: 13px; } .store-category-order { display: none; } }
            `}</style>
        </div>
    );
}
