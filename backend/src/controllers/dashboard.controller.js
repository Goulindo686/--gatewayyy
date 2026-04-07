const { supabase } = require('../config/database');

class DashboardController {
    async getStats(req, res, next) {
        try {
            const userId = req.user.id;

            // Total sales
            const { data: salesData } = await supabase
                .from('orders')
                .select('amount, created_at')
                .eq('seller_id', userId)
                .eq('status', 'paid');

            const totalSold = salesData?.reduce((sum, o) => sum + o.amount, 0) || 0;
            const totalOrders = salesData?.length || 0;

            // Pending orders
            const { data: pendingData } = await supabase
                .from('orders')
                .select('amount')
                .eq('seller_id', userId)
                .eq('status', 'pending');

            const pendingAmount = pendingData?.reduce((sum, o) => sum + o.amount, 0) || 0;

            // Total withdrawn
            const { data: withdrawnData } = await supabase
                .from('withdrawals')
                .select('amount')
                .eq('user_id', userId)
                .eq('status', 'completed');

            const totalWithdrawn = withdrawnData?.reduce((sum, w) => sum + w.amount, 0) || 0;

            // Total fees paid
            const { data: feesData } = await supabase
                .from('transactions')
                .select('amount')
                .eq('user_id', userId)
                .eq('type', 'fee')
                .eq('status', 'confirmed');

            const totalFees = feesData?.reduce((sum, t) => sum + t.amount, 0) || 0;

            // Net available
            const { data: refundsData } = await supabase
                .from('transactions')
                .select('amount')
                .eq('user_id', userId)
                .eq('type', 'refund')
                .eq('status', 'confirmed');

            const totalRefunds = refundsData?.reduce((sum, t) => sum + t.amount, 0) || 0;

            const netSales = totalSold - totalFees;
            const available = netSales - totalWithdrawn - totalRefunds;

            // Products count
            const { count: totalProducts } = await supabase
                .from('products')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);

            // Monthly sales (last 6 months)
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

            const monthlySales = this._groupByMonth(salesData?.filter(s =>
                new Date(s.created_at) >= sixMonthsAgo
            ) || []);

            // Recent orders
            const { data: recentOrders } = await supabase
                .from('orders')
                .select('*, products(name)')
                .eq('seller_id', userId)
                .order('created_at', { ascending: false })
                .limit(5);

            res.json({
                stats: {
                    total_sold: (totalSold / 100).toFixed(2),
                    net_revenue: (netSales / 100).toFixed(2),
                    available_balance: (Math.max(0, available) / 100).toFixed(2),
                    pending_balance: (pendingAmount / 100).toFixed(2),
                    total_withdrawn: (totalWithdrawn / 100).toFixed(2),
                    total_fees: (totalFees / 100).toFixed(2),
                    total_orders: totalOrders,
                    total_products: totalProducts || 0
                },
                monthly_sales: monthlySales,
                recent_orders: recentOrders?.map(o => ({
                    ...o,
                    amount_display: (o.amount / 100).toFixed(2)
                }))
            });
        } catch (error) {
            next(error);
        }
    }

    async getSales(req, res, next) {
        try {
            const userId = req.user.id;
            const { status, method, start, end, search } = req.query;

            let query = supabase
                .from('orders')
                .select('*, products(name)')
                .eq('seller_id', userId)
                .order('created_at', { ascending: false });

            if (status) query = query.eq('status', status);
            if (method) query = query.eq('payment_method', method);
            if (start) query = query.gte('created_at', start);
            if (end) query = query.lte('created_at', end);

            // Se houver busca, aplicamos filtros de texto
            if (search) {
                query = query.or(`buyer_name.ilike.%${search}%,buyer_email.ilike.%${search}%,buyer_cpf.ilike.%${search}%,product_name.ilike.%${search}%`);
            }

            const { data: sales, error } = await query;

            if (error) throw error;

            const totalAmount = sales?.reduce((sum, o) => sum + o.amount, 0) || 0;

            res.json({
                sales: sales?.map(o => ({
                    ...o,
                    product_name: o.products?.name || o.product_name,
                    amount_display: (o.amount / 100).toFixed(2)
                })),
                summary: {
                    count: sales?.length || 0,
                    total_amount_display: (totalAmount / 100).toFixed(2)
                }
            });
        } catch (error) {
            next(error);
        }
    }

    _groupByMonth(orders) {
        const months = {};
        const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

        orders.forEach(order => {
            const date = new Date(order.created_at);
            const key = `${labels[date.getMonth()]}/${date.getFullYear().toString().slice(-2)}`;
            months[key] = (months[key] || 0) + order.amount;
        });

        return Object.entries(months).map(([month, amount]) => ({
            month,
            amount: parseFloat((amount / 100).toFixed(2))
        }));
    }
}

module.exports = new DashboardController();
