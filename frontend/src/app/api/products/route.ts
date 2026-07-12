export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { fetchAll, supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { normalizeFacebookSettings } from '@/lib/facebook-capi';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);

    const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: false });

    if (!products?.length) return jsonSuccess({ products: [] });

    // Busca planos de assinatura vinculados a esses produtos
    const productIds = products.map(p => p.id);
    const { data: subPlans } = await supabase
        .from('subscription_plans')
        .select('id, product_id, interval')
        .in('product_id', productIds)
        .eq('status', 'active');

    const subPlansByProduct: Record<string, any> = {};
    (subPlans || []).forEach(sp => { subPlansByProduct[sp.product_id] = sp; });

    const salesByProduct: Record<string, number> = {};
    try {
        const paidOrders = await fetchAll<{ product_id: string | null }>(
            supabase
                .from('orders')
                .select('product_id')
                .eq('seller_id', auth.user.id)
                .eq('status', 'paid')
                .in('product_id', productIds)
        );

        for (const o of paidOrders) {
            if (!o?.product_id) continue;
            salesByProduct[o.product_id] = (salesByProduct[o.product_id] || 0) + 1;
        }
    } catch {}

    try {
        const planIds = (subPlans || []).map((p: any) => p.id).filter(Boolean);
        if (planIds.length > 0) {
            const planToProduct: Record<string, string> = {};
            (subPlans || []).forEach((p: any) => { if (p?.id && p?.product_id) planToProduct[p.id] = p.product_id; });

            const subscriptions = await fetchAll<{ subscription_plan_id: string | null }>(
                supabase
                    .from('subscriptions')
                    .select('subscription_plan_id')
                    .eq('seller_id', auth.user.id)
                    .in('subscription_plan_id', planIds)
                    .in('status', ['active', 'past_due', 'canceled'])
            );

            for (const s of subscriptions) {
                const pid = s?.subscription_plan_id ? planToProduct[s.subscription_plan_id] : null;
                if (!pid) continue;
                salesByProduct[pid] = (salesByProduct[pid] || 0) + 1;
            }
        }
    } catch {}

    const formattedProducts = products.map(p => ({
        ...p,
        price: p.price / 100,
        price_display: (p.price / 100).toFixed(2),
        sales_count: salesByProduct[p.id] || 0,
        subscription_plan: subPlansByProduct[p.id] || null
    }));

    try {
        const updates = formattedProducts
            .filter((p: any) => typeof p?.sales_count === 'number' && Number.isFinite(p.sales_count))
            .map((p: any) =>
                supabase
                    .from('products')
                    .update({ sales_count: p.sales_count })
                    .eq('id', p.id)
            );
        if (updates.length > 0) {
            await Promise.allSettled(updates);
        }
    } catch {}

    return jsonSuccess({ products: formattedProducts });
}

export async function POST(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);

    try {
        const body = await req.json();
        const { name, description, price, image_url, type, status, facebook_pixel_id, facebook_api_token, plans } = body;
        const cleanDescription = typeof description === 'string' && description.trim()
            ? description.trim()
            : null;
        const facebookSettings = normalizeFacebookSettings({ facebook_pixel_id, facebook_api_token });

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
            description: cleanDescription,
            price: basePrice,
            price_display: basePriceDisplay,
            image_url,
            type: type || 'digital',
            status: status || 'active',
            facebook_pixel_id: facebookSettings.facebook_pixel_id,
            facebook_api_token: facebookSettings.facebook_api_token
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
