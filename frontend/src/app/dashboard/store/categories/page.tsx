'use client';

import { useEffect, useState } from 'react';
import { storeCategoriesAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { FiArrowRight, FiEdit2, FiFolder, FiGrid, FiPlus, FiTrash2, FiX } from 'react-icons/fi';

type StoreCategory = {
    id: string;
    name: string;
    slug: string;
};

function createSlug(value: string) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

export default function StoreCategoriesPage() {
    const [categories, setCategories] = useState<StoreCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<StoreCategory | null>(null);
    const [form, setForm] = useState({ name: '', slug: '' });

    const loadCategories = async () => {
        try {
            const { data } = await storeCategoriesAPI.list();
            setCategories(data.categories || []);
        } catch {
            toast.error('Erro ao carregar categorias');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let cancelled = false;
        storeCategoriesAPI.list()
            .then(({ data }) => {
                if (!cancelled) setCategories(data.categories || []);
            })
            .catch(() => {
                if (!cancelled) toast.error('Erro ao carregar categorias');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const resetForm = () => {
        setEditing(null);
        setForm({ name: '', slug: '' });
    };

    const handleSave = async () => {
        if (!form.name.trim() || !form.slug.trim()) return toast.error('Preencha o nome e o endereço da categoria');
        setSaving(true);
        try {
            if (editing) {
                await storeCategoriesAPI.update(editing.id, form);
                toast.success('Categoria atualizada');
            } else {
                await storeCategoriesAPI.create(form);
                toast.success('Categoria criada');
            }
            resetForm();
            await loadCategories();
        } catch (error: unknown) {
            const message = error && typeof error === 'object' && 'response' in error
                ? (error as { response?: { data?: { error?: string } } }).response?.data?.error
                : null;
            toast.error(message || 'Erro ao salvar categoria');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (category: StoreCategory) => {
        if (!confirm(`Excluir a categoria “${category.name}”? Os produtos vinculados ficarão sem categoria.`)) return;
        try {
            await storeCategoriesAPI.delete(category.id);
            if (editing?.id === category.id) resetForm();
            toast.success('Categoria excluída');
            await loadCategories();
        } catch {
            toast.error('Erro ao excluir categoria');
        }
    };

    const editCategory = (category: StoreCategory) => {
        setEditing(category);
        setForm({ name: category.name, slug: category.slug });
        document.getElementById('category-editor')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    if (loading) return <div className="store-category-loading">Carregando categorias...</div>;

    return (
        <div className="store-categories-page">
            <section className="store-category-overview">
                <div className="store-category-overview-icon"><FiGrid /></div>
                <div>
                    <span>ORGANIZAÇÃO DO CATÁLOGO</span>
                    <h2>Categorias da loja</h2>
                    <p>Crie caminhos simples para o cliente encontrar os produtos certos com menos esforço.</p>
                </div>
                <div className="store-category-total">
                    <strong>{String(categories.length).padStart(2, '0')}</strong>
                    <span>{categories.length === 1 ? 'categoria criada' : 'categorias criadas'}</span>
                </div>
            </section>

            <div className="store-categories-layout">
                <section className="store-category-list-panel">
                    <div className="store-category-list-heading">
                        <div><span>COLEÇÕES ATUAIS</span><h3>Estrutura da navegação</h3></div>
                        <button type="button" onClick={resetForm}><FiPlus /> Nova categoria</button>
                    </div>

                    {categories.length === 0 ? (
                        <div className="store-category-empty">
                            <FiFolder />
                            <strong>Comece pela primeira categoria</strong>
                            <p>Use nomes curtos e fáceis de reconhecer, como “Mais vendidos”, “Cursos” ou “Cuidados pessoais”.</p>
                            <button type="button" onClick={resetForm}>Criar agora <FiArrowRight /></button>
                        </div>
                    ) : (
                        <div className="store-category-list">
                            {categories.map((category, index) => (
                                <article key={category.id} className={editing?.id === category.id ? 'editing' : ''}>
                                    <span className="store-category-index">{String(index + 1).padStart(2, '0')}</span>
                                    <div className="store-category-copy">
                                        <strong>{category.name}</strong>
                                        <small>/categoria/{category.slug}</small>
                                    </div>
                                    <div className="store-category-actions">
                                        <button type="button" onClick={() => editCategory(category)} aria-label={`Editar ${category.name}`}><FiEdit2 /></button>
                                        <button type="button" className="danger" onClick={() => handleDelete(category)} aria-label={`Excluir ${category.name}`}><FiTrash2 /></button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>

                <aside id="category-editor" className="store-category-editor">
                    <div className="store-category-editor-heading">
                        <span className="store-category-editor-number">{editing ? '02' : '01'}</span>
                        <div>
                            <small>{editing ? 'EDITANDO CATEGORIA' : 'NOVA CATEGORIA'}</small>
                            <h3>{editing ? editing.name : 'Crie um novo caminho'}</h3>
                        </div>
                        {editing && <button type="button" onClick={resetForm} aria-label="Cancelar edição"><FiX /></button>}
                    </div>
                    <p className="store-category-editor-description">O nome aparece para o cliente. O endereço é usado no link e deve ser simples.</p>

                    <label>
                        <span>Nome da categoria</span>
                        <input
                            className="input-field"
                            placeholder="Ex: Mais vendidos"
                            maxLength={80}
                            value={form.name}
                            onChange={event => {
                                const name = event.target.value;
                                setForm(previous => ({ ...previous, name, slug: editing ? previous.slug : createSlug(name) }));
                            }}
                        />
                    </label>
                    <label>
                        <span>Endereço da categoria</span>
                        <div className="store-category-slug">
                            <i>/</i>
                            <input
                                value={form.slug}
                                placeholder="mais-vendidos"
                                maxLength={80}
                                onChange={event => setForm(previous => ({ ...previous, slug: createSlug(event.target.value) }))}
                            />
                        </div>
                    </label>
                    <div className="store-category-editor-tip"><FiFolder /> Prefira uma categoria ampla em vez de muitas categorias com apenas um produto.</div>
                    <button type="button" className="btn-primary store-category-save" onClick={handleSave} disabled={saving}>
                        {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar categoria'} <FiArrowRight />
                    </button>
                </aside>
            </div>

            <style jsx global>{`
                .store-categories-page { display: grid; gap: 18px; padding-bottom: 36px; }
                .store-category-loading { min-height: 260px; display: grid; place-items: center; color: var(--text-muted); }
                .store-category-overview { min-height: 134px; border: 1px solid var(--border-color); border-radius: 22px; padding: 24px 26px; display: flex; align-items: center; gap: 16px; background: linear-gradient(125deg, var(--bg-card) 55%, rgba(108,92,231,.09)); }
                .store-category-overview-icon { width: 54px; height: 54px; border-radius: 17px; display: grid; place-items: center; flex: 0 0 auto; color: var(--accent-primary); background: rgba(108,92,231,.11); font-size: 21px; }
                .store-category-overview > div:nth-child(2) > span, .store-category-list-heading span, .store-category-editor-heading small { color: var(--accent-primary); font-size: 9px; font-weight: 900; letter-spacing: .12em; }
                .store-category-overview h2 { margin: 4px 0 6px; color: var(--text-primary); font-size: 23px; }
                .store-category-overview p { max-width: 680px; margin: 0; color: var(--text-secondary); font-size: 12px; line-height: 1.55; }
                .store-category-total { margin-left: auto; border-left: 1px solid var(--border-color); padding-left: 24px; text-align: right; }
                .store-category-total strong, .store-category-total span { display: block; }
                .store-category-total strong { color: var(--text-primary); font-size: 28px; line-height: 1; }
                .store-category-total span { margin-top: 5px; color: var(--text-muted); font-size: 9px; }
                .store-categories-layout { display: grid; grid-template-columns: minmax(0, 1fr) 360px; align-items: start; gap: 18px; }
                .store-category-list-panel, .store-category-editor { border: 1px solid var(--border-color); border-radius: 20px; background: var(--bg-card); }
                .store-category-list-panel { padding: 21px; }
                .store-category-list-heading { margin-bottom: 17px; display: flex; align-items: center; justify-content: space-between; gap: 18px; }
                .store-category-list-heading h3 { margin: 4px 0 0; color: var(--text-primary); font-size: 17px; }
                .store-category-list-heading > button { min-height: 38px; border: 1px solid var(--border-color); border-radius: 11px; padding: 0 12px; display: inline-flex; align-items: center; gap: 7px; color: var(--text-secondary); background: var(--bg-secondary); font-size: 10px; font-weight: 800; cursor: pointer; }
                .store-category-list { display: grid; gap: 9px; }
                .store-category-list article { min-height: 76px; border: 1px solid var(--border-color); border-radius: 14px; padding: 12px 13px; display: flex; align-items: center; gap: 12px; background: var(--bg-secondary); transition: border-color .2s, background .2s; }
                .store-category-list article.editing { border-color: rgba(108,92,231,.4); background: rgba(108,92,231,.07); }
                .store-category-index { width: 36px; height: 36px; border-radius: 11px; display: grid; place-items: center; flex: 0 0 auto; color: var(--accent-primary); background: rgba(108,92,231,.1); font-size: 10px; font-weight: 900; }
                .store-category-copy { min-width: 0; }
                .store-category-copy strong, .store-category-copy small { display: block; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
                .store-category-copy strong { color: var(--text-primary); font-size: 13px; }
                .store-category-copy small { margin-top: 4px; color: var(--text-muted); font-size: 9px; }
                .store-category-actions { margin-left: auto; display: flex; gap: 6px; }
                .store-category-actions button { width: 34px; height: 34px; border: 1px solid var(--border-color); border-radius: 10px; display: grid; place-items: center; color: var(--text-secondary); background: var(--bg-card); cursor: pointer; }
                .store-category-actions button.danger { color: var(--danger); }
                .store-category-empty { min-height: 300px; border: 1px dashed var(--border-color); border-radius: 16px; padding: 32px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; background: var(--bg-secondary); }
                .store-category-empty > svg { margin-bottom: 13px; color: var(--accent-primary); font-size: 28px; }
                .store-category-empty strong { color: var(--text-primary); font-size: 14px; }
                .store-category-empty p { max-width: 450px; margin: 7px 0 17px; color: var(--text-secondary); font-size: 11px; line-height: 1.55; }
                .store-category-empty button { border: 0; display: inline-flex; align-items: center; gap: 7px; color: var(--accent-primary); background: transparent; font-size: 10px; font-weight: 850; cursor: pointer; }
                .store-category-editor { position: sticky; top: 18px; padding: 22px; }
                .store-category-editor-heading { display: flex; align-items: center; gap: 11px; }
                .store-category-editor-number { width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; flex: 0 0 auto; color: var(--accent-primary); background: rgba(108,92,231,.11); font-size: 11px; font-weight: 900; }
                .store-category-editor-heading h3 { margin: 3px 0 0; color: var(--text-primary); font-size: 15px; }
                .store-category-editor-heading > button { margin-left: auto; border: 0; color: var(--text-muted); background: transparent; cursor: pointer; }
                .store-category-editor-description { margin: 16px 0 20px; color: var(--text-secondary); font-size: 11px; line-height: 1.55; }
                .store-category-editor label { display: block; margin-bottom: 15px; }
                .store-category-editor label > span { display: block; margin-bottom: 6px; color: var(--text-secondary); font-size: 10px; font-weight: 750; }
                .store-category-slug { height: 48px; border: 1px solid var(--border-color); border-radius: 12px; padding: 0 13px; display: flex; align-items: center; gap: 3px; background: var(--bg-secondary); }
                .store-category-slug i { color: var(--text-muted); font-size: 12px; font-style: normal; }
                .store-category-slug input { width: 100%; min-width: 0; border: 0; outline: 0; color: var(--text-primary); background: transparent; }
                .store-category-editor-tip { margin: 5px 0 18px; padding: 12px; border-radius: 11px; display: flex; align-items: flex-start; gap: 8px; color: var(--text-muted); background: var(--bg-secondary); font-size: 9px; line-height: 1.45; }
                .store-category-editor-tip svg { flex: 0 0 auto; color: var(--accent-primary); }
                .store-category-save { width: 100%; min-height: 44px; display: flex; align-items: center; justify-content: center; gap: 8px; }
                @media (max-width: 860px) { .store-categories-layout { grid-template-columns: 1fr; } .store-category-editor { position: static; } }
                @media (max-width: 620px) { .store-category-overview { align-items: flex-start; padding: 20px; } .store-category-overview-icon { width: 44px; height: 44px; border-radius: 14px; } .store-category-total { display: none; } .store-category-overview h2 { font-size: 19px; } .store-category-list-panel, .store-category-editor { padding: 16px; } .store-category-list-heading { align-items: flex-start; } .store-category-list-heading > button { font-size: 0; } .store-category-list-heading > button svg { font-size: 15px; } }
            `}</style>
        </div>
    );
}
