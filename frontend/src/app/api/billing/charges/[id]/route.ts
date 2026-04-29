export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = await getAuthUser(req);
        if (!auth) return jsonError('Não autorizado', 401);

        const { id } = await params;
        const userId = auth.user.id;
        const isAdmin = auth.user.role === 'admin';

        let query = supabase
            .from('billings')
            .select('*')
            .eq('id', id);

        // Non-admin users can only see their own billings
        if (!isAdmin) {
            query = query.eq('user_id', userId);
        }

        const { data: billing, error } = await query.single();

        if (error || !billing) {
            return jsonError('Cobrança não encontrada.', 404);
        }

        return jsonSuccess({
            billing: {
                ...billing,
                amount_display: (billing.amount / 100).toFixed(2),
                fee_display: (billing.fee_amount / 100).toFixed(2),
                net_display: (billing.net_amount / 100).toFixed(2)
            }
        });
    } catch (error: any) {
        console.error('[BILLING CHARGE ID GET] Error:', error);
        return jsonError(error.message, 500);
    }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = await getAuthUser(req);
        if (!auth) return jsonError('Não autorizado', 401);

        const { id } = await params;
        const userId = auth.user.id;

        const { data: billing, error: fetchError } = await supabase
            .from('billings')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (fetchError || !billing) {
            return jsonError('Cobrança não encontrada.', 404);
        }

        if (billing.status !== 'pending') {
            return jsonError('Apenas cobranças pendentes podem ser canceladas.', 400);
        }

        const { error: updateError } = await supabase
            .from('billings')
            .update({ status: 'cancelled', updated_at: new Date().toISOString() })
            .eq('id', id);

        if (updateError) throw updateError;

        return jsonSuccess({ message: 'Cobrança cancelada com sucesso.' });
    } catch (error: any) {
        console.error('[BILLING CHARGE ID PATCH] Error:', error);
        return jsonError(error.message, 500);
    }
}
