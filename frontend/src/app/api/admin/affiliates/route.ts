import { NextRequest } from 'next/server';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { supabase } from '@/lib/db';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { promoteAvailableAffiliateCommissions } from '@/lib/affiliates';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth || auth.user.role !== 'admin') return jsonError('Nao autorizado', 403);

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const rateLimit = await checkRateLimit({
        key: `admin:affiliates:${auth.user.id}:${ip}`,
        limit: 60,
        windowSecs: 60,
        failOpen: true,
    });
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit.resetAt);

    try {
        await promoteAvailableAffiliateCommissions();
        const [
            { data: programs },
            { data: affiliations },
            { data: commissions },
        ] = await Promise.all([
            supabase.from('affiliate_programs').select('*').order('created_at', { ascending: false }).limit(500),
            supabase.from('affiliate_affiliations').select('*').order('created_at', { ascending: false }).limit(500),
            supabase.from('affiliate_commissions').select('*').order('created_at', { ascending: false }).limit(1000),
        ]);

        const productIds = Array.from(new Set((programs || []).map((program: any) => program.product_id)));
        const userIds = Array.from(new Set([
            ...(programs || []).map((program: any) => program.producer_id),
            ...(affiliations || []).map((affiliation: any) => affiliation.affiliate_id),
        ]));
        const [{ data: products }, { data: users }] = await Promise.all([
            productIds.length
                ? supabase.from('products').select('id, name, status').in('id', productIds)
                : Promise.resolve({ data: [] }),
            userIds.length
                ? supabase.from('users').select('id, name, email, status').in('id', userIds)
                : Promise.resolve({ data: [] }),
        ]);
        const productById = Object.fromEntries((products || []).map((product: any) => [product.id, product]));
        const userById = Object.fromEntries((users || []).map((user: any) => [user.id, user]));
        const programById = Object.fromEntries((programs || []).map((program: any) => [program.id, program]));
        const approvedCommissions = (commissions || []).filter((commission: any) => ['approved', 'available'].includes(commission.status));

        return jsonSuccess({
            stats: {
                programs: (programs || []).length,
                active_programs: (programs || []).filter((program: any) => program.status === 'active').length,
                affiliates: new Set((affiliations || []).map((affiliation: any) => affiliation.affiliate_id)).size,
                sales: approvedCommissions.length,
                commission_amount: approvedCommissions.reduce((sum: number, commission: any) => sum + Number(commission.commission_amount || 0), 0),
            },
            programs: (programs || []).map((program: any) => ({
                ...program,
                product: productById[program.product_id] || null,
                producer: userById[program.producer_id] || null,
            })),
            affiliations: (affiliations || []).map((affiliation: any) => ({
                ...affiliation,
                program: programById[affiliation.program_id] || null,
                affiliate: userById[affiliation.affiliate_id] || null,
            })),
            commissions: commissions || [],
        });
    } catch (error) {
        console.error('[AFFILIATES] Admin overview error:', error);
        return jsonError('Erro ao carregar afiliados.', 500);
    }
}
