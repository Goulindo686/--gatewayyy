import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from './db';

const UTMIFY_ENDPOINT = 'https://api.utmify.com.br/api-credentials/orders';

type UtmifyStatus = 'waiting_payment' | 'paid' | 'refused' | 'refunded' | 'chargedback';

function formatDateUTC(value?: string | Date | null) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 19).replace('T', ' ');
}

function cleanDigits(value: any) {
    const digits = String(value || '').replace(/\D/g, '');
    return digits || null;
}

function getTracking(order: any) {
    const params = order?.tracking_params && typeof order.tracking_params === 'object'
        ? order.tracking_params
        : {};
    return {
        src: order?.utm_src || params.src || null,
        sck: order?.utm_sck || params.sck || null,
        utm_id: params.utm_id || null,
        utm_source: order?.utm_source || params.utm_source || null,
        utm_campaign: order?.utm_campaign || params.utm_campaign || null,
        utm_medium: order?.utm_medium || params.utm_medium || null,
        utm_content: order?.utm_content || params.utm_content || null,
        utm_term: order?.utm_term || params.utm_term || null,
        fbclid: params.fbclid || null,
        gclid: params.gclid || null,
        ttclid: params.ttclid || null,
        msclkid: params.msclkid || null,
        campaign_id: params.campaign_id || null,
        adset_id: params.adset_id || null,
        ad_id: params.ad_id || null,
        campaign_name: params.campaign_name || null,
        adset_name: params.adset_name || null,
        ad_name: params.ad_name || null,
        landing_url: order?.landing_url || params.landing_url || null,
        referrer: order?.referrer || params.referrer || null,
    };
}

function getGatewayFee(order: any) {
    const amount = Number(order?.amount || 0);
    if (!amount) return 0;
    if (order?.payment_method === 'credit_card') return Math.max(0, Math.round(amount * 0.02));
    return Math.min(200, amount);
}

function getEncryptionKey() {
    const secret = process.env.UTMIFY_ENCRYPTION_KEY || process.env.JWT_SECRET || '';
    if (!secret) return null;
    return createHash('sha256').update(secret).digest();
}

