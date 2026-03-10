export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';

export async function GET(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);

    const userId = auth.user.id;

    const url = new URL(req.url);
    const status = url.searchParams.get('status') || '';
    const method = url.searchParams.get('method') || '';

    let query = supabase
        .from('orders')
        .select('id, product_id, buyer_name, buyer_email, buyer_cpf, buyer_phone, amount, payment_method, status, pagarme_order_id, pagarme_charge_id, created_at, products(name)')
        .eq('seller_id', userId)
        .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (method) query = query.eq('payment_method', method);

    const { data: rows } = await query;

    const sales = (rows || []).map((o: any) => ({
        id: o.id,
        product_id: o.product_id,
        product_name: o.products?.name || (!o.product_id && o.payment_method === 'pix' ? 'API Pix' : '—'),
        buyer_name: o.buyer_name,
        buyer_email: o.buyer_email,
        buyer_cpf: o.buyer_cpf,
        buyer_phone: o.buyer_phone,
        amount: o.amount,
        amount_display: o.amount !== undefined ? (o.amount / 100).toFixed(2) : '0.00',
        payment_method: o.payment_method,
        status: o.status,
        pagarme_order_id: o.pagarme_order_id,
        pagarme_charge_id: o.pagarme_charge_id,
        created_at: o.created_at
    }));

    return jsonSuccess({ sales });
}
