'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { FiArrowLeft, FiTrash2, FiMinus, FiPlus, FiZap, FiTag, FiPackage, FiCreditCard } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { storeAPI, productsAPI } from '@/lib/api';

export default function CartPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { items, addItem, updateQuantity, removeItem, totalAmount, clearCart } = useCart();

    const enableCreditCard = process.env.NEXT_PUBLIC_ENABLE_CREDIT_CARD ? (process.env.NEXT_PUBLIC_ENABLE_CREDIT_CARD === 'true') : true;
    const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('pix');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [confirmEmail, setConfirmEmail] = useState('');
    const [cpf, setCpf] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [cep, setCep] = useState('');
    const [street, setStreet] = useState('');
    const [number, setNumber] = useState('');
    const [neighborhood, setNeighborhood] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [cardHolder, setCardHolder] = useState('');
    const [cardExpMonth, setCardExpMonth] = useState('');
    const [cardExpYear, setCardExpYear] = useState('');
    const [cardCvv, setCardCvv] = useState('');
    const [installments, setInstallments] = useState(1);
    const sanitizeCard = (v: string) => (v || '').replace(/\D/g, '');
    const isValidCard = (v: string) => {
        const num = sanitizeCard(v);
        if (num.length < 13 || num.length > 19) return false;
        let sum = 0;
        let dbl = false;
        for (let i = num.length - 1; i >= 0; i--) {
            let d = parseInt(num[i]);
            if (dbl) {
                d *= 2;
                if (d > 9) d -= 9;
            }
            sum += d;
            dbl = !dbl;
        }
        return sum % 10 === 0;
    };
    const isValidCPF = (v: string) => {
        const s = (v || '').replace(/\D/g, '');
        if (!s || s.length !== 11 || /^(\d)\1+$/.test(s)) return false;
        let sum = 0; for (let i = 0; i < 9; i++) sum += parseInt(s[i]) * (10 - i);
        let d1 = (sum * 10) % 11; if (d1 === 10) d1 = 0; if (d1 !== parseInt(s[9])) return false;
        sum = 0; for (let i = 0; i < 10; i++) sum += parseInt(s[i]) * (11 - i);
        let d2 = (sum * 10) % 11; if (d2 === 10) d2 = 0; return d2 === parseInt(s[10]);
    };
    const isValidCEP = (v: string) => /^\d{8}$/.test((v || '').replace(/\D/g, ''));
    const UFs = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
    const isValidUF = (v: string) => UFs.includes((v || '').toUpperCase());
    const isValidPhone = (v: string) => {
        const d = (v || '').replace(/\D/g, '');
        return d.length >= 10 && d.length <= 11;
    };
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

        if (!isValidCPF(cpf)) return toast.error("CPF inválido!");
        if (!isValidPhone(phone)) return toast.error("Telefone inválido!");

        const methodToSend = enableCreditCard ? paymentMethod : 'pix';
        if (methodToSend === 'credit_card') {
            if (!isValidCEP(cep)) return toast.error("CEP inválido!");
            if (!city || !isValidUF(state) || !street || !number) return toast.error("Preencha o endereço completo.");
            if (!cardNumber || !cardHolder || !cardExpMonth || !cardExpYear || !cardCvv) return toast.error("Preencha os dados do cartão.");
            if (!isValidCard(cardNumber)) return toast.error("Número de cartão inválido");
        }

        try {
            setLoading(true);

            const payload = {
                store_slug: params.slug,
                buyer: {
                    name,
                    email,
                    cpf,
                    phone,
                    address: {
                        street,
                        number,
                        neighborhood,
                        zip_code: (cep || '').replace(/\D/g, ''),
                        city,
                        state: (state || '').toUpperCase(),
                        country: 'BR',
                        line_1: `${street || ''}, ${number || ''}, ${neighborhood || ''}`
                    }
                },
                items: items.map(i => ({ id: i.id, quantity: i.quantity, price: i.price, name: i.name })),
                payment_method: methodToSend,
                card_data: methodToSend === 'credit_card' ? {
                    number: sanitizeCard(cardNumber),
                    holder_name: cardHolder,
                    exp_month: parseInt(cardExpMonth),
                    exp_year: parseInt(cardExpYear.length === 2 ? `20${cardExpYear}` : cardExpYear),
                    cvv: cardCvv,
                    installments
                } : undefined,
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
        <div style={{ minHeight: '100vh', background: '#0a0a0c', color: '#e2e8f0', fontFamily: 'Outfit, Inter, sans-serif', padding: isOverlay ? '40px 24px' : '80px 24px' }} className="storeCartPage">
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
                                        <div style={{ display: 'grid', gridTemplateColumns: enableCreditCard ? '1fr 1fr' : '1fr', gap: 12 }} className="storeCartPayMethods">
                                            <button
                                                type="button"
                                                onClick={() => setPaymentMethod('pix')}
                                                style={{
                                                    padding: '16px', borderRadius: 12, border: '1px solid',
                                                    display: 'flex', alignItems: 'center', gap: 12, fontWeight: 700, cursor: 'pointer',
                                                    background: paymentMethod === 'pix' ? 'rgba(0, 206, 201, 0.12)' : '#0a0a0c',
                                                    borderColor: paymentMethod === 'pix' ? '#00cec9' : 'rgba(255,255,255,0.08)',
                                                    color: paymentMethod === 'pix' ? '#00cec9' : '#94a3b8'
                                                }}
                                            >
                                                <div style={{ width: 24, height: 24, borderRadius: '50%', background: paymentMethod === 'pix' ? '#00cec9' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: paymentMethod === 'pix' ? 'black' : '#94a3b8' }}>
                                                    <FiZap size={14} />
                                                </div>
                                                Pix
                                            </button>
                                            {enableCreditCard && (
                                                <button
                                                    type="button"
                                                    onClick={() => setPaymentMethod('credit_card')}
                                                    style={{
                                                        padding: '16px', borderRadius: 12, border: '1px solid',
                                                        display: 'flex', alignItems: 'center', gap: 12, fontWeight: 700, cursor: 'pointer',
                                                        background: paymentMethod === 'credit_card' ? 'rgba(99, 102, 241, 0.12)' : '#0a0a0c',
                                                        borderColor: paymentMethod === 'credit_card' ? '#6366f1' : 'rgba(255,255,255,0.08)',
                                                        color: paymentMethod === 'credit_card' ? '#6366f1' : '#94a3b8'
                                                    }}
                                                >
                                                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: paymentMethod === 'credit_card' ? '#6366f1' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: paymentMethod === 'credit_card' ? 'white' : '#94a3b8' }}>
                                                        <FiCreditCard size={14} />
                                                    </div>
                                                    Cartão de crédito
                                                </button>
                                            )}
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
                                    {enableCreditCard && paymentMethod === 'credit_card' && (
                                        <>
                                            <div style={{ marginTop: 20 }}>
                                                <h3 style={{ fontSize: 13, fontWeight: 800, color: '#94a3b8', marginBottom: 10 }}>Endereço de cobrança</h3>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                                    <div>
                                                        <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>CEP</label>
                                                        <input
                                                            placeholder="00000-000"
                                                            value={cep}
                                                            onChange={e => setCep(e.target.value)}
                                                            style={{ width: '100%', background: '#0a0a0c', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '14px 16px', color: 'white', boxSizing: 'border-box' }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>Cidade</label>
                                                        <input
                                                            placeholder="Cidade"
                                                            value={city}
                                                            onChange={e => setCity(e.target.value)}
                                                            style={{ width: '100%', background: '#0a0a0c', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '14px 16px', color: 'white', boxSizing: 'border-box' }}
                                                        />
                                                    </div>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12 }}>
                                                    <div>
                                                        <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>Estado</label>
                                                        <input
                                                            placeholder="UF"
                                                            maxLength={2}
                                                            value={state}
                                                            onChange={e => setState(e.target.value.toUpperCase())}
                                                            style={{ width: '100%', background: '#0a0a0c', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '14px 16px', color: 'white', boxSizing: 'border-box' }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>Bairro</label>
                                                        <input
                                                            placeholder="Bairro"
                                                            value={neighborhood}
                                                            onChange={e => setNeighborhood(e.target.value)}
                                                            style={{ width: '100%', background: '#0a0a0c', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '14px 16px', color: 'white', boxSizing: 'border-box' }}
                                                        />
                                                    </div>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginTop: 12 }}>
                                                    <div>
                                                        <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>Rua</label>
                                                        <input
                                                            placeholder="Rua"
                                                            value={street}
                                                            onChange={e => setStreet(e.target.value)}
                                                            style={{ width: '100%', background: '#0a0a0c', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '14px 16px', color: 'white', boxSizing: 'border-box' }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>Número</label>
                                                        <input
                                                            placeholder="Nº"
                                                            value={number}
                                                            onChange={e => setNumber(e.target.value)}
                                                            style={{ width: '100%', background: '#0a0a0c', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '14px 16px', color: 'white', boxSizing: 'border-box' }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ marginTop: 20 }}>
                                                <h3 style={{ fontSize: 13, fontWeight: 800, color: '#94a3b8', marginBottom: 10 }}>Dados do cartão</h3>
                                                <div style={{ marginBottom: 12 }}>
                                                    <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>Número do cartão</label>
                                                    <input
                                                        placeholder="0000 0000 0000 0000"
                                                        value={cardNumber}
                                                        onChange={e => setCardNumber(e.target.value)}
                                                        style={{ width: '100%', background: '#0a0a0c', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '14px 16px', color: 'white', boxSizing: 'border-box' }}
                                                    />
                                                </div>
                                                <div style={{ marginBottom: 12 }}>
                                                    <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>Nome no cartão</label>
                                                    <input
                                                        placeholder="Nome como está no cartão"
                                                        value={cardHolder}
                                                        onChange={e => setCardHolder(e.target.value)}
                                                        style={{ width: '100%', background: '#0a0a0c', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '14px 16px', color: 'white', boxSizing: 'border-box' }}
                                                    />
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
                                                    <div>
                                                        <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>Mês</label>
                                                        <input
                                                            placeholder="MM"
                                                            maxLength={2}
                                                            value={cardExpMonth}
                                                            onChange={e => setCardExpMonth(e.target.value)}
                                                            style={{ width: '100%', background: '#0a0a0c', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '14px 16px', color: 'white', boxSizing: 'border-box' }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>Ano</label>
                                                        <input
                                                            placeholder="AA"
                                                            maxLength={2}
                                                            value={cardExpYear}
                                                            onChange={e => setCardExpYear(e.target.value)}
                                                            style={{ width: '100%', background: '#0a0a0c', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '14px 16px', color: 'white', boxSizing: 'border-box' }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>CVV</label>
                                                        <input
                                                            placeholder="000"
                                                            maxLength={4}
                                                            value={cardCvv}
                                                            onChange={e => setCardCvv(e.target.value)}
                                                            style={{ width: '100%', background: '#0a0a0c', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '14px 16px', color: 'white', boxSizing: 'border-box' }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>Parcelas</label>
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            max={12}
                                                            value={installments}
                                                            onChange={e => setInstallments(parseInt(e.target.value) || 1)}
                                                            style={{ width: '100%', background: '#0a0a0c', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '14px 16px', color: 'white', boxSizing: 'border-box' }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
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
                                                <div key={item.id} className="storeCartItemRow" style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 16, background: '#0a0a0c', padding: 12, borderRadius: 16, border: '1px solid rgba(255,255,255,0.03)' }}>
                                                    <div className="storeCartItemImage" style={{ width: 80, height: 80, borderRadius: 12, overflow: 'hidden', background: '#141417' }}>
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
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: paymentMethod === 'pix' ? '#00cec9' : '#6366f1' }}>
                                                {paymentMethod === 'pix' ? <FiZap size={14} /> : <FiCreditCard size={14} />}
                                                {paymentMethod === 'pix' ? 'Pix' : 'Cartão de crédito'}
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
                                                <div key={item.id} className="storeCartItemRow" style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 16, background: '#0a0a0c', padding: 12, borderRadius: 16, border: '1px solid rgba(255,255,255,0.03)' }}>
                                                    <div className="storeCartItemImage" style={{ width: 80, height: 80, borderRadius: 12, overflow: 'hidden', background: '#141417' }}>
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
                                        <div style={{ display: 'grid', gridTemplateColumns: enableCreditCard ? '1fr 1fr' : '1fr', gap: 12 }} className="storeCartPayMethods">
                                            <button
                                                type="button"
                                                onClick={() => setPaymentMethod('pix')}
                                                style={{
                                                    padding: '16px', borderRadius: 12, border: '1px solid',
                                                    display: 'flex', alignItems: 'center', gap: 12, fontWeight: 700, cursor: 'pointer',
                                                    background: paymentMethod === 'pix' ? 'rgba(0, 206, 201, 0.12)' : '#0a0a0c',
                                                    borderColor: paymentMethod === 'pix' ? '#00cec9' : 'rgba(255,255,255,0.08)',
                                                    color: paymentMethod === 'pix' ? '#00cec9' : '#94a3b8'
                                                }}
                                            >
                                                <div style={{ width: 24, height: 24, borderRadius: '50%', background: paymentMethod === 'pix' ? '#00cec9' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: paymentMethod === 'pix' ? 'black' : '#94a3b8' }}>
                                                    <FiZap size={14} />
                                                </div>
                                                Pix
                                            </button>
                                            {enableCreditCard && (
                                                <button
                                                    type="button"
                                                    onClick={() => setPaymentMethod('credit_card')}
                                                    style={{
                                                        padding: '16px', borderRadius: 12, border: '1px solid',
                                                        display: 'flex', alignItems: 'center', gap: 12, fontWeight: 700, cursor: 'pointer',
                                                        background: paymentMethod === 'credit_card' ? 'rgba(99, 102, 241, 0.12)' : '#0a0a0c',
                                                        borderColor: paymentMethod === 'credit_card' ? '#6366f1' : 'rgba(255,255,255,0.08)',
                                                        color: paymentMethod === 'credit_card' ? '#6366f1' : '#94a3b8'
                                                    }}
                                                >
                                                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: paymentMethod === 'credit_card' ? '#6366f1' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: paymentMethod === 'credit_card' ? 'white' : '#94a3b8' }}>
                                                        <FiCreditCard size={14} />
                                                    </div>
                                                    Cartão de crédito
                                                </button>
                                            )}
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
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: paymentMethod === 'pix' ? '#00cec9' : '#6366f1' }}>
                                                {paymentMethod === 'pix' ? <FiZap size={14} /> : <FiCreditCard size={14} />}
                                                {paymentMethod === 'pix' ? 'Pix' : 'Cartão de crédito'}
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
                    .storeCartPage {
                        -webkit-text-size-adjust: 100% !important;
                        text-size-adjust: 100% !important;
                    }
                    .storeCartGrid {
                        grid-template-columns: 1fr !important;
                        justify-content: center !important;
                        justify-items: stretch !important;
                        gap: 18px !important;
                    }
                    .storeCartPage input,
                    .storeCartPage select,
                    .storeCartPage textarea {
                        font-size: 16px !important;
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
                    .storeCartPage h1 {
                        font-size: 20px !important;
                    }
                    .storeCartPage p {
                        margin-bottom: 24px !important;
                    }
                    .storeCartCard {
                        padding: 16px !important;
                        border-radius: 20px !important;
                    }
                    .storeCartCard h2 {
                        font-size: 16px !important;
                        margin-bottom: 16px !important;
                    }
                    .storeCartPayMethods {
                        flex-direction: column !important;
                    }
                    .storeCartGrid2 {
                        grid-template-columns: 1fr !important;
                        gap: 12px !important;
                    }
                    .storeCartItemRow {
                        grid-template-columns: 64px 1fr !important;
                        gap: 12px !important;
                        padding: 10px !important;
                        border-radius: 14px !important;
                    }
                    .storeCartItemImage {
                        width: 64px !important;
                        height: 64px !important;
                        border-radius: 10px !important;
                    }
                }
            `}</style>
        </div>
    );
}
