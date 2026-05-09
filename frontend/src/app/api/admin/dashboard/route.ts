export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabase, fetchAll } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';

export async function GET(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth || auth.user.role !== 'admin') return jsonError('Não autorizado', 403);

    // Get exact counts for basic stats
    const { count: totalSellers } = await supabase
        .from('users').select('*', { count: 'exact', head: true }).eq('role', 'seller');

    // Fetch all paid orders to calculate total revenue and monthly charts
    // We use fetchAll to bypass the 1000 row limit
    const orders = await fetchAll(supabase
        .from('orders').select('amount, created_at').eq('status', 'paid'));

    // Fetch all fees to calculate total platform earnings
    const fees = await fetchAll(supabase
        .from('transactions').select('amount').eq('type', 'fee').eq('status', 'confirmed'));

    const totalRevenue = (orders || []).reduce((s, o) => s + (o.amount || 0), 0);
    const totalFees = (fees || []).reduce((s, f) => s + (f.amount || 0), 0);

    // Monthly revenue grouping (using the orders we already fetched)
    const monthlyMap: Record<string, number> = {};
    (orders || []).forEach((o: any) => {
        const d = new Date(o.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyMap[key] = (monthlyMap[key] || 0) + o.amount;
    });

    const monthly_revenue = Object.entries(monthlyMap)
        .sort(([a], [b]) => a.localeCompare(b)) // Ensure chronological order
        .map(([month, amount]) => ({
            month, amount: (amount / 100).toFixed(2)
        }));

    // Recent orders (limited to 10)
    const { data: recent_orders } = await supabase
        .from('orders').select('id, buyer_name, amount_display, status, created_at, products(name)')
        .order('created_at', { ascending: false }).limit(10);

    return jsonSuccess({
        stats: {
            total_sellers: totalSellers || 0,
            total_orders: orders?.length || 0,
            total_revenue: (totalRevenue / 100).toFixed(2),
            total_fees: (totalFees / 100).toFixed(2)
        },
        monthly_revenue,
        recent_orders: recent_orders || []
    });
}
