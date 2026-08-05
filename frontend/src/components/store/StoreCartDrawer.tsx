'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
    FiLock,
    FiMinus,
    FiPackage,
    FiPlus,
    FiShoppingBag,
    FiTrash2,
    FiX,
    FiZap,
} from 'react-icons/fi';
import { useCart, type CartItem } from '@/contexts/CartContext';

type DrawerTheme = {
    surface: string;
    surfaceAlt: string;
    text: string;
    muted: string;
    border: string;
};

type StoreCartDrawerProps = {
    open: boolean;
    onClose: () => void;
    storeSlug: string;
    accent: string;
    theme: DrawerTheme;
};

function cartItemKey(item: CartItem) {
    return item.plan_id ? `${item.id}__${item.plan_id}` : item.id;
}

function money(value: number) {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function StoreCartDrawer({ open, onClose, storeSlug, accent, theme }: StoreCartDrawerProps) {
    const router = useRouter();
    const { items, totalAmount, totalItems, updateQuantity, removeItem } = useCart();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        if (!open) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', closeOnEscape);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', closeOnEscape);
        };
    }, [onClose, open]);

    if (!mounted || !open) return null;

    const finishPurchase = () => {
        onClose();
        router.push(`/store/${encodeURIComponent(storeSlug)}/cart?overlay=1`);
    };

    return createPortal(
        <div className="store-cart-overlay" role="presentation" onMouseDown={onClose}>
            <aside
                className="store-cart-drawer"
                role="dialog"
                aria-modal="true"
                aria-label="Seu carrinho"
                onMouseDown={event => event.stopPropagation()}
                style={{
                    '--drawer-surface': theme.surface,
                    '--drawer-surface-alt': theme.surfaceAlt,
                    '--drawer-text': theme.text,
                    '--drawer-muted': theme.muted,
                    '--drawer-border': theme.border,
                    '--drawer-accent': accent,
                } as React.CSSProperties}
            >
                <header className="store-cart-drawer-header">
                    <div><strong>Seu carrinho</strong><span>({totalItems})</span></div>
                    <button type="button" onClick={onClose} aria-label="Fechar carrinho"><FiX /></button>
                </header>

                <div className="store-cart-drawer-content">
                    {items.length === 0 ? (
                        <div className="store-cart-empty">
                            <i><FiShoppingBag /></i>
                            <strong>Seu carrinho está vazio</strong>
                            <p>Adicione um produto para continuar sua compra.</p>
                            <button type="button" onClick={onClose}>Continuar comprando</button>
                        </div>
                    ) : (
                        <div className="store-cart-items">
                            {items.map(item => {
                                const key = cartItemKey(item);
                                return (
                                    <article className="store-cart-item" key={key}>
                                        <div className="store-cart-item-image">
                                            {item.image_url ? <img src={item.image_url} alt="" /> : <FiPackage />}
                                        </div>
                                        <div className="store-cart-item-details">
                                            <strong>{item.name}</strong>
                                            {item.plan_name && <small>{item.plan_name}</small>}
                                            <span>R$ {money(item.price)}</span>
                                            <div className="store-cart-quantity">
                                                <button type="button" onClick={() => updateQuantity(key, -1)} aria-label={`Diminuir quantidade de ${item.name}`}><FiMinus /></button>
                                                <b>{item.quantity}</b>
                                                <button type="button" onClick={() => updateQuantity(key, 1)} aria-label={`Aumentar quantidade de ${item.name}`}><FiPlus /></button>
                                            </div>
                                        </div>
                                        <div className="store-cart-item-total">
                                            <strong>R$ {money(item.price * item.quantity)}</strong>
                                            <button type="button" onClick={() => removeItem(key)} aria-label={`Remover ${item.name}`}><FiTrash2 /></button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </div>

                <footer className="store-cart-drawer-footer">
                    <div className="store-cart-subtotal"><span>Subtotal</span><strong>R$ {money(totalAmount)}</strong></div>
                    <button type="button" className="store-cart-finish" onClick={finishPurchase} disabled={items.length === 0}>
                        <FiLock /> Finalizar compra
                    </button>
                    <div className="store-cart-assurances">
                        <span><FiLock /> Seguro</span>
                        <span><FiZap /> Imediato</span>
                    </div>
                </footer>
            </aside>

            <style jsx global>{`
                .store-cart-overlay { position: fixed; inset: 0; z-index: 10000; display: flex; justify-content: flex-end; background: rgba(3, 8, 18, .78); backdrop-filter: blur(1.5px); animation: storeCartFade .2s ease both; }
                .store-cart-drawer { width: min(470px, 100vw); height: 100dvh; display: flex; flex-direction: column; color: var(--drawer-text); background: var(--drawer-surface); box-shadow: -24px 0 70px rgba(0,0,0,.24); animation: storeCartSlide .28s cubic-bezier(.2,.75,.25,1) both; }
                .store-cart-drawer * { box-sizing: border-box; }
                .store-cart-drawer-header { min-height: 68px; border-bottom: 1px solid var(--drawer-border); padding: 0 18px 0 22px; display: flex; align-items: center; justify-content: space-between; flex: 0 0 auto; }
                .store-cart-drawer-header > div { display: flex; align-items: baseline; gap: 7px; }
                .store-cart-drawer-header strong { font-size: 15px; font-weight: 900; }
                .store-cart-drawer-header span { color: var(--drawer-muted); font-size: 12px; }
                .store-cart-drawer-header button { width: 39px; height: 39px; border: 1px solid var(--drawer-border); border-radius: 50%; display: grid; place-items: center; color: var(--drawer-accent); background: var(--drawer-surface); font-size: 19px; cursor: pointer; box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--drawer-accent) 10%, transparent); }
                .store-cart-drawer-content { min-height: 0; flex: 1; overflow-y: auto; overscroll-behavior: contain; }
                .store-cart-items { display: grid; }
                .store-cart-item { min-height: 122px; border-bottom: 1px solid var(--drawer-border); padding: 15px 20px; display: grid; grid-template-columns: 62px minmax(0,1fr) auto; gap: 13px; align-items: start; }
                .store-cart-item-image { width: 62px; height: 62px; border: 1px solid var(--drawer-border); border-radius: 10px; overflow: hidden; display: grid; place-items: center; color: var(--drawer-muted); background: var(--drawer-surface-alt); }
                .store-cart-item-image img { width: 100%; height: 100%; object-fit: cover; }
                .store-cart-item-details { min-width: 0; }
                .store-cart-item-details > strong { display: block; overflow: hidden; color: var(--drawer-text); font-size: 12px; font-weight: 900; line-height: 1.35; text-overflow: ellipsis; white-space: nowrap; }
                .store-cart-item-details > small { display: block; margin-top: 3px; overflow: hidden; color: var(--drawer-accent); font-size: 9px; font-weight: 750; text-overflow: ellipsis; white-space: nowrap; }
                .store-cart-item-details > span { display: block; margin-top: 5px; color: var(--drawer-muted); font-size: 10px; }
                .store-cart-quantity { width: 88px; height: 31px; margin-top: 9px; border: 1px solid color-mix(in srgb, var(--drawer-accent) 35%, var(--drawer-border)); border-radius: 8px; display: grid; grid-template-columns: 29px 28px 29px; align-items: center; overflow: hidden; }
                .store-cart-quantity button { height: 100%; border: 0; display: grid; place-items: center; color: var(--drawer-muted); background: transparent; font-size: 13px; cursor: pointer; }
                .store-cart-quantity b { text-align: center; font-size: 11px; }
                .store-cart-item-total { min-width: 122px; margin-top: 43px; display: flex; align-items: center; justify-content: flex-end; gap: 20px; }
                .store-cart-item-total strong { font-size: 12px; white-space: nowrap; }
                .store-cart-item-total button { border: 0; padding: 3px; color: var(--drawer-muted); background: transparent; font-size: 15px; cursor: pointer; }
                .store-cart-empty { min-height: 100%; padding: 40px 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
                .store-cart-empty i { width: 62px; height: 62px; border-radius: 20px; display: grid; place-items: center; color: var(--drawer-accent); background: color-mix(in srgb, var(--drawer-accent) 10%, var(--drawer-surface)); font-size: 26px; }
                .store-cart-empty strong { margin-top: 17px; font-size: 15px; }
                .store-cart-empty p { max-width: 260px; margin: 6px 0 17px; color: var(--drawer-muted); font-size: 11px; line-height: 1.55; }
                .store-cart-empty button { border: 1px solid var(--drawer-accent); border-radius: 10px; padding: 10px 14px; color: var(--drawer-accent); background: transparent; font-size: 10px; font-weight: 850; cursor: pointer; }
                .store-cart-drawer-footer { min-height: 82px; border-top: 1px solid var(--drawer-border); padding: 14px 17px; display: grid; grid-template-columns: auto minmax(155px,1fr) auto; grid-template-rows: 28px 20px; column-gap: 11px; align-items: center; flex: 0 0 auto; background: var(--drawer-surface); box-shadow: 0 -10px 30px rgba(15,23,42,.05); }
                .store-cart-subtotal { grid-row: 1 / 3; display: flex; align-items: baseline; gap: 3px; white-space: nowrap; }
                .store-cart-subtotal span { color: var(--drawer-muted); font-size: 10px; }
                .store-cart-subtotal strong { font-size: 19px; font-weight: 950; letter-spacing: -.02em; }
                .store-cart-finish { height: 44px; border: 0; border-radius: 10px; grid-row: 1 / 3; display: flex; align-items: center; justify-content: center; gap: 8px; color: white; background: var(--drawer-accent); font-size: 11px; font-weight: 900; cursor: pointer; box-shadow: 0 12px 28px color-mix(in srgb, var(--drawer-accent) 28%, transparent); }
                .store-cart-finish:disabled { opacity: .45; cursor: not-allowed; box-shadow: none; }
                .store-cart-assurances { grid-row: 1 / 3; display: flex; gap: 9px; color: var(--drawer-muted); font-size: 8px; }
                .store-cart-assurances span { display: flex; align-items: center; gap: 3px; }
                .store-cart-assurances :global(svg) { color: #10b981; }
                @keyframes storeCartFade { from { opacity: 0; } }
                @keyframes storeCartSlide { from { transform: translateX(100%); } }
                @media (max-width: 540px) {
                    .store-cart-drawer { width: 100vw; }
                    .store-cart-item { padding: 14px; grid-template-columns: 56px minmax(0,1fr) auto; gap: 10px; }
                    .store-cart-item-image { width: 56px; height: 56px; }
                    .store-cart-item-total { min-width: 90px; gap: 10px; }
                    .store-cart-drawer-footer { padding: 12px 14px; grid-template-columns: 1fr 1.2fr; grid-template-rows: auto auto; row-gap: 8px; }
                    .store-cart-subtotal { grid-row: 1; }
                    .store-cart-finish { grid-column: 2; grid-row: 1; }
                    .store-cart-assurances { grid-column: 1 / 3; grid-row: 2; justify-content: flex-end; }
                }
            `}</style>
        </div>,
        document.body,
    );
}
