export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const auth = await getAuthUser(req);
        if (!auth) return jsonError('Não autorizado', 401);

        const userId = auth.user.id;

        // Get all billings for user
        const { data: billings, error } = await supabase
            .from('billings')
            .select('status, amount, fee_amount, net_amount')
            .eq('user_id', userId);

        if (error) {
            console.error('[BILLING STATS] Error:', error);
            // If table doesn't exist yet, return empty stats instead of crashing
            if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
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
                        total_net_display: "0.00"
                    }
                });
            }
            return jsonError(error.message, 500);
        }

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

        return jsonSuccess({
            stats: {
                ...stats,
                total_amount_display: (stats.total_amount / 100).toFixed(2),
                total_paid_display: (stats.total_paid / 100).toFixed(2),
                total_fees_display: (stats.total_fees / 100).toFixed(2),
                total_net_display: (stats.total_net / 100).toFixed(2)
            }
        });
    } catch (error: any) {
        console.error('[BILLING STATS] Unexpected Error:', error);
        return jsonError(error.message, 500);
    }
}
