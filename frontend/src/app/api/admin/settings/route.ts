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

    const { data: settingsRows, error } = await supabase
        .from('platform_settings')
        .select('*')
        .order('updated_at', { ascending: false, nullsFirst: false });

    if (error) return jsonError('Erro ao carregar configurações', 500);

    const primarySettings = settingsRows?.[0];
    const configuredWebhook = settingsRows
        ?.map(row => normalizeDiscordWebhookUrl(row.discord_webhook_url))
        .find((value): value is string => Boolean(value));

    return jsonSuccess({
        settings: {
            ...(primarySettings || {
                fee_percentage: parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || '2')
            }),
            discord_webhook_url: configuredWebhook || null
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

        // Preserva as taxas das linhas legadas: o webhook permanece na linha
        // que já o contém; se não houver uma, usamos a configuração mais recente.
        const { data: existingRows, error: existingError } = await supabase
            .from('platform_settings')
            .select('id, discord_webhook_url, updated_at')
            .order('updated_at', { ascending: false, nullsFirst: false });

        if (existingError) throw existingError;

        const existing = existingRows?.find(row =>
            Boolean(normalizeDiscordWebhookUrl(row.discord_webhook_url))
        ) || existingRows?.[0];

        let result;
        if (existing) {
            result = await supabase
                .from('platform_settings')
                .update({
                    discord_webhook_url: discordWebhookUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select('id, discord_webhook_url')
                .single();
        } else {
            result = await supabase
                .from('platform_settings')
                .insert([{ discord_webhook_url: discordWebhookUrl }])
                .select('id, discord_webhook_url')
                .single();
        }

        if (result.error) throw result.error;

        return jsonSuccess({
            message: 'Configurações salvas com sucesso',
            settings: result.data
        });
    } catch (error: any) {
        return jsonError('Erro ao salvar configurações', 500);
    }
}
