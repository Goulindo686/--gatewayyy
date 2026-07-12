export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';

export async function PUT(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth || auth.user.role !== 'admin') return jsonError('Não autorizado', 403);

    try {
        const ip =
            req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
            req.headers.get('x-real-ip') ||
            'unknown';
        const rl = await checkRateLimit({ key: `admin:settings:fees:put:${auth.user.id}:${ip}`, limit: 20, windowSecs: 3600, failOpen: true });
        if (!rl.allowed) return rateLimitResponse(rl.resetAt);

        const { fee_percentage } = await req.json();
        if (fee_percentage === undefined || fee_percentage < 0 || fee_percentage > 100) {
            return jsonError('Porcentagem deve ser entre 0 e 100');
        }

        // Upsert platform settings
        const { data: existing } = await supabase.from('platform_settings').select('id').limit(1).single();

        if (existing) {
            await supabase.from('platform_settings').update({ fee_percentage }).eq('id', existing.id);
        } else {
            await supabase.from('platform_settings').insert({ fee_percentage });
        }

        return jsonSuccess({ message: `Taxa atualizada para ${fee_percentage}%` });
    } catch {
        return jsonError('Erro interno', 500);
    }
}
