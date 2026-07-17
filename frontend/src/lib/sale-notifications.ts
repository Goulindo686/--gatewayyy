import { checkRateLimit } from '@/lib/rate-limit';
import { notifySale } from '@/lib/telegram';
import { sendPushNotification } from '@/lib/webpush';

type ApprovedSaleNotificationInput = {
    orderId: string;
    sellerId: string;
    amountCents: number;
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

    return true;
}