export function encryptUtmifyToken(token?: string | null) {
    const value = String(token || '').trim();
    if (!value) return null;
    if (value.startsWith('enc:v1:')) return value;

    const key = getEncryptionKey();
    if (!key) return value;

    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `enc:v1:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptUtmifyToken(token?: string | null) {
    const value = String(token || '').trim();
    if (!value || !value.startsWith('enc:v1:')) return value || null;

    const key = getEncryptionKey();
    if (!key) return null;

    try {
        const [, , ivB64, tagB64, encryptedB64] = value.split(':');
        const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
        decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
        const decrypted = Buffer.concat([
            decipher.update(Buffer.from(encryptedB64, 'base64')),
            decipher.final()
        ]);
        return decrypted.toString('utf8');
    } catch {
        return null;
    }
}

export function buildUtmifyPayload({
    order,
    product,
    status = 'paid',
    isTest = false,
}: {
    order: any;
    product?: any;
    status?: UtmifyStatus;
    isTest?: boolean;
}) {
    const amount = Number(order?.amount || 0);
    const gatewayFee = getGatewayFee(order);

    return {
        orderId: String(order?.id),
        platform: 'GouPay',
        paymentMethod: order?.payment_method === 'credit_card' ? 'credit_card' : 'pix',
        status,
        createdAt: formatDateUTC(order?.created_at) || formatDateUTC(new Date()),
        approvedDate: status === 'paid' ? formatDateUTC(new Date()) : null,
        refundedAt: status === 'refunded' ? formatDateUTC(new Date()) : null,
        customer: {
            name: order?.buyer_name || 'Cliente',
            email: order?.buyer_email || '',
            phone: cleanDigits(order?.buyer_phone),
            document: cleanDigits(order?.buyer_cpf),
            country: 'BR',
            ip: order?.client_ip || null,
        },
        products: [{
            id: String(product?.id || order?.product_id || order?.id),
            name: product?.name || 'Produto',
            planId: order?.plan_id || null,
            planName: order?.plan_name || null,
            quantity: 1,
            priceInCents: amount,
        }],
        trackingParameters: getTracking(order),
        commission: {
            totalPriceInCents: amount,
            gatewayFeeInCents: gatewayFee,
            userCommissionInCents: Math.max(0, amount - gatewayFee),
            currency: 'BRL',
        },
        isTest,
    };
}

export async function sendUtmifyOrder({
    token,
    order,
    product,
    status = 'paid',
    isTest = false,
}: {
    token?: string | null;
    order: any;
    product?: any;
    status?: UtmifyStatus;
    isTest?: boolean;
}) {
    const apiToken = String(decryptUtmifyToken(token) || token || '').trim();
    if (!apiToken) return { skipped: true, reason: 'missing_token' };

    const payload = buildUtmifyPayload({ order, product, status, isTest });
    const response = await fetch(UTMIFY_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-token': apiToken,
        },
        body: JSON.stringify(payload),
    });

    let data: any = null;
    try {
        data = await response.json();
    } catch {
        data = await response.text().catch(() => null);
    }

    if (!response.ok) {
        return {
            ok: false,
            status: response.status,
            error: typeof data === 'string' ? data : data?.message || data?.error || 'Utmify API error',
            data,
        };
    }

    return { ok: true, status: response.status, data, payload };
}

export async function sendUtmifyOrderWithLog({
    token,
    order,
    product,
    sellerId,
    status = 'paid',
    isTest = false,
    eventId,
}: {
    token?: string | null;
    order: any;
    product?: any;
    sellerId?: string;
    status?: UtmifyStatus;
    isTest?: boolean;
    eventId?: string;
}) {
    const orderId = String(order?.id || '');
    const id = eventId || (!isTest && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId) ? orderId : uuidv4());
    const payload = buildUtmifyPayload({ order, product, status, isTest });
    const seller_id = sellerId || order?.seller_id;
    const now = new Date();

    try {
        await supabase.from('utmify_events').upsert({
            id,
            seller_id,
            order_id: isTest ? null : order?.id,
            event_type: status,
            status: 'pending',
            payload,
            updated_at: now.toISOString(),
        }, { onConflict: 'id' });
    } catch (err) {
        console.warn('[UTMIFY] Event log insert skipped:', err);
    }

    const result = await sendUtmifyOrder({ token, order, product, status, isTest });
    const ok = !!(result as any).ok;
    const attemptsNext = 1;
    const nextRetry = ok || isTest
        ? null
        : new Date(now.getTime() + 5 * 60_000).toISOString();

    try {
        await supabase.from('utmify_events')
            .update({
                status: ok ? 'sent' : ((result as any).skipped ? 'skipped' : 'failed'),
                response_status: (result as any).status || null,
                response_body: (result as any).data || null,
                error_message: (result as any).error || (result as any).reason || null,
                attempt_count: attemptsNext,
                next_retry_at: nextRetry,
                sent_at: ok ? new Date().toISOString() : null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id);
    } catch (err) {
        console.warn('[UTMIFY] Event log update skipped:', err);
    }

    return { ...(result as any), event_id: id };
}

export async function retryUtmifyEvent(event: any, token?: string | null) {
    const payload = event?.payload || {};
    const order = {
        id: payload.orderId,
        seller_id: event?.seller_id,
        product_id: payload.products?.[0]?.id,
        buyer_name: payload.customer?.name,
        buyer_email: payload.customer?.email,
        buyer_phone: payload.customer?.phone,
        buyer_cpf: payload.customer?.document,
        amount: payload.commission?.totalPriceInCents,
        payment_method: payload.paymentMethod,
        status: payload.status,
        created_at: payload.createdAt,
        client_ip: payload.customer?.ip,
        utm_source: payload.trackingParameters?.utm_source,
        utm_campaign: payload.trackingParameters?.utm_campaign,
        utm_medium: payload.trackingParameters?.utm_medium,
        utm_content: payload.trackingParameters?.utm_content,
        utm_term: payload.trackingParameters?.utm_term,
        utm_src: payload.trackingParameters?.src,
        utm_sck: payload.trackingParameters?.sck,
        tracking_params: payload.trackingParameters,
        landing_url: payload.trackingParameters?.landing_url,
        referrer: payload.trackingParameters?.referrer,
    };

    const product = payload.products?.[0]
        ? { id: payload.products[0].id, name: payload.products[0].name }
        : undefined;

    const result = await sendUtmifyOrder({ token, order, product, status: payload.status || 'paid', isTest: !!payload.isTest });
    const previousAttempts = Number(event?.attempt_count || 0);
    const attempts = previousAttempts + 1;
    const ok = !!(result as any).ok;
    const nextRetry = ok || attempts >= 5
        ? null
        : new Date(Date.now() + Math.min(60, 5 * attempts) * 60_000).toISOString();

    await supabase.from('utmify_events')
        .update({
            status: ok ? 'sent' : 'failed',
            response_status: (result as any).status || null,
            response_body: (result as any).data || null,
            error_message: (result as any).error || (result as any).reason || null,
            attempt_count: attempts,
            next_retry_at: nextRetry,
            sent_at: ok ? new Date().toISOString() : event?.sent_at || null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', event.id);

    return result;
}

export async function sendPaidOrderToUtmify(order: any) {
    if (!order?.id || order.status !== 'paid' || order.utmify_sent_at) {
        return { skipped: true, reason: 'not_eligible' };
    }

    const { data: seller } = await supabase
        .from('users')
        .select('utmify_enabled, utmify_api_token')
        .eq('id', order.seller_id)
        .single();

    const token = decryptUtmifyToken(seller?.utmify_api_token);
    if (!seller?.utmify_enabled || !token) {
        return { skipped: true, reason: 'integration_disabled' };
    }

    let product: any = null;
    if (order.product_id) {
        const { data } = await supabase
            .from('products')
            .select('id, name')
            .eq('id', order.product_id)
            .single();
        product = data;
    }

    const result = await sendUtmifyOrderWithLog({
        token,
        sellerId: order.seller_id,
        order,
        product,
        status: 'paid',
    });

    if ((result as any).ok) {
        await supabase.from('orders')
            .update({ utmify_sent_at: new Date().toISOString(), utmify_last_error: null })
            .eq('id', order.id);
    } else if (!(result as any).skipped) {
        await supabase.from('orders')
            .update({ utmify_last_error: (result as any).error || 'Erro UTMify' })
            .eq('id', order.id);
    }

    return result;
}
