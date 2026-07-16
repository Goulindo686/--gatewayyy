export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { comparePassword, getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { supabase } from '@/lib/db';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import {
    buildOtpAuthUri,
    encryptTwoFactorSecret,
    formatTwoFactorSecret,
    generateTwoFactorSecret,
} from '@/lib/two-factor';

export async function POST(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Nao autorizado', 401);
    if (auth.tokenPayload?.impersonated_by) return jsonError('2FA nao pode ser alterado durante acesso administrativo', 403);

    const rateLimit = await checkRateLimit({
        key: `2fa:setup:${auth.user.id}`,
        limit: 5,
        windowSecs: 3600,
        failOpen: false,
    });
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit.resetAt);

    try {
        const { password } = await req.json();
        if (!password) return jsonError('Digite sua senha atual');
        if (auth.user.two_factor_enabled === true) return jsonError('O 2FA ja esta ativo nesta conta', 409);

        const passwordHash = auth.user.password_hash || auth.user.password;
        if (!passwordHash || !await comparePassword(String(password), passwordHash)) {
            return jsonError('Senha atual incorreta');
        }

        const secret = generateTwoFactorSecret();
        const encryptedSecret = encryptTwoFactorSecret(secret);
        const { error } = await supabase
            .from('users')
            .update({
                two_factor_enabled: false,
                two_factor_secret: encryptedSecret,
                two_factor_recovery_codes: [],
                two_factor_confirmed_at: null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', auth.user.id);

        if (error) {
            console.error('[2FA] Setup database error:', error);
            return jsonError('Execute a migracao 024_add_two_factor_authentication.sql no Supabase', 500);
        }

        const response = jsonSuccess({
            secret: formatTwoFactorSecret(secret),
            otpauth_uri: buildOtpAuthUri(secret, auth.user.email),
        });
        response.headers.set('Cache-Control', 'no-store');
        return response;
    } catch (error) {
        console.error('[2FA] Setup error:', error);
        return jsonError('Nao foi possivel iniciar a configuracao do 2FA', 500);
    }
}
