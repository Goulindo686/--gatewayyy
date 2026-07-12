export const dynamic = 'force-dynamic';
export const maxDuration = 30;
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { jsonError, jsonSuccess } from '@/lib/auth';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
    try {
        const { toEmail, userName, resetToken, secret } = await req.json();

        // Verifica secret interno para evitar chamadas externas
        const expectedSecret = process.env.INTERNAL_SECRET;
        if (!expectedSecret) {
            console.error('[SEND-RESET-EMAIL] INTERNAL_SECRET não configurado');
            return jsonError('Não configurado', 500);
        }
        if (secret !== expectedSecret) {
            return jsonError('Não autorizado', 401);
        }

        if (!toEmail || !resetToken) {
            return jsonError('Dados incompletos');
        }

        console.log(`[SEND-RESET-EMAIL] Iniciando envio para ${toEmail}`);

        await sendPasswordResetEmail({ toEmail, userName, resetToken });

        console.log(`[SEND-RESET-EMAIL] Email enviado com sucesso para ${toEmail}`);
        return jsonSuccess({ sent: true });
    } catch (err: any) {
        console.error('[SEND-RESET-EMAIL] ERRO:', err?.message, err?.code, err?.response);
        return jsonError('Erro ao enviar email', 500);
    }
}
