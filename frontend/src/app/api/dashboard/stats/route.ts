export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabase, fetchAll } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { PagarmeService } from '@/lib/pagarme';

type AmountRow = {
    amount?: number | null;
    affiliate_commission_amount?: number | null;
    created_at?: string | null;
};

type AffiliateAmountRow = {
    commission_amount?: number | null;
    status?: string | null;
    created_at?: string | null;
};

type RecentOrderRow = {
    id?: string | null;
    amount?: number | null;
    amount_display?: string | null;
    buyer_name?: string | null;
    created_at?: string | null;
    product_id?: string | null;
    payment_method?: string | null;
    status?: string | null;
    affiliate_id?: string | null;
    affiliate_commission_amount?: number | null;
    platform_fee_amount?: number | null;
    products?: { name?: string | null } | null;
    [key: string]: unknown;
};

type RecentAffiliateCommissionRow = {
    id: string;
    order_id?: string | null;
    subscription_id?: string | null;
    product_id?: string | null;
    producer_id?: string | null;
    gross_amount?: number | null;
    commission_amount?: number | null;
    commission_rate_bps?: number | null;
    status?: string | null;
    created_at?: string | null;
    source_type?: string | null;
    products?: { name?: string | null } | null;
    orders?: { payment_method?: string | null } | null;
};

type ReferencedUserRow = {
    id: string;
    name?: string | null;
    email?: string | null;
};

