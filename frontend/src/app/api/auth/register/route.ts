export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { hashPassword, jsonError, jsonSuccess } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { requestEmailVerification } from '@/lib/email-verification';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
    try {
        const contentType = req.headers.get('content-type') || '';
        if (!contentType.toLowerCase().includes('application/json')) {
            return jsonError('Content-Type inválido (use application/json)', 415);
        }

        // Rate limit por IP: 5 registros por hora
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
        const rl = await checkRateLimit({ key: `register:${ip}`, limit: 5, windowSecs: 3600, failOpen: false });
        if (!rl.allowed) return rateLimitResponse(rl.resetAt);

        const body = await req.json();
        const { name, email, password, cpf_cnpj, phone, terms_accepted } = body;

        if (!name || !email || !password || !cpf_cnpj) {
            return jsonError('Nome, email, senha e CPF/CNPJ são obrigatórios');
        }

        if (terms_accepted !== true) {
            return jsonError('Você deve aceitar os termos de uso para criar a conta.', 400);
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check if user exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .ilike('email', normalizedEmail)
            .single();

        if (existingUser) {
            return jsonError('Email já cadastrado');
        }

        const hashedPassword = await hashPassword(password);
        const userId = uuidv4();

        // Defer Pagar.me recipient creation until profile update with real bank data
        const pagarmeRecipientId = null;

        const baseUserData: any = {
            id: userId,
            name,
            email: normalizedEmail,
            cpf_cnpj,
            phone,
            role: 'seller',
            status: 'active',
            email_verified: false,
            terms_accepted_at: new Date().toISOString()
        };

        let user: any = null;
        let error: any = null;

        // Try inserting with terms_accepted_at
        ({ data: user, error } = await supabase
            .from('users')
            .insert({ ...baseUserData, password_hash: hashedPassword })
            .select()
            .single());

        // Fallback: If column doesn't exist, try without it
        if (error && (error.code === '42703' || error.message?.includes('does not exist'))) {
            const { terms_accepted_at, ...fallbackUserData } = baseUserData;
            ({ data: user, error } = await supabase
                .from('users')
                .insert({ ...fallbackUserData, password_hash: hashedPassword })
                .select()
                .single());
        }

        // Fallback: If password_hash column issue (old schema), try 'password'
        if (error && /password_hash/i.test(error.message || '')) {
            const { terms_accepted_at, ...fallbackUserData } = baseUserData;
            // Try with 'password' column (legacy)
            ({ data: user, error } = await supabase
                .from('users')
                .insert({ ...fallbackUserData, password: hashedPassword })
                .select()
                .single());
        }

        if (error) {
            console.error('Supabase insert error:', error);
            return jsonError('Erro no banco: ' + error.message);
        }

        // Create recipient record
        if (pagarmeRecipientId) {
            await supabase.from('recipients').insert({
                id: uuidv4(), user_id: userId, pagarme_recipient_id: pagarmeRecipientId, status: 'active'
            });
        }

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
            .ilike('buyer_email', normalizedEmail);

        const enrollmentsToUpsert = (paidOrders || [])
            .filter((o: any) => o?.product_id && o?.products?.type === 'digital')
            .map((o: any) => ({
                user_id: userId,
                product_id: o.product_id,
                order_id: o.id,
                status: 'active'
            }));

        if (enrollmentsToUpsert.length > 0) {
            await supabase
                .from('enrollments')
                .upsert(enrollmentsToUpsert, { onConflict: 'user_id, product_id' });
        }

        const verification = await requestEmailVerification({
            id: userId,
            name,
            email: normalizedEmail,
            role: 'seller',
            email_verified: false,
            email_verification_token: user?.email_verification_token,
        });

        return jsonSuccess({
            verification_required: true,
            verification_token: verification.verificationToken,
            email_masked: verification.emailMasked,
            code_sent: verification.sent,
            retry_after: verification.retryAfter,
        }, 201);
    } catch (err: any) {
        console.error('Register error:', err);
        return jsonError('Erro interno do servidor', 500);
    }
}
