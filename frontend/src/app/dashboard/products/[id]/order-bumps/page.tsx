'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { productsAPI, orderBumpsAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import {
    FiArrowLeft, FiPlus, FiTrash2, FiEdit2, FiSave, FiX,
    FiPackage, FiTag, FiToggleLeft, FiToggleRight, FiChevronDown, FiChevronUp
} from 'react-icons/fi';

interface Plan {
    id: string;
    name: string;
    price: number;
    sort_order: number;
}

interface BumpProduct {
    id: string;
    name: string;
    price: number;
    image_url?: string;
    plans?: Plan[];
}

interface OrderBump {
    id: string;
    title: string;
    description?: string;
    call_to_action: string;
    custom_price?: number;
    badge_text: string;
    badge_color: string;
    sort_order: number;
    is_active: boolean;
    bump_product_id?: string;
    bump_plan_id?: string;
    bump_product?: BumpProduct;
    bump_plan?: { id: string; name: string; price: number };
}

const EMPTY_FORM = {
    bump_product_id: '',
    bump_plan_id: '',
    title: 'Oferta Especial',
    description: '',
    call_to_action: 'Sim! Quero adicionar esta oferta',
    custom_price: '',
    badge_text: 'OFERTA EXCLUSIVA',
    badge_color: '#E17055',
};

const BADGE_COLORS = ['#E17055', '#6C5CE7', '#00B894', '#FDCB6E', '#0984E3', '#E84393', '#2D3436'];

