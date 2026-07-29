import 'server-only';

import { supabase } from '@/lib/db';
import { normalizeWebhookUrls, sendWebhookPayload } from '@/lib/webhooks';

const MAX_DELIVERY_ATTEMPTS = 12;

type OrderWebhookRecord = {
    id: string;
    seller_id: string;
    amount: number;
    amount_display?: string | null;
    description?: string | null;
    payment_method?: string | null;
    buyer_name?: string | null;
    buyer_email?: string | null;
    buyer_cpf?: string | null;
    buyer_phone?: string | null;
    created_at?: string | null;
};

type ClaimedDelivery = {
    id: string;
    url: string;
    payload: unknown;
    attempt_count: number;
};

export type OutgoingWebhookDeliverySummary = {
    claimed: number;
    delivered: number;
    failed: number;
};

function eventName(status: string) {
    const normalized = String(status || '').trim().toLowerCase();
    return normalized.startsWith('order.') ? normalized : `order.${normalized}`;
}

function buildOrderWebhookPayload(order: OrderWebhookRecord, status: string) {
    const normalizedStatus = String(status || '').replace(/^order\./, '');
    return {
        event: eventName(normalizedStatus),
        data: {
            id: order.id,
            transaction_id: order.id,
            status: normalizedStatus,
            amount: order.amount,
            amount_display: order.amount_display || (Number(order.amount || 0) / 100).toFixed(2),
            description: order.description || 'Venda via API',
            payment_method: order.payment_method,
            customer: {
                name: order.buyer_name,
                email: order.buyer_email,
                cpf: order.buyer_cpf,
                phone: order.buyer_phone,
            },
            created_at: order.created_at,
            updated_at: new Date().toISOString(),
        },
    };
}

export async function enqueueOrderWebhookDeliveries(
    order: OrderWebhookRecord,
    status: string,
) {
    const { data: seller, error: sellerError } = await supabase
        .from('users')
        .select('webhook_url, webhook_urls')
        .eq('id', order.seller_id)
        .single();
    if (sellerError) throw sellerError;

    const webhookUrls = normalizeWebhookUrls(seller?.webhook_urls, seller?.webhook_url);
    if (webhookUrls.length === 0) {
        return { eventType: eventName(status), queued: 0 };
    }

    const eventType = eventName(status);
    const payload = buildOrderWebhookPayload(order, status);
    const rows = webhookUrls.map((url) => ({
        user_id: order.seller_id,
        order_id: order.id,
        event_type: eventType,
        url,
        payload,
        status: 'pending',
        next_attempt_at: new Date().toISOString(),
    }));

    const { error } = await supabase
        .from('outgoing_webhook_deliveries')
        .upsert(rows, {
            onConflict: 'order_id,event_type,url',
            ignoreDuplicates: true,
        });
    if (error) throw error;

    return { eventType, queued: rows.length };
}

function nextAttemptAt(attemptCount: number) {
    const exponent = Math.max(0, Math.min(10, attemptCount - 1));
    const delaySeconds = Math.min(6 * 60 * 60, 30 * (2 ** exponent));
    return new Date(Date.now() + delaySeconds * 1000).toISOString();
}

function errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error || 'Falha desconhecida');
}

export async function processOutgoingWebhookDeliveries(options: {
    limit?: number;
    orderId?: string;
    eventType?: string;
} = {}): Promise<OutgoingWebhookDeliverySummary> {
    const { data, error } = await supabase.rpc('claim_outgoing_webhook_deliveries', {
        p_limit: Math.max(1, Math.min(options.limit || 25, 100)),
        p_order_id: options.orderId || null,
        p_event_type: options.eventType || null,
    });
    if (error) throw error;

    const deliveries = (data || []) as ClaimedDelivery[];
    const summary: OutgoingWebhookDeliverySummary = {
        claimed: deliveries.length,
        delivered: 0,
        failed: 0,
    };

    const queue = [...deliveries];
    const workers = Array.from({ length: Math.min(5, queue.length) }, async () => {
        while (queue.length > 0) {
            const delivery = queue.shift();
            if (!delivery) break;

            try {
                const result = await sendWebhookPayload(delivery.url, delivery.payload, {
                    timeoutMs: 10_000,
                });
                if (!result.ok) {
                    throw new Error(`HTTP ${result.status}: ${result.error || 'resposta rejeitada'}`);
                }

                const { error: updateError } = await supabase
                    .from('outgoing_webhook_deliveries')
                    .update({
                        status: 'delivered',
                        delivered_at: new Date().toISOString(),
                        next_attempt_at: null,
                        last_http_status: result.status,
                        last_error: null,
                    })
                    .eq('id', delivery.id)
                    .eq('status', 'processing');
                if (updateError) throw updateError;
                summary.delivered++;
            } catch (deliveryError) {
                const attemptsExhausted = delivery.attempt_count >= MAX_DELIVERY_ATTEMPTS;
                const { error: updateError } = await supabase
                    .from('outgoing_webhook_deliveries')
                    .update({
                        status: 'failed',
                        next_attempt_at: attemptsExhausted
                            ? null
                            : nextAttemptAt(delivery.attempt_count),
                        last_error: errorMessage(deliveryError).slice(0, 1000),
                    })
                    .eq('id', delivery.id)
                    .eq('status', 'processing');
                if (updateError) {
                    console.error('[OUTGOING WEBHOOK] Failed to persist delivery error:', updateError);
                }
                summary.failed++;
            }
        }
    });
    await Promise.all(workers);

    return summary;
}

export async function enqueueAndProcessOrderWebhook(
    order: OrderWebhookRecord,
    status: string,
) {
    const queued = await enqueueOrderWebhookDeliveries(order, status);
    if (queued.queued === 0) {
        return {
            ...queued,
            delivery: { claimed: 0, delivered: 0, failed: 0 },
        };
    }

    const delivery = await processOutgoingWebhookDeliveries({
        orderId: order.id,
        eventType: queued.eventType,
        limit: queued.queued,
    });
    return { ...queued, delivery };
}
