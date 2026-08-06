export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { supabase } from '@/lib/db';
import {
    addSupportMessage,
    listSupportMessages,
    sanitizeSupportMessage,
    type SupportThreadStatus,
} from '@/lib/support';

type RouteContext = { params: Promise<{ id: string }> };

async function loadSellerThread(threadId: string, sellerId: string) {
    const { data, error } = await supabase
        .from('support_threads')
        .select('*')
        .eq('id', threadId)
        .eq('seller_id', sellerId)
        .maybeSingle();
    if (error) throw error;
    return data;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Nao autorizado', 401);

    try {
        const { id } = await params;
        const thread = await loadSellerThread(id, auth.user.id);
        if (!thread) return jsonError('Atendimento nao encontrado.', 404);

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

        return jsonSuccess({ thread: { ...thread, product, order }, messages });
    } catch (error) {
        console.error('[SUPPORT] Seller thread load failed:', error);
        return jsonError('Nao foi possivel carregar o atendimento.', 500);
    }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Nao autorizado', 401);

    try {
        const { id } = await params;
        const thread = await loadSellerThread(id, auth.user.id);
        if (!thread) return jsonError('Atendimento nao encontrado.', 404);
        if (thread.status === 'archived') return jsonError('Este atendimento foi arquivado.', 403);

        const body = await req.json();
        const result = await addSupportMessage({
            thread,
            senderType: auth.user.role === 'admin' ? 'admin' : 'seller',
            senderUserId: auth.user.id,
            senderName: auth.user.store_name || auth.user.name || 'Vendedor',
            body: sanitizeSupportMessage(body.message),
        });
        if (!('message' in result)) return jsonError(result.error || 'Mensagem invalida.', result.status || 400);

        return jsonSuccess({ message: result.message }, 201);
    } catch (error) {
        console.error('[SUPPORT] Seller message failed:', error);
        return jsonError('Nao foi possivel enviar a mensagem.', 500);
    }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Nao autorizado', 401);

    try {
        const { id } = await params;
        const thread = await loadSellerThread(id, auth.user.id);
        if (!thread) return jsonError('Atendimento nao encontrado.', 404);

        const body = await req.json();
        const status = String(body.status || '') as SupportThreadStatus;
        const allowed = ['open', 'pending_seller', 'pending_buyer', 'resolved', 'archived'];
        if (!allowed.includes(status)) return jsonError('Status invalido.', 400);

        const { data, error } = await supabase
            .from('support_threads')
            .update({
                status,
                seller_last_read_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', thread.id)
            .select('*')
            .single();
        if (error) throw error;

        return jsonSuccess({ thread: data });
    } catch (error) {
        console.error('[SUPPORT] Seller thread update failed:', error);
        return jsonError('Nao foi possivel atualizar o atendimento.', 500);
    }
}
