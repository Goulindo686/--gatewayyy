export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

function cleanCategoryImageUrl(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (!/^https?:\/\//i.test(trimmed)) return null;
    return trimmed.slice(0, 1000);
}

function cleanSortOrder(value: unknown): number {
    const order = Number(value);
    return Number.isFinite(order) && order >= 0 ? Math.floor(order) : 0;
}

export async function GET(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);

    let categoriesQuery = await supabase
        .from('store_categories')
        .select('*')
        .eq('user_id', auth.user.id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

    if (categoriesQuery.error && /sort_order/i.test(categoriesQuery.error.message || '')) {
        categoriesQuery = await supabase
            .from('store_categories')
            .select('*')
            .eq('user_id', auth.user.id)
            .order('created_at', { ascending: false });
    }

    const { data: categories, error } = categoriesQuery;

    if (error) {
        console.error('Supabase categories error:', error);
        return jsonError('Erro ao buscar categorias', 500);
    }

    return jsonSuccess({ categories: categories || [] });
}

export async function POST(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);

    try {
        const { name, slug, image_url, sort_order } = await req.json();

        if (!name || !slug) return jsonError('Nome e slug são obrigatórios');

        const { data: category, error } = await supabase.from('store_categories').insert({
            id: uuidv4(),
            user_id: auth.user.id,
            name,
            slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ''),
            image_url: cleanCategoryImageUrl(image_url),
            sort_order: cleanSortOrder(sort_order)
        }).select();

        if (error) {
            console.error('Supabase category insert error:', error);
            return jsonError('Erro no banco: ' + error.message);
        }

        return jsonSuccess({ category: category?.[0] }, 201);
    } catch (err) {
        console.error('Create category error:', err);
        return jsonError('Erro interno', 500);
    }
}
