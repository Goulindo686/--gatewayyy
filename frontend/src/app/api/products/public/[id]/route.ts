import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { jsonError, jsonSuccess } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const { data: product } = await supabase
        .from('products')
        .select('id, name, description, price, price_display, image_url, type, user_id, checkout_settings, facebook_pixel_id')
        .eq('id', id)
        .eq('status', 'active')
        .single();

    if (!product) return jsonError('Produto não encontrado', 404);

    const { data: plans } = await supabase
        .from('product_plans')
        .select('*')
        .eq('product_id', product.id)
        .order('sort_order', { ascending: true });

    const firstPlan = (plans && plans.length > 0) ? plans[0] : null;
    const effectivePrice = firstPlan ? firstPlan.price : product.price;

    // Get seller name
    const { data: seller } = await supabase
        .from('users')
        .select('name')
        .eq('id', product.user_id)
        .single();

    return jsonSuccess({
        product: {
            ...product,
            price: effectivePrice / 100,
            price_display: (effectivePrice / 100).toFixed(2),
            seller_name: seller?.name || 'Vendedor',
            plans: (plans || []).map(p => ({
                ...p,
                price_display: (p.price / 100).toFixed(2)
            }))
        }
    });
}
