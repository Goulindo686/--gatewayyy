import { NextRequest } from 'next/server';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { supabase } from '@/lib/db';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { ensureAffiliateLink, ensureAffiliatePayoutControl } from '@/lib/affiliates';

export async function POST(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Nao autorizado', 401);

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const rateLimit = await checkRateLimit({
        key: `affiliates:request:${auth.user.id}:${ip}`,
        limit: 20,
        windowSecs: 3600,
        failOpen: false,
    });
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit.resetAt);

    const body = await req.json();
    if (body.terms_accepted !== true) return jsonError('Voce precisa aceitar os termos do programa.', 400);

    let query = supabase
        .from('affiliate_programs')
        .select('*')
        .eq('status', 'active');
    if (body.program_id) query = query.eq('id', String(body.program_id));
    else if (body.invite_code) query = query.eq('invite_code', String(body.invite_code).trim());
    else return jsonError('Informe o programa ou o convite.', 400);
    const { data: program, error: programError } = await query.maybeSingle();
    if (programError || !program) return jsonError('Programa de afiliados nao encontrado.', 404);
    if (program.producer_id === auth.user.id) return jsonError('Nao e permitido afiliar-se ao proprio produto.', 400);

    const validInvite = Boolean(body.invite_code)
        && String(body.invite_code).trim() === program.invite_code
        && (
            !program.invite_expires_at
            || new Date(program.invite_expires_at).getTime() > Date.now()
        );
    if (program.enrollment_mode === 'invite' && !validInvite) {
        return jsonError('Este programa aceita afiliados somente por convite.', 403);
    }

    const { data: recipientRows } = await supabase
        .from('recipients')
        .select('pagarme_recipient_id, status, updated_at')
        .eq('user_id', auth.user.id)
        .not('pagarme_recipient_id', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(1);
    const recipient = recipientRows?.[0];
    if (!recipient?.pagarme_recipient_id || ['refused', 'suspended'].includes(recipient.status)) {
        return jsonError('Configure e valide sua conta de recebimento antes de solicitar afiliacao.', 400);
    }

    const { data: existing } = await supabase
        .from('affiliate_affiliations')
        .select('*')
        .eq('program_id', program.id)
        .eq('affiliate_id', auth.user.id)
        .maybeSingle();
    if (existing?.status === 'suspended' || existing?.status === 'rejected') {
        return jsonError('Esta afiliacao precisa ser liberada pelo produtor antes de uma nova solicitacao.', 403);
    }

    const status = program.enrollment_mode === 'automatic' || validInvite ? 'approved' : 'pending';
    if (status === 'approved') {
        try {
            await ensureAffiliatePayoutControl(auth.user.id, recipient.pagarme_recipient_id);
        } catch (error) {
            console.error('[AFFILIATES] Failed to protect affiliate payout settings:', error);
            return jsonError('Nao foi possivel proteger o saldo de afiliado agora. Tente novamente em instantes.', 503);
        }
    }
    const now = new Date().toISOString();
    const values = {
        program_id: program.id,
        affiliate_id: auth.user.id,
        status,
        requested_at: now,
        approved_at: status === 'approved' ? now : null,
        ended_at: null,
        terms_accepted_at: now,
        terms_snapshot: program.terms_text || null,
        accepted_terms_version: Math.max(1, Number(program.terms_version || 1)),
        accepted_commission_rate_bps: program.commission_rate_bps,
        accepted_hold_days: program.hold_days,
        accepted_commission_on_bumps: Boolean(program.commission_on_bumps),
        accepted_commission_on_renewals: Boolean(program.commission_on_renewals),
    };
    const affiliationQuery = existing
        ? supabase.from('affiliate_affiliations').update(values).eq('id', existing.id)
        : supabase.from('affiliate_affiliations').insert(values);
    const { data: affiliation, error } = await affiliationQuery.select().single();
    if (error) {
        console.error('[AFFILIATES] Affiliation request error:', error);
        return jsonError('Nao foi possivel enviar sua solicitacao.', 500);
    }

    const link = status === 'approved'
        ? await ensureAffiliateLink({ affiliationId: affiliation.id, productId: program.product_id })
        : null;
    return jsonSuccess({ affiliation, link }, existing ? 200 : 201);
}