export default function OrderBumpsPage() {
    const params = useParams();
    const router = useRouter();
    const productId = params.id as string;

    const [product, setProduct] = useState<any>(null);
    const [bumps, setBumps] = useState<OrderBump[]>([]);
    const [myProducts, setMyProducts] = useState<BumpProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingBump, setEditingBump] = useState<OrderBump | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);

    // Planos do produto selecionado no form
    const selectedBumpProduct = myProducts.find(p => p.id === form.bump_product_id);
    const availablePlans = selectedBumpProduct?.plans || [];

    useEffect(() => {
        loadData();
    }, [productId]);

    const loadData = async () => {
        try {
            const [productRes, bumpsRes, productsRes] = await Promise.all([
                productsAPI.getById(productId),
                orderBumpsAPI.list(productId),
                productsAPI.list({ limit: 100 }),
            ]);
            setProduct(productRes.data.product);
            setBumps(bumpsRes.data.order_bumps || []);

            // Filtra produtos disponíveis (exclui o próprio produto)
            // O list agora já retorna os planos embutidos em cada produto
            const availableProducts = (productsRes.data.products || []).filter(
                (p: any) => p.id !== productId && p.status === 'active'
            );
            setMyProducts(availableProducts);
        } catch {
            toast.error('Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setEditingBump(null);
        setForm(EMPTY_FORM);
        setShowForm(true);
    };

    const openEdit = (bump: OrderBump) => {
        setEditingBump(bump);
        setForm({
            bump_product_id: bump.bump_product_id || '',
            bump_plan_id: bump.bump_plan_id || '',
            title: bump.title,
            description: bump.description || '',
            call_to_action: bump.call_to_action,
            custom_price: bump.custom_price ? (bump.custom_price / 100).toFixed(2) : '',
            badge_text: bump.badge_text,
            badge_color: bump.badge_color,
        });
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingBump(null);
        setForm(EMPTY_FORM);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.bump_product_id) {
            toast.error('Selecione o produto do bump');
            return;
        }
        setSaving(true);
        try {
            const payload: any = {
                bump_product_id: form.bump_product_id,
                bump_plan_id: form.bump_plan_id || null,
                title: form.title,
                description: form.description || null,
                call_to_action: form.call_to_action,
                custom_price: form.custom_price ? parseFloat(form.custom_price) : null,
                badge_text: form.badge_text,
                badge_color: form.badge_color,
            };

            if (editingBump) {
                await orderBumpsAPI.update(productId, editingBump.id, payload);
                toast.success('Order bump atualizado!');
            } else {
                await orderBumpsAPI.create(productId, payload);
                toast.success('Order bump criado!');
            }
            closeForm();
            loadData();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao salvar');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (bumpId: string) => {
        if (!confirm('Remover este order bump?')) return;
        try {
            await orderBumpsAPI.delete(productId, bumpId);
            toast.success('Order bump removido!');
            loadData();
        } catch {
            toast.error('Erro ao remover');
        }
    };

    const toggleActive = async (bump: OrderBump) => {
        try {
            await orderBumpsAPI.update(productId, bump.id, { is_active: !bump.is_active });
            setBumps(prev => prev.map(b => b.id === bump.id ? { ...b, is_active: !b.is_active } : b));
        } catch {
            toast.error('Erro ao atualizar');
        }
    };

    const moveOrder = async (bump: OrderBump, direction: 'up' | 'down') => {
        const idx = bumps.findIndex(b => b.id === bump.id);
        const newIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (newIdx < 0 || newIdx >= bumps.length) return;

        const newBumps = [...bumps];
        [newBumps[idx], newBumps[newIdx]] = [newBumps[newIdx], newBumps[idx]];
        setBumps(newBumps);

        // Persiste a nova ordem
        try {
            await Promise.all([
                orderBumpsAPI.update(productId, newBumps[idx].id, { sort_order: idx }),
                orderBumpsAPI.update(productId, newBumps[newIdx].id, { sort_order: newIdx }),
            ]);
        } catch {
            // Reverte em caso de erro
            loadData();
        }
    };

    const getEffectivePrice = (bump: OrderBump) => {
        if (bump.custom_price) return (bump.custom_price / 100).toFixed(2);
        if (bump.bump_plan?.price) return (bump.bump_plan.price / 100).toFixed(2);
        if (bump.bump_product?.price) return (bump.bump_product.price / 100).toFixed(2);
        return '—';
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <div style={{ width: 40, height: 40, border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <button
                        onClick={() => router.push('/dashboard/products')}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
                    >
                        <FiArrowLeft size={16} /> Voltar
                    </button>
                    <div>
                        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 2 }}>
                            Order Bumps
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{product?.name}</p>
                    </div>
                </div>
                <button
                    onClick={openCreate}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, background: 'var(--accent-primary)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}
                >
                    <FiPlus size={16} /> Novo Order Bump
                </button>
            </div>

            {/* Info box */}
            <div style={{ padding: '14px 18px', borderRadius: 12, background: 'rgba(108,92,231,0.08)', border: '1px solid rgba(108,92,231,0.2)', marginBottom: 28, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--accent-primary)' }}>O que é Order Bump?</strong> São ofertas adicionais exibidas logo abaixo do formulário de checkout. O comprador pode aceitar com um clique, sem precisar preencher nada novamente. Você pode adicionar múltiplos bumps — eles aparecem na ordem definida aqui.
            </div>

            {/* Lista de bumps */}
            {bumps.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '60px 24px' }}>
                    <FiTag size={48} style={{ opacity: 0.3, marginBottom: 16, display: 'block', margin: '0 auto 16px' }} />
                    <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Nenhum order bump cadastrado</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>
                        Adicione ofertas complementares para aumentar o ticket médio das suas vendas.
                    </p>
                    <button
                        onClick={openCreate}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, background: 'var(--accent-primary)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}
                    >
                        <FiPlus size={16} /> Criar primeiro Order Bump
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {bumps.map((bump, idx) => (
                        <div
                            key={bump.id}
                            className="glass-card"
                            style={{ padding: 20, opacity: bump.is_active ? 1 : 0.6, transition: 'opacity 0.2s' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                                {/* Badge de cor */}
                                <div style={{
                                    width: 48, height: 48, borderRadius: 12, background: bump.badge_color,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                }}>
                                    <FiTag size={22} color="#fff" />
                                </div>

                                {/* Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                                        <span style={{ fontSize: 16, fontWeight: 700 }}>{bump.title}</span>
                                        <span style={{
                                            fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 6,
                                            background: bump.badge_color + '22', color: bump.badge_color,
                                            border: `1px solid ${bump.badge_color}44`, textTransform: 'uppercase', letterSpacing: 1
                                        }}>
                                            {bump.badge_text}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                                        {bump.bump_product?.name}
                                        {bump.bump_plan && <span style={{ color: 'var(--accent-primary)', marginLeft: 6 }}>— {bump.bump_plan.name}</span>}
                                    </div>
                                    {bump.description && (
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{bump.description}</div>
                                    )}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-primary)' }}>
                                            R$ {getEffectivePrice(bump)}
                                        </span>
                                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            CTA: "{bump.call_to_action}"
                                        </span>
                                    </div>
                                </div>

                                {/* Ações */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                    {/* Reordenar */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <button
                                            onClick={() => moveOrder(bump, 'up')}
                                            disabled={idx === 0}
                                            style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.3 : 1 }}
                                        >
                                            <FiChevronUp size={14} />
                                        </button>
                                        <button
                                            onClick={() => moveOrder(bump, 'down')}
                                            disabled={idx === bumps.length - 1}
                                            style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: idx === bumps.length - 1 ? 'not-allowed' : 'pointer', opacity: idx === bumps.length - 1 ? 0.3 : 1 }}
                                        >
                                            <FiChevronDown size={14} />
                                        </button>
                                    </div>

                                    {/* Toggle ativo */}
                                    <button
                                        onClick={() => toggleActive(bump)}
                                        title={bump.is_active ? 'Desativar' : 'Ativar'}
                                        style={{ padding: '8px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer', color: bump.is_active ? '#00B894' : 'var(--text-muted)' }}
                                    >
                                        {bump.is_active ? <FiToggleRight size={20} /> : <FiToggleLeft size={20} />}
                                    </button>

                                    <button
                                        onClick={() => openEdit(bump)}
                                        style={{ padding: '8px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer' }}
                                    >
                                        <FiEdit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(bump.id)}
                                        style={{ padding: '8px', borderRadius: 8, border: '1px solid rgba(231,76,60,0.3)', background: 'rgba(231,76,60,0.08)', cursor: 'pointer', color: '#e74c3c' }}
                                    >
                                        <FiTrash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de criação/edição */}
            {showForm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: 560, padding: 36, maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <h3 style={{ fontSize: 18, fontWeight: 700 }}>
                                {editingBump ? 'Editar Order Bump' : 'Novo Order Bump'}
                            </h3>
                            <button onClick={closeForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <FiX size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                            {/* Produto do bump */}
                            <div>
                                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>
                                    Produto ofertado *
                                </label>
                                <select
                                    className="input-field"
                                    required
                                    value={form.bump_product_id}
                                    onChange={e => setForm({ ...form, bump_product_id: e.target.value, bump_plan_id: '' })}
                                >
                                    <option value="">Selecione um produto...</option>
                                    {myProducts.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} — R$ {(p.price / 100).toFixed(2)}
                                        </option>
                                    ))}
                                </select>
                                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                    Produto que será adicionado ao pedido quando o comprador aceitar o bump.
                                </p>
                            </div>

                            {/* Plano (se o produto tiver planos) */}
                            {availablePlans.length > 1 && (
                                <div>
                                    <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>
                                        Plano específico (opcional)
                                    </label>
                                    <select
                                        className="input-field"
                                        value={form.bump_plan_id}
                                        onChange={e => setForm({ ...form, bump_plan_id: e.target.value })}
                                    >
                                        <option value="">Usar preço base do produto</option>
                                        {availablePlans.map((pl: Plan) => (
                                            <option key={pl.id} value={pl.id}>
                                                {pl.name} — R$ {(pl.price / 100).toFixed(2)}
                                            </option>
                                        ))}
                                    </select>
                                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                        Se o produto tem múltiplos planos, escolha qual será ofertado no bump.
                                    </p>
                                </div>
                            )}

                            {/* Preço customizado */}
                            <div>
                                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>
                                    Preço promocional (opcional)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    className="input-field"
                                    placeholder="Ex: 19.90 (deixe vazio para usar o preço do produto)"
                                    value={form.custom_price}
                                    onChange={e => setForm({ ...form, custom_price: e.target.value })}
                                />
                                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                    Preço especial para o bump. Se vazio, usa o preço do produto/plano selecionado.
                                </p>
                            </div>

                            {/* Título */}
                            <div>
                                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>
                                    Título do bump *
                                </label>
                                <input
                                    type="text"
                                    className="input-field"
                                    required
                                    placeholder="Ex: Oferta Especial — Apenas hoje!"
                                    value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                />
                            </div>

                            {/* Descrição */}
                            <div>
                                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>
                                    Descrição (opcional)
                                </label>
                                <textarea
                                    className="input-field"
                                    rows={3}
                                    placeholder="Descreva brevemente o que o comprador está ganhando..."
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                    style={{ resize: 'vertical', minHeight: 80 }}
                                />
                            </div>

                            {/* Call to action */}
                            <div>
                                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>
                                    Texto do botão (CTA) *
                                </label>
                                <input
                                    type="text"
                                    className="input-field"
                                    required
                                    placeholder="Ex: Sim! Quero adicionar esta oferta"
                                    value={form.call_to_action}
                                    onChange={e => setForm({ ...form, call_to_action: e.target.value })}
                                />
                            </div>

                            {/* Badge */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>
                                        Texto do badge
                                    </label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        placeholder="Ex: OFERTA EXCLUSIVA"
                                        value={form.badge_text}
                                        onChange={e => setForm({ ...form, badge_text: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>
                                        Cor
                                    </label>
                                    <input
                                        type="color"
                                        value={form.badge_color}
                                        onChange={e => setForm({ ...form, badge_color: e.target.value })}
                                        style={{ width: 48, height: 48, borderRadius: 10, border: 'none', cursor: 'pointer', padding: 0 }}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {BADGE_COLORS.map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setForm({ ...form, badge_color: c })}
                                        style={{
                                            width: 32, height: 32, borderRadius: 8, background: c, border: form.badge_color === c ? '3px solid var(--text-primary)' : '2px solid transparent',
                                            cursor: 'pointer', transition: 'transform 0.1s'
                                        }}
                                    />
                                ))}
                            </div>

                            {/* Botões */}
                            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                                <button
                                    type="button"
                                    onClick={closeForm}
                                    style={{ flex: 1, height: 48, borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    style={{ flex: 2, height: 48, borderRadius: 12, background: 'var(--accent-primary)', color: '#fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14, opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                                >
                                    <FiSave size={16} /> {saving ? 'Salvando...' : editingBump ? 'Salvar alterações' : 'Criar Order Bump'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
