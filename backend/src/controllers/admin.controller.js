const { supabase } = require('../config/database');
const jwt = require('jsonwebtoken');

class AdminController {
    async getDashboard(req, res, next) {
        try {
            // Total sellers
            const { count: totalSellers } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'seller');

            // Total orders
            const { count: totalOrders } = await supabase
                .from('orders')
                .select('*', { count: 'exact', head: true });

            // Total revenue (paid orders)
            const { data: paidOrders } = await supabase
                .from('orders')
                .select('amount')
                .eq('status', 'paid');

            const totalRevenue = paidOrders?.reduce((sum, o) => sum + o.amount, 0) || 0;

            // Total fees collected
            const { data: feesData } = await supabase
                .from('platform_fees')
                .select('amount');

            const totalFees = feesData?.reduce((sum, f) => sum + f.amount, 0) || 0;

            // Recent orders
            const { data: recentOrders } = await supabase
                .from('orders')
                .select('*, products(name)')
                .order('created_at', { ascending: false })
                .limit(10);

            // Monthly revenue (last 12 months)
            const { data: allPaidOrders } = await supabase
                .from('orders')
                .select('amount, created_at')
                .eq('status', 'paid')
                .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());

            const monthlyRevenue = this._groupByMonth(allPaidOrders || []);

            res.json({
                stats: {
                    total_sellers: totalSellers || 0,
                    total_orders: totalOrders || 0,
                    total_revenue: (totalRevenue / 100).toFixed(2),
                    total_fees: (totalFees / 100).toFixed(2)
                },
                recent_orders: recentOrders?.map(o => ({
                    ...o,
                    amount_display: (o.amount / 100).toFixed(2)
                })),
                monthly_revenue: monthlyRevenue
            });
        } catch (error) {
            next(error);
        }
    }

    async listSellers(req, res, next) {
        try {
            const { page = 1, limit = 20, search } = req.query;
            const offset = (page - 1) * limit;

            let query = supabase
                .from('users')
                .select('id, name, email, cpf_cnpj, status, created_at, role', { count: 'exact' })
                .eq('role', 'seller')
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (search) {
                query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
            }

            const { data, count, error } = await query;
            if (error) throw error;

            res.json({
                sellers: data,
                total: count,
                page: parseInt(page),
                totalPages: Math.ceil(count / limit)
            });
        } catch (error) {
            next(error);
        }
    }

    async toggleBlockSeller(req, res, next) {
        try {
            const { id } = req.params;
            const { blocked } = req.body;

            const { data, error } = await supabase
                .from('users')
                .update({
                    status: blocked ? 'blocked' : 'active',
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .eq('role', 'seller')
                .select('id, name, email, status')
                .single();

            if (error) throw error;
            if (!data) return res.status(404).json({ error: 'Vendedor não encontrado.' });

            res.json({
                seller: data,
                message: blocked ? 'Vendedor bloqueado.' : 'Vendedor desbloqueado.'
            });
        } catch (error) {
            next(error);
        }
    }

    async listTransactions(req, res, next) {
        try {
            const { page = 1, limit = 20, type, status } = req.query;
            const offset = (page - 1) * limit;

            let query = supabase
                .from('transactions')
                .select('*, users(name, email)', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (type) query = query.eq('type', type);
            if (status) query = query.eq('status', status);

            const { data, count, error } = await query;
            if (error) throw error;

            res.json({
                transactions: data?.map(t => ({
                    ...t,
                    amount_display: (t.amount / 100).toFixed(2)
                })),
                total: count,
                page: parseInt(page),
                totalPages: Math.ceil(count / limit)
            });
        } catch (error) {
            next(error);
        }
    }

    async updateFee(req, res, next) {
        try {
            const { fee_percentage } = req.body;

            if (fee_percentage < 0 || fee_percentage > 100) {
                return res.status(400).json({ error: 'Porcentagem deve ser entre 0 e 100.' });
            }

            const { data, error } = await supabase
                .from('platform_settings')
                .update({
                    fee_percentage,
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;

            res.json({
                settings: data,
                message: `Taxa atualizada para ${fee_percentage}%`
            });
        } catch (error) {
            next(error);
        }
    }

    async impersonateSeller(req, res, next) {
        try {
            const { id } = req.params;

            const { data: user, error } = await supabase
                .from('users')
                .select('id, name, email, role, status, avatar_url')
                .eq('id', id)
                .single();

            if (error || !user) return res.status(404).json({ error: 'Usuário não encontrado.' });

            // Token temporário de 2 horas com flag de impersonation
            const token = jwt.sign(
                { userId: user.id, role: user.role, impersonated_by: req.user.id },
                process.env.JWT_SECRET,
                { expiresIn: '2h' }
            );

            res.json({
                token,
                user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar_url: user.avatar_url },
                message: `Sessão iniciada como ${user.name}`
            });
        } catch (error) {
            next(error);
        }
    }

    async getSettings(req, res, next) {
        try {
            const { data, error } = await supabase
                .from('platform_settings')
                .select('*')
                .single();

            if (error) throw error;

            res.json({ settings: data });
        } catch (error) {
            next(error);
        }
    }

    _groupByMonth(orders) {
        const months = {};
        orders.forEach(order => {
            const date = new Date(order.created_at);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            months[key] = (months[key] || 0) + order.amount;
        });

        return Object.entries(months)
            .map(([month, amount]) => ({
                month,
                amount: (amount / 100).toFixed(2)
            }))
            .sort((a, b) => a.month.localeCompare(b.month));
    }
}

module.exports = new AdminController();
