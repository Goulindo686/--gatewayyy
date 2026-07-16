export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { generateToken, jsonError, jsonSuccess } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { EmailVerificationError, verifyEmailCode } from '@/lib/email-verification';

export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
            || req.headers.get('x-real-ip')
            || 'unknown';
        const rateLimit = await checkRateLimit({
            key: `email-verification:verify:${ip}`,
            limit: 30,
            windowSecs: 900,
            failOpen: false,
        });
        if (!rateLimit.allowed) return rateLimitResponse(rateLimit.resetAt);

        const { verification_token: verificationToken, code } = await req.json();
        if (!verificationToken || !code) return jsonError('Codigo e verificacao sao obrigatorios');

        const user = await verifyEmailCode(String(verificationToken), String(code));
        const token = generateToken({ userId: user.id, role: user.role });

        return jsonSuccess({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        if (error instanceof EmailVerificationError) return jsonError(error.message, error.status);
        console.error('[EMAIL VERIFICATION] Verify error:', error);
        return jsonError('Erro interno ao verificar o email', 500);
    }
}
