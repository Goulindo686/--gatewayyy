export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { comparePassword, getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { supabase } from '@/lib/db';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { verifySecondFactor } from '@/lib/two-factor';

export async function POST(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Nao autorizado', 401);
    if (auth.tokenPayload?.impersonated_by) return jsonError('2FA nao pode ser alterado durante acesso administrativo', 403);

    const rateLimit = await checkRateLimit({
        key: `2fa:disable:${auth.user.id}`,
        limit: 10,
        windowSecs: 3600,
        failOpen: false,
    });
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit.resetAt);

    try {
        const { password, code } = await req.json();
        if (auth.user.two_factor_enabled !== true) return jsonError('O 2FA nao esta ativo', 409);

        const passwordHash = auth.user.password_hash || auth.user.password;
        if (!passwordHash || !await comparePassword(String(password || ''), passwordHash)) {
            return jsonError('Senha atual incorreta');
        }

        const verification = verifySecondFactor(auth.user, String(code || ''));
        if (!verification.valid) return jsonError('Codigo do autenticador ou de recuperacao invalido');

        const { error } = await supabase
            .from('users')
            .update({
                two_factor_enabled: false,
                two_factor_secret: null,
                two_factor_recovery_codes: [],
                two_factor_confirmed_at: null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', auth.user.id);

        if (error) return jsonError('Nao foi possivel desativar o 2FA', 500);
        return jsonSuccess({ enabled: false });
    } catch (error) {
        console.error('[2FA] Disable error:', error);
        return jsonError('Nao foi possivel desativar o 2FA', 500);
    }
}
