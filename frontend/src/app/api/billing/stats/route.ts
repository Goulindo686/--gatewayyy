export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabase, fetchAll } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const auth = await getAuthUser(req);
        if (!auth) return jsonError('Não autorizado', 401);

        const userId = auth.user.id;

        // Get all billings for user - use fetchAll to bypass 1000 row limit
        const billings = await fetchAll(supabase
            .from('billings')
            .select('status, amount, fee_amount, net_amount')
            .eq('user_id', userId));

        const stats = {
            total_billings: billings.length,
            pending: billings.filter(b => b.status === 'pending').length,
            paid: billings.filter(b => b.status === 'paid').length,
            expired: billings.filter(b => b.status === 'expired').length,
            cancelled: billings.filter(b => b.status === 'cancelled').length,
            total_amount: billings.reduce((sum, b) => sum + b.amount, 0),
            total_paid: billings.filter(b => b.status === 'paid').reduce((sum, b) => sum + b.amount, 0),
            total_fees: billings.filter(b => b.status === 'paid').reduce((sum, b) => sum + b.fee_amount, 0),
            total_net: billings.filter(b => b.status === 'paid').reduce((sum, b) => sum + b.net_amount, 0)
        };

        let defaultFeeCents = auth.user.role === 'admin' ? 0 : 200;
        const { data: platformSettings } = await supabase
            .from('platform_settings')
            .select('fee_percentage')
            .limit(1)
            .maybeSingle();
        if (platformSettings?.fee_percentage !== undefined && Number(platformSettings.fee_percentage) <= 0) {
            defaultFeeCents = 0;
        }
        const { data: pixFeeSetting } = auth.user.role === 'admin'
            ? { data: null }
            : await supabase
                .from('seller_pix_fee_settings')
                .select('fee_type, fixed_fee_cents, percentage')
                .eq('seller_id', userId)
                .maybeSingle();

        return jsonSuccess({
            stats: {
                ...stats,
                total_amount_display: (stats.total_amount / 100).toFixed(2),
                total_paid_display: (stats.total_paid / 100).toFixed(2),
                total_fees_display: (stats.total_fees / 100).toFixed(2),
                total_net_display: (stats.total_net / 100).toFixed(2),
                pix_fee: pixFeeSetting || {
                    fee_type: defaultFeeCents > 0 ? 'default' : 'exempt',
                    fixed_fee_cents: null,
                    percentage: null,
                    default_fee_cents: defaultFeeCents,
                },
            }
        });
    } catch (error: unknown) {
        const details = error as { code?: string; message?: string };
        console.error('[BILLING STATS] Error:', error);
        // If table doesn't exist yet or other Postgres error
        if (details.code === 'PGRST116' || details.message?.includes('does not exist')) {
             return jsonSuccess({
                stats: {
                    total_billings: 0,
                    pending: 0,
                    paid: 0,
                    expired: 0,
                    cancelled: 0,
                    total_amount: 0,
                    total_paid: 0,
                    total_fees: 0,
                    total_net: 0,
                    total_amount_display: "0.00",
                    total_paid_display: "0.00",
                    total_fees_display: "0.00",
                    total_net_display: "0.00",
                    pix_fee: { fee_type: 'default', fixed_fee_cents: null, percentage: null, default_fee_cents: 200 }
                }
            });
        }
        return jsonError(details.message || 'Erro ao carregar estatísticas', 500);
    }
}
