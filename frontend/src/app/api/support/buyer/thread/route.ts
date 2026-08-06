export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { getOrCreateSupportThreadForBuyer, withSupportResponseHeaders } from '@/lib/support';

function protectedError(message: string, status = 400) {
    return withSupportResponseHeaders(jsonError(message, status));
}

export async function POST(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return protectedError('Entre na sua conta GouPay para abrir o suporte.', 401);

    try {
        const rateLimit = await checkRateLimit({
            key: `support:thread:${auth.user.id}`,
            limit: 60,
            windowSecs: 3600,
            failOpen: false,
        });
        if (!rateLimit.allowed) {
            return withSupportResponseHeaders(rateLimitResponse(rateLimit.resetAt));
        }

        const body = await req.json();
        const orderId = String(body.order_id || '').trim();
        if (!/^[0-9a-f-]{36}$/i.test(orderId)) {
            return protectedError('Pedido invalido.', 400);
        }

        const result = await getOrCreateSupportThreadForBuyer(orderId, auth.user);
        if (!('thread' in result)) return protectedError(result.error || 'Pedido invalido.', result.status || 400);

        return withSupportResponseHeaders(jsonSuccess({
            thread: {
                id: result.thread.id,
                subject: result.thread.subject,
                status: result.thread.status,
                store_slug: result.thread.store_slug,
                seller_name: result.seller?.store_name || result.seller?.name || 'Vendedor',
                product_name: result.product?.name || null,
            },
        }));
    } catch (error) {
        console.error('[SUPPORT] Authenticated buyer thread creation failed:', error);
        return protectedError('Nao foi possivel abrir o suporte agora.', 500);
    }
}
