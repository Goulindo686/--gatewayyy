export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';

// GET /api/order-bumps/[product_id]/bumps — lista bumps do produto (autenticado)
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ product_id: string }> }
) {
    const { product_id } = await params;
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);

    // Verifica que o produto pertence ao usuário
    const { data: product } = await supabase
        .from('products')
        .select('id')
        .eq('id', product_id)
        .eq('user_id', auth.user.id)
        .single();

    if (!product) return jsonError('Produto não encontrado', 404);

    const { data, error } = await supabase
        .from('order_bumps')
        .select(`
            *,
            bump_product:bump_product_id (
                id, name, price, image_url,
                plans:product_plans (id, name, price, sort_order)
            ),
            bump_plan:bump_plan_id (id, name, price)
        `)
        .eq('product_id', product_id)
        .order('sort_order', { ascending: true });

    if (error) return jsonError('Erro ao buscar order bumps: ' + error.message, 500);

    return jsonSuccess({ order_bumps: data || [] });
}

// POST /api/order-bumps/[product_id]/bumps — cria novo bump
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ product_id: string }> }
) {
    const { product_id } = await params;
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);

    // Verifica que o produto pertence ao usuário
    const { data: product } = await supabase
        .from('products')
        .select('id')
        .eq('id', product_id)
        .eq('user_id', auth.user.id)
        .single();

    if (!product) return jsonError('Produto não encontrado', 404);

    const body = await req.json();
    const {
        bump_product_id,
        bump_plan_id,
        title,
        description,
        call_to_action,
        custom_price,
        badge_text,
        badge_color,
        sort_order,
    } = body;

    if (!bump_product_id) return jsonError('Produto do bump é obrigatório');

    // Verifica que o produto do bump pertence ao mesmo vendedor
    const { data: bumpProduct } = await supabase
        .from('products')
        .select('id, price')
        .eq('id', bump_product_id)
        .eq('user_id', auth.user.id)
        .single();

    if (!bumpProduct) return jsonError('Produto do bump não encontrado ou não pertence a você', 404);

    // Valida plano se informado
    if (bump_plan_id) {
        const { data: plan } = await supabase
            .from('product_plans')
            .select('id')
            .eq('id', bump_plan_id)
            .eq('product_id', bump_product_id)
            .single();

        if (!plan) return jsonError('Plano não encontrado para este produto');
    }

    const { data, error } = await supabase
        .from('order_bumps')
        .insert({
            product_id,
            user_id: auth.user.id,
            bump_product_id,
            bump_plan_id: bump_plan_id || null,
            title: title || 'Oferta Especial',
            description: description || null,
            call_to_action: call_to_action || 'Sim! Quero adicionar esta oferta',
            custom_price: custom_price ? Math.round(parseFloat(custom_price) * 100) : null,
            badge_text: badge_text || 'OFERTA EXCLUSIVA',
            badge_color: badge_color || '#E17055',
            sort_order: sort_order ?? 0,
            is_active: true,
        })
        .select(`
            *,
            bump_product:bump_product_id (
                id, name, price, image_url,
                plans:product_plans (id, name, price, sort_order)
            ),
            bump_plan:bump_plan_id (id, name, price)
        `)
        .single();

    if (error) return jsonError('Erro ao criar order bump: ' + error.message, 500);

    return jsonSuccess({ order_bump: data, message: 'Order bump criado com sucesso!' }, 201);
}
