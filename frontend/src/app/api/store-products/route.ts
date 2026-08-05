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

function storeProductSlug(name: string, id: string): string {
    const base = name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 120) || 'produto';
    return `${base}-${id.slice(0, 8)}`;
}

function normalizePlans(value: unknown): Array<{ name: string; price: number }> {
    if (!Array.isArray(value) || value.length === 0) {
        throw new SecurityValidationError('Informe ao menos um plano de preço válido');
    }
    if (value.length > 50) throw new SecurityValidationError('Limite de planos excedido');

    const plans = value.map((plan: any) => {
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
        return { name, price };
    });

    return plans;
}

async function normalizeCategory(userId: string, value: unknown): Promise<string | null> {
    if (value === undefined || value === null || value === '') return null;
    const categoryId = String(value);
    if (!/^[0-9a-f-]{36}$/i.test(categoryId)) {
        throw new SecurityValidationError('Categoria inválida');
    }
    const { data, error } = await supabase
        .from('store_categories')
        .select('id')
        .eq('id', categoryId)
        .eq('user_id', userId)
        .limit(1);
    if (error || !data?.[0]) throw new SecurityValidationError('Categoria não encontrada');
    return categoryId;
}

function formatProduct(product: any, plans: any[] = []) {
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

export async function GET(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);

    const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', auth.user.id)
        .eq('sales_channel', 'store')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Store products list error:', error);
        return jsonError('Erro ao carregar produtos da loja', 500);
    }
    if (!products?.length) return jsonSuccess({ products: [] });

    const { data: plans, error: plansError } = await supabase
        .from('product_plans')
        .select('id, product_id, name, price, sort_order')
        .in('product_id', products.map(product => product.id))
        .order('sort_order', { ascending: true });

    if (plansError) {
        console.error('Store product plans list error:', plansError);
        return jsonError('Erro ao carregar planos dos produtos', 500);
    }

    const plansByProduct = new Map<string, any[]>();
    for (const plan of plans || []) {
        const entries = plansByProduct.get(plan.product_id) || [];
        entries.push(plan);
        plansByProduct.set(plan.product_id, entries);
    }

    return jsonSuccess({
        products: products.map(product => formatProduct(product, plansByProduct.get(product.id) || [])),
    });
}

export async function POST(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);
    if (requestBodyTooLarge(req, MAX_BODY_BYTES)) return jsonError('Conteúdo muito grande', 413);

    let createdProductId: string | null = null;
    try {
        const body = await req.json();
        const id = uuidv4();
        const name = normalizeSafeText(body.name, {
            field: 'Nome',
            maxLength: 200,
            required: true,
        }) as string;
        const descriptionFormat = normalizeStoreDescriptionFormat(body.store_description_format);
        const description = sanitizeStoreProductDescription(body.description, descriptionFormat);
        const imageUrl = normalizeHttpUrl(body.image_url, { field: 'Imagem', maxLength: 2_048 });
        const categoryId = await normalizeCategory(auth.user.id, body.store_category_id);
        const plans = normalizePlans(body.plans);
        const status = body.status === 'inactive' ? 'inactive' : 'active';
        const basePrice = plans[0].price;

        const { data: product, error } = await supabase
            .from('products')
            .insert({
                id,
                user_id: auth.user.id,
                name,
                description,
                price: basePrice,
                price_display: (basePrice / 100).toFixed(2),
                image_url: imageUrl,
                type: 'digital',
                status,
                show_in_store: body.show_in_store !== false,
                store_category_id: categoryId,
                sales_channel: 'store',
                store_product_slug: storeProductSlug(name, id),
                store_description_format: descriptionFormat,
            })
            .select()
            .single();

        if (error || !product) {
            console.error('Store product insert error:', error);
            return jsonError('Erro ao criar produto da loja', 500);
        }
        createdProductId = product.id;

        const { error: plansError } = await supabase.from('product_plans').insert(
            plans.map((plan, index) => ({
                product_id: product.id,
                name: plan.name,
                price: plan.price,
                sort_order: index,
            })),
        );
        if (plansError) {
            console.error('Store product plans insert error:', plansError);
            await supabase.from('products').delete().eq('id', product.id).eq('user_id', auth.user.id);
            createdProductId = null;
            return jsonError('Erro ao criar os planos do produto', 500);
        }

        return jsonSuccess({ product: formatProduct(product) }, 201);
    } catch (error) {
        if (createdProductId) {
            await supabase.from('products').delete().eq('id', createdProductId).eq('user_id', auth.user.id);
        }
        if (error instanceof SecurityValidationError) return jsonError(error.message, 400);
        console.error('Create store product error:', error);
        return jsonError('Erro interno', 500);
    }
}
