export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth || auth.user.role !== 'admin') return jsonError('Não autorizado', 403);

    const ip =
        req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        req.headers.get('x-real-ip') ||
        'unknown';
    const rl = await checkRateLimit({ key: `admin:transactions:get:${auth.user.id}:${ip}`, limit: 30, windowSecs: 60, failOpen: true });
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    const type = req.nextUrl.searchParams.get('type') || '';
    const status = req.nextUrl.searchParams.get('status') || '';

    let query = supabase
        .from('transactions')
        .select('id, type, amount, amount_display, status, description, created_at, users(name)')
        .order('created_at', { ascending: false })
        .limit(100);

    if (type) query = query.eq('type', type);
    if (status) query = query.eq('status', status);

    const { data: transactions } = await query;

    return jsonSuccess({ transactions: transactions || [] });
}
