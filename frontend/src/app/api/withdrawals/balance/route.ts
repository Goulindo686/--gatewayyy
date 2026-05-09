export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabase, fetchAll } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { PagarmeService } from '@/lib/pagarme';

export async function GET(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);

    try {
        // Get recipient ID
        const { data: recipient } = await supabase
            .from('recipients').select('pagarme_recipient_id').eq('user_id', auth.user.id).single();

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

                const available = balance.available_amount !== undefined ? balance.available_amount : getAmount(balance.available);
                const pending = balance.waiting_funds_amount !== undefined ? balance.waiting_funds_amount : getAmount(balance.waiting_funds);
                const transferred = balance.transferred_amount !== undefined ? balance.transferred_amount : getAmount(balance.transferred);

                // Fetch recipient status for KYC check
                const pRecipient = await PagarmeService.getRecipient(recipient.pagarme_recipient_id);

                // Fetch total sold from orders (Gross) - use fetchAll to bypass 1000 row limit
                const orders = await fetchAll(supabase
                    .from('orders').select('amount').eq('seller_id', auth.user.id).eq('status', 'paid'));
                const totalSold = (orders || []).reduce((sum, o) => sum + (o.amount || 0), 0);

                return jsonSuccess({
                    available: (available / 100).toFixed(2),
                    pending: (pending / 100).toFixed(2),
                    total_sold: (totalSold / 100).toFixed(2),
                    total_withdrawn: (transferred / 100).toFixed(2),
                    recipient_status: pRecipient.status,
                    kyc_status: pRecipient.kyc_details?.status || 'none'
                });
            } catch (pErr: any) {
                console.error('Pagar.me balance error in withdrawals API:', pErr.response?.data || pErr.message);
                // Fall through to local calculation
            }
        }

        // Fallback: Calculate balance from transactions - use fetchAll for all
        const [sales, fees, withdrawals, pendingSales] = await Promise.all([
            fetchAll(supabase.from('transactions').select('amount').eq('user_id', auth.user.id).eq('type', 'sale').eq('status', 'confirmed')),
            fetchAll(supabase.from('transactions').select('amount').eq('user_id', auth.user.id).eq('type', 'fee')),
            fetchAll(supabase.from('transactions').select('amount').eq('user_id', auth.user.id).eq('type', 'withdrawal')),
            fetchAll(supabase.from('transactions').select('amount').eq('user_id', auth.user.id).eq('type', 'sale').eq('status', 'pending'))
        ]);

        const totalSold = (sales || []).reduce((sum, t) => sum + (t.amount || 0), 0);
        const totalFees = (fees || []).reduce((sum, t) => sum + (t.amount || 0), 0);
        const totalWithdrawn = (withdrawals || []).reduce((sum, t) => sum + (t.amount || 0), 0);
        const pendingAmount = (pendingSales || []).reduce((sum, t) => sum + (t.amount || 0), 0);
        const available = totalSold - totalFees - totalWithdrawn;

        return jsonSuccess({
            available: (available / 100).toFixed(2),
            pending: (pendingAmount / 100).toFixed(2),
            total_sold: (totalSold / 100).toFixed(2),
            total_withdrawn: (totalWithdrawn / 100).toFixed(2),
            total_fees: (totalFees / 100).toFixed(2)
        });
    } catch (err: any) {
        console.error('Balance API error:', err);
        return jsonError('Erro ao buscar saldo', 500);
    }
}
