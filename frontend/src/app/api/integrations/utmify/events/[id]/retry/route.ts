export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { decryptUtmifyToken, retryUtmifyEvent } from '@/lib/utmify';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await getAuthUser(req);
    if (!auth?.user) return jsonError('Nao autorizado', 401);
    if (auth.tokenPayload?.impersonated_by) return jsonError('Acao bloqueada durante acesso como vendedor', 403);

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
    const rl = await checkRateLimit({ key: `utmify:retry:${auth.user.id}:${ip}`, limit: 20, windowSecs: 3600, failOpen: true });
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    const { id } = await params;
    const { data: event, error } = await supabase
        .from('utmify_events')
        .select('*')
        .eq('id', id)
        .eq('seller_id', auth.user.id)
        .single();

    if (error || !event) return jsonError('Evento nao encontrado', 404);

    const token = decryptUtmifyToken(auth.user.utmify_api_token);
    if (!auth.user.utmify_enabled || !token) return jsonError('Ative a UTMify e salve a credencial antes de reenviar.');

    const result = await retryUtmifyEvent(event, token);
    if ((result as any).ok) return jsonSuccess({ message: 'Evento reenviado para a UTMify.', result });

    return jsonError((result as any).error || 'Nao foi possivel reenviar o evento.', 400);
}
