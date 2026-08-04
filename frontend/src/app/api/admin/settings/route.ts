export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { normalizeDiscordWebhookUrl } from '@/lib/discord-webhook';
import { requestBodyTooLarge } from '@/lib/request-security';

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

export async function PUT(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth || auth.user.role !== 'admin') return jsonError('Não autorizado', 403);

    const ip =
        req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        req.headers.get('x-real-ip') ||
        'unknown';
    const rl = await checkRateLimit({ key: `admin:settings:put:${auth.user.id}:${ip}`, limit: 30, windowSecs: 60, failOpen: true });
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);
    if (requestBodyTooLarge(req, 8_192)) return jsonError('Requisição muito grande', 413);

    try {
        const body = await req.json();
        const rawDiscordWebhookUrl = body.discord_webhook_url;
        const discordWebhookUrl = normalizeDiscordWebhookUrl(rawDiscordWebhookUrl);
        if (typeof rawDiscordWebhookUrl !== 'string') {
            return jsonError('Webhook do Discord inválido', 400);
        }
        if (rawDiscordWebhookUrl.trim() && !discordWebhookUrl) {
            return jsonError('Use uma URL oficial de webhook do Discord', 400);
        }

        // Verifica se já existe um registro
        const { data: existing } = await supabase.from('platform_settings').select('id').limit(1).single();

        let result;
        if (existing) {
            result = await supabase
                .from('platform_settings')
                .update({ discord_webhook_url: discordWebhookUrl })
                .eq('id', existing.id);
        } else {
            result = await supabase
                .from('platform_settings')
                .insert([{ discord_webhook_url: discordWebhookUrl }]);
        }

        if (result.error) throw result.error;

        return jsonSuccess({ message: 'Configurações salvas com sucesso' });
    } catch (error: any) {
        return jsonError('Erro ao salvar configurações', 500);
    }
}
