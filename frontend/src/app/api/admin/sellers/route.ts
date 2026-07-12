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
    const rl = await checkRateLimit({ key: `admin:sellers:get:${auth.user.id}:${ip}`, limit: 60, windowSecs: 60, failOpen: true });
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    const search = req.nextUrl.searchParams.get('search') || '';

    let query = supabase
        .from('users')
        .select('id, name, email, cpf_cnpj, status, created_at')
        .eq('role', 'seller')
        .order('created_at', { ascending: false });

    if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: sellers } = await query;

    return jsonSuccess({ sellers: sellers || [] });
}
