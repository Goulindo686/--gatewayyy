export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';

export async function POST(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Nao autorizado', 401);

    const body = await req.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return jsonError('Subscription invalida', 400);
    }

    const { error } = await supabase
        .from('push_subscriptions')
        .upsert(
            {
                user_id: auth.user.id,
                endpoint,
                p256dh: keys.p256dh,
                auth: keys.auth,
            },
            { onConflict: 'user_id,endpoint' }
        );

    if (error) {
        console.error('[Push Subscribe] Erro ao salvar subscription:', error);
        return jsonError('Erro ao salvar subscription', 500);
    }

    return jsonSuccess({ subscribed: true });
}

export async function DELETE(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Nao autorizado', 401);

    const body = await req.json();
    const { endpoint } = body;

    if (endpoint) {
        await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', auth.user.id)
            .eq('endpoint', endpoint);
    } else {
        // Remove todas as subscriptions do usuario
        await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', auth.user.id);
    }

    return jsonSuccess({ unsubscribed: true });
}
