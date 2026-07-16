export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { comparePassword, generateToken, jsonError, jsonSuccess } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { requestEmailVerification } from '@/lib/email-verification';

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

        const passwordHash = user.password_hash || user.password;
        if (!passwordHash) return jsonError('Credenciais inválidas', 401);

        const validPassword = await comparePassword(password, passwordHash);
        if (!validPassword) return jsonError('Credenciais inválidas', 401);

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

            const enrollmentsToUpsert = (paidOrders || [])
                .filter((o: any) => o?.product_id && o?.products?.type === 'digital')
                .map((o: any) => ({
                    user_id: user.id,
                    product_id: o.product_id,
                    order_id: o.id,
                    status: 'active'
                }));

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
