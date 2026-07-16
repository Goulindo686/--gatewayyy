export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { generateToken, jsonError, jsonSuccess } from '@/lib/auth';
import { supabase } from '@/lib/db';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import {
    readTwoFactorChallenge,
    TwoFactorError,
    verifySecondFactor,
} from '@/lib/two-factor';

export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
            || req.headers.get('x-real-ip')
            || 'unknown';
        const rateLimit = await checkRateLimit({
            key: `2fa:login:${ip}`,
            limit: 30,
            windowSecs: 900,
            failOpen: false,
        });
        if (!rateLimit.allowed) return rateLimitResponse(rateLimit.resetAt);

        const { two_factor_token: challengeToken, code } = await req.json();
        if (!challengeToken || !code) return jsonError('Codigo 2FA obrigatorio');

        const userId = readTwoFactorChallenge(String(challengeToken));
        const { data: user, error } = await supabase
            .from('users')
            .select('id, name, email, role, status, two_factor_enabled, two_factor_secret, two_factor_recovery_codes')
            .eq('id', userId)
            .single();

        if (error || !user) return jsonError('Conta nao encontrada', 404);
        if (user.status === 'blocked') return jsonError('Conta bloqueada', 403);
        if (user.two_factor_enabled !== true) return jsonError('O 2FA nao esta ativo nesta conta', 409);

        const verification = verifySecondFactor(user, String(code));
        if (!verification.valid) return jsonError('Codigo do autenticador ou de recuperacao invalido', 401);

        if (verification.usedRecoveryCode) {
            const { error: consumeError } = await supabase
                .from('users')
                .update({
                    two_factor_recovery_codes: verification.remainingRecoveryCodes,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id);
            if (consumeError) return jsonError('Nao foi possivel consumir o codigo de recuperacao', 500);
        }

        const token = generateToken({ userId: user.id, role: user.role });
        return jsonSuccess({
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
            recovery_code_used: verification.usedRecoveryCode,
            recovery_codes_remaining: verification.remainingRecoveryCodes.length,
        });
    } catch (error) {
        if (error instanceof TwoFactorError) return jsonError(error.message, error.status);
        console.error('[2FA] Login verification error:', error);
        return jsonError('Erro interno ao verificar o 2FA', 500);
    }
}
