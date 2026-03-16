export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);

    const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: false });

    const formattedProducts = products?.map(p => ({
        ...p,
        price: p.price / 100,
        price_display: (p.price / 100).toFixed(2)
    })) || [];

    return jsonSuccess({ products: formattedProducts });
}

export async function POST(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);

    try {
        const body = await req.json();
        const { name, description, price, image_url, type, status, facebook_pixel_id, facebook_api_token, plans } = body;

        if (!name) return jsonError('Nome é obrigatório');

        const normalizedPlans: Array<{ name: string; price: number }> = Array.isArray(plans) && plans.length > 0
            ? plans.map((p: any) => ({
                name: String(p.name || 'Plano'),
                price: Math.round(parseFloat(String(p.price)) * 100)
            })).filter(p => p.name && p.price > 0)
            : (price ? [{ name: 'Padrão', price: Math.round(parseFloat(String(price)) * 100) }] : []);

        if (normalizedPlans.length === 0) return jsonError('Informe ao menos um plano de preço válido');
        const basePrice = normalizedPlans[0].price;
        const basePriceDisplay = (basePrice / 100).toFixed(2);

        const { data: product, error } = await supabase.from('products').insert({
            id: uuidv4(),
            user_id: auth.user.id,
            name,
            description,
            price: basePrice,
            price_display: basePriceDisplay,
            image_url,
            type: type || 'digital',
            status: status || 'active',
            facebook_pixel_id,
            facebook_api_token
        }).select().single();

        if (error) {
            console.error('Supabase product insert error:', error);
            return jsonError('Erro no banco: ' + error.message);
        }

        if (product && normalizedPlans.length > 0) {
            const rows = normalizedPlans.map((p, idx) => ({
                product_id: product.id,
                name: p.name,
                price: p.price,
                sort_order: idx
            }));
            const { error: plansErr } = await supabase.from('product_plans').insert(rows);
            if (plansErr) {
                console.error('Supabase product_plans insert error:', plansErr);
            }
        }

        return jsonSuccess({ product }, 201);
    } catch (err) {
        console.error('Create product error:', err);
        return jsonError('Erro interno', 500);
    }
}
