export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { hashPassword, jsonError, jsonSuccess } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { requestEmailVerification } from '@/lib/email-verification';
import { v4 as uuidv4 } from 'uuid';
import { notifyNewAccountOnDiscord } from '@/lib/discord-webhook';

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

        // Contas antigas criadas automaticamente pelo checkout podem ser
        // reivindicadas somente pelo cadastro normal + confirmação do e-mail.
        const { data: existingUser } = await supabase
            .from('users')
            .select('id, role, email_verified')
            .ilike('email', normalizedEmail)
            .single();

        const isLegacyCheckoutAccount = Boolean(
            existingUser
            && existingUser.role === 'customer'
            && existingUser.email_verified !== true
        );

        if (existingUser && !isLegacyCheckoutAccount) {
            return jsonError('Email já cadastrado');
        }

        const hashedPassword = await hashPassword(password);
        const userId = existingUser?.id || uuidv4();

        // Defer Pagar.me recipient creation until profile update with real bank data
        const pagarmeRecipientId = null;

        const baseUserData: any = {
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

        const persistUser = (payload: Record<string, unknown>) => isLegacyCheckoutAccount
            ? supabase.from('users').update(payload).eq('id', userId).select().single()
            : supabase.from('users').insert({ id: userId, ...payload }).select().single();

        // Cria uma conta nova ou converte uma conta legada sem entregar sessão.
        ({ data: user, error } = await persistUser({
            ...baseUserData,
            password_hash: hashedPassword,
        }));

        // Fallback: If column doesn't exist, try without it
        if (error && (error.code === '42703' || error.message?.includes('does not exist'))) {
            const { terms_accepted_at, ...fallbackUserData } = baseUserData;
            ({ data: user, error } = await persistUser({
                ...fallbackUserData,
                password_hash: hashedPassword,
            }));
        }

        // Fallback: If password_hash column issue (old schema), try 'password'
        if (error && /password_hash/i.test(error.message || '')) {
            const { terms_accepted_at, ...fallbackUserData } = baseUserData;
            // Try with 'password' column (legacy)
            ({ data: user, error } = await persistUser({
                ...fallbackUserData,
                password: hashedPassword,
            }));
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

        const verification = await requestEmailVerification({
            id: userId,
            name,
            email: normalizedEmail,
            role: 'seller',
            email_verified: false,
            email_verification_token: user?.email_verification_token,
        });

        await notifyNewAccountOnDiscord(req, {
            name,
            email: normalizedEmail,
            phone,
            cpf_cnpj,
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
