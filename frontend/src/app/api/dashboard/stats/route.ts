export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabase, fetchAll } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { PagarmeService } from '@/lib/pagarme';

export async function GET(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);

    const userId = auth.user.id;
    const url = new URL(req.url);
    const start = url.searchParams.get('start') || '';
    const end = url.searchParams.get('end') || '';

    // Base stats - use count for efficiency
    const { count: totalProducts } = await supabase
        .from('products').select('*', { count: 'exact', head: true }).eq('user_id', userId);

    let totalSoldDec = 0;
    let availableDec = 0;
    let pendingDec = 0;
    let totalWithdrawnDec = 0;
    let totalFeesDec = 0;
    let usedPagarme = false;

    // 1. Get stats from local Database (Baseline)
    // We use fetchAll to bypass the 1000 row limit of Supabase/PostgREST
    const [orders, billings, fees, withdrawals, pendingSales] = await Promise.all([
        fetchAll(supabase.from('orders').select('amount, created_at').eq('seller_id', userId).eq('status', 'paid')),
        fetchAll(supabase.from('billings').select('amount, created_at').eq('user_id', userId).eq('status', 'paid')),
        fetchAll(supabase.from('transactions').select('amount').eq('user_id', userId).eq('type', 'fee')),
        fetchAll(supabase.from('transactions').select('amount').eq('user_id', userId).eq('type', 'withdrawal')),
        fetchAll(supabase.from('transactions').select('amount').eq('user_id', userId).in('type', ['sale', 'api_sale']).eq('status', 'pending'))
    ]);

    const totalOrdersAmount = (orders || []).reduce((s, t) => s + (t.amount || 0), 0);
    const totalBillingsAmount = (billings || []).reduce((s, t) => s + (t.amount || 0), 0);

    totalSoldDec = (totalOrdersAmount + totalBillingsAmount) / 100;
    totalFeesDec = (fees || []).reduce((s, t) => s + (t.amount || 0), 0) / 100;
    totalWithdrawnDec = (withdrawals || []).reduce((s, t) => s + (t.amount || 0), 0) / 100;
    pendingDec = (pendingSales || []).reduce((s, t) => s + (t.amount || 0), 0) / 100;

    // Initial available balance is Gross - Fees - Withdrawn
    availableDec = totalSoldDec - totalFeesDec - totalWithdrawnDec;

    // 2. Overlay with real-time balance from Pagar.me only when NO period filters are applied
    if (!start && !end) {
        const { data: recipient } = await supabase
            .from('recipients').select('pagarme_recipient_id').eq('user_id', userId).single();

        if (recipient?.pagarme_recipient_id) {
            try {
                const balance = await PagarmeService.getRecipientBalance(recipient.pagarme_recipient_id);
                
                const getAmount = (field: any) => {
                    if (!field) return 0;
                    if (Array.isArray(field)) {
                        const item = field.find((i: any) => i.amount !== undefined) || field[0];
                        return item?.amount || 0;
                    }
                    return field.amount || 0;
                };

                availableDec = (balance.available_amount !== undefined ? balance.available_amount : getAmount(balance.available)) / 100;
                pendingDec = (balance.waiting_funds_amount !== undefined ? balance.waiting_funds_amount : getAmount(balance.waiting_funds)) / 100;
                totalWithdrawnDec = (balance.transferred_amount !== undefined ? balance.transferred_amount : getAmount(balance.transferred)) / 100;
                usedPagarme = true;
            } catch (pErr: any) {
                console.error('[STATS] Pagar.me balance error:', pErr.response?.data || pErr.message);
            }
        }
    }

    // Monthly sales grouping
    const monthlyMap: Record<string, number> = {};
    const processSale = (o: any) => {
        // Filter by date if provided
        if (start && new Date(o.created_at) < new Date(start)) return;
        if (end && new Date(o.created_at) > new Date(end)) return;

        const d = new Date(o.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyMap[key] = (monthlyMap[key] || 0) + o.amount;
    };

    (orders || []).forEach(processSale);
    (billings || []).forEach(processSale);

    const monthly_sales = Object.entries(monthlyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, amount]) => ({
            month, amount: (amount / 100).toFixed(2)
        }));

    // Recent orders (limited to 10)
    let recentQuery = supabase
        .from('orders').select('id, product_id, buyer_name, amount, amount_display, payment_method, status, created_at, products(name)')
        .eq('seller_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

    if (start) recentQuery = recentQuery.gte('created_at', new Date(start).toISOString());
    if (end) recentQuery = recentQuery.lte('created_at', new Date(end).toISOString());

    const { data: recent_orders_raw } = await recentQuery;

    return jsonSuccess({
        stats: {
            total_sold: totalSoldDec.toFixed(2),
            available_balance: availableDec.toFixed(2),
            pending_balance: pendingDec.toFixed(2),
            total_withdrawn: totalWithdrawnDec.toFixed(2),
            total_fees: totalFeesDec.toFixed(2),
            total_products: totalProducts || 0,
            net_revenue: (totalSoldDec - totalFeesDec).toFixed(2)
        },
        monthly_sales,
        recent_orders: (recent_orders_raw || []).map((o: any) => ({
            ...o,
            amount_display: o.amount_display || (o.amount !== undefined ? (o.amount / 100).toFixed(2) : '0.00'),
            product_name: o.products?.name || (!o.product_id && o.payment_method === 'pix' ? 'API Pix' : '—')
        }))
    });
}
