export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { sendPushNotification } from '@/lib/webpush';

type TestScenario =
    | 'approved_sale'
    | 'affiliate_sale'
    | 'affiliate_commission'
    | 'platform_fee'
    | 'affiliate_complete';

function boundedNumber(value: unknown, fallback: number, min: number, max: number) {
    const parsed = Number(value);
    return Number.isFinite(parsed)
        ? Math.min(max, Math.max(min, parsed))
        : fallback;
}

function formatBRL(amount: number) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(amount).replace(/\u00a0/g, ' ');
}

export async function POST(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Nao autorizado', 401);
    if (auth.user.role !== 'admin') return jsonError('Acesso restrito a administradores', 403);

    const body = await req.json();
    const allowedScenarios = new Set<TestScenario>([
        'approved_sale',
        'affiliate_sale',
        'affiliate_commission',
        'platform_fee',
        'affiliate_complete',
    ]);
    const requestedScenario = String(body.notification_type || 'approved_sale') as TestScenario;
    if (!allowedScenarios.has(requestedScenario)) {
        return jsonError('Tipo de simulacao invalido.', 400);
    }

    const grossAmount = boundedNumber(body.amount, 29.90, 1, 1_000_000);
    const platformFee = Math.min(
        grossAmount,
        boundedNumber(body.platform_fee, 2, 0, 10_000),
    );
    const commissionPercentage = boundedNumber(body.commission_percentage, 30, 0, 90);
    const commissionBase = Math.max(0, grossAmount - platformFee);
    const affiliateCommission = Math.round(commissionBase * commissionPercentage) / 100;
    const producerAmount = Math.max(0, grossAmount - platformFee - affiliateCommission);
    const simulationId = Date.now();

    const payloadsByScenario = {
        approved_sale: [{
            title: 'Venda Aprovada!',
            body: `Valor: ${formatBRL(grossAmount)}`,
            url: '/dashboard',
            tag: `sale-test-${simulationId}`,
            type: 'approved_sale',
        }],
        affiliate_sale: [{
            title: 'Venda de afiliado!',
            body: `Sua parte: ${formatBRL(producerAmount)}`,
            url: '/dashboard/affiliates',
            tag: `affiliate-sale-test-${simulationId}`,
            type: 'affiliate_sale',
        }],
        affiliate_commission: [{
            title: 'Comissão de venda!',
            body: `Você recebeu ${formatBRL(affiliateCommission)}`,
            url: '/dashboard/affiliates',
            tag: `affiliate-commission-test-${simulationId}`,
            type: 'affiliate_commission',
        }],
        platform_fee: [{
            title: 'Taxa da plataforma!',
            body: `${formatBRL(platformFee)} - Vendedor teste - Produto teste`,
            url: '/admin/transactions',
            tag: `platform-fee-test-${simulationId}`,
            type: 'platform_fee',
        }],
        affiliate_complete: [
            {
                title: 'Venda de afiliado!',
                body: `Sua parte: ${formatBRL(producerAmount)}`,
                url: '/dashboard/affiliates',
                tag: `affiliate-sale-complete-test-${simulationId}`,
                type: 'affiliate_sale',
            },
            {
                title: 'Comissão de venda!',
                body: `Você recebeu ${formatBRL(affiliateCommission)}`,
                url: '/dashboard/affiliates',
                tag: `affiliate-commission-complete-test-${simulationId}`,
                type: 'affiliate_commission',
            },
            {
                title: 'Taxa da plataforma!',
                body: `${formatBRL(platformFee)} - Vendedor teste - Produto teste`,
                url: '/admin/transactions',
                tag: `platform-fee-complete-test-${simulationId}`,
                type: 'platform_fee',
            },
        ],
    } satisfies Record<TestScenario, Array<{
        title: string;
        body: string;
        url: string;
        tag: string;
        type: string;
    }>>;

    try {
        const deliveries = await Promise.all(
            payloadsByScenario[requestedScenario].map((payload) =>
                sendPushNotification(auth.user.id, {
                    ...payload,
                    icon: '/favicon.png',
                    sound: 'sale_chime',
                    timestamp: Date.now(),
                })
            ),
        );
        const delivery = deliveries[0];

        if (deliveries.some((result) => !result.configured)) {
            return jsonError('As chaves de notificacao do servidor estao incompletas.', 503);
        }
        if (deliveries.some((result) => result.reason === 'subscription_lookup_failed')) {
            return jsonError('Nao foi possivel consultar os dispositivos registrados.', 503);
        }
        if (delivery.subscriptions === 0) {
            return jsonError('Este dispositivo nao esta registrado no servidor. Desative e ative as notificacoes novamente.', 409);
        }
        if (deliveries.some((result) => result.delivered === 0)) {
            return jsonError('O dispositivo recusou a notificacao. Desative e ative as notificacoes novamente.', 502);
        }

        return jsonSuccess({
            sent: true,
            scenario: requestedScenario,
            notifications_sent: deliveries.length,
            deliveries,
            preview: {
                gross_amount: grossAmount,
                platform_fee: platformFee,
                commission_percentage: commissionPercentage,
                affiliate_commission: affiliateCommission,
                producer_amount: producerAmount,
            },
        });
    } catch (err: unknown) {
        console.error('[Push Test] Erro:', err);
        return jsonError('Erro ao enviar notificacao de teste', 500);
    }
}
