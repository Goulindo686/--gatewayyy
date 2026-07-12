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
    const rl = await checkRateLimit({ key: `admin:settings:get:${auth.user.id}:${ip}`, limit: 60, windowSecs: 60, failOpen: true });
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    const { data: settings } = await supabase
        .from('platform_settings').select('*').limit(1).single();

    return jsonSuccess({
        settings: settings || {
            fee_percentage: parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || '2')
        }
    });
}
