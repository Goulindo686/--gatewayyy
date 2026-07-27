import { NextRequest } from 'next/server';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { supabase } from '@/lib/db';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { ensureAffiliateLink } from '@/lib/affiliates';
import { normalizeAffiliateRateBps } from '@/lib/affiliates-core';

const producerActions = new Set(['approve', 'reject', 'suspend', 'cancel']);

export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Nao autorizado', 401);

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const rateLimit = await checkRateLimit({
        key: `affiliates:affiliation:update:${auth.user.id}:${ip}`,
        limit: 60,
        windowSecs: 3600,
        failOpen: false,
    });
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit.resetAt);

    const { id } = await context.params;
    const body = await req.json();
    const action = String(body.action || '');
    const { data: affiliation } = await supabase
        .from('affiliate_affiliations')
        .select('*')
        .eq('id', id)
        .maybeSingle();
    if (!affiliation) return jsonError('Afiliacao nao encontrada.', 404);

    const { data: program } = await supabase
        .from('affiliate_programs')
        .select('id, producer_id, product_id')
        .eq('id', affiliation.program_id)
        .maybeSingle();
    if (!program) return jsonError('Programa nao encontrado.', 404);

    const isAdmin = auth.user.role === 'admin';
    const isProducer = program.producer_id === auth.user.id;
    const isAffiliate = affiliation.affiliate_id === auth.user.id;
    if (action === 'cancel' && isAffiliate) {
        // An affiliate can leave their own program.
    } else if (!producerActions.has(action) || (!isProducer && !isAdmin)) {
        return jsonError('Voce nao pode alterar esta afiliacao.', 403);
    }

    let status = affiliation.status;
    if (action === 'approve') status = 'approved';
    if (action === 'reject') status = 'rejected';
    if (action === 'suspend') status = 'suspended';
    if (action === 'cancel') status = 'cancelled';

    if (status === 'approved') {
        const { data: recipientRows } = await supabase
            .from('recipients')
            .select('pagarme_recipient_id, status, updated_at')
            .eq('user_id', affiliation.affiliate_id)
            .not('pagarme_recipient_id', 'is', null)
            .order('updated_at', { ascending: false })
            .limit(1);
        const recipient = recipientRows?.[0];
        if (!recipient?.pagarme_recipient_id || ['refused', 'suspended'].includes(recipient.status)) {
            return jsonError('O afiliado ainda nao possui uma conta de recebimento valida.', 400);
        }
    }

    const now = new Date().toISOString();
    const customRate = body.custom_commission_rate_bps === null || body.custom_commission_rate_bps === ''
        ? null
        : normalizeAffiliateRateBps(Number(body.custom_commission_rate_bps));
    const values: Record<string, any> = {
        status,
        approved_at: status === 'approved' ? now : affiliation.approved_at,
        ended_at: ['rejected', 'suspended', 'cancelled'].includes(status) ? now : null,
    };
    if ((isProducer || isAdmin) && body.custom_commission_rate_bps !== undefined) {
        values.custom_commission_rate_bps = customRate;
    }

    const { data: updated, error } = await supabase
        .from('affiliate_affiliations')
        .update(values)
        .eq('id', affiliation.id)
        .select()
        .single();
    if (error) return jsonError('Nao foi possivel atualizar a afiliacao.', 500);

    let link = null;
    if (status === 'approved') {
        link = await ensureAffiliateLink({ affiliationId: affiliation.id, productId: program.product_id });
        await supabase.from('affiliate_links').update({ is_active: true }).eq('affiliation_id', affiliation.id);
    } else {
        await supabase.from('affiliate_links').update({ is_active: false }).eq('affiliation_id', affiliation.id);
    }

    return jsonSuccess({ affiliation: updated, link });
}
