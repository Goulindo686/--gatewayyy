'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface CartItem {
    id: string;
    name: string;
    price: number;
    price_display?: string;
    image_url?: string;
    plan_id?: string;
    plan_name?: string;
    quantity: number;
}

interface CartContextType {
    items: CartItem[];
    addItem: (item: Omit<CartItem, 'quantity'>) => void;
    removeItem: (id: string) => void;
    updateQuantity: (id: string, delta: number) => void;
    clearCart: () => void;
    totalAmount: number;
    totalItems: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children, storeSlug }: { children: ReactNode; storeSlug: string }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        const _loaded = localStorage.getItem(`cart_${storeSlug}`);
        if (_loaded) {
            try {
                setItems(JSON.parse(_loaded));
            } catch (e) {
                console.error("Failed to parse cart", e);
            }
        }
        setIsLoaded(true);
    }, [storeSlug]);

    // Save to localStorage when items change
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(`cart_${storeSlug}`, JSON.stringify(items));
        }
    }, [items, storeSlug, isLoaded]);

    const addItem = (newItem: Omit<CartItem, 'quantity'>) => {
        setItems(prev => {
            const existing = prev.find(i => i.id === newItem.id);
            if (existing) {
                return prev.map(i => i.id === newItem.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { ...newItem, quantity: 1 }];
        });
    };

    const removeItem = (id: string) => {
        setItems(prev => prev.filter(i => i.id !== id));
    };

    const updateQuantity = (id: string, delta: number) => {
        setItems(prev => prev.map(i => {
            if (i.id === id) {
                const newQ = Math.max(1, i.quantity + delta);
                return { ...i, quantity: newQ };
            }
            return i;
        }));
    };

    const clearCart = () => {
        setItems([]);
    };

    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalAmount, totalItems }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}
