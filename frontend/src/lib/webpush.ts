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
}

/**
 * Envia Web Push para todos os dispositivos registrados de um usuario.
 * Subscriptions invalidas (expiradas/revogadas) sao removidas automaticamente.
 */
export async function sendPushNotification(userId: string, payload: PushPayload): Promise<void> {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
        console.warn('[WebPush] VAPID keys nao configuradas — notificacao push ignorada.');
        return;
    }

    const { data: subscriptions, error } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('user_id', userId);

    if (error || !subscriptions || subscriptions.length === 0) return;

    const notification = JSON.stringify(payload);

    const results = await Promise.allSettled(
        subscriptions.map(async (sub) => {
            try {
                await webpush.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: { p256dh: sub.p256dh, auth: sub.auth },
                    },
                    notification
                );
            } catch (err: any) {
                // 410 Gone = subscription expirada/cancelada pelo usuario — remover
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await supabase.from('push_subscriptions').delete().eq('id', sub.id);
                } else {
                    console.error('[WebPush] Erro ao enviar para', sub.endpoint, err.message);
                }
            }
        })
    );

    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) {
        console.warn(`[WebPush] ${failed} de ${subscriptions.length} notificacoes falharam.`);
    }
}
