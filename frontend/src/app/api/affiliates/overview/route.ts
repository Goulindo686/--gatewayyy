import { NextRequest } from 'next/server';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { supabase } from '@/lib/db';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { promoteAvailableAffiliateCommissions } from '@/lib/affiliates';

export const dynamic = 'force-dynamic';

function sum(items: any[], field: string) {
    return items.reduce((total, item) => total + Number(item?.[field] || 0), 0);
}

export async function GET(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Nao autorizado', 401);

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const rateLimit = await checkRateLimit({
        key: `affiliates:overview:${auth.user.id}:${ip}`,
        limit: 60,
        windowSecs: 60,
        failOpen: true,
    });
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit.resetAt);

    try {
        await promoteAvailableAffiliateCommissions(auth.user.id);

        const [
            { data: products, error: productsError },
            { data: ownAffiliations, error: affiliationsError },
            { data: recipientRows },
            { data: commissions, error: commissionsError },
        ] = await Promise.all([
            supabase
                .from('products')
                .select('id, name, description, price, image_url, status')
                .eq('user_id', auth.user.id)
                .order('created_at', { ascending: false }),
            supabase
                .from('affiliate_affiliations')
                .select('*')
                .eq('affiliate_id', auth.user.id)
                .order('created_at', { ascending: false }),
            supabase
                .from('recipients')
                .select('pagarme_recipient_id, status, updated_at')
                .eq('user_id', auth.user.id)
                .not('pagarme_recipient_id', 'is', null)
                .order('updated_at', { ascending: false })
                .limit(1),
            supabase
                .from('affiliate_commissions')
                .select('*')
                .or(`affiliate_id.eq.${auth.user.id},producer_id.eq.${auth.user.id}`)
                .order('created_at', { ascending: false })
                .limit(500),
        ]);

        if (productsError) throw productsError;
        if (affiliationsError) throw affiliationsError;
        if (commissionsError) throw commissionsError;

        const productIds = (products || []).map((product: any) => product.id);
        const { data: producerPrograms, error: producerProgramsError } = productIds.length
            ? await supabase
                .from('affiliate_programs')
                .select('*')
                .eq('producer_id', auth.user.id)
                .in('product_id', productIds)
                .order('created_at', { ascending: false })
            : { data: [], error: null };
        if (producerProgramsError) throw producerProgramsError;

        const producerProgramIds = (producerPrograms || []).map((program: any) => program.id);
        const { data: producerAffiliations, error: producerAffiliationsError } = producerProgramIds.length
            ? await supabase
                .from('affiliate_affiliations')
                .select('*')
                .in('program_id', producerProgramIds)
                .order('created_at', { ascending: false })
            : { data: [], error: null };
        if (producerAffiliationsError) throw producerAffiliationsError;

        const affiliationIds = [
            ...(ownAffiliations || []).map((affiliation: any) => affiliation.id),
            ...(producerAffiliations || []).map((affiliation: any) => affiliation.id),
        ];
        const ownProgramIds = (ownAffiliations || []).map((affiliation: any) => affiliation.program_id);
        const { data: ownPrograms } = ownProgramIds.length
            ? await supabase
                .from('affiliate_programs')
                .select('id, product_id, producer_id, status, enrollment_mode, commission_rate_bps, attribution_model, cookie_days, marketplace_visible, commission_on_bumps, commission_on_renewals, hold_days, terms_text, created_at, updated_at')
                .in('id', ownProgramIds)
            : { data: [] };
        const { data: links } = affiliationIds.length
            ? await supabase.from('affiliate_links').select('*').in('affiliation_id', affiliationIds).order('created_at')
            : { data: [] };

        const { data: marketplacePrograms, error: marketplaceError } = await supabase
            .from('affiliate_programs')
            .select('id, product_id, producer_id, status, enrollment_mode, commission_rate_bps, attribution_model, cookie_days, marketplace_visible, commission_on_bumps, commission_on_renewals, hold_days, terms_text, created_at, updated_at')
            .eq('status', 'active')
            .eq('marketplace_visible', true)
            .order('created_at', { ascending: false })
            .limit(100);
        if (marketplaceError) throw marketplaceError;

        const referencedProductIds = Array.from(new Set([
            ...(ownPrograms || []).map((program: any) => program.product_id),
            ...(marketplacePrograms || []).map((program: any) => program.product_id),
        ]));
        const { data: referencedProducts } = referencedProductIds.length
            ? await supabase
                .from('products')
                .select('id, user_id, name, description, price, image_url, status')
                .in('id', referencedProductIds)
            : { data: [] };

        const referencedUserIds = Array.from(new Set([
            ...(producerAffiliations || []).map((affiliation: any) => affiliation.affiliate_id),
            ...(ownPrograms || []).map((program: any) => program.producer_id),
            ...(marketplacePrograms || []).map((program: any) => program.producer_id),
        ]));
        const { data: referencedUsers } = referencedUserIds.length
            ? await supabase
                .from('users')
                .select('id, name, email, status')
                .in('id', referencedUserIds)
            : { data: [] };

        const productById = Object.fromEntries((referencedProducts || []).map((product: any) => [product.id, product]));
        const userById = Object.fromEntries((referencedUsers || []).map((user: any) => [user.id, user]));
        const linkByAffiliation = Object.fromEntries((links || []).map((link: any) => [link.affiliation_id, link]));
        const ownProgramById = Object.fromEntries((ownPrograms || []).map((program: any) => [program.id, program]));
        const producerProgramById = Object.fromEntries((producerPrograms || []).map((program: any) => [program.id, program]));
        const producerCommissions = (commissions || []).filter((commission: any) => commission.producer_id === auth.user.id);
        const affiliateCommissions = (commissions || []).filter((commission: any) => commission.affiliate_id === auth.user.id);

        const [{ count: affiliateClicks }, { count: producerClicks }] = await Promise.all([
            supabase
                .from('affiliate_clicks')
                .select('id', { count: 'exact', head: true })
                .eq('affiliate_id', auth.user.id),
            producerProgramIds.length
                ? supabase
                    .from('affiliate_clicks')
                    .select('id', { count: 'exact', head: true })
                    .in('program_id', producerProgramIds)
                : Promise.resolve({ count: 0 }),
        ]);

        return jsonSuccess({
            recipient: {
                ready: Boolean(recipientRows?.[0]?.pagarme_recipient_id)
                    && !['refused', 'suspended'].includes(recipientRows?.[0]?.status),
                status: recipientRows?.[0]?.status || 'not_configured',
            },
            producer: {
                products: (products || []).map((product: any) => ({
                    ...product,
                    program: (producerPrograms || []).find((program: any) => program.product_id === product.id) || null,
                })),
                affiliations: (producerAffiliations || []).map((affiliation: any) => ({
                    ...affiliation,
                    affiliate: userById[affiliation.affiliate_id] || null,
                    program: producerProgramById[affiliation.program_id] || null,
                    link: linkByAffiliation[affiliation.id] || null,
                })),
                commissions: producerCommissions,
                stats: {
                    clicks: producerClicks || 0,
                    sales: producerCommissions.filter((commission: any) => ['approved', 'available'].includes(commission.status)).length,
                    commissions_amount: sum(
                        producerCommissions.filter((commission: any) => ['approved', 'available'].includes(commission.status)),
                        'commission_amount',
                    ),
                },
            },
            affiliate: {
                affiliations: (ownAffiliations || []).map((affiliation: any) => {
                    const program = ownProgramById[affiliation.program_id] || null;
                    return {
                        ...affiliation,
                        program,
                        product: program ? productById[program.product_id] || null : null,
                        producer: program ? userById[program.producer_id] || null : null,
                        link: linkByAffiliation[affiliation.id] || null,
                    };
                }),
                commissions: affiliateCommissions,
                stats: {
                    clicks: affiliateClicks || 0,
                    sales: affiliateCommissions.filter((commission: any) => ['approved', 'available'].includes(commission.status)).length,
                    pending_amount: sum(
                        affiliateCommissions.filter((commission: any) => ['pending', 'approved'].includes(commission.status)),
                        'commission_amount',
                    ),
                    available_amount: sum(
                        affiliateCommissions.filter((commission: any) => commission.status === 'available'),
                        'commission_amount',
                    ),
                },
            },
            marketplace: (marketplacePrograms || [])
                .filter((program: any) => productById[program.product_id]?.status === 'active')
                .map((program: any) => ({
                    ...program,
                    product: productById[program.product_id] || null,
                    producer: userById[program.producer_id]
                        ? { id: userById[program.producer_id].id, name: userById[program.producer_id].name }
                        : null,
                    affiliation: (ownAffiliations || []).find((affiliation: any) => affiliation.program_id === program.id) || null,
                    is_own_program: program.producer_id === auth.user.id,
                })),
        });
    } catch (error: any) {
        console.error('[AFFILIATES] Overview error:', error);
        return jsonError(
            /affiliate_/i.test(String(error?.message || ''))
                ? 'O modulo de afiliados ainda nao foi ativado no banco de dados.'
                : 'Erro ao carregar o sistema de afiliados.',
            500,
        );
    }
}
