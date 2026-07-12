export const dynamic = 'force-dynamic';
export const maxDuration = 30; // aumenta o timeout para 30 segundos
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { jsonError, jsonSuccess } from '@/lib/auth';
import { sendPasswordResetEmail } from '@/lib/email';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
    try {
        const requestId = uuidv4().slice(0, 8);
        const { email } = await req.json();

        if (!email) return jsonError('Email é obrigatório');

        const normalizedEmail = String(email).toLowerCase().trim();
        if (!normalizedEmail) return jsonError('Email é obrigatório');

        const ip =
            req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
            req.headers.get('x-real-ip') ||
            'unknown';

        const rlIp = await checkRateLimit({ key: `auth:forgot:ip:${ip}`, limit: 10, windowSecs: 900, failOpen: false });
        if (!rlIp.allowed) return rateLimitResponse(rlIp.resetAt);

        const rlEmail = await checkRateLimit({ key: `auth:forgot:email:${normalizedEmail}`, limit: 3, windowSecs: 3600, failOpen: false });
        if (!rlEmail.allowed) return rateLimitResponse(rlEmail.resetAt);

        const { data: users, error: userErr } = await supabase
            .from('users')
            .select('id, email, name')
            .ilike('email', normalizedEmail)
            .limit(1);

        const user = users?.[0];
        console.log(`[FORGOT-PASSWORD][${requestId}] Email: ${normalizedEmail}, User found: ${!!user}`);
        if (userErr) {
            console.error(`[FORGOT-PASSWORD][${requestId}] Erro ao buscar usuário:`, userErr.message, userErr.code, userErr.details);
        }

        if (user) {
            const resetToken = uuidv4();
            const resetExpires = new Date(Date.now() + 3600000);

            const { error } = await supabase
                .from('users')
                .update({
                    password_reset_token: resetToken,
                    password_reset_expires: resetExpires.toISOString()
                })
                .eq('id', user.id);

            if (!error) {
                try {
                    await sendPasswordResetEmail({
                        toEmail: user.email,
                        userName: user.name,
                        resetToken,
                    });
                    console.log(`[FORGOT-PASSWORD][${requestId}] Email de recuperação enviado para ${user.email}`);
                } catch (sendErr: any) {
                    console.error(`[FORGOT-PASSWORD][${requestId}] Erro ao enviar email de recuperação:`, sendErr?.message, sendErr?.code);
                }
            } else {
                console.error(`[FORGOT-PASSWORD][${requestId}] Erro ao salvar token de recuperação no banco:`, error.message, error.code, error.details);
            }
        }

        return jsonSuccess({
            message: 'Se o email existir, as instruções de recuperação serão enviadas.'
        });
    } catch (err) {
        console.error('Forgot password error:', err);
        return jsonError('Erro interno do servidor', 500);
    }
}