function commissionStatusToSaleStatus(status?: string | null) {
    if (status === 'approved' || status === 'available') return 'paid';
    if (status === 'refunded' || status === 'chargeback') return 'refunded';
    if (status === 'cancelled') return 'cancelled';
    if (status === 'failed') return 'failed';
    return 'pending';
}

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
    const [orders, billings, fees, withdrawals, pendingSales, affiliateEarnings] = await Promise.all([
        fetchAll<AmountRow>(supabase.from('orders').select('amount, affiliate_commission_amount, created_at').eq('seller_id', userId).eq('status', 'paid')),
        fetchAll<AmountRow>(supabase.from('billings').select('amount, created_at').eq('user_id', userId).eq('status', 'paid')),
        fetchAll<AmountRow>(supabase.from('transactions').select('amount, created_at').eq('user_id', userId).eq('type', 'fee')),
        fetchAll<AmountRow>(supabase.from('transactions').select('amount').eq('user_id', userId).eq('type', 'withdrawal')),
        fetchAll<AmountRow>(supabase.from('transactions').select('amount').eq('user_id', userId).in('type', ['sale', 'api_sale']).eq('status', 'pending')),
        fetchAll<AffiliateAmountRow>(
            supabase
                .from('affiliate_commissions')
                .select('commission_amount, status, created_at')
                .eq('affiliate_id', userId)
                .in('status', ['approved', 'available'])
        ).catch((error) => {
            console.error('[STATS] Affiliate earnings lookup error:', error);
            return [] as AffiliateAmountRow[];
        }),
    ]);

    const periodOrders = (orders || []).filter(isWithinPeriod);
    const periodBillings = (billings || []).filter(isWithinPeriod);
    const periodFees = (fees || []).filter(isWithinPeriod);
    const periodAffiliateEarnings = (affiliateEarnings || []).filter(isWithinPeriod);

    const lifetimeOrdersAmount = (orders || []).reduce((s, t) => s + (t.amount || 0), 0);
    const lifetimeBillingsAmount = (billings || []).reduce((s, t) => s + (t.amount || 0), 0);
    const lifetimeFeesAmount = (fees || []).reduce((s, t) => s + (t.amount || 0), 0);
    const lifetimeWithdrawalsAmount = (withdrawals || []).reduce((s, t) => s + (t.amount || 0), 0);
    const lifetimePendingAmount = (pendingSales || []).reduce((s, t) => s + (t.amount || 0), 0);
    const lifetimeAffiliateEarningsAmount = (affiliateEarnings || [])
        .reduce((sum, commission) => sum + (commission.commission_amount || 0), 0);
    const lifetimeAffiliateCommissionsPaid = (orders || [])
        .reduce((sum, order) => sum + (order.affiliate_commission_amount || 0), 0);
    const periodAffiliateEarningsAmount = periodAffiliateEarnings
        .reduce((sum, commission) => sum + (commission.commission_amount || 0), 0);
    const periodAffiliateCommissionsPaid = periodOrders
        .reduce((sum, order) => sum + (order.affiliate_commission_amount || 0), 0);

    totalSoldDec = (
        periodOrders.reduce((s, t) => s + (t.amount || 0), 0) +
        periodBillings.reduce((s, t) => s + (t.amount || 0), 0) +
        periodAffiliateEarningsAmount
    ) / 100;
    totalFeesDec = periodFees.reduce((s, t) => s + (t.amount || 0), 0) / 100;
    totalWithdrawnDec = lifetimeWithdrawalsAmount / 100;
    pendingDec = lifetimePendingAmount / 100;

    // Fallback local: o saldo atual nunca deve depender do filtro de período.
    availableDec = (
        lifetimeOrdersAmount +
        lifetimeBillingsAmount -
        lifetimeFeesAmount -
        lifetimeAffiliateCommissionsPaid +
        lifetimeAffiliateEarningsAmount -
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
    const monthlyAffiliateEarningsMap: Record<string, number> = {};
    const monthlyAffiliateCommissionsPaidMap: Record<string, number> = {};
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

    const processAffiliateEarning = (commission: AffiliateAmountRow) => {
        if (!commission.created_at) return;
        const d = new Date(commission.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const amount = commission.commission_amount || 0;
        monthlyMap[key] = (monthlyMap[key] || 0) + amount;
        monthlyAffiliateEarningsMap[key] = (monthlyAffiliateEarningsMap[key] || 0) + amount;
    };

    const processProducerAffiliateCommission = (order: AmountRow) => {
        if (!order.created_at || !order.affiliate_commission_amount) return;
        const d = new Date(order.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyAffiliateCommissionsPaidMap[key] =
            (monthlyAffiliateCommissionsPaidMap[key] || 0) + order.affiliate_commission_amount;
    };

    periodOrders.forEach(processSale);
    periodBillings.forEach(processSale);
    periodFees.forEach(processFee);
    periodAffiliateEarnings.forEach(processAffiliateEarning);
    periodOrders.forEach(processProducerAffiliateCommission);

    const monthly_sales = Object.entries(monthlyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, amount]) => {
            const feesAmount = monthlyFeesMap[month] || 0;
            const affiliateEarningsAmount = monthlyAffiliateEarningsMap[month] || 0;
            const affiliateCommissionsPaidAmount = monthlyAffiliateCommissionsPaidMap[month] || 0;
            return {
                month,
                amount: (amount / 100).toFixed(2),
                fees: (feesAmount / 100).toFixed(2),
                affiliate_earnings: (affiliateEarningsAmount / 100).toFixed(2),
                affiliate_commissions_paid: (affiliateCommissionsPaidAmount / 100).toFixed(2),
                net_revenue: ((amount - feesAmount - affiliateCommissionsPaidAmount) / 100).toFixed(2)
            };
        });

    // Recent orders (limited to 10)
    let recentQuery = supabase
        .from('orders').select('id, product_id, buyer_name, amount, amount_display, payment_method, status, created_at, affiliate_id, affiliate_commission_amount, platform_fee_amount, products(name)')
        .eq('seller_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

    if (startDate) recentQuery = recentQuery.gte('created_at', startDate.toISOString());
    if (endDate) recentQuery = recentQuery.lte('created_at', endDate.toISOString());

    const { data: recent_orders_raw } = await recentQuery;

    let affiliateNotificationsQuery = supabase
        .from('affiliate_commissions')
        .select('id, order_id, subscription_id, product_id, producer_id, gross_amount, commission_amount, commission_rate_bps, status, created_at, source_type, products(name), orders(payment_method)')
        .eq('affiliate_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

    if (startDate) affiliateNotificationsQuery = affiliateNotificationsQuery.gte('created_at', startDate.toISOString());
    if (endDate) affiliateNotificationsQuery = affiliateNotificationsQuery.lte('created_at', endDate.toISOString());

    const { data: affiliate_notifications_raw } = await affiliateNotificationsQuery;
    const rawRecentOrders = (recent_orders_raw || []) as RecentOrderRow[];
    const rawAffiliateCommissions = (affiliate_notifications_raw || []) as RecentAffiliateCommissionRow[];
    const referencedUserIds = Array.from(new Set([
        ...rawRecentOrders.map((order) => order.affiliate_id).filter((id): id is string => Boolean(id)),
        ...rawAffiliateCommissions.map((commission) => commission.producer_id).filter((id): id is string => Boolean(id)),
    ]));
    const { data: referenced_users } = referencedUserIds.length
        ? await supabase.from('users').select('id, name, email').in('id', referencedUserIds)
        : { data: [] };
    const userById = Object.fromEntries(
        ((referenced_users || []) as ReferencedUserRow[]).map((user) => [user.id, user]),
    ) as Record<string, ReferencedUserRow>;

    const recentOrders = rawRecentOrders.map((order) => {
        const grossAmount = Math.max(0, Math.round(Number(order.amount) || 0));
        const platformFeeAmount = Math.max(0, Math.round(Number(order.platform_fee_amount) || 0));
        const commissionAmount = Math.max(0, Math.round(Number(order.affiliate_commission_amount) || 0));
        const isAffiliateSale = Boolean(order.affiliate_id && commissionAmount > 0);
        const affiliate = order.affiliate_id ? userById[order.affiliate_id] : null;

        return {
            ...order,
            amount: grossAmount,
            amount_display: (grossAmount / 100).toFixed(2),
            gross_amount: grossAmount,
            platform_fee_amount: platformFeeAmount,
            commission_amount: commissionAmount,
            net_amount: Math.max(0, grossAmount - platformFeeAmount - commissionAmount),
            product_name: order.products?.name || (!order.product_id && order.payment_method === 'pix' ? 'API Pix' : '—'),
            sale_kind: isAffiliateSale ? 'affiliate_sale' : 'direct_sale',
            affiliate_name: affiliate?.name || affiliate?.email || null,
        };
    });
    const producerNotifications = recentOrders.map((order) => {
        const isAffiliateSale = order.sale_kind === 'affiliate_sale';

        return {
            ...order,
            notification_kind: isAffiliateSale ? 'affiliate_sale' : 'sale',
            notification_amount: isAffiliateSale
                ? order.net_amount
                : order.gross_amount,
        };
    });
    const affiliateSales = rawAffiliateCommissions.map((commission) => {
        const amount = Math.max(0, Math.round(Number(commission.commission_amount) || 0));
        const producer = commission.producer_id ? userById[commission.producer_id] : null;
        return {
            id: `affiliate-commission-${commission.id}`,
            commission_id: commission.id,
            order_id: commission.order_id,
            subscription_id: commission.subscription_id,
            product_id: commission.product_id,
            amount,
            amount_display: (amount / 100).toFixed(2),
            gross_amount: Math.max(0, Math.round(Number(commission.gross_amount) || 0)),
            commission_amount: amount,
            commission_rate_bps: Math.max(0, Math.round(Number(commission.commission_rate_bps) || 0)),
            payment_method: commission.orders?.payment_method
                || (commission.source_type?.startsWith('subscription') ? 'recurrence' : 'affiliate'),
            status: commissionStatusToSaleStatus(commission.status),
            commission_status: commission.status,
            created_at: commission.created_at,
            source_type: commission.source_type,
            product_name: commission.products?.name || 'Produto',
            producer_id: commission.producer_id,
            producer_name: producer?.name || producer?.email || null,
            sale_kind: 'affiliate_commission',
            notification_kind: 'affiliate_commission',
            notification_amount: amount,
        };
    });
    const recentSales = [...recentOrders, ...affiliateSales]
        .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
        .slice(0, 10);
    const notifications = [
        ...producerNotifications,
        ...affiliateSales.filter((sale) => sale.status === 'paid'),
    ]
        .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
        .slice(0, 10);

    return jsonSuccess({
        stats: {
            total_sold: totalSoldDec.toFixed(2),
            available_balance: availableDec.toFixed(2),
            pending_balance: pendingDec.toFixed(2),
            total_withdrawn: totalWithdrawnDec.toFixed(2),
            total_fees: totalFeesDec.toFixed(2),
            total_products: totalProducts || 0,
            affiliate_earnings: (periodAffiliateEarningsAmount / 100).toFixed(2),
            affiliate_commissions_paid: (periodAffiliateCommissionsPaid / 100).toFixed(2),
            net_revenue: (totalSoldDec - totalFeesDec - (periodAffiliateCommissionsPaid / 100)).toFixed(2)
        },
        monthly_sales,
        recent_orders: recentSales,
        notifications,
    });
}
