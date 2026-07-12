export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth || auth.user.role !== 'admin') return jsonError('Nao autorizado', 403);

    const ip =
        req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        req.headers.get('x-real-ip') ||
        'unknown';
    const rl = await checkRateLimit({ key: `admin:withdrawals:get:${auth.user.id}:${ip}`, limit: 60, windowSecs: 60, failOpen: true });
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    const status = req.nextUrl.searchParams.get('status') || '';

    let query = supabase
        .from('withdrawals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

    if (status) query = query.eq('status', status);

    const { data: withdrawals, error } = await query;
    if (error) return jsonError('Erro ao buscar saques', 500);

    const userIds = [...new Set((withdrawals || []).map(w => w.user_id).filter(Boolean))];
    const { data: users } = userIds.length
        ? await supabase.from('users').select('id, name, email, pix_key, pix_key_type').in('id', userIds)
        : { data: [] };

    const usersById = new Map((users || []).map(user => [user.id, user]));
    const formatted = (withdrawals || []).map(withdrawal => ({
        ...withdrawal,
        amount_display: withdrawal.amount_display || (withdrawal.amount / 100).toFixed(2),
        seller: usersById.get(withdrawal.user_id) || null,
    }));

    return jsonSuccess({ withdrawals: formatted });
}
