import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';

export async function GET(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);

    const email = auth.user.email?.toLowerCase().trim();

    const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('id, status, amount, current_period_end, canceled_at, subscription_plans(name, interval, interval_count)')
        .ilike('customer_email', email)
        .order('created_at', { ascending: false });

    return jsonSuccess({ subscriptions: subscriptions || [] });
}
