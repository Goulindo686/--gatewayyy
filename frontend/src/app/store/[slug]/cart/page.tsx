'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { FiArrowLeft, FiTrash2, FiMinus, FiPlus, FiZap, FiTag, FiPackage } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { storeAPI, productsAPI } from '@/lib/api';

export default function CartPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { items, addItem, updateQuantity, removeItem, totalAmount, clearCart } = useCart();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [confirmEmail, setConfirmEmail] = useState('');
    const [cpf, setCpf] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    // Endereço removido: não obrigatório na integração atual
    const [details, setDetails] = useState<Record<string, any>>({});
    const isOverlay = searchParams.get('overlay') === '1';
    useEffect(() => {
        const addId = searchParams.get('add');
        const run = async () => {
            if (!addId) return;
            try {
                const { data } = await productsAPI.getPublic(addId);
                const p = data.product;
                if (p) {
                    const priceNumber = typeof p.price === 'number' ? p.price : parseFloat(p.price);
                    addItem({ id: p.id, name: p.name, price: priceNumber, price_display: p.price_display, image_url: p.image_url });
                    toast.success(`${p.name} adicionado!`);
                }
            } catch {}
            router.replace(`/store/${params.slug}/cart`);
        };
        run();
    }, [searchParams]);

    useEffect(() => {
        let cancelled = false;
        const fetchDetails = async () => {
            try {
                const idsToFetch = items.filter(i => !details[i.id]).map(i => i.id);
                for (const id of idsToFetch) {
                    try {
                        const { data } = await productsAPI.getPublic(id);
                        if (!cancelled && data?.product) {
                            setDetails(prev => ({ ...prev, [id]: data.product }));
                        }
                    } catch {}
                }
            } catch {}
        };
        fetchDetails();
        return () => { cancelled = true; };
    }, [items]);

    const handleCheckout = async () => {
        if (items.length === 0) return toast.error("Carrinho vazio!");

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) return toast.error("Por favor, insira um e-mail válido!");
        if (email !== confirmEmail) return toast.error("Os e-mails não coincidem!");

        try {
            setLoading(true);

            const payload = {
                store_slug: params.slug,
                buyer: {
                    name,
                    email,
                    cpf,
                    phone
                },
                items: items.map(i => ({ id: i.id, quantity: i.quantity, price: i.price, name: i.name })),
                payment_method: 'pix',
                total: totalAmount
            };

            const { data } = await storeAPI.createOrder(payload);

            clearCart();
            toast.success("Pedido gerado com sucesso!");
            router.push(`/store/${params.slug}/payment/${data.order.id}`);
        } catch (err: any) {
            console.error('Checkout error:', err);
            toast.error(err.response?.data?.error || "Erro ao processar pedido");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a0c', color: '#e2e8f0', fontFamily: 'Outfit, Inter, sans-serif', padding: '40px 24px' }} className="storeCartPage">
            <div style={{ maxWidth: isOverlay ? 1400 : 1400, margin: '0 auto' }}>
                <button
                    onClick={() => router.back()}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 32, fontWeight: 600 }}
                >
                    <FiArrowLeft /> Voltar para a loja
                </button>

                <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Carrinho de compras</h1>
                <p style={{ color: '#64748b', marginBottom: 40, fontSize: 14 }}>Nesta página, você encontra os produtos adicionados ao seu carrinho.</p>

                <div style={{ display: 'grid', gridTemplateColumns: isOverlay ? '420px 420px 420px' : 'minmax(420px, 1.5fr) minmax(380px, 1.2fr) 420px', gap: isOverlay ? 32 : 40, justifyContent: isOverlay ? 'center' : 'stretch', justifyItems: isOverlay ? 'center' : 'stretch' }} className="storeCartGrid">

                    {isOverlay ? (
                        <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                <div style={{ background: '#141417', borderRadius: 24, padding: 32, border: '1px solid rgba(255,255,255,0.03)' }} className="storeCartCard">
                                    <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>Informações de pagamento</h2>
                                    <div style={{ marginBottom: 24 }}>
                                        <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 12 }}>Método</label>
                                        <div style={{ display: 'flex', gap: 12 }} className="storeCartPayMethods">
                                            <div
                                                style={{
                                                    flex: 1, padding: '16px', borderRadius: 12, border: '1px solid',
                                                    display: 'flex', alignItems: 'center', gap: 12, fontWeight: 700,
                                                    background: 'rgba(0, 206, 201, 0.1)',
                                                    borderColor: '#00cec9',
                                                    color: '#00cec9'
                                                }}
                                            >
                                                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#00cec9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'black' }}>
                                                    <FiZap size={14} />
                                                </div>
                                                Pix
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ marginBottom: 20 }}>
                                        <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>Nome completo</label>
                                        <input
                                            placeholder="Seu nome"
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            style={{ width: '100%', background: '#0a0a0c', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '14px 16px', color: 'white', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }} className="storeCartGrid2">
                                        <div>
                                            <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>Email</label>
                                            <input
                                                type="email"
                                                placeholder="seu@email.com"
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                style={{ width: '100%', background: '#0a0a0c', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '14px 16px', color: 'white', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>Confirmar Email</label>
                                            <input
                                                type="email"
                                                placeholder="seu@email.com"
                                                value={confirmEmail}
                                                onChange={e => setConfirmEmail(e.target.value)}
                                                style={{ width: '100%', background: '#0a0a0c', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '14px 16px', color: 'white', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="storeCartGrid2">
                                        <div>
                                            <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>CPF</label>
                                            <input
                                                placeholder="000.000.000-00"
                                                value={cpf}
                                                onChange={e => setCpf(e.target.value)}
                                                style={{ width: '100%', background: '#0a0a0c', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '14px 16px', color: 'white', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>Telefone</label>
                                            <input
                                                placeholder="(11) 99999-9999"
                                                value={phone}
                                                onChange={e => setPhone(e.target.value)}
                                                style={{ width: '100%', background: '#0a0a0c', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '14px 16px', color: 'white', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                    </div>
                                    <button style={{ marginTop: 32, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: '#0a0a0c', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, color: '#64748b', cursor: 'pointer' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <FiTag /> Cupom de desconto
                                        </div>
                                        <div style={{ color: 'white', fontWeight: 700 }}>Adicionar</div>
                                    </button>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                <div style={{ background: '#141417', borderRadius: 24, padding: 32, border: '1px solid rgba(255,255,255,0.03)' }} className="storeCartCard">
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                                        <h2 style={{ fontSize: 18, fontWeight: 700 }}>{'Produtos no carrinho'}</h2>
                                        <span style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>{items.length} itens</span>
                                    </div>
                                    {items.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '20px 0', color: '#64748b' }}>Seu carrinho está vazio.</div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                            {items.map(item => (
                                                <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 16, background: '#0a0a0c', padding: 12, borderRadius: 16, border: '1px solid rgba(255,255,255,0.03)' }}>
                                                    <div style={{ width: 80, height: 80, borderRadius: 12, overflow: 'hidden', background: '#141417' }}>
                                                        {item.image_url ? <img src={item.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <FiPackage style={{ margin: 28, opacity: 0.1 }} />}
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                        <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>{item.name}</div>
                                                        <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
                                                            {(details[item.id]?.description || 'Sem descrição')}
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#141417', borderRadius: 8, padding: '4px 8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                                <FiMinus size={14} style={{ cursor: 'pointer' }} onClick={() => updateQuantity(item.id, -1)} />
                                                                <span style={{ fontSize: 14, fontWeight: 800 }}>{item.quantity}</span>
                                                                <FiPlus size={14} style={{ cursor: 'pointer' }} onClick={() => updateQuantity(item.id, 1)} />
                                                            </div>
                                                            <button onClick={() => removeItem(item.id)} style={{ background: 'transparent', border: 'none', color: '#ff7675', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                                                <FiTrash2 size={16} /> Remover
                                                            </button>
                                                            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'baseline', gap: 6, whiteSpace: 'nowrap', color: 'white', fontWeight: 800, fontSize: 16 }}>
                                                                <span>R$</span>
                                                                <span>{(item.price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div style={{ position: 'sticky', top: 40 }} className="storeCartSummaryWrap">
                                <div style={{ background: '#141417', borderRadius: 24, padding: 32, border: '1px solid rgba(255,255,255,0.03)' }} className="storeCartCard">
                                    <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>Resumo da compra</h2>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#64748b', fontWeight: 500 }}>
                                            <span>Subtotal</span>
                                            <span style={{ color: 'white', fontWeight: 700 }}>R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#64748b', fontWeight: 500 }}>
                                            <span>Método</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#00cec9', fontWeight: 700 }}>
                                                <FiZap size={14} />
                                                Pix
                                            </div>
                                        </div>
                                        <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '8px 0' }} />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800, color: 'white' }}>
                                            <span>Total</span>
                                            <span>R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleCheckout}
                                        disabled={loading || items.length === 0}
                                        style={{
                                            width: '100%', padding: '18px', borderRadius: 14, background: 'white', color: '#0a0a0c',
                                            fontWeight: 800, fontSize: 15, border: 'none', cursor: 'pointer',
                                            opacity: (loading || items.length === 0) ? 0.5 : 1, transition: 'transform 0.2s'
                                        }}
                                    >
                                        {loading ? 'Processando...' : 'Gerar pagamento'}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                <div style={{ background: '#141417', borderRadius: 24, padding: 32, border: '1px solid rgba(255,255,255,0.03)' }} className="storeCartCard">
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                                        <h2 style={{ fontSize: 18, fontWeight: 700 }}>{'Informações do produto'}</h2>
                                        <span style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>{items.length} itens</span>
                                    </div>
                                    {items.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '20px 0', color: '#64748b' }}>Seu carrinho está vazio.</div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                            {items.map(item => (
                                                <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 16, background: '#0a0a0c', padding: 12, borderRadius: 16, border: '1px solid rgba(255,255,255,0.03)' }}>
                                                    <div style={{ width: 80, height: 80, borderRadius: 12, overflow: 'hidden', background: '#141417' }}>
                                                        {item.image_url ? <img src={item.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <FiPackage style={{ margin: 28, opacity: 0.1 }} />}
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                        <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>{item.name}</div>
                                                        <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
                                                            {(details[item.id]?.description || 'Sem descrição')}
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#141417', borderRadius: 8, padding: '4px 8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                                <FiMinus size={14} style={{ cursor: 'pointer' }} onClick={() => updateQuantity(item.id, -1)} />
                                                                <span style={{ fontSize: 14, fontWeight: 800 }}>{item.quantity}</span>
                                                                <FiPlus size={14} style={{ cursor: 'pointer' }} onClick={() => updateQuantity(item.id, 1)} />
                                                            </div>
                                                            <button onClick={() => removeItem(item.id)} style={{ background: 'transparent', border: 'none', color: '#ff7675', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                                                <FiTrash2 size={16} /> Remover
                                                            </button>
                                                            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'baseline', gap: 6, whiteSpace: 'nowrap', color: 'white', fontWeight: 800, fontSize: 16 }}>
                                                                <span>R$</span>
                                                                <span>{(item.price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                <div style={{ background: '#141417', borderRadius: 24, padding: 32, border: '1px solid rgba(255,255,255,0.03)' }} className="storeCartCard">
                                    <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>Informações de pagamento</h2>
                                    <div style={{ marginBottom: 24 }}>
                                        <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 12 }}>Método</label>
                                        <div style={{ display: 'flex', gap: 12 }} className="storeCartPayMethods">
                                            <div
                                                style={{
                                                    flex: 1, padding: '16px', borderRadius: 12, border: '1px solid',
                                                    display: 'flex', alignItems: 'center', gap: 12, fontWeight: 700,
                                                    background: 'rgba(0, 206, 201, 0.1)',
                                                    borderColor: '#00cec9',
                                                    color: '#00cec9'
                                                }}
                                            >
                                                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#00cec9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'black' }}>
                                                    <FiZap size={14} />
                                                </div>
                                                Pix
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ marginBottom: 20 }}>
                                        <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>Nome completo</label>
                                        <input
                                            placeholder="Seu nome"
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            style={{ width: '100%', background: '#0a0a0c', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '14px 16px', color: 'white', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }} className="storeCartGrid2">
                                        <div>
                                            <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>Email</label>
                                            <input
                                                type="email"
                                                placeholder="seu@email.com"
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                style={{ width: '100%', background: '#0a0a0c', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '14px 16px', color: 'white', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>Confirmar Email</label>
                                            <input
                                                type="email"
                                                placeholder="seu@email.com"
                                                value={confirmEmail}
                                                onChange={e => setConfirmEmail(e.target.value)}
                                                style={{ width: '100%', background: '#0a0a0c', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '14px 16px', color: 'white', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="storeCartGrid2">
                                        <div>
                                            <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>CPF</label>
                                            <input
                                                placeholder="000.000.000-00"
                                                value={cpf}
                                                onChange={e => setCpf(e.target.value)}
                                                style={{ width: '100%', background: '#0a0a0c', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '14px 16px', color: 'white', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>Telefone</label>
                                            <input
                                                placeholder="(11) 99999-9999"
                                                value={phone}
                                                onChange={e => setPhone(e.target.value)}
                                                style={{ width: '100%', background: '#0a0a0c', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '14px 16px', color: 'white', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                    </div>
                                    <button style={{ marginTop: 32, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: '#0a0a0c', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, color: '#64748b', cursor: 'pointer' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <FiTag /> Cupom de desconto
                                        </div>
                                        <div style={{ color: 'white', fontWeight: 700 }}>Adicionar</div>
                                    </button>
                                </div>
                            </div>
                            <div style={{ position: 'sticky', top: 40 }} className="storeCartSummaryWrap">
                                <div style={{ background: '#141417', borderRadius: 24, padding: 32, border: '1px solid rgba(255,255,255,0.03)' }} className="storeCartCard">
                                    <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>Resumo da compra</h2>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#64748b', fontWeight: 500 }}>
                                            <span>Subtotal</span>
                                            <span style={{ color: 'white', fontWeight: 700 }}>R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#64748b', fontWeight: 500 }}>
                                            <span>Método</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#00cec9', fontWeight: 700 }}>
                                                <FiZap size={14} />
                                                Pix
                                            </div>
                                        </div>
                                        <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '8px 0' }} />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800, color: 'white' }}>
                                            <span>Total</span>
                                            <span>R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleCheckout}
                                        disabled={loading || items.length === 0}
                                        style={{
                                            width: '100%', padding: '18px', borderRadius: 14, background: 'white', color: '#0a0a0c',
                                            fontWeight: 800, fontSize: 15, border: 'none', cursor: 'pointer',
                                            opacity: (loading || items.length === 0) ? 0.5 : 1, transition: 'transform 0.2s'
                                        }}
                                    >
                                        {loading ? 'Processando...' : 'Gerar pagamento'}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                </div>
            </div>
            <style jsx>{`
                @media (max-width: 980px) {
                    .storeCartGrid {
                        grid-template-columns: 1fr !important;
                        justify-content: center !important;
                        justify-items: stretch !important;
                        gap: 18px !important;
                    }
                    .storeCartSummaryWrap {
                        position: static !important;
                        top: auto !important;
                    }
                    .storeCartCard {
                        width: 100% !important;
                        max-width: 560px !important;
                        margin: 0 auto !important;
                    }
                }
                @media (max-width: 640px) {
                    .storeCartPage {
                        padding: 24px 14px !important;
                    }
                    .storeCartCard {
                        padding: 18px !important;
                        border-radius: 20px !important;
                    }
                    .storeCartPayMethods {
                        flex-direction: column !important;
                    }
                    .storeCartGrid2 {
                        grid-template-columns: 1fr !important;
                        gap: 12px !important;
                    }
                }
            `}</style>
        </div>
    );
}
