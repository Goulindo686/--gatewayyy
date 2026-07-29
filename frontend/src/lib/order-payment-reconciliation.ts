import 'server-only';

import { supabase } from '@/lib/db';
import { PagarmeService } from '@/lib/pagarme';
import { syncOrderAffiliateCommission } from '@/lib/affiliates';
import { sendApprovedSaleNotification } from '@/lib/sale-notifications';
import { saveTransactionByProviderEvent } from '@/lib/transaction-ledger';
import { enqueueAndProcessOrderWebhook } from '@/lib/outgoing-webhooks';

type ReconciliationStatus =
    | 'not_found'
    | 'unchanged'
    | 'paid'
    | 'failed'
    | 'cancelled'
    | 'refunded'
    | 'chargeback';

export type OrderPaymentReconciliationResult = {
    status: ReconciliationStatus;
    reconciled: boolean;
    notificationAttempted: boolean;
    order: any | null;
};

function normalizeProviderStatus(providerOrder: any): ReconciliationStatus | 'pending' {
    const charges = Array.isArray(providerOrder?.charges) ? providerOrder.charges : [];
    const statuses = [
        providerOrder?.status,
        ...charges.flatMap((charge: any) => [
            charge?.status,
            charge?.last_transaction?.status,
        ]),
    ]
        .map((status) => String(status || '').trim().toLowerCase())
        .filter(Boolean);

    if (statuses.some((status) => ['paid', 'captured'].includes(status))) return 'paid';
    if (statuses.some((status) => ['chargedback', 'chargeback'].includes(status))) return 'chargeback';
    if (statuses.some((status) => ['refunded'].includes(status))) return 'refunded';
    if (statuses.some((status) => ['canceled', 'cancelled'].includes(status))) return 'cancelled';
    if (statuses.some((status) => ['failed', 'payment_failed'].includes(status))) return 'failed';
    return 'pending';
}

async function persistPaidLedger(order: any) {
    const { data: updatedSales, error: saleUpdateError } = await supabase
        .from('transactions')
        .update({ status: 'confirmed' })
        .eq('order_id', order.id)
        .in('type', ['sale', 'api_sale'])
        .select('id');
    if (saleUpdateError) throw saleUpdateError;

    if (!updatedSales?.length) {
        const { error } = await saveTransactionByProviderEvent({
            user_id: order.seller_id,
            order_id: order.id,
            type: 'sale',
            amount: order.amount,
            status: 'confirmed',
            description: `Venda confirmada - Pedido ${order.id}`,
            provider_event_key: `order-sale:${order.id}`,
        });
        if (error) throw error;
    }

    const feeAmount = Math.min(
        Math.max(0, Math.round(Number(order.amount) || 0)),
        Math.max(0, Math.round(Number(order.platform_fee_amount) || 0)),
    );
    if (feeAmount > 0) {
        const { error } = await saveTransactionByProviderEvent({
            user_id: order.seller_id,
            order_id: order.id,
            type: 'fee',
            amount: feeAmount,
            status: 'confirmed',
            description: `Taxa de plataforma - Pedido ${order.id}`,
            provider_event_key: `order-fee:${order.id}`,
        });
        if (error) throw error;
    }
}

async function notifyReconciledSale(order: any) {
    const { data: product } = order.product_id
        ? await supabase
            .from('products')
            .select('name, image_url')
            .eq('id', order.product_id)
            .maybeSingle()
        : { data: null };

    return sendApprovedSaleNotification({
        orderId: order.id,
        sellerId: order.seller_id,
        amountCents: order.amount,
        platformFeeAmountCents: order.platform_fee_amount || 0,
        affiliate: order.affiliate_id && order.affiliate_commission_amount
            ? {
                userId: order.affiliate_id,
                commissionAmountCents: order.affiliate_commission_amount,
            }
            : null,
        paymentMethod: order.payment_method || 'Pagamento',
        productName: product?.name || 'Venda',
        customerName: order.buyer_name || order.buyer_email || 'Cliente',
        imageUrl: product?.image_url,
        url: '/dashboard',
    });
}

async function ensureMerchantWebhook(
    order: Parameters<typeof enqueueAndProcessOrderWebhook>[0],
    status: string,
) {
    try {
        return await enqueueAndProcessOrderWebhook(order, status);
    } catch (error) {
        // Provider status is still authoritative. A temporary outbox failure
        // must not turn a paid order back into an API error; the next poll or
        // recovery run will try to enqueue it again.
        console.error('[PAYMENT RECONCILIATION] Failed to queue merchant webhook:', error);
        return null;
    }
}

