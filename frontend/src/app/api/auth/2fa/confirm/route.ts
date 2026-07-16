export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { supabase } from '@/lib/db';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import {
    createRecoveryCodes,
    decryptTwoFactorSecret,
    verifyTotp,
} from '@/lib/two-factor';

export async function POST(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Nao autorizado', 401);
    if (auth.tokenPayload?.impersonated_by) return jsonError('2FA nao pode ser alterado durante acesso administrativo', 403);

    const rateLimit = await checkRateLimit({
        key: `2fa:confirm:${auth.user.id}`,
        limit: 10,
        windowSecs: 900,
        failOpen: false,
    });
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit.resetAt);

    try {
        const { code } = await req.json();
        if (!auth.user.two_factor_secret) return jsonError('Inicie a configuracao do autenticador novamente', 409);
        if (auth.user.two_factor_enabled === true) return jsonError('O 2FA ja esta ativo', 409);

        const secret = decryptTwoFactorSecret(auth.user.two_factor_secret);
        if (!verifyTotp(secret, String(code || ''))) return jsonError('Codigo invalido. Confira o relogio do celular e tente novamente.');

        const recovery = createRecoveryCodes(auth.user.id);
        const confirmedAt = new Date().toISOString();
        const { error } = await supabase
            .from('users')
            .update({
                two_factor_enabled: true,
                two_factor_recovery_codes: recovery.hashes,
                two_factor_confirmed_at: confirmedAt,
                updated_at: confirmedAt,
            })
            .eq('id', auth.user.id)
            .eq('two_factor_secret', auth.user.two_factor_secret);

        if (error) {
            console.error('[2FA] Confirm database error:', error);
            return jsonError('Nao foi possivel ativar o 2FA', 500);
        }

        const response = jsonSuccess({
            enabled: true,
            confirmed_at: confirmedAt,
            recovery_codes: recovery.codes,
        });
        response.headers.set('Cache-Control', 'no-store');
        return response;
    } catch (error) {
        console.error('[2FA] Confirm error:', error);
        return jsonError('Nao foi possivel confirmar o 2FA', 500);
    }
}
