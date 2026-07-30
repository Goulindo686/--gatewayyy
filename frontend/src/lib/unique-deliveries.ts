import 'server-only';

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import type { UniqueDeliveryPayload } from '@/lib/unique-delivery-crypto';

export const UNIQUE_DELIVERY_BUCKET = 'unique-deliveries';
export const UNIQUE_DELIVERY_MAX_BATCH = 250;

function cleanText(value: unknown, maxLength: number) {
    return typeof value === 'string'
        ? value.replace(/\u0000/g, '').trim().slice(0, maxLength)
        : '';
}

export function normalizeUniqueDeliveryPayload(raw: unknown): UniqueDeliveryPayload {
    const value = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
    const payload: UniqueDeliveryPayload = {
        access: cleanText(value.access, 10_000),
        instructions: cleanText(value.instructions, 20_000),
        customText: cleanText(value.customText ?? value.custom_text, 20_000),
        redirectUrl: cleanText(value.redirectUrl ?? value.redirect_url, 2_048),
        notes: cleanText(value.notes, 20_000),
    };

    if (!payload.access) {
        throw new Error('O acesso exclusivo e obrigatorio.');
    }

    if (payload.redirectUrl) {
        let parsed: URL;
        try {
            parsed = new URL(payload.redirectUrl);
        } catch {
            throw new Error('O link de redirecionamento e invalido.');
        }
        if (!['https:', 'http:'].includes(parsed.protocol)) {
            throw new Error('O link deve usar http ou https.');
        }
    }

    return payload;
}

export function requestIp(req: NextRequest) {
    return req.headers.get('x-forwarded-for')?.split(',')[0].trim()
        || req.headers.get('x-real-ip')
        || 'unknown';
}

export function maskUniqueDeliveryEmail(value: string) {
    const email = String(value || '').trim();
    const [local, domain] = email.split('@');
    if (!local || !domain) return 'cliente protegido';
    const visible = local.slice(0, Math.min(2, local.length));
    return `${visible}${'*'.repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

export async function requireOwnedProduct(productId: string, sellerId: string) {
    const { data: product, error } = await supabase
        .from('products')
        .select('id, user_id, name, type, status')
        .eq('id', productId)
        .eq('user_id', sellerId)
        .maybeSingle();
    if (error) throw error;
    return product;
}

export async function getUniqueDeliveryStock(productId: string) {
    const { data: settings, error: settingsError } = await supabase
        .from('unique_delivery_settings')
        .select('enabled, enabled_at')
        .eq('product_id', productId)
        .maybeSingle();

    // Compatibilidade durante rollout: antes da migration, produtos existentes
    // continuam vendendo normalmente e o modulo e tratado como desativado.
    if (settingsError) {
        const missingDuringRollout = ['42P01', 'PGRST205'].includes(
            String(settingsError.code || ''),
        ) || /schema cache|does not exist/i.test(settingsError.message || '');
        if (missingDuringRollout) {
            console.warn('[UNIQUE DELIVERY] Settings unavailable during rollout');
            return { enabled: false, available: null as number | null };
        }
        throw settingsError;
    }
    if (!settings?.enabled) {
        return { enabled: false, available: null as number | null };
    }

    const { count, error } = await supabase
        .from('unique_delivery_items')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', productId)
        .eq('status', 'available');
    if (error) throw error;
    return { enabled: true, available: count || 0 };
}

function isMissingUniqueDeliverySchema(error: unknown) {
    const details = error && typeof error === 'object'
        ? error as { code?: unknown; message?: unknown }
        : {};
    return ['42P01', 'PGRST205'].includes(String(details.code || ''))
        || /schema cache|does not exist/i.test(String(details.message || ''));
}

export async function getUniqueDeliveryPurchaseKeys(orderIds: string[]) {
    const normalizedOrderIds = Array.from(new Set(orderIds.filter(Boolean)));
    const purchases = new Set<string>();
    if (!normalizedOrderIds.length) return purchases;

    for (let offset = 0; offset < normalizedOrderIds.length; offset += 200) {
        const orderIdBatch = normalizedOrderIds.slice(offset, offset + 200);
        const [mappedProducts, fulfillments] = await Promise.all([
            supabase
                .from('unique_delivery_order_products')
                .select('order_id, product_id')
                .in('order_id', orderIdBatch),
            supabase
                .from('unique_delivery_fulfillments')
                .select('order_id, product_id')
                .in('order_id', orderIdBatch),
        ]);

        for (const result of [mappedProducts, fulfillments]) {
            if (result.error && !isMissingUniqueDeliverySchema(result.error)) {
                throw result.error;
            }
            for (const row of result.data || []) {
                if (row.order_id && row.product_id) {
                    purchases.add(`${row.order_id}:${row.product_id}`);
                }
            }
        }
    }

    return purchases;
}

export async function orderUsesUniqueDelivery(orderId: string, productId: string) {
    const purchases = await getUniqueDeliveryPurchaseKeys([orderId]);
    return purchases.has(`${orderId}:${productId}`);
}

export function withSensitiveResponseHeaders(response: Response) {
    response.headers.set('Cache-Control', 'private, no-store, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'no-referrer');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    return response;
}
