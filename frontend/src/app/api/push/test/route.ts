export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { sendPushNotification } from '@/lib/webpush';

export async function POST(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Nao autorizado', 401);
    if (auth.user.role !== 'admin') return jsonError('Acesso restrito a administradores', 403);

    const body = await req.json();
    const amount = parseFloat(body.amount) || 10.00;

    const formatted = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(amount);

    try {
        await sendPushNotification(auth.user.id, {
            title: 'Venda Aprovada!',
            body: `Valor: ${formatted.replace(/\u00a0/g, ' ')}`,
            url: '/dashboard',
            icon: '/favicon.png',
            tag: `sale-test-${Date.now()}`,
        });

        return jsonSuccess({ sent: true });
    } catch (err: unknown) {
        console.error('[Push Test] Erro:', err);
        return jsonError('Erro ao enviar notificacao de teste', 500);
    }
}
