export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { requestBodyTooLarge } from '@/lib/request-security';
import {
    sendSmtpDiagnosticEmail,
    verifySmtpConnection,
} from '@/lib/smtp';

function serializeEmailError(error: unknown) {
    const err = error as {
        message?: string;
        code?: string;
        command?: string;
        response?: string;
        responseCode?: number;
    };

    return {
        message: err?.message || 'Falha desconhecida ao testar SMTP',
        code: err?.code || null,
        command: err?.command || null,
        response: err?.response || null,
        responseCode: err?.responseCode || null,
    };
}

export async function POST(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth || auth.user.role !== 'admin') return jsonError('Nao autorizado', 403);

    const ip =
        req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        req.headers.get('x-real-ip') ||
        'unknown';
    const rl = await checkRateLimit({
        key: `admin:settings:email-test:${auth.user.id}:${ip}`,
        limit: 10,
        windowSecs: 3600,
        failOpen: true,
    });
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);
    if (requestBodyTooLarge(req, 2_048)) return jsonError('Requisicao muito grande', 413);

    try {
        const body = await req.json().catch(() => ({}));
        const to = typeof body.to === 'string' ? body.to.trim() : '';
        const mode = body.mode === 'send' ? 'send' : 'verify';

        const result = mode === 'send'
            ? await sendSmtpDiagnosticEmail(to)
            : await verifySmtpConnection();

        return jsonSuccess({
            ok: true,
            mode,
            result,
        });
    } catch (error) {
        console.error('[ADMIN EMAIL TEST] SMTP diagnostic failed:', error);
        return Response.json({
            error: 'Falha no diagnostico de email',
            diagnostic: serializeEmailError(error),
        }, { status: 500 });
    }
}
