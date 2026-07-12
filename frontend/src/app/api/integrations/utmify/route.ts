export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { decryptUtmifyToken, encryptUtmifyToken, sendUtmifyOrderWithLog } from '@/lib/utmify';

function sanitizeToken(value: any) {
    const token = String(value || '').trim();
    return token || null;
}

export async function GET(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth?.user) return jsonError('Nao autorizado', 401);

    const { data: events, error: eventsError } = await supabase
        .from('utmify_events')
        .select('id, order_id, event_type, status, response_status, error_message, attempt_count, next_retry_at, sent_at, created_at, updated_at')
        .eq('seller_id', auth.user.id)
        .order('created_at', { ascending: false })
        .limit(20);
    if (eventsError) console.warn('[UTMIFY] Events table unavailable:', eventsError.message);

    const decrypted = decryptUtmifyToken(auth.user.utmify_api_token);
    const hasToken = !!decrypted;

    return jsonSuccess({
        integration: {
            enabled: !!auth.user.utmify_enabled,
            api_token: '',
            has_token: hasToken,
            last_sent_at: auth.user.utmify_last_sent_at || null,
            last_error: auth.user.utmify_last_error || null,
        },
        events: eventsError ? [] : (events || [])
    });
}

export async function PUT(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth?.user) return jsonError('Nao autorizado', 401);
    if (auth.tokenPayload?.impersonated_by) return jsonError('Acao bloqueada durante acesso como vendedor', 403);

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
    const rl = await checkRateLimit({ key: `utmify:put:${auth.user.id}:${ip}`, limit: 30, windowSecs: 3600, failOpen: true });
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    const body = await req.json();
    const enabled = !!body.enabled;
    const token = sanitizeToken(body.api_token);
    const existingToken = decryptUtmifyToken(auth.user.utmify_api_token);
    const tokenToStore = token ? encryptUtmifyToken(token) : auth.user.utmify_api_token || null;

    if (enabled && !token && !existingToken) return jsonError('Informe a credencial API da UTMify para ativar.');

    const updateData = {
        utmify_enabled: enabled,
        utmify_api_token: enabled ? tokenToStore : null,
        utmify_last_error: null,
    };

    const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', auth.user.id);

    if (error) return jsonError(`Erro ao salvar UTMify: ${error.message}`, 500);

    return jsonSuccess({
        integration: {
            enabled,
            api_token: '',
            has_token: enabled && !!(token || existingToken),
            last_error: null,
            last_sent_at: auth.user.utmify_last_sent_at || null,
        },
        message: 'Integracao UTMify salva com sucesso.'
    });
}

export async function POST(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth?.user) return jsonError('Nao autorizado', 401);
    if (auth.tokenPayload?.impersonated_by) return jsonError('Acao bloqueada durante acesso como vendedor', 403);

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
    const rl = await checkRateLimit({ key: `utmify:test:${auth.user.id}:${ip}`, limit: 10, windowSecs: 3600, failOpen: true });
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    const token = decryptUtmifyToken(auth.user.utmify_api_token);
    if (!auth.user.utmify_enabled || !token) return jsonError('Ative a UTMify e salve a credencial antes de testar.');

    const now = new Date().toISOString();
    const result = await sendUtmifyOrderWithLog({
        token,
        sellerId: auth.user.id,
        isTest: true,
        status: 'paid',
        product: {
            id: 'goupay-test-product',
            name: 'Produto de teste GouPay',
        },
        order: {
            id: `goupay-test-${Date.now()}`,
            seller_id: auth.user.id,
            product_id: 'goupay-test-product',
            buyer_name: auth.user.name || 'Cliente Teste',
            buyer_email: auth.user.email || 'cliente@goupay.com.br',
            buyer_phone: auth.user.phone || null,
            buyer_cpf: auth.user.cpf_cnpj || null,
            amount: 1000,
            payment_method: 'pix',
            status: 'paid',
            created_at: now,
            client_ip: ip,
            utm_source: 'facebook',
            utm_campaign: 'campanha_teste_goupay',
            utm_medium: 'cpc',
            utm_content: 'criativo_teste',
            utm_term: 'publico_teste',
            utm_src: 'goupay',
            utm_sck: 'teste',
        }
    });

    if ((result as any).ok) {
        await supabase.from('users')
            .update({ utmify_last_sent_at: now, utmify_last_error: null })
            .eq('id', auth.user.id);
        return jsonSuccess({ message: 'Evento de teste enviado para a UTMify.', result });
    }

    const errorMessage = (result as any).error || 'Nao foi possivel enviar o teste para a UTMify.';
    await supabase.from('users')
        .update({ utmify_last_error: errorMessage })
        .eq('id', auth.user.id);

    return jsonError(errorMessage, 400);
}
