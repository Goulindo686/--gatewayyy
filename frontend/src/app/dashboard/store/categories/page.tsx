'use client';

import { useEffect, useState } from 'react';
import { storeCategoriesAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { FiArrowDown, FiArrowUp, FiEdit2, FiGrid, FiImage, FiLink, FiPlus, FiTag, FiTrash2, FiUpload, FiX } from 'react-icons/fi';

type CategoryForm = {
    name: string;
    slug: string;
    image_url: string;
};

const emptyForm: CategoryForm = { name: '', slug: '', image_url: '' };

function slugify(value: string) {
    return value.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function errorMessage(error: any, fallback: string) {
    return error?.response?.data?.error || error?.message || fallback;
}

export default function StoreCategoriesPage() {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [ordering, setOrdering] = useState(false);
    const [isEditing, setIsEditing] = useState<any>(null);
    const [form, setForm] = useState<CategoryForm>(emptyForm);

    useEffect(() => {
        void loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            const { data } = await storeCategoriesAPI.list();
            setCategories(data.categories || []);
        } catch (error) {
            toast.error('Erro ao carregar categorias');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setForm(emptyForm);
        setIsEditing(null);
    };

    const uploadImage = async (file: File) => {
        setUploading(true);
        const loadingToast = toast.loading('Enviando imagem...');
        try {
            const data = new FormData();
            data.append('file', file);
            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
                body: data
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Erro ao enviar imagem');
            setForm(current => ({ ...current, image_url: result.url }));
            toast.success('Imagem adicionada', { id: loadingToast });
        } catch (error) {
            toast.error(errorMessage(error, 'Erro ao enviar imagem'), { id: loadingToast });
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        const name = form.name.trim();
        const slug = slugify(form.slug);
        if (!name || !slug) return toast.error('Preencha nome e slug');

        try {
            const payload = { name, slug, image_url: form.image_url.trim(), sort_order: isEditing?.sort_order ?? categories.length };
            if (isEditing) {
                await storeCategoriesAPI.update(isEditing.id, payload);
                toast.success('Categoria atualizada');
            } else {
                await storeCategoriesAPI.create(payload);
                toast.success('Categoria criada');
            }
            resetForm();
            await loadCategories();
        } catch (error: any) {
            toast.error(errorMessage(error, 'Erro ao salvar categoria'));
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta categoria? Os produtos vinculados a ela ficarao sem categoria.')) return;
        try {
            await storeCategoriesAPI.delete(id);
            toast.success('Categoria excluida');
            await loadCategories();
        } catch (error) {
            toast.error('Erro ao excluir');
        }
    };

    const editCategory = (cat: any) => {
        setIsEditing(cat);
        setForm({ name: cat.name || '', slug: cat.slug || '', image_url: cat.image_url || '' });
    };

    const orderedCategories = [...categories].sort((a, b) => {
        const aOrder = Number.isFinite(Number(a.sort_order)) ? Number(a.sort_order) : 0;
        const bOrder = Number.isFinite(Number(b.sort_order)) ? Number(b.sort_order) : 0;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return String(b.created_at || '').localeCompare(String(a.created_at || ''));
    });

    const moveCategory = async (categoryId: string, direction: -1 | 1) => {
        const currentIndex = orderedCategories.findIndex(category => category.id === categoryId);
        const targetIndex = currentIndex + direction;
        if (currentIndex < 0 || targetIndex < 0 || targetIndex >= orderedCategories.length) return;

        const next = [...orderedCategories];
        [next[currentIndex], next[targetIndex]] = [next[targetIndex], next[currentIndex]];
        const normalized = next.map((category, index) => ({ ...category, sort_order: index }));
        setCategories(normalized);
        setOrdering(true);
        try {
            await Promise.all(normalized.map(category => storeCategoriesAPI.update(category.id, { sort_order: category.sort_order })));
            toast.success('Ordem das categorias atualizada');
        } catch (error) {
            toast.error('Erro ao salvar ordem das categorias');
            await loadCategories();
        } finally {
            setOrdering(false);
        }
    };

    if (loading) return <div className="store-subpage-loading">Carregando categorias...</div>;

    return (
        <div className="store-categories-page">
            <section className="store-subpage-intro">
                <div className="store-subpage-intro-icon"><FiGrid /></div>
                <div className="store-subpage-intro-copy">
                    <span>ORGANIZACAO DO CATALOGO</span>
                    <h2>Categorias da loja</h2>
                    <p>Crie vitrines visuais para seus clientes navegarem por jogos, chaves, contas, cursos ou qualquer grupo de produto.</p>
                </div>
                <div className="store-subpage-stat">
                    <strong>{categories.length}</strong>
                    <span>categoria{orderedCategories.length === 1 ? '' : 's'} criada{orderedCategories.length === 1 ? '' : 's'}</span>
                </div>
            </section>

            <div className="store-categories-layout">
                <aside className="store-categories-form">
                    <div className="store-form-heading">
                        <span className="store-form-heading-icon">{isEditing ? <FiEdit2 /> : <FiPlus />}</span>
                        <div><small>{isEditing ? 'EDITANDO CARD' : 'NOVO CARD'}</small><h3>{isEditing ? 'Editar categoria' : 'Nova categoria'}</h3></div>
                    </div>

                    <div className="store-category-preview-card">
                        <div className="store-category-preview-media">
                            {form.image_url ? <img src={form.image_url} alt="" /> : <FiImage />}
                            <span />
                        </div>
                        <strong>{form.name || 'Nome da categoria'}</strong>
                    </div>

                    <div className="store-category-field">
                        <label>Imagem do card</label>
                        <div className="store-category-upload-row">
                            <label className="store-category-upload">
                                <FiUpload /> {uploading ? 'Enviando...' : form.image_url ? 'Trocar imagem' : 'Enviar imagem'}
                                <input
                                    type="file"
                                    accept="image/*"
                                    hidden
                                    disabled={uploading}
                                    onChange={async event => {
                                        const file = event.target.files?.[0];
                                        if (file) await uploadImage(file);
                                        event.target.value = '';
                                    }}
                                />
                            </label>
                            {form.image_url && (
                                <button type="button" className="store-category-clear-image" onClick={() => setForm(current => ({ ...current, image_url: '' }))}>
                                    <FiX /> Remover
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="store-category-field">
                        <label>Nome da categoria</label>
                        <input
                            className="input-field"
                            maxLength={60}
                            placeholder="Ex: Steam Keys"
                            value={form.name}
                            onChange={event => {
                                const name = event.target.value;
                                setForm(current => ({
                                    ...current,
                                    name,
                                    slug: isEditing ? current.slug : slugify(name)
                                }));
                            }}
                        />
                    </div>

                    <div className="store-category-field">
                        <label>Endereco da categoria</label>
                        <input
                            className="input-field"
                            maxLength={64}
                            placeholder="ex: steam-keys"
                            value={form.slug}
                            onChange={event => setForm(current => ({ ...current, slug: slugify(event.target.value) }))}
                        />
                        <small>Sera usado como <code>?category={form.slug || 'nome-da-categoria'}</code></small>
                    </div>

                    <div className="store-category-form-actions">
                        {isEditing && (
                            <button type="button" onClick={resetForm} className="btn-secondary">
                                Cancelar
                            </button>
                        )}
                        <button type="button" onClick={handleSave} className="btn-primary">
                            {isEditing ? 'Atualizar' : 'Criar categoria'}
                        </button>
                    </div>
                </aside>

                <section className="store-categories-list-panel">
                    <div className="store-panel-heading">
                        <div><span>CARDS DA VITRINE</span><h3>Categorias publicadas</h3></div>
                        <small>As imagens aparecem na loja quando categorias estiverem ativas.</small>
                    </div>

                    {orderedCategories.length === 0 ? (
                        <div className="store-categories-empty">
                            <FiTag />
                            <strong>Nenhuma categoria criada</strong>
                            <p>Crie sua primeira categoria com uma imagem vertical para deixar a loja mais visual.</p>
                        </div>
                    ) : (
                        <div className="store-category-list">
                            {orderedCategories.map((cat, index) => (
                                <article key={cat.id} className={`store-category-item ${isEditing?.id === cat.id ? 'editing' : ''}`}>
                                    <span className="store-category-order">{String(index + 1).padStart(2, '0')}</span>
                                    <span className="store-category-symbol">
                                        {cat.image_url ? <img src={cat.image_url} alt="" /> : <FiTag />}
                                    </span>
                                    <div className="store-category-info">
                                        <strong>{cat.name}</strong>
                                        <small><FiLink /> /{cat.slug}</small>
                                    </div>
                                    <div className="store-category-move-actions">
                                        <button type="button" onClick={() => moveCategory(cat.id, -1)} disabled={ordering || index === 0} aria-label={`Mover ${cat.name} para cima`}><FiArrowUp /></button>
                                        <button type="button" onClick={() => moveCategory(cat.id, 1)} disabled={ordering || index === orderedCategories.length - 1} aria-label={`Mover ${cat.name} para baixo`}><FiArrowDown /></button>
                                    </div>
                                    <div className="store-category-actions">
                                        <button type="button" onClick={() => editCategory(cat)} aria-label={`Editar ${cat.name}`}><FiEdit2 /></button>
                                        <button type="button" className="danger" onClick={() => handleDelete(cat.id)} aria-label={`Excluir ${cat.name}`}><FiTrash2 /></button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
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
                .store-categories-layout { display: grid; grid-template-columns: 360px minmax(0, 1fr); gap: 16px; align-items: start; }
                .store-categories-list-panel, .store-categories-form { border: 1px solid var(--border-color); border-radius: 18px; background: var(--bg-card); }
                .store-categories-form { position: sticky; top: 86px; padding: 18px; }
                .store-categories-list-panel { min-width: 0; padding: 18px; }
                .store-form-heading { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
                .store-form-heading-icon { width: 36px; height: 36px; border-radius: 11px; display: grid; place-items: center; color: var(--accent-primary); background: rgba(108,92,231,.11); }
                .store-form-heading small { display: block; color: var(--accent-primary); font-size: 7px; font-weight: 900; letter-spacing: .11em; margin-bottom: 2px; }
                .store-form-heading h3 { color: var(--text-primary); font-size: 14px; font-weight: 800; }
                .store-category-preview-card { position: relative; min-height: 214px; border: 1px solid var(--border-color); border-radius: 18px; display: grid; place-items: end center; overflow: hidden; padding: 18px; margin-bottom: 16px; background: linear-gradient(135deg, rgba(108,92,231,.20), rgba(9,132,227,.14)); }
                .store-category-preview-media { position: absolute; inset: 0; display: grid; place-items: center; color: rgba(255,255,255,.78); font-size: 44px; background: linear-gradient(145deg, #151821, #252b3a); }
                .store-category-preview-media img { width: 100%; height: 100%; object-fit: cover; }
                .store-category-preview-media span { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,.08), rgba(0,0,0,.72)); }
                .store-category-preview-card strong { position: relative; z-index: 1; max-width: 100%; color: #fff; font-size: 20px; font-weight: 950; text-align: center; text-transform: uppercase; line-height: .96; text-shadow: 0 2px 14px rgba(0,0,0,.48); word-break: break-word; }
                .store-category-field { margin-bottom: 14px; }
                .store-category-field label { display: block; color: var(--text-secondary); font-size: 11px; font-weight: 750; margin-bottom: 6px; }
                .store-category-field > small { display: block; color: var(--text-muted); font-size: 8px; line-height: 1.45; margin-top: 6px; }
                .store-category-field code { color: var(--accent-primary); }
                .store-category-upload-row { display: flex; gap: 8px; }
                .store-category-upload, .store-category-clear-image { min-height: 40px; border: 1px solid var(--border-color); border-radius: 11px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 0 12px; background: var(--bg-secondary); color: var(--text-secondary); font-size: 11px; font-weight: 800; cursor: pointer; }
                .store-category-upload { flex: 1; color: var(--accent-primary); border-color: rgba(108,92,231,.24); }
                .store-category-clear-image { color: var(--danger); }
                .store-category-form-actions { display: flex; gap: 8px; border-top: 1px solid var(--border-color); padding-top: 15px; margin-top: 18px; }
                .store-category-form-actions button { flex: 1; min-height: 42px; }
                .store-panel-heading { display: flex; align-items: end; justify-content: space-between; gap: 16px; border-bottom: 1px solid var(--border-color); padding: 0 2px 14px; margin-bottom: 12px; }
                .store-panel-heading span { display: block; color: var(--accent-primary); font-size: 8px; font-weight: 900; letter-spacing: .12em; margin-bottom: 3px; }
                .store-panel-heading h3 { color: var(--text-primary); font-size: 15px; font-weight: 800; }
                .store-panel-heading small { color: var(--text-muted); font-size: 9px; text-align: right; }
                .store-category-list { display: grid; gap: 8px; }
                .store-category-item { min-width: 0; border: 1px solid var(--border-color); border-radius: 13px; padding: 10px 12px; display: flex; align-items: center; gap: 11px; background: var(--bg-secondary); transition: border-color .2s, background .2s; }
                .store-category-item.editing { border-color: rgba(108,92,231,.42); background: rgba(108,92,231,.07); }
                .store-category-order { color: var(--text-muted); font-size: 9px; font-weight: 900; }
                .store-category-symbol { width: 44px; height: 58px; border-radius: 11px; display: grid; place-items: center; flex: 0 0 auto; overflow: hidden; color: var(--accent-primary); background: rgba(108,92,231,.10); }
                .store-category-symbol img { width: 100%; height: 100%; object-fit: cover; }
                .store-category-info { min-width: 0; }
                .store-category-info strong { display: block; overflow: hidden; color: var(--text-primary); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 4px; }
                .store-category-info small { display: flex; align-items: center; gap: 4px; color: var(--text-muted); font-size: 9px; }
                .store-category-move-actions { display: flex; gap: 5px; margin-left: auto; }
                .store-category-move-actions button { width: 29px; height: 29px; border: 1px solid var(--border-color); border-radius: 9px; display: grid; place-items: center; color: var(--text-muted); background: var(--bg-card); cursor: pointer; }
                .store-category-move-actions button:disabled { opacity: .35; cursor: not-allowed; }
                .store-category-actions { display: flex; gap: 6px; }
                .store-category-actions button { width: 32px; height: 32px; border: 1px solid var(--border-color); border-radius: 9px; display: grid; place-items: center; color: var(--text-secondary); background: var(--bg-card); cursor: pointer; }
                .store-category-actions button.danger { color: var(--danger); border-color: rgba(255,107,107,.22); }
                .store-categories-empty { min-height: 260px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: var(--text-muted); }
                .store-categories-empty > svg { font-size: 28px; margin-bottom: 10px; opacity: .6; }
                .store-categories-empty strong { color: var(--text-primary); font-size: 13px; margin-bottom: 5px; }
                .store-categories-empty p { max-width: 330px; font-size: 10px; line-height: 1.5; }
                @media (max-width: 920px) { .store-categories-layout { grid-template-columns: 1fr; } .store-categories-form { position: static; } }
                @media (max-width: 600px) { .store-subpage-intro { align-items: flex-start; padding: 16px; } .store-subpage-stat { display: none; } .store-panel-heading { display: block; } .store-panel-heading small { display: block; margin-top: 5px; text-align: left; } .store-categories-list-panel, .store-categories-form { padding: 13px; } .store-category-order { display: none; } .store-category-upload-row, .store-category-form-actions { flex-direction: column; } }
            `}</style>
        </div>
    );
}
