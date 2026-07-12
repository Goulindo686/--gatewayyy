'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

declare global {
    interface Window {
        fbq: any;
        _fbq: any;
    }
}

export const pageview = (eventId?: string) => {
    if (typeof window !== 'undefined' && window.fbq) {
        window.fbq('track', 'PageView', {}, eventId ? { eventID: eventId } : undefined);
    }
};

export const event = (name: string, options = {}, eventId?: string) => {
    if (typeof window !== 'undefined' && window.fbq) {
        window.fbq('track', name, options, eventId ? { eventID: eventId } : undefined);
    }
};

export function getFacebookCookies() {
    if (typeof document === 'undefined') return {};

    const read = (name: string) => document.cookie
        .split('; ')
        .find(row => row.startsWith(`${name}=`))
        ?.split('=')
        .slice(1)
        .join('=');

    return {
        fbp: read('_fbp'),
        fbc: read('_fbc')
    };
}

export function trackFacebookPurchase(product: any, amount: number, orderId: string) {
    if (!product?.facebook_pixel_id || typeof window === 'undefined' || !window.fbq) return;

    event('Purchase', {
        content_name: product.name,
        content_ids: [product.id],
        content_type: 'product',
        value: Number(Number(amount || 0).toFixed(2)),
        currency: 'BRL',
        num_items: 1
    }, orderId);
}

interface FacebookPixelProps {
    pixelId?: string;
    product?: any;
}

export default function FacebookPixel({ pixelId, product }: FacebookPixelProps) {
    const [loaded, setLoaded] = useState(false);
    const safePixelId = String(pixelId || '').replace(/\D/g, '');
    const price = Number(product?.price || product?.price_display || 0);
    const pageEventId = useRef(`page_${Date.now()}_${Math.random().toString(36).slice(2)}`);

    useEffect(() => {
        if (typeof window !== 'undefined' && window.fbq) {
            setLoaded(true);
        }
    }, []);

    useEffect(() => {
        if (!loaded || !product || !safePixelId) return;

        const timer = setTimeout(() => {
            event('ViewContent', {
                content_name: product.name,
                content_ids: [product.id],
                content_type: 'product',
                value: Number(price.toFixed(2)),
                currency: 'BRL'
            }, `view_${product.id}_${pageEventId.current}`);

            event('InitiateCheckout', {
                content_name: product.name,
                content_ids: [product.id],
                content_type: 'product',
                value: Number(price.toFixed(2)),
                currency: 'BRL',
                num_items: 1
            }, `checkout_${product.id}_${pageEventId.current}`);
        }, 500);

        return () => clearTimeout(timer);
    }, [loaded, product, safePixelId, price]);

    if (!safePixelId) return null;

    return (
        <Script
            id={`fb-pixel-${safePixelId}`}
            strategy="afterInteractive"
            onLoad={() => setLoaded(true)}
            dangerouslySetInnerHTML={{
                __html: `
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${safePixelId}');
                fbq('track', 'PageView');
                `,
            }}
        />
    );
}
