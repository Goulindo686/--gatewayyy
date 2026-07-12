export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { jsonError, jsonSuccess } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
    try {
        const requestId = uuidv4().slice(0, 8);
        const { token, password } = await req.json();

        if (!token) return jsonError('Token é obrigatório');
        if (!password || password.length < 6) {
            return jsonError('Senha deve ter no mínimo 6 caracteres');
        }

        const ip =
            req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
            req.headers.get('x-real-ip') ||
            'unknown';

        const rlIp = await checkRateLimit({ key: `auth:reset:ip:${ip}`, limit: 20, windowSecs: 900, failOpen: false });
        if (!rlIp.allowed) return rateLimitResponse(rlIp.resetAt);

        const rlToken = await checkRateLimit({ key: `auth:reset:token:${String(token).slice(0, 64)}`, limit: 10, windowSecs: 3600, failOpen: false });
        if (!rlToken.allowed) return rateLimitResponse(rlToken.resetAt);

        // Find user by reset token
        const { data: users, error: findError } = await supabase
            .from('users')
            .select('*')
            .eq('password_reset_token', token)
            .limit(1);

        if (findError || !users || users.length === 0) {
            if (findError) console.error(`[RESET-PASSWORD][${requestId}] Erro ao buscar token:`, findError.message, findError.code, findError.details);
            return jsonError('Token inválido ou expirado', 400);
        }

        const user = users[0];

        // Check if token is expired
        if (!user.password_reset_expires || new Date(user.password_reset_expires) < new Date()) {
            return jsonError('Token expirado. Solicite um novo link de recuperação.', 400);
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(password, 12);

        // Update password and clear reset token
        const baseUpdate: Record<string, any> = {
            password_reset_token: null,
            password_reset_expires: null,
            updated_at: new Date().toISOString(),
        };

        let updateError: any = null;

        const attemptUpdates: Array<Record<string, any>> = [
            { ...baseUpdate, password_hash: passwordHash },
            { ...baseUpdate, password: passwordHash },
            { password_hash: passwordHash, password_reset_token: null, password_reset_expires: null },
            { password: passwordHash, password_reset_token: null, password_reset_expires: null },
        ];

        for (const payload of attemptUpdates) {
            const { error } = await supabase
                .from('users')
                .update(payload)
                .eq('id', user.id);
            if (!error) {
                updateError = null;
                break;
            }
            updateError = error;
            const msg = String(error?.message || '');
            if (/password_hash/i.test(msg) || /updated_at/i.test(msg) || /password/i.test(msg)) {
                continue;
            }
            break;
        }

        if (updateError) {
            console.error(`[RESET-PASSWORD][${requestId}] Error updating password:`, updateError);
            return jsonError('Erro ao atualizar senha', 500);
        }

        console.log(`[RESET-PASSWORD][${requestId}] Password updated successfully for user:`, user.email);
        return jsonSuccess({ message: 'Senha alterada com sucesso!' });
    } catch (err) {
        console.error('Reset password error:', err);
        return jsonError('Erro interno do servidor', 500);
    }
}
