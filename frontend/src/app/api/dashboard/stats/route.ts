export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabase, fetchAll } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { PagarmeService } from '@/lib/pagarme';

type AmountRow = {
    amount?: number | null;
    created_at?: string | null;
};

type RecentOrderRow = {
    amount?: number | null;
    amount_display?: string | null;
    product_id?: string | null;
    payment_method?: string | null;
    products?: { name?: string | null } | null;
    [key: string]: unknown;
};

export async function GET(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);

    const userId = auth.user.id;
    const url = new URL(req.url);
    const start = url.searchParams.get('start') || '';
    const end = url.searchParams.get('end') || '';
    const startDate = start ? new Date(start) : null;
    const endDate = end ? new Date(end) : null;

    if ((startDate && Number.isNaN(startDate.getTime())) || (endDate && Number.isNaN(endDate.getTime()))) {
        return jsonError('Período inválido', 400);
    }

    const isWithinPeriod = (row: { created_at?: string | null }) => {
        if (!row.created_at) return !startDate && !endDate;
        const createdAt = new Date(row.created_at);
        if (Number.isNaN(createdAt.getTime())) return false;
        if (startDate && createdAt < startDate) return false;
        if (endDate && createdAt > endDate) return false;
        return true;
    };

    // Base stats - use count for efficiency
    const { count: totalProducts } = await supabase
        .from('products').select('*', { count: 'exact', head: true }).eq('user_id', userId);

    let totalSoldDec = 0;
    let availableDec = 0;
    let pendingDec = 0;
    let totalWithdrawnDec = 0;
    let totalFeesDec = 0;

    // 1. Get stats from local Database (Baseline)
    // We use fetchAll to bypass the 1000 row limit of Supabase/PostgREST
    const [orders, billings, fees, withdrawals, pendingSales] = await Promise.all([
        fetchAll<AmountRow>(supabase.from('orders').select('amount, created_at').eq('seller_id', userId).eq('status', 'paid')),
        fetchAll<AmountRow>(supabase.from('billings').select('amount, created_at').eq('user_id', userId).eq('status', 'paid')),
        fetchAll<AmountRow>(supabase.from('transactions').select('amount, created_at').eq('user_id', userId).eq('type', 'fee')),
        fetchAll<AmountRow>(supabase.from('transactions').select('amount').eq('user_id', userId).eq('type', 'withdrawal')),
        fetchAll<AmountRow>(supabase.from('transactions').select('amount').eq('user_id', userId).in('type', ['sale', 'api_sale']).eq('status', 'pending'))
    ]);

    const periodOrders = (orders || []).filter(isWithinPeriod);
    const periodBillings = (billings || []).filter(isWithinPeriod);
    const periodFees = (fees || []).filter(isWithinPeriod);

    const lifetimeOrdersAmount = (orders || []).reduce((s, t) => s + (t.amount || 0), 0);
    const lifetimeBillingsAmount = (billings || []).reduce((s, t) => s + (t.amount || 0), 0);
    const lifetimeFeesAmount = (fees || []).reduce((s, t) => s + (t.amount || 0), 0);
    const lifetimeWithdrawalsAmount = (withdrawals || []).reduce((s, t) => s + (t.amount || 0), 0);
    const lifetimePendingAmount = (pendingSales || []).reduce((s, t) => s + (t.amount || 0), 0);

    totalSoldDec = (
        periodOrders.reduce((s, t) => s + (t.amount || 0), 0) +
        periodBillings.reduce((s, t) => s + (t.amount || 0), 0)
    ) / 100;
    totalFeesDec = periodFees.reduce((s, t) => s + (t.amount || 0), 0) / 100;
    totalWithdrawnDec = lifetimeWithdrawalsAmount / 100;
    pendingDec = lifetimePendingAmount / 100;

    // Fallback local: o saldo atual nunca deve depender do filtro de período.
    availableDec = (
        lifetimeOrdersAmount +
        lifetimeBillingsAmount -
        lifetimeFeesAmount -
        lifetimeWithdrawalsAmount
    ) / 100;

    // O saldo financeiro é uma fotografia atual e não uma métrica do período.
    // Por isso, a Pagar.me deve ser consultada com ou sem filtros na dashboard.
    const { data: recipient } = await supabase
        .from('recipients').select('pagarme_recipient_id').eq('user_id', userId).single();

    if (recipient?.pagarme_recipient_id) {
        try {
            const balance = await PagarmeService.getRecipientBalance(recipient.pagarme_recipient_id);
                
            const getAmount = (field: unknown) => {
                if (!field) return 0;
                if (Array.isArray(field)) {
                    const item = field.find((value) => (
                        typeof value === 'object' && value !== null && 'amount' in value
                    ));
                    if (typeof item === 'object' && item !== null && 'amount' in item) {
                        return Number(item.amount || 0);
                    }
                    return 0;
                }
                if (typeof field === 'object' && 'amount' in field) {
                    return Number(field.amount || 0);
                }
                return 0;
            };

            availableDec = (balance.available_amount !== undefined ? balance.available_amount : getAmount(balance.available)) / 100;
            pendingDec = (balance.waiting_funds_amount !== undefined ? balance.waiting_funds_amount : getAmount(balance.waiting_funds)) / 100;
            totalWithdrawnDec = (balance.transferred_amount !== undefined ? balance.transferred_amount : getAmount(balance.transferred)) / 100;
        } catch (pErr: unknown) {
            const error = pErr as { response?: { data?: unknown }; message?: string };
            console.error('[STATS] Pagar.me balance error:', error.response?.data || error.message);
        }
    }

    // Monthly sales grouping
    const monthlyMap: Record<string, number> = {};
    const monthlyFeesMap: Record<string, number> = {};
    const processSale = (o: AmountRow) => {
        if (!o.created_at) return;
        const d = new Date(o.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyMap[key] = (monthlyMap[key] || 0) + (o.amount || 0);
    };

    const processFee = (fee: AmountRow) => {
        if (!fee.created_at) return;
        const d = new Date(fee.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyFeesMap[key] = (monthlyFeesMap[key] || 0) + (fee.amount || 0);
    };

    periodOrders.forEach(processSale);
    periodBillings.forEach(processSale);
    periodFees.forEach(processFee);

    const monthly_sales = Object.entries(monthlyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, amount]) => {
            const feesAmount = monthlyFeesMap[month] || 0;
            return {
                month,
                amount: (amount / 100).toFixed(2),
                fees: (feesAmount / 100).toFixed(2),
                net_revenue: ((amount - feesAmount) / 100).toFixed(2)
            };
        });

    // Recent orders (limited to 10)
    let recentQuery = supabase
        .from('orders').select('id, product_id, buyer_name, amount, amount_display, payment_method, status, created_at, products(name)')
        .eq('seller_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

    if (startDate) recentQuery = recentQuery.gte('created_at', startDate.toISOString());
    if (endDate) recentQuery = recentQuery.lte('created_at', endDate.toISOString());

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
        recent_orders: ((recent_orders_raw || []) as RecentOrderRow[]).map((o) => ({
            ...o,
            amount_display: o.amount_display || (o.amount != null ? (o.amount / 100).toFixed(2) : '0.00'),
            product_name: o.products?.name || (!o.product_id && o.payment_method === 'pix' ? 'API Pix' : '—')
        }))
    });
}
