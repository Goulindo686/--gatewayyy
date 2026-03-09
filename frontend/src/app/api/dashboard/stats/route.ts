export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { PagarmeService } from '@/lib/pagarme';

export async function GET(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);

    const userId = auth.user.id;

    // Base stats
    const { data: products } = await supabase
        .from('products').select('id').eq('user_id', userId);

    let totalSoldDec = 0;
    let availableDec = 0;
    let pendingDec = 0;
    let totalWithdrawnDec = 0;
    let totalFeesDec = 0;
    let usedPagarme = false;

    // 1. Get stats from local Database (Baseline)
    const [ordersData, fees, withdrawals, pendingSales] = await Promise.all([
        supabase.from('orders').select('amount').eq('seller_id', userId).eq('status', 'paid'),
        supabase.from('transactions').select('amount').eq('user_id', userId).eq('type', 'fee'),
        supabase.from('transactions').select('amount').eq('user_id', userId).eq('type', 'withdrawal'),
        supabase.from('transactions').select('amount').eq('user_id', userId).in('type', ['sale', 'api_sale']).eq('status', 'pending')
    ]);

    totalSoldDec = (ordersData.data || []).reduce((s, t) => s + (t.amount || 0), 0) / 100;
    totalFeesDec = (fees.data || []).reduce((s, t) => s + (t.amount || 0), 0) / 100;
    totalWithdrawnDec = (withdrawals.data || []).reduce((s, t) => s + (t.amount || 0), 0) / 100;
    pendingDec = (pendingSales.data || []).reduce((s, t) => s + (t.amount || 0), 0) / 100;

    // Initial available balance is Gross - Fees - Withdrawn
    availableDec = totalSoldDec - totalFeesDec - totalWithdrawnDec;

    // 2. Overlay with real-time Pagar.me balance if available
    const { data: recipient } = await supabase
        .from('recipients').select('pagarme_recipient_id').eq('user_id', userId).single();

    if (recipient?.pagarme_recipient_id) {
        try {
            const balance = await PagarmeService.getRecipientBalance(recipient.pagarme_recipient_id);
            console.log(`[STATS] Balance for ${recipient.pagarme_recipient_id}:`, JSON.stringify(balance, null, 2));

            const getAmount = (field: any) => {
                if (!field) return 0;
                if (Array.isArray(field)) {
                    // Search for amount in array (standard v5)
                    const item = field.find((i: any) => i.amount !== undefined) || field[0];
                    return item?.amount || 0;
                }
                return field.amount || 0;
            };

            // Overlay local values with Real-time Pagar.me values
            availableDec = (balance.available_amount !== undefined ? balance.available_amount : getAmount(balance.available)) / 100;
            pendingDec = (balance.waiting_funds_amount !== undefined ? balance.waiting_funds_amount : getAmount(balance.waiting_funds)) / 100;
            totalWithdrawnDec = (balance.transferred_amount !== undefined ? balance.transferred_amount : getAmount(balance.transferred)) / 100;
            usedPagarme = true;
        } catch (pErr: any) {
            console.error('[STATS] Pagar.me balance error:', pErr.response?.data || pErr.message);
        }
    }

    // Monthly sales
    const { data: monthlySales } = await supabase
        .from('orders').select('amount, created_at')
        .eq('seller_id', userId).eq('status', 'paid')
        .order('created_at', { ascending: true });

    const monthlyMap: Record<string, number> = {};
    (monthlySales || []).forEach((o: any) => {
        const d = new Date(o.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyMap[key] = (monthlyMap[key] || 0) + o.amount;
    });

    const monthly_sales = Object.entries(monthlyMap).map(([month, amount]) => ({
        month, amount: (amount / 100).toFixed(2)
    }));

    // Recent orders
    const { data: recent_orders_raw } = await supabase
        .from('orders').select('id, product_id, buyer_name, amount, amount_display, payment_method, status, created_at, products(name)')
        .eq('seller_id', userId).order('created_at', { ascending: false }).limit(10);

    return jsonSuccess({
        stats: {
            total_sold: totalSoldDec.toFixed(2),
            available_balance: availableDec.toFixed(2),
            pending_balance: pendingDec.toFixed(2),
            total_withdrawn: totalWithdrawnDec.toFixed(2),
            total_fees: totalFeesDec.toFixed(2),
            total_products: products?.length || 0,
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
