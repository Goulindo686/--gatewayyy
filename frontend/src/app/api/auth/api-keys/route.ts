import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Erro interno';
}

export async function GET(req: NextRequest) {
    try {
        const auth = await getAuthUser(req);
        if (!auth || !auth.user) {
            return jsonError('Nao autorizado', 401);
        }
        if (auth.tokenPayload?.impersonated_by) {
            return jsonError('Acao bloqueada durante acesso como vendedor', 403);
        }
        const user = auth.user;

        const ip =
            req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
            req.headers.get('x-real-ip') ||
            'unknown';
        const rl = await checkRateLimit({ key: `api_keys:get:${user.id}:${ip}`, limit: 120, windowSecs: 60, failOpen: true });
        if (!rl.allowed) return rateLimitResponse(rl.resetAt);

        const { data: keys, error } = await supabase
            .from('api_keys')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return jsonSuccess({ keys });
    } catch (error: unknown) {
        return jsonError(getErrorMessage(error), 500);
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = await getAuthUser(req);
        if (!auth || !auth.user) {
            return jsonError('Nao autorizado', 401);
        }
        if (auth.tokenPayload?.impersonated_by) {
            return jsonError('Acao bloqueada durante acesso como vendedor', 403);
        }
        const user = auth.user;

        const ip =
            req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
            req.headers.get('x-real-ip') ||
            'unknown';
        const rl = await checkRateLimit({ key: `api_keys:post:${user.id}:${ip}`, limit: 10, windowSecs: 86400, failOpen: true });
        if (!rl.allowed) return rateLimitResponse(rl.resetAt);

        const newKey = 'gou_live_' + uuidv4().replace(/-/g, '');

        const { data, error } = await supabase
            .from('api_keys')
            .insert({
                user_id: user.id,
                api_key: newKey,
                key_type: 'live'
            })
            .select()
            .single();

        if (error) throw error;

        return jsonSuccess({ key: data });
    } catch (error: unknown) {
        return jsonError(getErrorMessage(error), 500);
    }
}
