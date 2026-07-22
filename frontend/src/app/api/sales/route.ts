export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { fetchAll, supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';

type SaleRow = {
    amount?: number | null;
    product_name?: string | null;
    products?: { name?: string | null } | null;
    delivered?: boolean | null;
    delivered_at?: string | null;
    [key: string]: unknown;
};

export async function GET(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);

    const { searchParams } = req.nextUrl;
    const status = searchParams.get('status');
    const method = searchParams.get('method');
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const search = searchParams.get('search')?.trim() || '';

    let query = supabase
        .from('orders')
        .select('id, product_id, buyer_name, buyer_email, buyer_cpf, buyer_phone, amount, payment_method, status, pagarme_order_id, pagarme_charge_id, created_at, delivered, delivered_at, products(name)')
        .eq('seller_id', auth.user.id)
        .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (method) query = query.eq('payment_method', method);
    if (start) query = query.gte('created_at', start);
    if (end) query = query.lte('created_at', end);

    if (search) {
        // The OR expression is built from a restricted set of characters so
        // punctuation entered in the search box cannot break the PostgREST filter.
        const safeSearch = search.replace(/[%,_*(),]/g, ' ').replace(/\s+/g, ' ').trim();
        if (!safeSearch) {
            return jsonSuccess({ sales: [], summary: { count: 0, total_amount_display: '0.00' } });
        }
        const pattern = `*${safeSearch}*`;
        const searchFilters = [
            `buyer_name.ilike.${pattern}`,
            `buyer_email.ilike.${pattern}`,
            `buyer_cpf.ilike.${pattern}`,
            `buyer_phone.ilike.${pattern}`,
            `pagarme_order_id.ilike.${pattern}`,
            `pagarme_charge_id.ilike.${pattern}`,
            `status.ilike.${pattern}`,
            `payment_method.ilike.${pattern}`,
        ];

        // Checkout data is stored as digits, while users commonly paste CPF
        // and phone numbers with punctuation. Search both representations.
        const searchDigits = search.replace(/\D/g, '');
        if (searchDigits) {
            searchFilters.push(
                `buyer_cpf.ilike.*${searchDigits}*`,
                `buyer_phone.ilike.*${searchDigits}*`,
            );
        }

        query = query.or(searchFilters.join(','));
    }

    // Always page through the complete result set. Supabase returns at most
    // 1,000 rows by default, which made older sales impossible to find.
    let sales: SaleRow[];
    try {
        sales = await fetchAll<SaleRow>(query);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'erro desconhecido';
        return jsonError('Erro ao buscar vendas: ' + message);
    }

    const totalAmount = (sales || []).reduce((sum, o) => sum + (o.amount || 0), 0);

    const formatted = (sales || []).map(o => ({
        ...o,
        product_name: o.products?.name || o.product_name || '—',
        amount_display: ((o.amount || 0) / 100).toFixed(2),
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
