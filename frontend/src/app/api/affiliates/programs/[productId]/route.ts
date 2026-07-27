import { NextRequest } from 'next/server';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { supabase } from '@/lib/db';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { createAffiliateCode } from '@/lib/affiliates';
import { normalizeAffiliateRateBps } from '@/lib/affiliates-core';

const allowedEnrollmentModes = new Set(['invite', 'manual', 'automatic']);
const allowedAttributionModels = new Set(['last_click', 'first_click']);

export async function PUT(
    req: NextRequest,
    context: { params: Promise<{ productId: string }> },
) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Nao autorizado', 401);

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const rateLimit = await checkRateLimit({
        key: `affiliates:program:update:${auth.user.id}:${ip}`,
        limit: 30,
        windowSecs: 3600,
        failOpen: false,
    });
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit.resetAt);

    const { productId } = await context.params;
    const { data: product } = await supabase
        .from('products')
        .select('id, user_id')
        .eq('id', productId)
        .eq('user_id', auth.user.id)
        .maybeSingle();
    if (!product) return jsonError('Produto nao encontrado', 404);

    const body = await req.json();
    const enrollmentMode = allowedEnrollmentModes.has(body.enrollment_mode) ? body.enrollment_mode : 'manual';
    const attributionModel = allowedAttributionModels.has(body.attribution_model) ? body.attribution_model : 'last_click';
    const cookieDays = Math.max(1, Math.min(365, Math.trunc(Number(body.cookie_days) || 60)));
    const holdDays = Math.max(0, Math.min(180, Math.trunc(Number(body.hold_days) || 0)));
    const commissionRateBps = normalizeAffiliateRateBps(Number(body.commission_rate_bps) || 3000);
    const status = body.status === 'active' ? 'active' : 'inactive';
    const commissionOnBumps = body.commission_on_bumps !== false;

    const { data: existing, error: existingError } = await supabase
        .from('affiliate_programs')
        .select('id, invite_code, invite_expires_at, commission_rate_bps, terms_text, terms_version, hold_days, commission_on_bumps, commission_on_renewals')
        .eq('product_id', productId)
        .maybeSingle();
    if (existingError) return jsonError('O modulo de afiliados ainda nao foi ativado no banco de dados.', 500);

    const { data: subscriptionPlanRows } = await supabase
        .from('subscription_plans')
        .select('id')
        .eq('product_id', productId)
        .eq('status', 'active')
        .limit(1);
    const requiresRecurringCommission = Boolean(subscriptionPlanRows?.length);
    const commissionOnRenewals = requiresRecurringCommission || body.commission_on_renewals !== false;
    const materialTermsChanged = existing
        ? Number(existing.commission_rate_bps) !== commissionRateBps
            || String(existing.terms_text || '') !== String(body.terms_text || '').trim().slice(0, 10_000)
            || Number(existing.hold_days || 0) !== holdDays
            || Boolean(existing.commission_on_bumps) !== commissionOnBumps
            || Boolean(existing.commission_on_renewals) !== commissionOnRenewals
        : false;
    const inviteExpired = Boolean(
        existing?.invite_expires_at
        && new Date(existing.invite_expires_at).getTime() <= Date.now(),
    );
    const rotateInvite = body.rotate_invite === true;
    const now = new Date();
    const inviteExpiresAt = new Date(now);
    inviteExpiresAt.setUTCDate(inviteExpiresAt.getUTCDate() + 30);

    const shouldRotateInvite = !existing?.invite_code || inviteExpired || rotateInvite;
    const values = {
        product_id: productId,
        producer_id: auth.user.id,
        status,
        enrollment_mode: enrollmentMode,
        commission_rate_bps: commissionRateBps,
        attribution_model: attributionModel,
        cookie_days: cookieDays,
        marketplace_visible: Boolean(body.marketplace_visible),
        commission_on_bumps: commissionOnBumps,
        commission_on_renewals: commissionOnRenewals,
        hold_days: holdDays,
        terms_text: String(body.terms_text || '').trim().slice(0, 10_000) || null,
        terms_version: Math.max(1, Number(existing?.terms_version || 1)) + (materialTermsChanged ? 1 : 0),
        invite_code: shouldRotateInvite ? createAffiliateCode() : existing.invite_code,
        invite_expires_at: shouldRotateInvite
            ? inviteExpiresAt.toISOString()
            : existing.invite_expires_at,
        ...(shouldRotateInvite ? { invite_last_rotated_at: now.toISOString() } : {}),
    };
    const query = existing
        ? supabase.from('affiliate_programs').update(values).eq('id', existing.id)
        : supabase.from('affiliate_programs').insert(values);
    const { data: program, error } = await query.select().single();
    if (error) {
        console.error('[AFFILIATES] Program update error:', error);
        return jsonError('Nao foi possivel salvar o programa de afiliados.', 500);
    }

    return jsonSuccess({ program });
}