/**
 * Confere um pedido local diretamente na Pagar.me.
 *
 * Esta e uma contingencia para quando o webhook estiver atrasado ou indisponivel.
 * O split financeiro ja ocorreu no provedor; aqui apenas sincronizamos o estado
 * local e usamos as mesmas chaves idempotentes do webhook.
 */
export async function reconcileOrderPayment(
    orderId: string,
): Promise<OrderPaymentReconciliationResult> {
    const { data: currentOrder, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .maybeSingle();
    if (orderError) throw orderError;
    if (!currentOrder) {
        return {
            status: 'not_found',
            reconciled: false,
            notificationAttempted: false,
            order: null,
        };
    }

    if (currentOrder.status === 'paid') {
        let notificationAttempted = false;
        if (!currentOrder.paid_processed_at) {
            try {
                await persistPaidLedger(currentOrder);
            } catch (error) {
                console.error('[PAYMENT RECONCILIATION] Failed to recover paid ledger:', error);
            }
            try {
                await syncOrderAffiliateCommission(currentOrder, 'paid');
                notificationAttempted = await notifyReconciledSale(currentOrder);
            } catch (error) {
                console.error('[PAYMENT RECONCILIATION] Failed to recover paid notification:', error);
            }
        }
        await ensureMerchantWebhook(currentOrder, 'paid');
        return {
            status: 'paid',
            reconciled: false,
            notificationAttempted,
            order: currentOrder,
        };
    }

    if (
        ['failed', 'cancelled', 'canceled', 'refunded', 'chargeback'].includes(currentOrder.status)
        || !currentOrder.pagarme_order_id
    ) {
        if (currentOrder.status !== 'pending' && currentOrder.status !== 'processing') {
            await ensureMerchantWebhook(
                currentOrder,
                currentOrder.status === 'canceled' ? 'cancelled' : currentOrder.status,
            );
        }
        return {
            status: currentOrder.status === 'canceled' ? 'cancelled' : currentOrder.status,
            reconciled: false,
            notificationAttempted: false,
            order: currentOrder,
        } as OrderPaymentReconciliationResult;
    }

    const providerOrder = await PagarmeService.getOrder(currentOrder.pagarme_order_id);
    const providerStatus = normalizeProviderStatus(providerOrder);
    if (providerStatus === 'pending') {
        return {
            status: 'unchanged',
            reconciled: false,
            notificationAttempted: false,
            order: currentOrder,
        };
    }

    const nextStatus = providerStatus === 'cancelled' ? 'cancelled' : providerStatus;
    const { error: statusError } = await supabase
        .from('orders')
        .update({ status: nextStatus })
        .eq('id', currentOrder.id)
        .in('status', ['pending', 'processing']);
    if (statusError) throw statusError;

    const { data: refreshedOrder, error: refreshError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', currentOrder.id)
        .single();
    if (refreshError) throw refreshError;

    await syncOrderAffiliateCommission(refreshedOrder, refreshedOrder.status);

    if (refreshedOrder.status !== 'paid') {
        await supabase
            .from('transactions')
            .update({ status: refreshedOrder.status })
            .eq('order_id', refreshedOrder.id)
            .in('type', ['sale', 'api_sale']);
        await ensureMerchantWebhook(refreshedOrder, refreshedOrder.status);
        return {
            status: providerStatus,
            reconciled: true,
            notificationAttempted: false,
            order: refreshedOrder,
        };
    }

    // Ledger e notificacao sao independentes: uma falha de escrita nao deve
    // impedir o alerta de uma venda que o provedor ja confirmou.
    try {
        await persistPaidLedger(refreshedOrder);
    } catch (error) {
        console.error('[PAYMENT RECONCILIATION] Failed to persist ledger:', error);
    }

    let notificationAttempted = false;
    try {
        notificationAttempted = await notifyReconciledSale(refreshedOrder);
    } catch (error) {
        console.error('[PAYMENT RECONCILIATION] Failed to notify paid order:', error);
    }
    await ensureMerchantWebhook(refreshedOrder, 'paid');

    if (refreshedOrder.product_id) {
        const { count } = await supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('product_id', refreshedOrder.product_id)
            .eq('status', 'paid');
        await supabase
            .from('products')
            .update({ sales_count: count || 0 })
            .eq('id', refreshedOrder.product_id);
    }

    return {
        status: 'paid',
        reconciled: true,
        notificationAttempted,
        order: refreshedOrder,
    };
}
