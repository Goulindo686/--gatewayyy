export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { supabase } from '@/lib/db';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { createRecoveryCodes, verifySecondFactor } from '@/lib/two-factor';

export async function POST(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Nao autorizado', 401);
    if (auth.tokenPayload?.impersonated_by) return jsonError('2FA nao pode ser alterado durante acesso administrativo', 403);

    const rateLimit = await checkRateLimit({
        key: `2fa:recovery:${auth.user.id}`,
        limit: 5,
        windowSecs: 3600,
        failOpen: false,
    });
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit.resetAt);

    try {
        const { code } = await req.json();
        if (auth.user.two_factor_enabled !== true) return jsonError('Ative o 2FA primeiro', 409);

        const verification = verifySecondFactor(auth.user, String(code || ''));
        if (!verification.valid) return jsonError('Codigo do autenticador ou de recuperacao invalido');

        const recovery = createRecoveryCodes(auth.user.id);
        const { error } = await supabase
            .from('users')
            .update({ two_factor_recovery_codes: recovery.hashes, updated_at: new Date().toISOString() })
            .eq('id', auth.user.id);

        if (error) return jsonError('Nao foi possivel gerar novos codigos', 500);

        const response = jsonSuccess({ recovery_codes: recovery.codes });
        response.headers.set('Cache-Control', 'no-store');
        return response;
    } catch (error) {
        console.error('[2FA] Recovery codes error:', error);
        return jsonError('Nao foi possivel gerar novos codigos', 500);
    }
}
