export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';

// PUT /api/order-bumps/[product_id]/bumps/[bump_id] — atualiza bump
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ product_id: string; bump_id: string }> }
) {
    const { product_id, bump_id } = await params;
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);

    // Verifica que o bump pertence ao produto e ao usuário
    const { data: existing } = await supabase
        .from('order_bumps')
        .select('id')
        .eq('id', bump_id)
        .eq('product_id', product_id)
        .eq('user_id', auth.user.id)
        .single();

    if (!existing) return jsonError('Order bump não encontrado', 404);

    const body = await req.json();
    const updates: any = { updated_at: new Date().toISOString() };

    if (body.bump_product_id !== undefined) updates.bump_product_id = body.bump_product_id;
    if (body.bump_plan_id !== undefined) updates.bump_plan_id = body.bump_plan_id || null;
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.call_to_action !== undefined) updates.call_to_action = body.call_to_action;
    if (body.custom_price !== undefined) {
        updates.custom_price = body.custom_price ? Math.round(parseFloat(body.custom_price) * 100) : null;
    }
    if (body.badge_text !== undefined) updates.badge_text = body.badge_text;
    if (body.badge_color !== undefined) updates.badge_color = body.badge_color;
    if (body.sort_order !== undefined) updates.sort_order = body.sort_order;
    if (body.is_active !== undefined) updates.is_active = body.is_active;

    const { data, error } = await supabase
        .from('order_bumps')
        .update(updates)
        .eq('id', bump_id)
        .select(`
            *,
            bump_product:bump_product_id (
                id, name, price, image_url,
                plans:product_plans (id, name, price, sort_order)
            ),
            bump_plan:bump_plan_id (id, name, price)
        `)
        .single();

    if (error) return jsonError('Erro ao atualizar order bump: ' + error.message, 500);

    return jsonSuccess({ order_bump: data, message: 'Order bump atualizado com sucesso!' });
}

// DELETE /api/order-bumps/[product_id]/bumps/[bump_id] — remove bump
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ product_id: string; bump_id: string }> }
) {
    const { product_id, bump_id } = await params;
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);

    const { error } = await supabase
        .from('order_bumps')
        .delete()
        .eq('id', bump_id)
        .eq('product_id', product_id)
        .eq('user_id', auth.user.id);

    if (error) return jsonError('Erro ao remover order bump: ' + error.message, 500);

    return jsonSuccess({ message: 'Order bump removido com sucesso!' });
}
