import { createHash } from 'crypto';

type FacebookEventInput = {
    eventName: 'PageView' | 'ViewContent' | 'InitiateCheckout' | 'Purchase';
    product: any;
    order?: any;
    buyer?: any;
    eventId?: string;
    eventSourceUrl?: string;
    userAgent?: string;
    ip?: string;
    fbp?: string;
    fbc?: string;
    value?: number;
    testEventCode?: string;
};

function hash(value?: string | null) {
    if (!value) return undefined;
    const normalized = value.trim().toLowerCase();
    if (!normalized) return undefined;
    return createHash('sha256').update(normalized).digest('hex');
}

function cleanDigits(value?: string | null) {
    return value ? value.replace(/\D/g, '') : undefined;
}

function getPixelCredentials(product: any) {
    const pixelId = String(product?.facebook_pixel_id || '').replace(/\D/g, '');
    const accessToken = String(product?.facebook_api_token || '').trim();
    if (!pixelId || !accessToken) return null;
    return { pixelId, accessToken };
}

export async function sendFacebookEvent(input: FacebookEventInput) {
    const credentials = getPixelCredentials(input.product);
    if (!credentials) {
        return { skipped: true, reason: 'missing_credentials' };
    }

    const amountCents = Number(input.order?.amount || 0);
    const value = input.value ?? (amountCents > 0 ? amountCents / 100 : Number(input.product?.price || 0));
    const buyer = input.buyer || input.order || {};
    const eventId = input.eventId || input.order?.facebook_event_id || input.order?.id;

    const userData: Record<string, any> = {
        em: hash(buyer.email || buyer.buyer_email),
        ph: hash(cleanDigits(buyer.phone || buyer.buyer_phone)),
        fn: hash((buyer.name || buyer.buyer_name || '').split(' ')[0]),
        ln: hash((buyer.name || buyer.buyer_name || '').split(' ').slice(1).join(' ')),
        fbp: input.fbp || input.order?.facebook_fbp,
        fbc: input.fbc || input.order?.facebook_fbc,
        client_ip_address: input.ip || input.order?.client_ip,
        client_user_agent: input.userAgent || input.order?.client_user_agent
    };

    Object.keys(userData).forEach(key => {
        if (!userData[key]) delete userData[key];
    });

    const eventData: any = {
        event_name: input.eventName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        event_source_url: input.eventSourceUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'https://goupay.com.br'}/checkout/${input.product?.id}`,
        event_id: eventId,
        user_data: userData,
        custom_data: {
            value: Number.isFinite(value) ? Number(value.toFixed(2)) : 0,
            currency: 'BRL',
            content_name: input.product?.name,
            content_ids: [input.product?.id].filter(Boolean),
            content_type: 'product',
            num_items: 1
        }
    };

    if (!eventData.event_id) delete eventData.event_id;
    const payload: any = { data: [eventData] };
    if (input.testEventCode) payload.test_event_code = input.testEventCode;

    const url = `https://graph.facebook.com/v19.0/${credentials.pixelId}/events?access_token=${encodeURIComponent(credentials.accessToken)}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        return {
            ok: false,
            status: response.status,
            error: data?.error?.message || 'Facebook API error',
            details: data
        };
    }

    return { ok: true, status: response.status, data };
}

export function normalizeFacebookSettings(input: { facebook_pixel_id?: any; facebook_api_token?: any }) {
    return {
        facebook_pixel_id: input.facebook_pixel_id !== undefined
            ? String(input.facebook_pixel_id || '').replace(/\D/g, '') || null
            : undefined,
        facebook_api_token: input.facebook_api_token !== undefined
            ? String(input.facebook_api_token || '').trim() || null
            : undefined
    };
}
