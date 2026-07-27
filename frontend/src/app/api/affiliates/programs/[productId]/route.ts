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

    const { data: existing, error: existingError } = await supabase
        .from('affiliate_programs')
        .select('id, invite_code')
        .eq('product_id', productId)
        .maybeSingle();
    if (existingError) return jsonError('O modulo de afiliados ainda nao foi ativado no banco de dados.', 500);

    const values = {
        product_id: productId,
        producer_id: auth.user.id,
        status,
        enrollment_mode: enrollmentMode,
        commission_rate_bps: commissionRateBps,
        attribution_model: attributionModel,
        cookie_days: cookieDays,
        marketplace_visible: Boolean(body.marketplace_visible),
        commission_on_bumps: body.commission_on_bumps !== false,
        commission_on_renewals: body.commission_on_renewals !== false,
        hold_days: holdDays,
        terms_text: String(body.terms_text || '').trim().slice(0, 10_000) || null,
        invite_code: existing?.invite_code || createAffiliateCode(),
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
