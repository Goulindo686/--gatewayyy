export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { getOrCreateSupportThreadForBuyer } from '@/lib/support';

export async function POST(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Entre na sua conta GouPay para abrir o suporte.', 401);

    try {
        const body = await req.json();
        const orderId = String(body.order_id || '').trim();
        if (!/^[0-9a-f-]{36}$/i.test(orderId)) {
            return jsonError('Pedido invalido.', 400);
        }

        const result = await getOrCreateSupportThreadForBuyer(orderId, auth.user);
        if (!('thread' in result)) return jsonError(result.error || 'Pedido invalido.', result.status || 400);

        return jsonSuccess({
            thread: {
                id: result.thread.id,
                subject: result.thread.subject,
                status: result.thread.status,
                store_slug: result.thread.store_slug,
                seller_name: result.seller?.store_name || result.seller?.name || 'Vendedor',
                product_name: result.product?.name || null,
            },
        });
    } catch (error) {
        console.error('[SUPPORT] Authenticated buyer thread creation failed:', error);
        return jsonError('Nao foi possivel abrir o suporte agora.', 500);
    }
}
