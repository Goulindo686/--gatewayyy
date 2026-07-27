export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { comparePassword, generateToken, jsonError, jsonSuccess } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { requestEmailVerification } from '@/lib/email-verification';
import { createTwoFactorChallenge } from '@/lib/two-factor';
import {
    buildPasswordSyncUpdate,
    getStoredPasswordCandidates,
    type StoredPasswordCandidate,
} from '@/lib/password-storage';

type PaidOrderRow = {
    id: string;
    product_id?: string | null;
    products?: { type?: string | null } | Array<{ type?: string | null }> | null;
};

export async function POST(req: NextRequest) {
    try {
        const ip =
            req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
            req.headers.get('x-real-ip') ||
            'unknown';

        const rlIp = await checkRateLimit({ key: `auth:login:ip:${ip}`, limit: 30, windowSecs: 900, failOpen: false });
        if (!rlIp.allowed) return rateLimitResponse(rlIp.resetAt);

        const { email, password } = await req.json();

        if (!email || !password) {
            return jsonError('Email e senha são obrigatórios');
        }

        const normalizedEmail = String(email).toLowerCase().trim();
        const rlEmail = await checkRateLimit({ key: `auth:login:email:${normalizedEmail}`, limit: 15, windowSecs: 3600, failOpen: false });
        if (!rlEmail.allowed) return rateLimitResponse(rlEmail.resetAt);

        const { data: user } = await supabase
            .from('users')
            .select('*')
            .ilike('email', normalizedEmail)
            .single();

        if (!user) return jsonError('Credenciais inválidas', 401);
        if (user.status === 'blocked') return jsonError('Conta bloqueada', 403);

        const passwordCandidates = getStoredPasswordCandidates(user);
        let matchedPassword: StoredPasswordCandidate | null = null;

        for (const candidate of passwordCandidates) {
            if (await comparePassword(password, candidate.hash)) {
                matchedPassword = candidate;
                break;
            }
        }

        if (!matchedPassword) return jsonError('Credenciais inválidas', 401);

        if (matchedPassword.column === 'password') {
            const passwordSyncUpdate = buildPasswordSyncUpdate(user, matchedPassword.hash);
            const { error: syncError } = await supabase
                .from('users')
                .update(passwordSyncUpdate)
                .eq('id', user.id);

            if (syncError) {
                console.error('[LOGIN] Falha ao sincronizar colunas de senha:', syncError.message);
            }
        }

        const userEmailNormalized = (user.email || '').toLowerCase().trim();
        if (userEmailNormalized) {
            const { data: paidOrders } = await supabase
                .from('orders')
                .select(`
                    id,
                    product_id,
                    products (
                        type
                    )
                `)
                .eq('status', 'paid')
                .ilike('buyer_email', userEmailNormalized);

            const enrollmentsToUpsert = ((paidOrders || []) as PaidOrderRow[])
                .flatMap((order) => {
                    const product = Array.isArray(order.products)
                        ? order.products[0]
                        : order.products;

                    if (!order.product_id || product?.type !== 'digital') return [];

                    return [{
                        user_id: user.id,
                        product_id: order.product_id,
                        order_id: order.id,
                        status: 'active',
                    }];
                });

            if (enrollmentsToUpsert.length > 0) {
                await supabase
                    .from('enrollments')
                    .upsert(enrollmentsToUpsert, { onConflict: 'user_id, product_id' });
            }
        }

        if (user.email_verified !== true) {
            const verification = await requestEmailVerification(user);
            return jsonSuccess({
                verification_required: true,
                verification_token: verification.verificationToken,
                email_masked: verification.emailMasked,
                code_sent: verification.sent,
                retry_after: verification.retryAfter,
            });
        }

        if (user.two_factor_enabled === true) {
            return jsonSuccess({
                two_factor_required: true,
                two_factor_token: createTwoFactorChallenge(user.id),
            });
        }

        const token = generateToken({ userId: user.id, role: user.role });

        return jsonSuccess({
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });
    } catch (err) {
        console.error('Login error:', err);
        return jsonError('Erro interno do servidor', 500);
    }
}
