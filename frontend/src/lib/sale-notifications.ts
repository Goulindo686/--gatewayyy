import { checkRateLimit } from '@/lib/rate-limit';
import { notifySale } from '@/lib/telegram';
import { sendPushNotification } from '@/lib/webpush';

type ApprovedSaleNotificationInput = {
    orderId: string;
    sellerId: string;
    amountCents: number;
    platformFeeAmountCents?: number;
    affiliate?: {
        userId: string;
        commissionAmountCents: number;
    } | null;
    paymentMethod?: string;
    productName?: string;
    customerName?: string;
    imageUrl?: string | null;
    url?: string;
};

const NOTIFICATION_DEDUP_WINDOW_SECONDS = 365 * 24 * 60 * 60;

export function formatApprovedSaleValue(amountCents: number) {
    const normalizedAmount = Math.max(0, Math.round(Number(amountCents) || 0));
    const value = new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(normalizedAmount / 100);
    return `R$ ${value}`;
}

/**
 * Envia a mesma notificacao para qualquer venda aprovada (PIX, cartao ou cobranca),
 * com deduplicacao por pedido para cobrir aprovacao imediata e webhook.
 */
export async function sendApprovedSaleNotification(input: ApprovedSaleNotificationInput) {
    if (!input.orderId || !input.sellerId) return false;

    const deduplication = await checkRateLimit({
        key: `notification:approved-sale:${input.orderId}`,
        limit: 1,
        windowSecs: NOTIFICATION_DEDUP_WINDOW_SECONDS,
        failOpen: true,
    });
    if (!deduplication.allowed) return false;

    const affiliateId = String(input.affiliate?.userId || '').trim();
    const commissionAmountCents = Math.max(
        0,
        Math.round(Number(input.affiliate?.commissionAmountCents) || 0),
    );
    const platformFeeAmountCents = Math.max(
        0,
        Math.round(Number(input.platformFeeAmountCents) || 0),
    );
    const isAffiliateSale = Boolean(
        affiliateId
        && affiliateId !== input.sellerId
        && commissionAmountCents > 0,
    );

    if (isAffiliateSale) {
        const producerAmountCents = Math.max(
            0,
            Math.round(Number(input.amountCents) || 0)
                - platformFeeAmountCents
                - commissionAmountCents,
        );
        const producerValue = formatApprovedSaleValue(producerAmountCents);
        const commissionValue = formatApprovedSaleValue(commissionAmountCents);
        const affiliateUrl = '/dashboard/affiliates';

        await Promise.allSettled([
            notifySale(input.sellerId, {
                title: 'Venda de afiliado!',
                amount_label: 'Sua parte',
                product_name: input.productName || 'Venda',
                amount: producerAmountCents,
                payment_method: input.paymentMethod || 'Pagamento',
                customer_name: input.customerName || 'Cliente',
                image_url: input.imageUrl || undefined,
            }),
            sendPushNotification(input.sellerId, {
                title: 'Venda de afiliado!',
                body: `Sua parte: ${producerValue}`,
                url: affiliateUrl,
                icon: '/favicon.png',
                tag: `affiliate-sale-producer-${input.orderId}`,
                type: 'affiliate_sale',
                sound: 'sale_chime',
                timestamp: Date.now(),
            }),
            notifySale(affiliateId, {
                title: 'Comissão de venda!',
                amount_label: 'Comissão',
                product_name: input.productName || 'Venda',
                amount: commissionAmountCents,
                payment_method: input.paymentMethod || 'Pagamento',
                customer_name: 'Venda indicada',
                image_url: input.imageUrl || undefined,
            }),
            sendPushNotification(affiliateId, {
                title: 'Comissão de venda!',
                body: `Você recebeu ${commissionValue}`,
                url: affiliateUrl,
                icon: '/favicon.png',
                tag: `affiliate-commission-${input.orderId}`,
                type: 'affiliate_commission',
                sound: 'sale_chime',
                timestamp: Date.now(),
            }),
        ]);
    } else {
        const value = formatApprovedSaleValue(input.amountCents);
        await Promise.allSettled([
            notifySale(input.sellerId, {
                product_name: input.productName || 'Venda',
                amount: input.amountCents,
                payment_method: input.paymentMethod || 'Pagamento',
                customer_name: input.customerName || 'Cliente',
                image_url: input.imageUrl || undefined,
            }),
            sendPushNotification(input.sellerId, {
                title: 'Venda Aprovada!',
                body: `Valor: ${value}`,
                url: input.url || '/dashboard',
                icon: '/favicon.png',
                tag: `sale-${input.orderId}`,
                type: 'approved_sale',
                sound: 'sale_chime',
                timestamp: Date.now(),
            }),
        ]);
    }

    return true;
}
