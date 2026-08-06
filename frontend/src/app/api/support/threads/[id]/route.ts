export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { supabase } from '@/lib/db';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import {
    addSupportMessage,
    listSupportMessages,
    sanitizeSupportMessage,
    withSupportResponseHeaders,
    type SupportThreadStatus,
} from '@/lib/support';

type RouteContext = { params: Promise<{ id: string }> };

const SELLER_THREAD_FIELDS = `
    id,
    seller_id,
    order_id,
    product_id,
    store_slug,
    buyer_name,
    buyer_email,
    buyer_phone,
    subject,
    status,
    priority,
    source,
    seller_last_read_at,
    buyer_last_read_at,
    last_message_at,
    last_message_preview,
    created_at,
    updated_at
`;

function protectedError(message: string, status = 400) {
    return withSupportResponseHeaders(jsonError(message, status));
}

function protectedSuccess(data: unknown, status = 200) {
    return withSupportResponseHeaders(jsonSuccess(data, status));
}

async function loadSellerThread(threadId: string, sellerId: string) {
    const { data, error } = await supabase
        .from('support_threads')
        .select(SELLER_THREAD_FIELDS)
        .eq('id', threadId)
        .eq('seller_id', sellerId)
        .maybeSingle();
    if (error) throw error;
    return data;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
    const auth = await getAuthUser(req);
    if (!auth) return protectedError('Nao autorizado', 401);

    try {
        const { id } = await params;
        const thread = await loadSellerThread(id, auth.user.id);
        if (!thread) return protectedError('Atendimento nao encontrado.', 404);

        const [{ data: product }, { data: order }, messages] = await Promise.all([
            thread.product_id
                ? supabase.from('products').select('id, name, image_url').eq('id', thread.product_id).maybeSingle()
                : Promise.resolve({ data: null }),
            thread.order_id
                ? supabase.from('orders').select('id, amount_display, status, created_at').eq('id', thread.order_id).maybeSingle()
                : Promise.resolve({ data: null }),
            listSupportMessages(thread.id),
        ]);

        await supabase
            .from('support_threads')
            .update({ seller_last_read_at: new Date().toISOString() })
            .eq('id', thread.id);

        return protectedSuccess({ thread: { ...thread, product, order }, messages });
    } catch (error) {
        console.error('[SUPPORT] Seller thread load failed:', error);
        return protectedError('Nao foi possivel carregar o atendimento.', 500);
    }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
    const auth = await getAuthUser(req);
    if (!auth) return protectedError('Nao autorizado', 401);

    try {
        const { id } = await params;
        const thread = await loadSellerThread(id, auth.user.id);
        if (!thread) return protectedError('Atendimento nao encontrado.', 404);
        if (thread.status === 'archived') return protectedError('Este atendimento foi arquivado.', 403);

        const rateLimit = await checkRateLimit({
            key: `support:message:${auth.user.id}:${thread.id}`,
            limit: 30,
            windowSecs: 60,
            failOpen: false,
        });
        if (!rateLimit.allowed) {
            return withSupportResponseHeaders(rateLimitResponse(rateLimit.resetAt));
        }

        const body = await req.json();
        const result = await addSupportMessage({
            thread,
            senderType: auth.user.role === 'admin' ? 'admin' : 'seller',
            senderUserId: auth.user.id,
            senderName: auth.user.store_name || auth.user.name || 'Vendedor',
            body: sanitizeSupportMessage(body.message),
        });
        if (!('message' in result)) return protectedError(result.error || 'Mensagem invalida.', result.status || 400);

        return protectedSuccess({ message: result.message }, 201);
    } catch (error) {
        console.error('[SUPPORT] Seller message failed:', error);
        return protectedError('Nao foi possivel enviar a mensagem.', 500);
    }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
    const auth = await getAuthUser(req);
    if (!auth) return protectedError('Nao autorizado', 401);

    try {
        const { id } = await params;
        const thread = await loadSellerThread(id, auth.user.id);
        if (!thread) return protectedError('Atendimento nao encontrado.', 404);

        const body = await req.json();
        const status = String(body.status || '') as SupportThreadStatus;
        const allowed = ['open', 'pending_seller', 'pending_buyer', 'resolved', 'archived'];
        if (!allowed.includes(status)) return protectedError('Status invalido.', 400);

        const { data, error } = await supabase
            .from('support_threads')
            .update({
                status,
                seller_last_read_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', thread.id)
            .select(SELLER_THREAD_FIELDS)
            .single();
        if (error) throw error;

        return protectedSuccess({ thread: data });
    } catch (error) {
        console.error('[SUPPORT] Seller thread update failed:', error);
        return protectedError('Nao foi possivel atualizar o atendimento.', 500);
    }
}
