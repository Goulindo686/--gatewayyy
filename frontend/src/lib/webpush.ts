import webpush from 'web-push';
import { supabase } from '@/lib/db';

// Configura VAPID uma unica vez ao importar o modulo
if (
    process.env.VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT
) {
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT,
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

export interface PushPayload {
    title: string;
    body: string;
    url?: string;
    icon?: string;
    tag?: string;
    type?: string;
    sound?: string;
    timestamp?: number;
}

export interface PushDeliveryReport {
    configured: boolean;
    subscriptions: number;
    delivered: number;
    failed: number;
    removed: number;
    reason?: 'vapid_not_configured' | 'subscription_lookup_failed' | 'no_subscriptions' | 'delivery_failed';
}

/**
 * Envia Web Push para todos os dispositivos registrados de um usuario.
 * Subscriptions invalidas (expiradas/revogadas) sao removidas automaticamente.
 */
export async function sendPushNotification(userId: string, payload: PushPayload): Promise<PushDeliveryReport> {
    if (
        !process.env.VAPID_PUBLIC_KEY
        || !process.env.VAPID_PRIVATE_KEY
        || !process.env.VAPID_SUBJECT
    ) {
        console.warn('[WebPush] Configuracao VAPID incompleta; notificacao push ignorada.');
        return {
            configured: false,
            subscriptions: 0,
            delivered: 0,
            failed: 0,
            removed: 0,
            reason: 'vapid_not_configured',
        };
    }

    const { data: subscriptions, error } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('user_id', userId);

    if (error) {
        console.error('[WebPush] Erro ao consultar dispositivos:', error.message);
        return {
            configured: true,
            subscriptions: 0,
            delivered: 0,
            failed: 0,
            removed: 0,
            reason: 'subscription_lookup_failed',
        };
    }

    if (!subscriptions || subscriptions.length === 0) {
        return {
            configured: true,
            subscriptions: 0,
            delivered: 0,
            failed: 0,
            removed: 0,
            reason: 'no_subscriptions',
        };
    }

    const notification = JSON.stringify(payload);

    const results = await Promise.all(
        subscriptions.map(async (sub) => {
            try {
                await webpush.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: { p256dh: sub.p256dh, auth: sub.auth },
                    },
                    notification,
                    {
                        TTL: 60 * 60,
                        urgency: ['approved_sale', 'affiliate_sale', 'affiliate_commission'].includes(payload.type || '')
                            ? 'high'
                            : 'normal',
                    }
                );
                return 'delivered' as const;
            } catch (err: unknown) {
                const pushError = err as { statusCode?: number; message?: string };
                // 410 Gone = subscription expirada/cancelada pelo usuario — remover
                if (pushError.statusCode === 410 || pushError.statusCode === 404) {
                    await supabase.from('push_subscriptions').delete().eq('id', sub.id);
                    return 'removed' as const;
                } else {
                    console.error(
                        '[WebPush] Falha de entrega:',
                        pushError.statusCode || 'sem_status',
                        pushError.message || 'erro desconhecido',
                    );
                    return 'failed' as const;
                }
            }
        })
    );

    const delivered = results.filter((result) => result === 'delivered').length;
    const failed = results.filter((result) => result === 'failed').length;
    const removed = results.filter((result) => result === 'removed').length;
    if (failed > 0) {
        console.warn(`[WebPush] ${failed} de ${subscriptions.length} notificacoes falharam.`);
    }

    return {
        configured: true,
        subscriptions: subscriptions.length,
        delivered,
        failed,
        removed,
        ...(delivered === 0 ? { reason: 'delivery_failed' as const } : {}),
    };
}
