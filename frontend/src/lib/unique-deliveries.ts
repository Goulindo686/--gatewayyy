import 'server-only';

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import type { UniqueDeliveryPayload } from '@/lib/unique-delivery-crypto';

export const UNIQUE_DELIVERY_BUCKET = 'unique-deliveries';
export const UNIQUE_DELIVERY_MAX_FILE_BYTES = 15 * 1024 * 1024;
export const UNIQUE_DELIVERY_MAX_BATCH = 250;

const BLOCKED_FILE_EXTENSIONS = new Set([
    'apk', 'app', 'bat', 'bin', 'cmd', 'com', 'cpl', 'dll', 'dmg', 'exe',
    'hta', 'html', 'htm', 'iso', 'jar', 'js', 'jse', 'lnk', 'msi', 'msp',
    'ps1', 'reg', 'scr', 'sh', 'svg', 'vbe', 'vbs', 'wsf',
]);

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

export function normalizeUniqueDeliveryFilename(value: string) {
    const filename = String(value || 'arquivo')
        .normalize('NFKC')
        .replace(/[\u0000-\u001f\u007f]/g, '')
        .replace(/[\\/]/g, '_')
        .trim()
        .slice(0, 180) || 'arquivo';
    const extension = filename.includes('.')
        ? filename.split('.').pop()!.toLowerCase()
        : '';

    if (extension && BLOCKED_FILE_EXTENSIONS.has(extension)) {
        throw new Error('Este tipo de arquivo nao e permitido.');
    }
    return filename;
}

export function normalizeUniqueDeliveryContentType(value: unknown) {
    const contentType = String(value || '').trim().toLowerCase();
    return /^[a-z0-9][a-z0-9!#$&^_.+-]{0,126}\/[a-z0-9][a-z0-9!#$&^_.+-]{0,126}$/.test(contentType)
        ? contentType
        : 'application/octet-stream';
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

export async function hasAssignedUniqueDelivery(orderId: string) {
    const { count, error } = await supabase
        .from('unique_delivery_fulfillments')
        .select('id', { count: 'exact', head: true })
        .eq('order_id', orderId)
        .eq('status', 'assigned');
    if (error) return false;
    return (count || 0) > 0;
}

export function withSensitiveResponseHeaders(response: Response) {
    response.headers.set('Cache-Control', 'private, no-store, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'no-referrer');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    return response;
}
