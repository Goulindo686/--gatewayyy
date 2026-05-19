import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { jsonError, jsonSuccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const { data: product } = await supabase
        .from('products')
        .select('id, name, description, price, price_display, image_url, type, user_id, checkout_settings, facebook_pixel_id')
        .eq('id', id)
        .eq('status', 'active')
        .single();

    if (!product) return jsonError('Produto não encontrado', 404);

    // Busca planos do produto
    const { data: plans, error: plansError } = await supabase
        .from('product_plans')
        .select('id, product_id, name, price, sort_order')
        .eq('product_id', product.id)
        .order('sort_order', { ascending: true });

    if (plansError) console.error('Plans fetch error:', plansError);

    // Busca order bumps ativos do produto
    const { data: orderBumpsRaw } = await supabase
        .from('order_bumps')
        .select(`
            id, title, description, call_to_action,
            custom_price, badge_text, badge_color, sort_order,
            bump_product:bump_product_id (
                id, name, price, image_url,
                plans:product_plans (id, name, price, sort_order)
            ),
            bump_plan:bump_plan_id (id, name, price)
        `)
        .eq('product_id', id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

    // Calcula preço efetivo de cada bump (tudo em centavos no Supabase)
    const orderBumps = (orderBumpsRaw || []).map((bump: any) => {
        let effectivePriceCents: number | null =
            bump.custom_price ?? bump.bump_plan?.price ?? bump.bump_product?.price ?? null;

        return {
            ...bump,
            effective_price: effectivePriceCents,
            effective_price_display: effectivePriceCents != null
                ? (effectivePriceCents / 100).toFixed(2)
                : null,
            // Normaliza preços dos planos do produto do bump
            bump_product: bump.bump_product
                ? {
                    ...bump.bump_product,
                    price_display: (bump.bump_product.price / 100).toFixed(2),
                    plans: (bump.bump_product.plans || []).map((p: any) => ({
                        ...p,
                        price_display: (p.price / 100).toFixed(2),
                    })),
                }
                : null,
        };
    });

    const firstPlan = plans && plans.length > 0 ? plans[0] : null;
    const effectivePrice = firstPlan ? firstPlan.price : product.price;

    // Get seller name
    const { data: seller } = await supabase
        .from('users')
        .select('name')
        .eq('id', product.user_id)
        .single();

    const response = jsonSuccess({
        product: {
            ...product,
            price: effectivePrice / 100,
            price_display: (effectivePrice / 100).toFixed(2),
            seller_name: seller?.name || 'Vendedor',
            plans: (plans || []).map(p => ({
                ...p,
                price: p.price / 100,                    // em reais
                price_display: (p.price / 100).toFixed(2),
            })),
            order_bumps: orderBumps,
        }
    });
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
}
