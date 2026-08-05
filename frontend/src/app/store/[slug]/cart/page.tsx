'use client';

import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
    FiArrowLeft,
    FiCheck,
    FiCreditCard,
    FiLock,
    FiMinus,
    FiPackage,
    FiPlus,
    FiShield,
    FiTrash2,
    FiZap,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useCart } from '@/contexts/CartContext';
import { storeAPI, productsAPI } from '@/lib/api';
import { isValidCardExpiration } from '@/lib/checkout-validation';
import { CardTokenizationError, createCheckoutSessionId, getCheckoutDevicePlatform, tokenizePagarmeCard } from '@/lib/pagarme-card';
import { authenticatePagarme3DS } from '@/lib/pagarme-3ds';
import { normalizeAffiliateReference } from '@/lib/affiliates-core';
import { normalizeStoreStyle } from '@/lib/store-builder';
import StoreCreditCardPreview from '@/components/store/StoreCreditCardPreview';

const checkoutThemes = {
    light: {
        bg: '#f4f7fb',
        surface: '#ffffff',
        surfaceAlt: '#edf3fc',
        text: '#0e1526',
        muted: '#5a6577',
        border: '#d3dbe8',
        shadow: '0 24px 80px rgba(30, 64, 175, .11)',
    },
    dark: {
        bg: '#080d18',
        surface: '#111827',
        surfaceAlt: '#172033',
        text: '#f8fafc',
        muted: '#94a3b8',
        border: '#29354a',
        shadow: '0 24px 80px rgba(0, 0, 0, .34)',
    },
};

function cartItemKey(item: { id: string; plan_id?: string }) {
    return item.plan_id ? item.id + '__' + item.plan_id : item.id;
}

