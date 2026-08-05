export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { supabase } from '@/lib/db';
import {
    normalizeHttpUrl,
    normalizeSafeText,
    requestBodyTooLarge,
    SecurityValidationError,
} from '@/lib/request-security';
import {
    normalizeStoreDescriptionFormat,
    sanitizeStoreProductDescription,
} from '@/lib/store-product-content';

const MAX_BODY_BYTES = 80_000;

function normalizePlans(value: unknown): Array<{ id: string; name: string; price: number; sort_order: number }> {
    if (!Array.isArray(value) || value.length === 0) {
        throw new SecurityValidationError('Informe ao menos um plano de preço válido');
    }
    if (value.length > 50) throw new SecurityValidationError('Limite de planos excedido');
    return value.map((plan: any, index) => {
        const name = normalizeSafeText(String(plan?.name || ''), {
            field: 'Nome do plano',
            maxLength: 120,
            required: true,
        }) as string;
        const amount = Number.parseFloat(String(plan?.price));
        const price = Math.round(amount * 100);
        if (!Number.isFinite(amount) || price < 1 || price > 100_000_000) {
            throw new SecurityValidationError('Preço de plano inválido');
        }
        return { id: uuidv4(), name, price, sort_order: index };
    });
}

async function normalizeCategory(userId: string, value: unknown): Promise<string | null> {
    if (value === undefined || value === null || value === '') return null;
    const categoryId = String(value);
    if (!/^[0-9a-f-]{36}$/i.test(categoryId)) throw new SecurityValidationError('Categoria inválida');
    const { data, error } = await supabase
        .from('store_categories')
        .select('id')
        .eq('id', categoryId)
        .eq('user_id', userId)
        .limit(1);
    if (error || !data?.[0]) throw new SecurityValidationError('Categoria não encontrada');
    return categoryId;
}

function formatProduct(product: any, plans: any[]) {
    return {
        ...product,
        price: Number(product.price || 0) / 100,
        price_display: (Number(product.price || 0) / 100).toFixed(2),
        plans: plans.map(plan => ({
            ...plan,
            price_display: (Number(plan.price || 0) / 100).toFixed(2),
        })),
    };
}

async function getOwnedStoreProduct(userId: string, id: string) {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .eq('sales_channel', 'store')
        .limit(1);
    return { product: data?.[0] || null, error };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);
    const { id } = await params;
    const { product, error } = await getOwnedStoreProduct(auth.user.id, id);
    if (error) return jsonError('Erro ao carregar produto da loja', 500);
    if (!product) return jsonError('Produto da loja não encontrado', 404);

    const { data: plans, error: plansError } = await supabase
        .from('product_plans')
        .select('id, product_id, name, price, sort_order')
        .eq('product_id', id)
        .order('sort_order', { ascending: true });
    if (plansError) return jsonError('Erro ao carregar planos do produto', 500);

    const response = jsonSuccess({ product: formatProduct(product, plans || []) });
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);
    if (requestBodyTooLarge(req, MAX_BODY_BYTES)) return jsonError('Conteúdo muito grande', 413);
    const { id } = await params;

    try {
        const { product: existing, error: existingError } = await getOwnedStoreProduct(auth.user.id, id);
        if (existingError) return jsonError('Erro ao validar produto da loja', 500);
        if (!existing) return jsonError('Produto da loja não encontrado', 404);

        const body = await req.json();
        const updates: Record<string, unknown> = {};
        if (body.name !== undefined) {
            updates.name = normalizeSafeText(body.name, { field: 'Nome', maxLength: 200, required: true });
        }
        if (body.store_description_format !== undefined || body.description !== undefined) {
            const format = normalizeStoreDescriptionFormat(
                body.store_description_format ?? existing.store_description_format,
            );
            updates.store_description_format = format;
            updates.description = sanitizeStoreProductDescription(
                body.description ?? existing.description,
                format,
            );
        }
        if (body.image_url !== undefined) {
            updates.image_url = normalizeHttpUrl(body.image_url, { field: 'Imagem', maxLength: 2_048 });
        }
        if (body.status !== undefined) updates.status = body.status === 'inactive' ? 'inactive' : 'active';
        if (body.show_in_store !== undefined) updates.show_in_store = Boolean(body.show_in_store);
        if (body.store_category_id !== undefined) {
            updates.store_category_id = await normalizeCategory(auth.user.id, body.store_category_id);
        }

        let replacementPlans: ReturnType<typeof normalizePlans> | null = null;
        if (body.plans !== undefined) {
            replacementPlans = normalizePlans(body.plans);
            updates.price = replacementPlans[0].price;
            updates.price_display = (replacementPlans[0].price / 100).toFixed(2);
        }

        const { data: updatedRows, error: updateError } = await supabase
            .from('products')
            .update(updates)
            .eq('id', id)
            .eq('user_id', auth.user.id)
            .eq('sales_channel', 'store')
            .select();
        if (updateError || !updatedRows?.[0]) {
            console.error('Store product update error:', updateError);
            return jsonError('Erro ao atualizar produto da loja', 500);
        }

        if (replacementPlans) {
            const { data: oldPlans, error: oldPlansError } = await supabase
                .from('product_plans')
                .select('id')
                .eq('product_id', id);
            if (oldPlansError) return jsonError('Erro ao validar planos existentes', 500);

            const { error: insertError } = await supabase.from('product_plans').insert(
                replacementPlans.map(plan => ({ ...plan, product_id: id })),
            );
            if (insertError) {
                console.error('Store product replacement plans insert error:', insertError);
                return jsonError('Produto salvo, mas não foi possível atualizar os planos', 500);
            }

            const oldIds = (oldPlans || []).map(plan => plan.id);
            if (oldIds.length > 0) {
                const { error: deleteError } = await supabase.from('product_plans').delete().in('id', oldIds);
                if (deleteError) {
                    console.error('Store product old plans cleanup error:', deleteError);
                    await supabase.from('product_plans').delete().in('id', replacementPlans.map(plan => plan.id));
                    return jsonError('Produto salvo, mas não foi possível substituir os planos', 500);
                }
            }
        }

        const { data: plans } = await supabase
            .from('product_plans')
            .select('id, product_id, name, price, sort_order')
            .eq('product_id', id)
            .order('sort_order', { ascending: true });

        const response = jsonSuccess({ product: formatProduct(updatedRows[0], plans || []) });
        response.headers.set('Cache-Control', 'no-store, max-age=0');
        return response;
    } catch (error) {
        if (error instanceof SecurityValidationError) return jsonError(error.message, 400);
        console.error('Update store product error:', error);
        return jsonError('Erro interno', 500);
    }
}
