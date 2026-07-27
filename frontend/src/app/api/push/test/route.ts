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
        const delivery = await sendPushNotification(auth.user.id, {
            title: 'Venda Aprovada!',
            body: `Valor: ${formatted.replace(/\u00a0/g, ' ')}`,
            url: '/dashboard',
            icon: '/favicon.png',
            tag: `sale-test-${Date.now()}`,
            type: 'approved_sale',
            sound: 'sale_chime',
            timestamp: Date.now(),
        });

        if (!delivery.configured) {
            return jsonError('As chaves de notificacao do servidor estao incompletas.', 503);
        }
        if (delivery.reason === 'subscription_lookup_failed') {
            return jsonError('Nao foi possivel consultar os dispositivos registrados.', 503);
        }
        if (delivery.subscriptions === 0) {
            return jsonError('Este dispositivo nao esta registrado no servidor. Desative e ative as notificacoes novamente.', 409);
        }
        if (delivery.delivered === 0) {
            return jsonError('O dispositivo recusou a notificacao. Desative e ative as notificacoes novamente.', 502);
        }

        return jsonSuccess({ sent: true, delivery });
    } catch (err: unknown) {
        console.error('[Push Test] Erro:', err);
        return jsonError('Erro ao enviar notificacao de teste', 500);
    }
}