function money(value: number) {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CartPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { items, addItem, updateQuantity, removeItem, totalAmount, clearCart } = useCart();
    const checkoutSessionRef = useRef<string | null>(null);

    const [store, setStore] = useState<any>(null);
    const [cardConfig, setCardConfig] = useState({ enabled: false, publicKey: '' });
    const enableCreditCard = cardConfig.enabled && !!cardConfig.publicKey;
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
    const [cardPreviewFlipped, setCardPreviewFlipped] = useState(false);

    const sanitizeCard = (value: string) => (value || '').replace(/\D/g, '');
    const onlyDigits = (value: string) => (value || '').replace(/\D/g, '');
    const formatCpf = (value: string) => onlyDigits(value).slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    const formatPhone = (value: string) => {
        const digits = onlyDigits(value).slice(0, 11);
        if (digits.length <= 10) return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
        return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
    };
    const formatCep = (value: string) => onlyDigits(value).slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');
    const formatCardNumber = (value: string) => onlyDigits(value).slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
    const isValidCard = (value: string) => {
        const digits = sanitizeCard(value);
        if (digits.length < 13 || digits.length > 19) return false;
        let sum = 0;
        let doubleDigit = false;
        for (let index = digits.length - 1; index >= 0; index--) {
            let digit = parseInt(digits[index]);
            if (doubleDigit) {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }
            sum += digit;
            doubleDigit = !doubleDigit;
        }
        return sum % 10 === 0;
    };
    const isValidCPF = (value: string) => {
        const digits = (value || '').replace(/\D/g, '');
        if (!digits || digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false;
        let sum = 0;
        for (let index = 0; index < 9; index++) sum += parseInt(digits[index]) * (10 - index);
        let firstDigit = (sum * 10) % 11;
        if (firstDigit === 10) firstDigit = 0;
        if (firstDigit !== parseInt(digits[9])) return false;
        sum = 0;
        for (let index = 0; index < 10; index++) sum += parseInt(digits[index]) * (11 - index);
        let secondDigit = (sum * 10) % 11;
        if (secondDigit === 10) secondDigit = 0;
        return secondDigit === parseInt(digits[10]);
    };
    const isValidCEP = (value: string) => /^\d{8}$/.test((value || '').replace(/\D/g, ''));
    const validStates = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
    const isValidUF = (value: string) => validStates.includes((value || '').toUpperCase());
    const isValidPhone = (value: string) => {
        const digits = (value || '').replace(/\D/g, '');
        return digits.length >= 10 && digits.length <= 11;
    };

    useEffect(() => {
        const rawSlug = String(params.slug || '');
        const encodedSlug = encodeURIComponent(rawSlug);
        fetch('/api/checkout/config?store_slug=' + encodedSlug, { cache: 'no-store' })
            .then(response => response.ok ? response.json() : null)
            .then(config => {
                const creditCard = config?.credit_card;
                setCardConfig({
                    enabled: creditCard?.enabled === true,
                    publicKey: typeof creditCard?.public_key === 'string' ? creditCard.public_key : '',
                });
            })
            .catch(() => setCardConfig({ enabled: false, publicKey: '' }));

        storeAPI.getStoreBySlug(rawSlug)
            .then(({ data }) => setStore(data?.store || null))
            .catch(() => setStore(null));
    }, [params.slug]);

    useEffect(() => {
        if (!enableCreditCard && paymentMethod !== 'pix') setPaymentMethod('pix');
    }, [enableCreditCard, paymentMethod]);

    useEffect(() => {
        const addId = searchParams.get('add');
        const run = async () => {
            if (!addId) return;
            try {
                const { data } = await productsAPI.getPublic(addId);
                const product = data.product;
                if (product) {
                    const plan = Array.isArray(product.plans) && product.plans.length > 0 ? product.plans[0] : null;
                    const priceNumber = plan
                        ? plan.price / 100
                        : (typeof product.price === 'number' ? product.price : parseFloat(product.price));
                    addItem({
                        id: product.id,
                        name: product.name,
                        price: priceNumber,
                        price_display: plan ? plan.price_display : product.price_display,
                        image_url: product.image_url,
                        plan_id: plan ? plan.id : undefined,
                        plan_name: plan ? plan.name : undefined,
                    } as any);
                    toast.success(product.name + ' adicionado!');
                }
            } catch {}
            router.replace('/store/' + params.slug + '/cart');
        };
        run();
    }, [searchParams]);

    const visual = normalizeStoreStyle(store?.style);
    const baseTheme = store?.theme === 'dark' ? checkoutThemes.dark : checkoutThemes.light;
    const theme = visual.color_mode === 'custom' ? {
        bg: visual.custom_colors.background,
        surface: visual.custom_colors.surface,
        surfaceAlt: visual.custom_colors.surface_alt,
        text: visual.custom_colors.text,
        muted: visual.custom_colors.muted,
        border: visual.custom_colors.border,
        shadow: baseTheme.shadow,
    } : baseTheme;
    const accent = visual.color_mode === 'custom'
        ? visual.custom_colors.accent
        : (store?.accent_color || '#0667ef');
    const canonicalSlug = store?.slug || String(params.slug || '');
    const heroImage = visual.hero_content.logo_url || store?.banner_url || items[0]?.image_url || '';
    const storeName = store?.name || 'Sua loja';
    const cssVariables = {
        '--checkout-bg': theme.bg,
        '--checkout-surface': theme.surface,
        '--checkout-surface-alt': theme.surfaceAlt,
        '--checkout-text': theme.text,
        '--checkout-muted': theme.muted,
        '--checkout-border': theme.border,
        '--checkout-accent': accent,
        '--checkout-shadow': theme.shadow,
    } as CSSProperties;
    const inputStyle = {
        background: theme.surfaceAlt,
        borderColor: theme.border,
        color: theme.text,
    };
    const brandPanelStyle = store?.banner_url ? {
        backgroundImage: 'linear-gradient(150deg, color-mix(in srgb, ' + accent + ' 68%, rgba(5,10,25,.93)), rgba(5,10,25,.94)), url("' + store.banner_url + '")',
    } : {
        backgroundImage: 'radial-gradient(circle at 12% 10%, ' + accent + 'aa, transparent 34%), linear-gradient(145deg, color-mix(in srgb, ' + accent + ' 46%, #0f172a), #090f1f 72%)',
    };

    const handleCheckout = async () => {
        if (items.length === 0) return toast.error('Carrinho vazio!');

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!name.trim()) return toast.error('Por favor, insira seu nome!');
        if (!emailRegex.test(email)) return toast.error('Por favor, insira um e-mail válido!');
        if (email !== confirmEmail) return toast.error('Os e-mails não coincidem!');
        if (!isValidCPF(cpf)) return toast.error('CPF inválido!');
        if (!isValidPhone(phone)) return toast.error('Telefone inválido!');

        const methodToSend = enableCreditCard ? paymentMethod : 'pix';
        if (methodToSend === 'credit_card') {
            if (!isValidCEP(cep)) return toast.error('CEP inválido!');
            if (!city || !isValidUF(state) || !street || !number) return toast.error('Preencha o endereço completo.');
            if (!cardNumber || !cardHolder || !cardExpMonth || !cardExpYear || !cardCvv) return toast.error('Preencha os dados do cartão.');
            if (!isValidCard(cardNumber)) return toast.error('Número de cartão inválido');
            if (!isValidCardExpiration(cardExpMonth, cardExpYear)) return toast.error('Validade do cartão inválida');
            if (!/^\d{3,4}$/.test(onlyDigits(cardCvv))) return toast.error('CVV inválido');
        }

        try {
            setLoading(true);
            const checkoutSessionId = checkoutSessionRef.current || createCheckoutSessionId();
            checkoutSessionRef.current = checkoutSessionId;

            let cardToken: string | undefined;
            let threeDsTransactionId: string | null = null;
            if (methodToSend === 'credit_card') {
                const expirationYear = Number(cardExpYear.length === 2 ? '20' + cardExpYear : cardExpYear);
                threeDsTransactionId = await authenticatePagarme3DS({
                    amountCents: Math.round(totalAmount * 100),
                    customer: { name, email, cpf, phone },
                    card: {
                        number: cardNumber,
                        holderName: cardHolder,
                        expMonth: Number(cardExpMonth),
                        expYear: expirationYear,
                    },
                    billingAddress: {
                        line_1: (number || '') + ', ' + (street || '') + ', ' + (neighborhood || ''),
                        zip_code: (cep || '').replace(/\D/g, ''),
                        city,
                        state: (state || '').toUpperCase(),
                        country: 'BR',
                    },
                    items: items.map(item => ({
                        description: item.name || 'Produto',
                        code: item.plan_id || item.id,
                    })),
                });

                cardToken = await tokenizePagarmeCard(cardConfig.publicKey, {
                    number: cardNumber,
                    holderName: cardHolder,
                    expMonth: Number(cardExpMonth),
                    expYear: expirationYear,
                    cvv: cardCvv,
                });
            }

            const payload = {
                store_slug: canonicalSlug,
                affiliate_ref: normalizeAffiliateReference(searchParams.get('aff_ref')) || undefined,
                buyer: {
                    name,
                    email,
                    cpf,
                    phone,
                    ...(methodToSend === 'credit_card' ? {
                        address: {
                            street,
                            number,
                            neighborhood,
                            zip_code: (cep || '').replace(/\D/g, ''),
                            city,
                            state: (state || '').toUpperCase(),
                            country: 'BR',
                            line_1: (street || '') + ', ' + (number || '') + ', ' + (neighborhood || ''),
                        },
                    } : {}),
                },
                items: items.map(item => ({
                    id: item.id,
                    quantity: item.quantity,
                    plan_id: item.plan_id,
                })),
                payment_method: methodToSend,
                card_token: cardToken,
                installments: methodToSend === 'credit_card' ? installments : undefined,
                checkout_session_id: checkoutSessionId,
                device_platform: methodToSend === 'credit_card' ? getCheckoutDevicePlatform() : undefined,
                three_ds_transaction_id: methodToSend === 'credit_card' ? threeDsTransactionId || undefined : undefined,
                total: totalAmount,
            };

            const { data } = await storeAPI.createOrder(payload);
            clearCart();
            toast.success('Pedido gerado com sucesso!');
            router.push('/store/' + encodeURIComponent(canonicalSlug) + '/payment/' + data.order.id);
        } catch (error: any) {
            if (error?.response?.status >= 400 && error?.response?.status < 500 && error?.response?.status !== 409) {
                checkoutSessionRef.current = null;
            }
            console.error('Checkout error:', error);
            toast.error(error instanceof CardTokenizationError
                ? error.message
                : error.response?.data?.error || 'Erro ao processar pedido');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="store-checkout-page" style={cssVariables}>
            <div className="checkout-shell">
                <button className="checkout-back" type="button" onClick={() => router.back()}>
                    <FiArrowLeft /> Voltar para a loja
                </button>

                <div className="checkout-frame">
                    <aside className="checkout-brand-panel" style={brandPanelStyle}>
                        <div className="checkout-brand-glow" />
                        <div className="checkout-brand-top">
                            <span><FiShield /> Checkout protegido</span>
                            <b>GouPay</b>
                        </div>

                        <div className="checkout-brand-copy">
                            {heroImage ? (
                                <div className="checkout-hero-image">
                                    <img src={heroImage} alt={'Imagem da ' + storeName} />
                                </div>
                            ) : (
                                <div className="checkout-hero-fallback"><FiPackage /></div>
                            )}
                            <small>Finalizando sua compra em</small>
                            <h1>{storeName}</h1>
                            <p>{store?.description || 'Produtos digitais com pagamento seguro e entrega rápida.'}</p>
                        </div>

                        <section className="checkout-order-card">
                            <div className="checkout-order-title">
                                <strong>Resumo do pedido</strong>
                                <span>{items.length} {items.length === 1 ? 'item' : 'itens'}</span>
                            </div>
                            <div className="checkout-order-items">
                                {items.length === 0 ? (
                                    <div className="checkout-empty">Seu carrinho está vazio.</div>
                                ) : items.map(item => {
                                    const key = cartItemKey(item);
                                    return (
                                        <article className="checkout-order-item" key={key}>
                                            <div className="checkout-order-image">
                                                {item.image_url
                                                    ? <img src={item.image_url} alt="" />
                                                    : <FiPackage />}
                                            </div>
                                            <div className="checkout-order-info">
                                                <strong>{item.name}</strong>
                                                {item.plan_name && <span>{item.plan_name}</span>}
                                                <div className="checkout-order-controls">
                                                    <button type="button" onClick={() => updateQuantity(key, -1)} aria-label={'Diminuir quantidade de ' + item.name}><FiMinus /></button>
                                                    <b>{item.quantity}</b>
                                                    <button type="button" onClick={() => updateQuantity(key, 1)} aria-label={'Aumentar quantidade de ' + item.name}><FiPlus /></button>
                                                    <button className="checkout-remove" type="button" onClick={() => removeItem(key)} aria-label={'Remover ' + item.name}><FiTrash2 /></button>
                                                </div>
                                            </div>
                                            <strong className="checkout-order-price">R$ {money(item.price * item.quantity)}</strong>
                                        </article>
                                    );
                                })}
                            </div>
                            <div className="checkout-total-row"><span>Total de hoje</span><strong>R$ {money(totalAmount)}</strong></div>
                        </section>

                        <div className="checkout-trust-line">
                            <span><FiLock /> Dados protegidos</span>
                            <span><FiZap /> Confirmação rápida</span>
                        </div>
                    </aside>

                    <section className="checkout-payment-panel">
                        <header className="checkout-payment-header">
                            <span>Pagamento seguro</span>
                            <h2>Conclua sua compra</h2>
                            <p>Escolha o método e preencha os dados abaixo.</p>
                        </header>

                        <div className="checkout-section">
                            <div className="checkout-section-heading"><b>1</b><span>Método de pagamento</span></div>
                            <div className={'checkout-payment-methods ' + (enableCreditCard ? 'has-card' : '')}>
                                <button
                                    className={paymentMethod === 'pix' ? 'active' : ''}
                                    type="button"
                                    onClick={() => setPaymentMethod('pix')}
                                >
                                    <i><FiZap /></i>
                                    <span><strong>Pix</strong><small>Aprovação em poucos minutos</small></span>
                                    {paymentMethod === 'pix' && <FiCheck className="method-check" />}
                                </button>
                                {enableCreditCard && (
                                    <button
                                        className={paymentMethod === 'credit_card' ? 'active' : ''}
                                        type="button"
                                        onClick={() => setPaymentMethod('credit_card')}
                                    >
                                        <i><FiCreditCard /></i>
                                        <span><strong>Cartão de crédito</strong><small>Parcele em até 12 vezes</small></span>
                                        {paymentMethod === 'credit_card' && <FiCheck className="method-check" />}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="checkout-section">
                            <div className="checkout-section-heading"><b>2</b><span>Seus dados</span></div>
                            <div className="checkout-fields">
                                <label className="checkout-field checkout-field-full">
                                    <span>Nome completo</span>
                                    <input
                                        autoComplete="name"
                                        placeholder="Seu nome"
                                        value={name}
                                        onChange={event => setName(event.target.value)}
                                        style={inputStyle}
                                    />
                                </label>
                                <label className="checkout-field">
                                    <span>E-mail</span>
                                    <input
                                        type="email"
                                        autoComplete="email"
                                        placeholder="seu@email.com"
                                        value={email}
                                        onChange={event => setEmail(event.target.value)}
                                        style={inputStyle}
                                    />
                                </label>
                                <label className="checkout-field">
                                    <span>Confirmar e-mail</span>
                                    <input
                                        type="email"
                                        autoComplete="email"
                                        placeholder="Repita seu e-mail"
                                        value={confirmEmail}
                                        onChange={event => setConfirmEmail(event.target.value)}
                                        style={inputStyle}
                                    />
                                </label>
                                <label className="checkout-field">
                                    <span>CPF</span>
                                    <input
                                        inputMode="numeric"
                                        autoComplete="off"
                                        placeholder="000.000.000-00"
                                        value={cpf}
                                        onChange={event => setCpf(formatCpf(event.target.value))}
                                        style={inputStyle}
                                    />
                                </label>
                                <label className="checkout-field">
                                    <span>Telefone</span>
                                    <input
                                        inputMode="tel"
                                        autoComplete="tel"
                                        placeholder="(11) 99999-9999"
                                        value={phone}
                                        onChange={event => setPhone(formatPhone(event.target.value))}
                                        style={inputStyle}
                                    />
                                </label>
                            </div>
                        </div>

                        {enableCreditCard && paymentMethod === 'credit_card' && (
                            <div className="checkout-section checkout-card-section">
                                <div className="checkout-section-heading"><b>3</b><span>Dados do cartão</span></div>
                                <StoreCreditCardPreview
                                    accent={accent}
                                    number={cardNumber}
                                    holder={cardHolder}
                                    expMonth={cardExpMonth}
                                    expYear={cardExpYear}
                                    flipped={cardPreviewFlipped}
                                />
                                <div className="checkout-fields">
                                    <label className="checkout-field checkout-field-full">
                                        <span>Número do cartão</span>
                                        <input
                                            inputMode="numeric"
                                            autoComplete="cc-number"
                                            placeholder="0000 0000 0000 0000"
                                            value={cardNumber}
                                            onChange={event => setCardNumber(formatCardNumber(event.target.value))}
                                            style={inputStyle}
                                        />
                                    </label>
                                    <label className="checkout-field checkout-field-full">
                                        <span>Nome impresso no cartão</span>
                                        <input
                                            autoComplete="cc-name"
                                            placeholder="Nome como está no cartão"
                                            value={cardHolder}
                                            onChange={event => setCardHolder(event.target.value)}
                                            style={inputStyle}
                                        />
                                    </label>
                                    <label className="checkout-field">
                                        <span>Validade</span>
                                        <div className="checkout-expiration">
                                            <input
                                                inputMode="numeric"
                                                autoComplete="cc-exp-month"
                                                placeholder="MM"
                                                maxLength={2}
                                                value={cardExpMonth}
                                                onChange={event => setCardExpMonth(onlyDigits(event.target.value).slice(0, 2))}
                                                style={inputStyle}
                                            />
                                            <em>/</em>
                                            <input
                                                inputMode="numeric"
                                                autoComplete="cc-exp-year"
                                                placeholder="AA"
                                                maxLength={2}
                                                value={cardExpYear}
                                                onChange={event => setCardExpYear(onlyDigits(event.target.value).slice(0, 2))}
                                                style={inputStyle}
                                            />
                                        </div>
                                    </label>
                                    <label className="checkout-field">
                                        <span>CVV</span>
                                        <input
                                            inputMode="numeric"
                                            autoComplete="cc-csc"
                                            placeholder="000"
                                            maxLength={4}
                                            value={cardCvv}
                                            onFocus={() => setCardPreviewFlipped(true)}
                                            onClick={() => setCardPreviewFlipped(true)}
                                            onBlur={() => setCardPreviewFlipped(false)}
                                            onChange={event => setCardCvv(onlyDigits(event.target.value).slice(0, 4))}
                                            style={inputStyle}
                                        />
                                    </label>
                                    <label className="checkout-field checkout-field-full">
                                        <span>Parcelas</span>
                                        <select
                                            value={installments}
                                            onChange={event => setInstallments(Number(event.target.value))}
                                            style={inputStyle}
                                        >
                                            {Array.from({ length: 12 }, (_, index) => index + 1).map(value => (
                                                <option key={value} value={value}>
                                                    {value}x de R$ {money(totalAmount / value)}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </div>

                                <div className="checkout-subheading">Endereço de cobrança</div>
                                <div className="checkout-fields">
                                    <label className="checkout-field">
                                        <span>CEP</span>
                                        <input
                                            inputMode="numeric"
                                            autoComplete="postal-code"
                                            placeholder="00000-000"
                                            value={cep}
                                            onChange={event => setCep(formatCep(event.target.value))}
                                            style={inputStyle}
                                        />
                                    </label>
                                    <label className="checkout-field">
                                        <span>Cidade</span>
                                        <input
                                            autoComplete="address-level2"
                                            placeholder="Cidade"
                                            value={city}
                                            onChange={event => setCity(event.target.value)}
                                            style={inputStyle}
                                        />
                                    </label>
                                    <label className="checkout-field">
                                        <span>Estado</span>
                                        <input
                                            autoComplete="address-level1"
                                            placeholder="UF"
                                            maxLength={2}
                                            value={state}
                                            onChange={event => setState(event.target.value.toUpperCase())}
                                            style={inputStyle}
                                        />
                                    </label>
                                    <label className="checkout-field">
                                        <span>Bairro</span>
                                        <input
                                            autoComplete="address-line2"
                                            placeholder="Bairro"
                                            value={neighborhood}
                                            onChange={event => setNeighborhood(event.target.value)}
                                            style={inputStyle}
                                        />
                                    </label>
                                    <label className="checkout-field checkout-field-street">
                                        <span>Rua</span>
                                        <input
                                            autoComplete="address-line1"
                                            placeholder="Rua"
                                            value={street}
                                            onChange={event => setStreet(event.target.value)}
                                            style={inputStyle}
                                        />
                                    </label>
                                    <label className="checkout-field checkout-field-number">
                                        <span>Número</span>
                                        <input
                                            placeholder="Nº"
                                            value={number}
                                            onChange={event => setNumber(event.target.value)}
                                            style={inputStyle}
                                        />
                                    </label>
                                </div>
                            </div>
                        )}

                        <footer className="checkout-payment-footer">
                            <div>
                                <span>Total a pagar</span>
                                <strong>R$ {money(totalAmount)}</strong>
                                <small>{paymentMethod === 'pix' ? 'Pagamento via Pix' : installments + 'x no cartão'}</small>
                            </div>
                            <button type="button" onClick={handleCheckout} disabled={loading || items.length === 0}>
                                <FiLock />
                                {loading ? 'Processando...' : paymentMethod === 'pix' ? 'Gerar Pix' : 'Pagar com cartão'}
                            </button>
                        </footer>
                        <p className="checkout-security-note"><FiShield /> Seus dados são criptografados e processados em ambiente seguro.</p>
                    </section>
                </div>
            </div>

            <style jsx>{`
                .store-checkout-page {
                    min-height: 100vh;
                    padding: 42px 24px;
                    color: var(--checkout-text);
                    background:
                        radial-gradient(circle at 5% 0%, color-mix(in srgb, var(--checkout-accent) 13%, transparent), transparent 27%),
                        radial-gradient(circle at 98% 15%, color-mix(in srgb, var(--checkout-accent) 9%, transparent), transparent 25%),
                        var(--checkout-bg);
                    font-family: Outfit, Inter, sans-serif;
                }
                .store-checkout-page * { box-sizing: border-box; }
                .checkout-shell { width: min(1180px, 100%); margin: 0 auto; }
                .checkout-back { margin-bottom: 18px; border: 0; padding: 9px 0; display: inline-flex; align-items: center; gap: 8px; color: var(--checkout-muted); background: transparent; font-size: 13px; font-weight: 750; cursor: pointer; }
                .checkout-back:hover { color: var(--checkout-accent); }
                .checkout-frame { min-height: 730px; border: 1px solid var(--checkout-border); border-radius: 28px; display: grid; grid-template-columns: minmax(360px, .82fr) minmax(520px, 1.18fr); overflow: hidden; background: var(--checkout-surface); box-shadow: var(--checkout-shadow); }
                .checkout-brand-panel { position: relative; min-width: 0; padding: 34px; display: flex; flex-direction: column; overflow: hidden; color: white; background-position: center; background-size: cover; }
                .checkout-brand-panel::before { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(5,10,25,.06), rgba(5,10,25,.32)); pointer-events: none; }
                .checkout-brand-glow { position: absolute; width: 350px; height: 350px; right: -160px; top: -150px; border-radius: 50%; background: color-mix(in srgb, var(--checkout-accent) 42%, transparent); filter: blur(40px); opacity: .7; }
                .checkout-brand-top, .checkout-brand-copy, .checkout-order-card, .checkout-trust-line { position: relative; z-index: 1; }
                .checkout-brand-top { display: flex; align-items: center; justify-content: space-between; color: rgba(255,255,255,.76); font-size: 10px; letter-spacing: .05em; text-transform: uppercase; }
                .checkout-brand-top span { display: inline-flex; align-items: center; gap: 7px; }
                .checkout-brand-top b { font-size: 12px; letter-spacing: .08em; }
                .checkout-brand-copy { padding: 44px 4px 34px; text-align: center; }
                .checkout-hero-image, .checkout-hero-fallback { width: 150px; height: 150px; margin: 0 auto 21px; border: 1px solid rgba(255,255,255,.24); border-radius: 34px; display: grid; place-items: center; overflow: hidden; background: rgba(255,255,255,.10); box-shadow: 0 22px 58px rgba(0,0,0,.24); backdrop-filter: blur(14px); }
                .checkout-hero-image img { width: 100%; height: 100%; object-fit: cover; }
                .checkout-hero-fallback { font-size: 48px; color: rgba(255,255,255,.8); }
                .checkout-brand-copy small { display: block; color: rgba(255,255,255,.68); font-size: 10px; font-weight: 750; letter-spacing: .12em; text-transform: uppercase; }
                .checkout-brand-copy h1 { margin: 7px 0 9px; color: white; font-size: 34px; font-weight: 900; letter-spacing: -.04em; }
                .checkout-brand-copy p { max-width: 330px; margin: 0 auto; color: rgba(255,255,255,.72); font-size: 12px; line-height: 1.55; }
                .checkout-order-card { margin-top: auto; border: 1px solid rgba(255,255,255,.18); border-radius: 20px; padding: 18px; background: rgba(6,11,25,.48); backdrop-filter: blur(17px); }
                .checkout-order-title { padding-bottom: 12px; display: flex; align-items: center; justify-content: space-between; }
                .checkout-order-title strong { font-size: 13px; }
                .checkout-order-title span { color: rgba(255,255,255,.58); font-size: 10px; }
                .checkout-order-items { max-height: 204px; overflow-y: auto; }
                .checkout-empty { padding: 22px 0; color: rgba(255,255,255,.62); text-align: center; font-size: 11px; }
                .checkout-order-item { border-top: 1px solid rgba(255,255,255,.10); padding: 12px 0; display: grid; grid-template-columns: 48px minmax(0,1fr) auto; gap: 11px; align-items: center; }
                .checkout-order-image { width: 48px; height: 48px; border-radius: 10px; display: grid; place-items: center; overflow: hidden; color: rgba(255,255,255,.45); background: rgba(255,255,255,.08); }
                .checkout-order-image img { width: 100%; height: 100%; object-fit: cover; }
                .checkout-order-info { min-width: 0; }
                .checkout-order-info > strong { display: block; overflow: hidden; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
                .checkout-order-info > span { display: block; margin-top: 2px; color: color-mix(in srgb, var(--checkout-accent) 65%, white); font-size: 9px; font-weight: 750; }
                .checkout-order-controls { margin-top: 6px; display: flex; align-items: center; gap: 5px; }
                .checkout-order-controls button { width: 21px; height: 21px; border: 1px solid rgba(255,255,255,.14); border-radius: 6px; display: grid; place-items: center; color: white; background: rgba(255,255,255,.07); font-size: 10px; cursor: pointer; }
                .checkout-order-controls b { min-width: 18px; text-align: center; font-size: 10px; }
                .checkout-order-controls .checkout-remove { margin-left: 3px; border: 0; color: #fecaca; background: rgba(239,68,68,.13); }
                .checkout-order-price { font-size: 11px; white-space: nowrap; }
                .checkout-total-row { border-top: 1px solid rgba(255,255,255,.15); padding-top: 15px; display: flex; align-items: baseline; justify-content: space-between; }
                .checkout-total-row span { color: rgba(255,255,255,.68); font-size: 11px; }
                .checkout-total-row strong { font-size: 21px; }
                .checkout-trust-line { padding: 16px 4px 0; display: flex; justify-content: center; gap: 22px; color: rgba(255,255,255,.58); font-size: 9px; }
                .checkout-trust-line span { display: inline-flex; align-items: center; gap: 5px; }
                .checkout-payment-panel { min-width: 0; padding: 44px 52px 36px; background: var(--checkout-surface); }
                .checkout-payment-header > span { color: var(--checkout-accent); font-size: 10px; font-weight: 850; letter-spacing: .13em; text-transform: uppercase; }
                .checkout-payment-header h2 { margin: 7px 0 7px; color: var(--checkout-text); font-size: 29px; letter-spacing: -.035em; }
                .checkout-payment-header p { margin: 0; color: var(--checkout-muted); font-size: 12px; }
                .checkout-section { border-top: 1px solid var(--checkout-border); margin-top: 28px; padding-top: 25px; }
                .checkout-section-heading { margin-bottom: 18px; display: flex; align-items: center; gap: 10px; color: var(--checkout-text); font-size: 13px; font-weight: 850; }
                .checkout-section-heading b { width: 25px; height: 25px; border-radius: 8px; display: grid; place-items: center; color: var(--checkout-accent); background: color-mix(in srgb, var(--checkout-accent) 11%, var(--checkout-surface)); font-size: 10px; }
                .checkout-payment-methods { display: grid; grid-template-columns: 1fr; gap: 12px; }
                .checkout-payment-methods.has-card { grid-template-columns: repeat(2, 1fr); }
                .checkout-payment-methods button { position: relative; min-height: 67px; border: 1px solid var(--checkout-border); border-radius: 13px; padding: 11px 36px 11px 12px; display: flex; align-items: center; gap: 11px; color: var(--checkout-text); background: var(--checkout-surface-alt); text-align: left; cursor: pointer; transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease; }
                .checkout-payment-methods button:hover { transform: translateY(-1px); border-color: color-mix(in srgb, var(--checkout-accent) 35%, var(--checkout-border)); }
                .checkout-payment-methods button.active { border-color: var(--checkout-accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--checkout-accent) 9%, transparent); }
                .checkout-payment-methods button > i { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; color: var(--checkout-accent); background: color-mix(in srgb, var(--checkout-accent) 10%, var(--checkout-surface)); font-size: 16px; }
                .checkout-payment-methods button > span { display: grid; gap: 3px; }
                .checkout-payment-methods strong { font-size: 11px; }
                .checkout-payment-methods small { color: var(--checkout-muted); font-size: 8px; }
                .method-check { position: absolute; right: 13px; color: var(--checkout-accent); }
                .checkout-fields { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 15px; }
                .checkout-field { min-width: 0; display: grid; gap: 7px; }
                .checkout-field > span { color: var(--checkout-muted); font-size: 10px; font-weight: 750; }
                .checkout-field-full { grid-column: 1 / -1; }
                .checkout-field input, .checkout-field select { width: 100%; height: 44px; border: 1px solid; border-radius: 10px; padding: 0 13px; font: inherit; font-size: 12px; transition: border-color .18s ease, box-shadow .18s ease; }
                .checkout-field input::placeholder { color: color-mix(in srgb, var(--checkout-muted) 68%, transparent); }
                .checkout-field input:focus, .checkout-field select:focus { outline: none; border-color: var(--checkout-accent) !important; box-shadow: 0 0 0 3px color-mix(in srgb, var(--checkout-accent) 10%, transparent); }
                .checkout-expiration { display: grid; grid-template-columns: 1fr auto 1fr; gap: 7px; align-items: center; }
                .checkout-expiration em { color: var(--checkout-muted); font-style: normal; }
                .checkout-subheading { margin: 26px 0 14px; color: var(--checkout-text); font-size: 11px; font-weight: 850; }
                .checkout-payment-footer { border-top: 1px solid var(--checkout-border); margin-top: 30px; padding-top: 25px; display: grid; grid-template-columns: 1fr minmax(210px, auto); gap: 24px; align-items: center; }
                .checkout-payment-footer > div { display: grid; gap: 2px; }
                .checkout-payment-footer span { color: var(--checkout-muted); font-size: 9px; }
                .checkout-payment-footer strong { color: var(--checkout-text); font-size: 25px; letter-spacing: -.03em; }
                .checkout-payment-footer small { color: var(--checkout-accent); font-size: 8px; font-weight: 750; }
                .checkout-payment-footer button { height: 51px; border: 0; border-radius: 12px; padding: 0 22px; display: flex; align-items: center; justify-content: center; gap: 8px; color: white; background: var(--checkout-accent); font-size: 11px; font-weight: 900; cursor: pointer; box-shadow: 0 14px 30px color-mix(in srgb, var(--checkout-accent) 26%, transparent); transition: transform .18s ease; }
                .checkout-payment-footer button:hover:not(:disabled) { transform: translateY(-1px); }
                .checkout-payment-footer button:disabled { opacity: .45; cursor: not-allowed; box-shadow: none; }
                .checkout-security-note { margin: 15px 0 0; display: flex; align-items: center; justify-content: flex-end; gap: 6px; color: var(--checkout-muted); font-size: 8px; }
                .checkout-security-note :global(svg) { color: #10b981; }
                @media (max-width: 980px) {
                    .store-checkout-page { padding: 24px 16px; }
                    .checkout-frame { grid-template-columns: 1fr; }
                    .checkout-brand-panel { min-height: 620px; }
                    .checkout-brand-copy { padding-top: 34px; }
                    .checkout-order-card { width: min(520px,100%); margin-right: auto; margin-left: auto; }
                    .checkout-payment-panel { padding: 38px; }
                }
                @media (max-width: 620px) {
                    .store-checkout-page { padding: 14px 10px; }
                    .checkout-back { margin-left: 6px; }
                    .checkout-frame { border-radius: 20px; }
                    .checkout-brand-panel { min-height: 580px; padding: 24px 18px; }
                    .checkout-brand-copy { padding: 30px 0 25px; }
                    .checkout-hero-image, .checkout-hero-fallback { width: 118px; height: 118px; border-radius: 27px; }
                    .checkout-brand-copy h1 { font-size: 27px; }
                    .checkout-payment-panel { padding: 28px 18px; }
                    .checkout-payment-header h2 { font-size: 24px; }
                    .checkout-payment-methods.has-card, .checkout-fields { grid-template-columns: 1fr; }
                    .checkout-field, .checkout-field-full, .checkout-field-street, .checkout-field-number { grid-column: 1; }
                    .checkout-field input, .checkout-field select { height: 47px; font-size: 16px; }
                    .checkout-payment-footer { grid-template-columns: 1fr; }
                    .checkout-payment-footer button { width: 100%; }
                    .checkout-security-note { justify-content: center; text-align: center; }
                }
            `}</style>
        </main>
    );
}
