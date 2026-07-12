export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';

export async function GET(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);

    const { searchParams } = req.nextUrl;
    const status = searchParams.get('status');
    const method = searchParams.get('method');
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    let query = supabase
        .from('orders')
        .select('*, products(name)')
        .eq('seller_id', auth.user.id)
        .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (method) query = query.eq('payment_method', method);
    if (start) query = query.gte('created_at', start);
    if (end) query = query.lte('created_at', end);

    const { data: sales, error } = await query;

    if (error) return jsonError('Erro ao buscar vendas: ' + error.message);

    const totalAmount = (sales || []).reduce((sum, o) => sum + (o.amount || 0), 0);

    const formatted = (sales || []).map(o => ({
        ...o,
        product_name: o.products?.name || o.product_name || '—',
        amount_display: (o.amount / 100).toFixed(2),
        delivered: o.delivered ?? false,
        delivered_at: o.delivered_at || null,
    }));

    return jsonSuccess({
        sales: formatted,
        summary: {
            count: formatted.length,
            total_amount_display: (totalAmount / 100).toFixed(2),
        }
    });
}
