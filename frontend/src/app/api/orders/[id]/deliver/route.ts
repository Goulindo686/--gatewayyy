export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';

// PATCH — marca ou desmarca uma venda como entregue
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);

    try {
        const { delivered, note } = await req.json();

        // Verifica se o pedido pertence ao vendedor
        const { data: order } = await supabase
            .from('orders')
            .select('id, seller_id')
            .eq('id', id)
            .eq('seller_id', auth.user.id)
            .single();

        if (!order) return jsonError('Pedido não encontrado', 404);

        const { data: updated, error } = await supabase
            .from('orders')
            .update({
                delivered: !!delivered,
                delivered_at: delivered ? new Date().toISOString() : null,
                delivered_note: note || null,
            })
            .eq('id', id)
            .select()
            .single();

        if (error) return jsonError('Erro ao atualizar pedido: ' + error.message);

        return jsonSuccess({ order: updated });
    } catch (err: any) {
        return jsonError('Erro interno', 500);
    }
}
