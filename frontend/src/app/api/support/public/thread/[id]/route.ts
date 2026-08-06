export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { jsonError, jsonSuccess } from '@/lib/auth';
import {
    addSupportMessage,
    listSupportMessages,
    sanitizeSupportMessage,
    validateBuyerThreadAccess,
} from '@/lib/support';
import { supabase } from '@/lib/db';

type RouteContext = { params: Promise<{ id: string }> };

function tokenFromRequest(req: NextRequest) {
    return req.nextUrl.searchParams.get('token') || req.headers.get('x-support-token') || '';
}

export async function GET(req: NextRequest, { params }: RouteContext) {
    try {
        const { id } = await params;
        const thread = await validateBuyerThreadAccess(id, tokenFromRequest(req));
        if (!thread) return jsonError('Atendimento nao encontrado.', 404);

        const [{ data: seller }, { data: product }, messages] = await Promise.all([
            supabase
                .from('users')
                .select('store_name, store_slug, name')
                .eq('id', thread.seller_id)
                .maybeSingle(),
            thread.product_id
                ? supabase.from('products').select('name').eq('id', thread.product_id).maybeSingle()
                : Promise.resolve({ data: null }),
            listSupportMessages(thread.id),
        ]);

        await supabase
            .from('support_threads')
            .update({ buyer_last_read_at: new Date().toISOString() })
            .eq('id', thread.id);

        return jsonSuccess({
            thread: {
                id: thread.id,
                subject: thread.subject,
                status: thread.status,
                order_id: thread.order_id,
                store_slug: thread.store_slug || seller?.store_slug || null,
                seller_name: seller?.store_name || seller?.name || 'Vendedor',
                product_name: product?.name || null,
                created_at: thread.created_at,
                updated_at: thread.updated_at,
            },
            messages,
        });
    } catch (error) {
        console.error('[SUPPORT] Buyer thread load failed:', error);
        return jsonError('Nao foi possivel carregar o atendimento.', 500);
    }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
    try {
        const { id } = await params;
        const thread = await validateBuyerThreadAccess(id, tokenFromRequest(req));
        if (!thread) return jsonError('Atendimento nao encontrado.', 404);
        if (thread.status === 'archived') return jsonError('Este atendimento foi arquivado.', 403);

        const body = await req.json();
        const result = await addSupportMessage({
            thread,
            senderType: 'buyer',
            senderName: thread.buyer_name || 'Cliente',
            body: sanitizeSupportMessage(body.message),
        });
        if (!('message' in result)) return jsonError(result.error || 'Mensagem invalida.', result.status || 400);

        return jsonSuccess({ message: result.message }, 201);
    } catch (error) {
        console.error('[SUPPORT] Buyer message failed:', error);
        return jsonError('Nao foi possivel enviar a mensagem.', 500);
    }
}
