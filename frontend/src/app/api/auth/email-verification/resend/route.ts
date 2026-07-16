export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { jsonError, jsonSuccess } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import {
    EmailVerificationError,
    getVerificationUser,
    requestEmailVerification,
} from '@/lib/email-verification';

export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
            || req.headers.get('x-real-ip')
            || 'unknown';
        const rateLimit = await checkRateLimit({
            key: `email-verification:resend:${ip}`,
            limit: 10,
            windowSecs: 3600,
            failOpen: false,
        });
        if (!rateLimit.allowed) return rateLimitResponse(rateLimit.resetAt);

        const { verification_token: verificationToken } = await req.json();
        if (!verificationToken) return jsonError('Verificacao obrigatoria');

        const user = await getVerificationUser(String(verificationToken));
        if (user.email_verified === true) return jsonError('Este email ja foi verificado');

        const verification = await requestEmailVerification(user);
        return jsonSuccess({
            verification_required: true,
            verification_token: verification.verificationToken,
            email_masked: verification.emailMasked,
            code_sent: verification.sent,
            retry_after: verification.retryAfter,
        });
    } catch (error) {
        if (error instanceof EmailVerificationError) return jsonError(error.message, error.status);
        console.error('[EMAIL VERIFICATION] Resend error:', error);
        return jsonError('Nao foi possivel reenviar o codigo agora', 500);
    }
}
