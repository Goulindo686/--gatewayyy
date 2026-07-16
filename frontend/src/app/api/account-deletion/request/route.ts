import { NextRequest } from 'next/server';
import { jsonError, jsonSuccess } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendAccountDeletionRequestEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanText(value: unknown, maxLength: number) {
    return String(value || '')
        .replace(/[\u0000-\u001F\u007F]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);
}

export async function POST(req: NextRequest) {
    try {
        const ip =
            req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
            req.headers.get('x-real-ip') ||
            'unknown';

        const body = await req.json().catch(() => ({}));

        // Honeypot field used by the public form. Return success to avoid training spam bots.
        if (cleanText(body.website, 120)) {
            return jsonSuccess({ ok: true });
        }

        const name = cleanText(body.name, 120);
        const accountEmail = cleanText(body.accountEmail, 160).toLowerCase();
        const contactEmail = cleanText(body.contactEmail || body.accountEmail, 160).toLowerCase();
        const reason = cleanText(body.reason, 900);
        const confirmed = body.confirmed === true;

        if (!name) return jsonError('Informe seu nome.', 400);
        if (!EMAIL_RE.test(accountEmail)) return jsonError('Informe o email da conta.', 400);
        if (!EMAIL_RE.test(contactEmail)) return jsonError('Informe um email de contato valido.', 400);
        if (!confirmed) return jsonError('Confirme que deseja solicitar a exclusao da conta e dos dados elegiveis.', 400);

        const ipLimit = await checkRateLimit({
            key: `account-deletion:ip:${ip}`,
            limit: 5,
            windowSecs: 3600,
            failOpen: true,
        });
        if (!ipLimit.allowed) return jsonError('Muitas solicitacoes. Tente novamente mais tarde.', 429);

        const emailLimit = await checkRateLimit({
            key: `account-deletion:email:${accountEmail}`,
            limit: 3,
            windowSecs: 86400,
            failOpen: true,
        });
        if (!emailLimit.allowed) return jsonError('Ja recebemos solicitacoes recentes para este email.', 429);

        await sendAccountDeletionRequestEmail({
            name,
            accountEmail,
            contactEmail,
            reason,
            ip,
            userAgent: req.headers.get('user-agent') || undefined,
            requestedAt: new Date().toISOString(),
        });

        return jsonSuccess({
            ok: true,
            message: 'Solicitacao recebida. A equipe GouPay analisara os dados elegiveis para exclusao.',
        });
    } catch (error: any) {
        console.error('[ACCOUNT DELETION] Request failed:', error?.message || error);
        return jsonError('Nao foi possivel enviar sua solicitacao agora. Tente novamente em alguns minutos.', 500);
    }
}
