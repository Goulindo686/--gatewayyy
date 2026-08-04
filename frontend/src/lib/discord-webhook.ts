import { NextRequest } from 'next/server';
import { supabase } from './db';

const DISCORD_WEBHOOK_HOSTS = new Set(['discord.com', 'discordapp.com']);

export function normalizeDiscordWebhookUrl(value: unknown): string | null {
    if (typeof value !== 'string' || !value.trim()) return null;

    try {
        const url = new URL(value.trim());
        if (url.protocol !== 'https:' || !DISCORD_WEBHOOK_HOSTS.has(url.hostname.toLowerCase())) return null;
        if (!/^\/api\/webhooks\/\d+\/[A-Za-z0-9._-]+$/.test(url.pathname)) return null;
        if (url.username || url.password || url.port || url.search || url.hash) return null;
        return url.toString();
    } catch {
        return null;
    }
}

function discordField(value: unknown, fallback = 'Não informado') {
    const text = String(value ?? '').trim() || fallback;
    return text.slice(0, 1024);
}

export async function notifyNewAccountOnDiscord(
    req: NextRequest,
    user: { name?: unknown; email?: unknown; phone?: unknown; cpf_cnpj?: unknown },
) {
    try {
        const { data: settings, error } = await supabase
            .from('platform_settings')
            .select('discord_webhook_url')
            .not('discord_webhook_url', 'is', null)
            .limit(1)
            .maybeSingle();

        if (error || !settings?.discord_webhook_url) return;
        const webhookUrl = normalizeDiscordWebhookUrl(settings.discord_webhook_url);
        if (!webhookUrl) {
            console.error('[REGISTER] Webhook do Discord configurado com URL inválida');
            return;
        }

        const ip = req.headers.get('cf-connecting-ip')
            || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
            || req.headers.get('x-real-ip')
            || 'Desconhecido';
        const userAgent = req.headers.get('user-agent') || 'Desconhecido';

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                allowed_mentions: { parse: [] },
                embeds: [{
                    title: '🚨 Nova Conta Criada',
                    description: 'Um novo usuário se cadastrou na plataforma.',
                    color: 5814783,
                    fields: [
                        { name: 'Nome', value: discordField(user.name), inline: true },
                        { name: 'Email', value: discordField(user.email), inline: true },
                        { name: 'Telefone', value: discordField(user.phone), inline: true },
                        { name: 'CPF/CNPJ', value: discordField(user.cpf_cnpj), inline: true },
                        { name: 'Endereço IP informado', value: discordField(ip), inline: true },
                        { name: 'User-Agent', value: discordField(userAgent), inline: false },
                        { name: 'Data/Hora', value: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }), inline: false },
                    ],
                }],
            }),
            redirect: 'error',
            signal: AbortSignal.timeout(5_000),
        });

        if (!response.ok) {
            console.error(`[REGISTER] Discord recusou a notificação (${response.status})`);
        }
    } catch (error) {
        console.error('[REGISTER] Falha ao enviar notificação ao Discord:', error instanceof Error ? error.message : 'erro desconhecido');
    }
}
