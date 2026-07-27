export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { supabase } from '@/lib/db';
import { jsonError, jsonSuccess } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { sendPurchaseApprovedEmail } from '@/lib/email';
import { sendFacebookEvent } from '@/lib/facebook-capi';
import { sendPaidOrderToUtmify } from '@/lib/utmify';
import { normalizeWebhookUrls, sendWebhookPayload } from '@/lib/webhooks';
import { CARD_PLATFORM_FEE_PERCENTAGE } from '@/lib/pagarme';
import { sendApprovedSaleNotification } from '@/lib/sale-notifications';
import {
    recordSubscriptionRenewalCommission,
    reverseSubscriptionAffiliateCommission,
    syncInitialSubscriptionAffiliateCommission,
    syncOrderAffiliateCommission,
} from '@/lib/affiliates';
import {
    beginWebhookEvent,
    completeWebhookEvent,
    createWebhookEventKey,
    failWebhookEvent,
} from '@/lib/webhook-security';
import { saveTransactionByProviderEvent } from '@/lib/transaction-ledger';

type SaleNotificationOrder = {
    id: string;
    seller_id: string;
    amount: number;
    platform_fee_amount?: number | null;
    affiliate_id?: string | null;
    affiliate_commission_amount?: number | null;
    payment_method?: string | null;
    buyer_name?: string | null;
    buyer_email?: string | null;
    product_id?: string | null;
};

async function notifyApprovedOrder(
    order: SaleNotificationOrder,
    knownProduct?: { name?: string | null; image_url?: string | null }
) {
    let product = knownProduct;
    if (!product && order.product_id) {
        const { data } = await supabase
            .from('products')
            .select('name, image_url')
            .eq('id', order.product_id)
            .maybeSingle();
        product = data || undefined;
    }

    return sendApprovedSaleNotification({
        orderId: order.id,
        sellerId: order.seller_id,
        amountCents: order.amount,
        platformFeeAmountCents: order.platform_fee_amount || 0,
        affiliate: order.affiliate_id && order.affiliate_commission_amount ? {
            userId: order.affiliate_id,
            commissionAmountCents: order.affiliate_commission_amount,
        } : null,
        paymentMethod: order.payment_method || 'Pagamento',
        productName: product?.name || 'Venda',
        customerName: order.buyer_name || order.buyer_email || 'Cliente',
        imageUrl: product?.image_url,
        url: '/dashboard',
    });
}

function safeEqual(a: string, b: string) {
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.from(b);
    if (aBuf.length !== bBuf.length) return false;
    return timingSafeEqual(aBuf, bBuf);
}

function isValidBasicAuth(req: NextRequest, username: string, password: string) {
    const auth = req.headers.get('authorization') || '';
    if (!auth.startsWith('Basic ')) return false;
    const token = auth.slice('Basic '.length).trim();
    const expected = Buffer.from(`${username}:${password}`).toString('base64');
    return safeEqual(token, expected);
}

function isValidPagarmeSignature({
    secret,
    rawBody,
    signatureHeader,
}: {
    secret: string;
    rawBody: string;
    signatureHeader: string;
}) {
    const provided = signatureHeader.trim();
    const providedHex = provided.includes('=') ? provided.split('=').slice(1).join('=').trim() : provided;

    const sha1 = createHmac('sha1', secret).update(rawBody).digest('hex');
    const sha256 = createHmac('sha256', secret).update(rawBody).digest('hex');

    return [sha1, sha256].some((expected) => (
        safeEqual(provided, expected)
        || safeEqual(providedHex, expected)
        || safeEqual(provided, `sha1=${expected}`)
        || safeEqual(provided, `sha256=${expected}`)
    ));
}

function canTransitionOrderStatus(currentStatus: string, nextStatus: string) {
    if (!nextStatus || currentStatus === nextStatus) return true;
    if (currentStatus === 'chargeback') return false;
    if (currentStatus === 'refunded') return nextStatus === 'chargeback';
    if (currentStatus === 'paid' && ['pending', 'failed', 'cancelled', 'canceled'].includes(nextStatus)) {
        return false;
    }
    return true;
}

async function claimPaidOrderProcessing(order: any, eventKey: string) {
    if (order.paid_processed_at) return 'completed' as const;

    const startedAt = new Date(order.paid_processing_started_at || 0).getTime();
    const hasFreshOwner = order.paid_processing_token
        && Number.isFinite(startedAt)
        && Date.now() - startedAt < 2 * 60 * 1000;
    if (hasFreshOwner && order.paid_processing_token !== eventKey) {
        return 'in_progress' as const;
    }

    const staleBefore = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data, error } = await supabase
        .from('orders')
        .update({
            paid_processing_token: eventKey,
            paid_processing_started_at: new Date().toISOString(),
        })
        .eq('id', order.id)
        .is('paid_processed_at', null)
        .or(`paid_processing_token.is.null,paid_processing_token.eq.${eventKey},paid_processing_started_at.lt.${staleBefore}`)
        .select('id')
        .maybeSingle();
    if (error) throw error;
    return data ? 'claimed' as const : 'in_progress' as const;
}

function subscriptionIdFromWebhook(type: string, data: any) {
    if (type.startsWith('subscription.')) return String(data?.id || '');
    return String(
        data?.subscription?.id
        || data?.invoice?.subscription?.id
        || data?.invoice?.subscription_id
        || data?.invoice?.subscriptionId
        || data?.charge?.invoice?.subscription?.id
        || data?.charge?.invoice?.subscription_id
        || data?.charge?.invoice?.subscriptionId
        || data?.subscription_id
        || '',
    );
}

function subscriptionPaymentId(data: any) {
    return String(
        data?.charge?.id
        || data?.charge_id
        || data?.invoice?.charge?.id
        || data?.current_cycle?.charge?.id
        || data?.current_cycle?.invoice?.charge?.id
        || (String(data?.id || '').startsWith('ch_') ? data.id : '')
        || '',
    ) || null;
}

function chargeIdFromWebhook(type: string, data: any) {
    if (type === 'chargeback.received') {
        return String(data?.charge?.id || data?.charge_id || '');
    }
    return type.startsWith('charge.') ? String(data?.id || '') : '';
}

function subscriptionCycleReference(data: any, rawBody: string) {
    return String(
        data?.current_cycle?.id
        || data?.current_cycle?.start_at
        || data?.cycle?.id
        || data?.cycle?.start_at
        || data?.invoice?.id
        || data?.charge?.id
        || createHash('sha256').update(rawBody).digest('hex'),
    );
}

async function handleSubscriptionWebhook(type: string, data: any, rawBody: string, eventKey: string) {
    const pagarmeSubscriptionId = subscriptionIdFromWebhook(type, data);
    if (!pagarmeSubscriptionId) return false;

    if (type === 'subscription.created') {
        await supabase
            .from('subscriptions')
            .update({ status: 'active' })
            .eq('pagarme_subscription_id', pagarmeSubscriptionId);
        return true;
    }

    const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*, subscription_plans(name, product_id)')
        .eq('pagarme_subscription_id', pagarmeSubscriptionId)
        .maybeSingle();
    if (!subscription) {
        throw new Error(`Assinatura local ainda nao encontrada para o evento ${type}.`);
    }

    const paymentId = subscriptionPaymentId(data);
    const cycleReference = subscriptionCycleReference(data, rawBody);
    const matchesInitialCycle = Boolean(
        (subscription.affiliate_initial_cycle_reference
            && subscription.affiliate_initial_cycle_reference === cycleReference)
        || (subscription.affiliate_initial_payment_id
            && subscription.affiliate_initial_payment_id === paymentId),
    );

    if (
        type === 'subscription.payment_succeeded'
        || type === 'subscription.cycle_ended'
        || type === 'invoice.paid'
        || type === 'charge.paid'
    ) {
        await supabase
            .from('subscriptions')
            .update({ status: 'active', current_period_start: new Date().toISOString() })
            .eq('id', subscription.id);

        await saveTransactionByProviderEvent({
            id: uuidv4(),
            user_id: subscription.seller_id,
            type: 'subscription_payment',
            amount: subscription.amount,
            status: 'confirmed',
            description: `Cobranca recorrente - ${subscription.subscription_plans?.name || 'Assinatura'} - ${subscription.customer_email}`,
            provider_event_key: `subscription-payment:${eventKey}`,
        });

        const { data: initialCommission } = await supabase
            .from('affiliate_commissions')
            .select('id, provider_payment_id')
            .eq('subscription_id', subscription.id)
            .eq('source_type', 'subscription_initial')
            .maybeSingle();
        const isInitialPayment = matchesInitialCycle
            || Boolean(initialCommission && !initialCommission.provider_payment_id);

        if (isInitialPayment) {
            if (initialCommission && paymentId && !initialCommission.provider_payment_id) {
                await supabase
                    .from('affiliate_commissions')
                    .update({ provider_payment_id: paymentId })
                    .eq('id', initialCommission.id);
            }
            await syncInitialSubscriptionAffiliateCommission(
                subscription.id,
                'active',
                subscription.affiliate_hold_days || 0,
            );
        } else {
            const providerEventId = createHash('sha256')
                .update(`affiliate-renewal:${subscription.id}:${cycleReference}`)
                .digest('hex');
            await recordSubscriptionRenewalCommission(
                subscription,
                providerEventId,
                paymentId,
            );
        }
        return true;
    }

    if (
        type === 'subscription.payment_failed'
        || type === 'invoice.payment_failed'
        || type === 'charge.payment_failed'
    ) {
        await supabase
            .from('subscriptions')
            .update({ status: 'past_due' })
            .eq('id', subscription.id);
        if (matchesInitialCycle) {
            await syncInitialSubscriptionAffiliateCommission(
                subscription.id,
                'failed',
                subscription.affiliate_hold_days || 0,
            );
        }
        return true;
    }

    if (type === 'subscription.canceled' || type === 'subscription.expired') {
        await supabase
            .from('subscriptions')
            .update({ status: 'canceled', canceled_at: new Date().toISOString() })
            .eq('id', subscription.id);

        const productId = subscription.subscription_plans?.product_id;
        if (productId && subscription.customer_email) {
            const { data: user } = await supabase
                .from('users')
                .select('id')
                .ilike('email', subscription.customer_email)
                .maybeSingle();
            if (user) {
                await supabase
                    .from('enrollments')
                    .update({ status: 'inactive' })
                    .eq('user_id', user.id)
                    .eq('product_id', productId);
            }
        }
        return true;
    }

    if (
        type === 'charge.refunded'
        || type === 'charge.chargedback'
        || type === 'chargeback.received'
    ) {
        await reverseSubscriptionAffiliateCommission({
            subscriptionId: subscription.id,
            providerPaymentId: paymentId,
            status: type === 'charge.refunded' ? 'refunded' : 'chargeback',
        });
        if (type !== 'charge.refunded') {
            await supabase
                .from('subscriptions')
                .update({ status: 'canceled', canceled_at: new Date().toISOString() })
                .eq('id', subscription.id);
        }
        return true;
    }

    return type.startsWith('subscription.');
}

export async function POST(req: NextRequest) {
    let activeWebhookEventKey: string | null = null;
    const webhookSuccess = async (payload: Record<string, unknown>) => {
        if (activeWebhookEventKey) await completeWebhookEvent(activeWebhookEventKey);
        return jsonSuccess(payload);
    };
    try {
        const ip =
            req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
            req.headers.get('x-real-ip') ||
            'unknown';

        const rlIp = await checkRateLimit({ key: `webhook:pagarme:ip:${ip}`, limit: 120, windowSecs: 60, failOpen: false });
        if (!rlIp.allowed) return jsonError('Too many requests', 429);

        const webhookSecret = process.env.PAGARME_WEBHOOK_SECRET;
        const webhookUser = process.env.PAGARME_WEBHOOK_USER;
        const webhookPass = process.env.PAGARME_WEBHOOK_PASS;
        const signature = req.headers.get('x-hub-signature') || req.headers.get('x-pagarme-signature');

        const rawBody = await req.text();

        if (process.env.NODE_ENV === 'production') {
            const hasHmac = !!webhookSecret;
            const hasBasic = !!(webhookUser && webhookPass);
            if (!hasHmac && !hasBasic) {
                console.error('[WEBHOOK] Webhook auth não configurada (defina PAGARME_WEBHOOK_SECRET ou PAGARME_WEBHOOK_USER/PAGARME_WEBHOOK_PASS)');
                return jsonError('Webhook não configurado', 500);
            }

            if (hasHmac && signature) {
                if (!isValidPagarmeSignature({ secret: webhookSecret!, rawBody, signatureHeader: signature })) {
                    console.warn('[WEBHOOK] Assinatura inválida — rejeitado');
                    return jsonError('Assinatura inválida', 401);
                }
            } else if (hasBasic) {
                if (!isValidBasicAuth(req, webhookUser!, webhookPass!)) {
                    console.warn('[WEBHOOK] Basic auth inválido — rejeitado');
                    return jsonError('Não autorizado', 401);
                }
            } else {
                console.warn('[WEBHOOK] Assinatura ausente — rejeitado');
                return jsonError('Assinatura ausente', 401);
            }
        }

        const body = JSON.parse(rawBody);
        const { type, data } = body;

        if (!type || !data) return jsonError('Invalid webhook', 400);

        const providerEventId = String(body?.id || '').trim().slice(0, 200);
        const eventId = providerEventId || String(data?.id || '');
        if (eventId) {
            const rlEvent = await checkRateLimit({ key: `webhook:pagarme:event:${eventId}`, limit: 20, windowSecs: 3600, failOpen: true });
            if (!rlEvent.allowed) return jsonError('Too many requests', 429);
        }

        console.log('Webhook received:', type, 'ID:', data.id, 'Order ID:', data.order?.id);

        const webhookIdentity = createWebhookEventKey(type, rawBody, providerEventId);
        const eventLock = await beginWebhookEvent({
            ...webhookIdentity,
            eventType: type,
            providerObjectId: String(data?.id || '') || null,
        });
        if (!eventLock.acquired) {
            return jsonSuccess({ received: true, duplicate: true });
        }
        activeWebhookEventKey = webhookIdentity.eventKey;

        if (await handleSubscriptionWebhook(
            type,
            data,
            rawBody,
            activeWebhookEventKey,
        )) {
            return webhookSuccess({ received: true });
        }

        let order;
        const webhookChargeId = chargeIdFromWebhook(type, data);

        // ESTRATÉGIA 1: Buscar por ID da Cobrança (Charge ID)
        if (webhookChargeId) {
            const { data: o } = await supabase
                .from('orders').select('*').eq('pagarme_charge_id', webhookChargeId).single();
            if (o) order = o;
        }

        // ESTRATÉGIA 2: Buscar por ID do Pedido (Order ID) - Se vier dentro do objeto data.order
        if (!order && data.order && data.order.id) {
            const { data: o } = await supabase
                .from('orders').select('*').eq('pagarme_order_id', data.order.id).single();
            if (o) order = o;
        }

        // ESTRATÉGIA 3: Buscar por ID do Pedido (Order ID) - Se o evento for direto de pedido
        if (!order && type.startsWith('order.') && data.id) {
            const { data: o } = await supabase
                .from('orders').select('*').eq('pagarme_order_id', data.id).single();
            if (o) order = o;
        }

        const pagarmeOrderId =
            data?.order?.id ||
            data?.charge?.order?.id ||
            data?.order_id ||
            data?.orderId ||
            (type.startsWith('order.') ? data.id : undefined);

        // ESTRATÉGIA 4: Buscar por Order ID quando vier como order_id/orderId em eventos de charge.*
        if (!order && pagarmeOrderId) {
            const { data: o } = await supabase
                .from('orders').select('*').eq('pagarme_order_id', pagarmeOrderId).single();
            if (o) order = o;
        }

        const providerOrderCode = String(
            data?.order?.code
            || data?.charge?.order?.code
            || (type.startsWith('order.') ? data?.code : '')
            || '',
        );
        const localOrderId = providerOrderCode.match(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i,
        )?.[0];
        if (!order && localOrderId) {
            const { data: localOrder } = await supabase
                .from('orders')
                .select('*')
                .eq('id', localOrderId)
                .maybeSingle();
            if (localOrder) order = localOrder;
        }

        // ─── BILLING CHARGES LOOKUP ─────────────────────────────────────────
        // If order not found in 'orders' table, check 'billings' table
        if (!order && !type.includes('transfer') && !type.includes('subscription')) {
            let billing = null;

            // Try by charge ID
            if (webhookChargeId) {
                const { data: b } = await supabase
                    .from('billings').select('*').eq('pagarme_charge_id', webhookChargeId).single();
                if (b) billing = b;
            }

            // Try by order ID
            if (!billing && pagarmeOrderId) {
                const { data: b } = await supabase
                    .from('billings').select('*').eq('pagarme_order_id', pagarmeOrderId).single();
                if (b) billing = b;
            }

            if (billing) {
                console.log('[WEBHOOK] Found billing charge:', billing.id, 'Event:', type);

                if (type === 'order.paid' || type === 'charge.paid') {
                    if (billing.status !== 'paid') {
                        await supabase.from('billings')
                            .update({ status: 'paid', paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
                            .eq('id', billing.id);
                        
                        console.log('[WEBHOOK] Billing charge marked as paid:', billing.id);

                        // ─── NOTIFICAÇÕES PARA COBRANÇAS ─────────────────────
                        try {
                            const { data: seller } = await supabase
                                .from('users')
                                .select('id, name, email')
                                .eq('id', billing.user_id)
                                .single();

                            if (seller) {
                                // Notificar o vendedor no Telegram e Web Push com o mesmo visual.
                                await sendApprovedSaleNotification({
                                    orderId: `billing-${billing.id}`,
                                    sellerId: seller.id,
                                    amountCents: billing.amount,
                                    platformFeeAmountCents: billing.fee_amount || 0,
                                    paymentMethod: 'PIX',
                                    productName: billing.description || 'Cobrança Avulsa',
                                    customerName: 'Pagamento de Cobrança',
                                    url: '/dashboard/billings',
                                });
                            }
                        } catch (notifyError) {
                            console.error('[WEBHOOK] Error sending billing notifications:', notifyError);
                        }
                        // ─── FIM NOTIFICAÇÕES ────────────────────────────────
                    }
                } else if (type === 'order.payment_failed' || type === 'charge.payment_failed') {
                    await supabase.from('billings')
                        .update({ status: 'failed', updated_at: new Date().toISOString() })
                        .eq('id', billing.id);
                } else if (type === 'charge.refunded') {
                    await supabase.from('billings')
                        .update({ status: 'refunded', updated_at: new Date().toISOString() })
                        .eq('id', billing.id);
                } else if (type === 'charge.chargedback' || type === 'chargeback.received') {
                    await supabase.from('billings')
                        .update({ status: 'chargeback', updated_at: new Date().toISOString() })
                        .eq('id', billing.id);
                }

                return webhookSuccess({ received: true });
            }
        }
        // ─── END BILLING CHARGES LOOKUP ─────────────────────────────────────

        if (!order && !type.includes('transfer') && pagarmeOrderId) {
            let txStatus: string | null = null;

            if (type === 'order.paid' || type === 'charge.paid') txStatus = 'confirmed';
            else if (type === 'order.payment_failed' || type === 'charge.payment_failed') txStatus = 'failed';
            else if (type === 'charge.refunded') txStatus = 'refunded';
            else if (type === 'charge.chargedback' || type === 'chargeback.received') txStatus = 'chargeback';

            if (txStatus) {
                const { data: apiTx } = await supabase
                    .from('transactions')
                    .select('id, status')
                    .eq('type', 'api_sale')
                    .eq('pagarme_transaction_id', pagarmeOrderId)
                    .single();

                if (apiTx && apiTx.status !== txStatus) {
                    await supabase.from('transactions')
                        .update({ status: txStatus })
                        .eq('id', apiTx.id);
                }
                if (apiTx) {
                    return webhookSuccess({ received: true });
                }
            }
        }

        if (!order && type.includes('transfer')) {
            // Lógica de transferência (mantida abaixo)
        } else if (!order) {
            const checkoutOrigin = String(
                data?.metadata?.checkout_origin
                || data?.order?.metadata?.checkout_origin
                || data?.charge?.order?.metadata?.checkout_origin
                || '',
            );
            if (localOrderId || checkoutOrigin.startsWith('goupay_')) {
                throw new Error(`Pedido local ainda nao encontrado para o evento ${type}.`);
            }
            console.log('Order not found for webhook:', type, data.id, 'pagarmeOrderId:', pagarmeOrderId);
            return webhookSuccess({ received: true });
        }

        let newStatus = order?.status;
        let transactionType = 'sale';

        switch (type) {
            case 'order.paid':
            case 'charge.paid':
                newStatus = 'paid';
                break;
            case 'order.payment_failed':
            case 'charge.payment_failed':
                newStatus = 'failed';
                break;
            case 'charge.refunded':
                newStatus = 'refunded';
                transactionType = 'refund';
                break;
            case 'charge.chargedback':
            case 'chargeback.received':
                newStatus = 'chargeback';
                transactionType = 'refund';
                break;
            case 'transfer.paid':
                // Update withdrawal status to completed
                const { data: paidWithdrawals } = await supabase.from('withdrawals')
                    .update({ status: 'completed', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
                    .eq('pagarme_transfer_id', data.id)
                    .select('id');
                await supabase.from('transactions')
                    .update({ status: 'confirmed' })
                    .eq('type', 'withdrawal')
                    .eq('pagarme_transaction_id', data.id);
                if (!paidWithdrawals || paidWithdrawals.length === 0) {
                    const { data: tx } = await supabase.from('transactions')
                        .select('user_id, amount')
                        .eq('type', 'withdrawal')
                        .eq('pagarme_transaction_id', data.id)
                        .single();

                    if (tx) {
                        await supabase.from('withdrawals')
                            .update({ status: 'completed', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
                            .eq('user_id', tx.user_id)
                            .eq('amount', tx.amount)
                            .eq('status', 'processing');
                    }
                }
                return webhookSuccess({ received: true });
            case 'transfer.failed':
                // Update withdrawal status to failed
                const { data: failedWithdrawals } = await supabase.from('withdrawals')
                    .update({ status: 'failed', updated_at: new Date().toISOString() })
                    .eq('pagarme_transfer_id', data.id)
                    .select('id');

                // Also update the transaction status
                const { data: withdrawal } = await supabase.from('withdrawals')
                    .select('user_id, amount')
                    .eq('pagarme_transfer_id', data.id)
                    .single();

                if (withdrawal) {
                    await supabase.from('transactions')
                        .update({ status: 'failed' })
                        .eq('type', 'withdrawal')
                        .eq('pagarme_transaction_id', data.id);
                }
                if (!failedWithdrawals || failedWithdrawals.length === 0) {
                    const { data: tx } = await supabase.from('transactions')
                        .select('user_id, amount')
                        .eq('type', 'withdrawal')
                        .eq('pagarme_transaction_id', data.id)
                        .single();

                    if (tx) {
                        await supabase.from('withdrawals')
                            .update({ status: 'failed', updated_at: new Date().toISOString() })
                            .eq('user_id', tx.user_id)
                            .eq('amount', tx.amount)
                            .eq('status', 'processing');
                    }
                }
                return webhookSuccess({ received: true });

            default:
                return webhookSuccess({ received: true });
        }

        // Update order status
        if (!canTransitionOrderStatus(order.status, newStatus)) {
            console.warn('[WEBHOOK] Ignoring out-of-order status transition:', {
                order_id: order.id,
                current_status: order.status,
                attempted_status: newStatus,
                event_type: type,
            });
            return webhookSuccess({ received: true, ignored_transition: true });
        }
        const { error: statusUpdateError } = await supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', order.id);
        if (statusUpdateError) throw statusUpdateError;
        order = { ...order, status: newStatus };
        await syncOrderAffiliateCommission(order, newStatus);

        if (newStatus === 'paid') {
            const paidClaim = await claimPaidOrderProcessing(order, activeWebhookEventKey);
            if (paidClaim === 'completed') {
                return webhookSuccess({ received: true, already_processed: true });
            }
            if (paidClaim === 'in_progress') {
                throw new Error(`O pedido ${order.id} ja esta sendo finalizado por outro processo.`);
            }

            // Get platform fee percentage
            let feePercentage = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || '2');
            const isCardPayment = order.payment_method === 'credit_card' || order.payment_method === 'card';
            try {
                const { data: settingsRow } = await supabase
                    .from('platform_settings')
                    .select('fee_percentage')
                    .limit(1)
                    .single();
                if (settingsRow?.fee_percentage !== undefined && settingsRow.fee_percentage >= 0 && settingsRow.fee_percentage <= 100) {
                    feePercentage = settingsRow.fee_percentage;
                }
            } catch {}
            if (isCardPayment) {
                feePercentage = CARD_PLATFORM_FEE_PERCENTAGE;
            }
            try {
                const { data: sellerUser } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', order.seller_id)
                    .single();
                if (sellerUser?.role === 'admin') {
                    feePercentage = 0;
                }
            } catch {}
            const hasStoredFee = order.platform_fee_amount !== null
                && order.platform_fee_amount !== undefined
                && Number.isFinite(Number(order.platform_fee_amount));
            const feeAmount = hasStoredFee
                ? Math.min(order.amount, Math.max(0, Math.round(Number(order.platform_fee_amount))))
                : feePercentage > 0
                    ? (isCardPayment
                        ? Math.min(order.amount, Math.round(order.amount * (feePercentage / 100)))
                        : Math.min(200, order.amount))
                    : 0;

            // Update original 'sale' or 'api_sale' transaction to confirmed
            const { data: updatedSales, error: saleUpdateError } = await supabase.from('transactions')
                .update({ status: 'confirmed' })
                .eq('order_id', order.id)
                .in('type', ['sale', 'api_sale'])
                .select('id');
            if (saleUpdateError) throw saleUpdateError;
            if (!updatedSales?.length) {
                const { error: saleInsertError } = await saveTransactionByProviderEvent({
                    user_id: order.seller_id,
                    order_id: order.id,
                    type: 'sale',
                    amount: order.amount,
                    status: 'confirmed',
                    description: `Venda confirmada - Pedido ${order.id}`,
                    provider_event_key: `order-sale:${order.id}`,
                });
                if (saleInsertError) throw saleInsertError;
            }

            if (feeAmount > 0) {
                const feeLabel = isCardPayment
                    ? `${CARD_PLATFORM_FEE_PERCENTAGE}% (cartão)`
                    : `R$ ${(feeAmount / 100).toFixed(2).replace('.', ',')} (PIX)`;
                await saveTransactionByProviderEvent({
                    user_id: order.seller_id,
                    order_id: order.id,
                    type: 'fee',
                    amount: feeAmount,
                    status: 'confirmed',
                    description: `Taxa de plataforma (${feeLabel}) - Pedido ${order.id}`,
                    provider_event_key: `order-fee:${order.id}`,
                });
            }

            // Fetch product data for notification and stats
            let productName = 'Produto';
            let productData = null;

            if (order.product_id) {
                const { data: product } = await supabase
                    .from('products')
                    .select('id, name, sales_count, type, image_url, facebook_pixel_id, facebook_api_token')
                    .eq('id', order.product_id)
                    .single();
                
                if (product) {
                    productData = product;
                    productName = product.name || 'Produto';

                    try {
                        const utmifyResult = await sendPaidOrderToUtmify(order);
                        if (!(utmifyResult as any).ok && !(utmifyResult as any).skipped) {
                            console.warn('[UTMIFY] Webhook purchase not sent:', utmifyResult);
                        }
                    } catch (utmifyErr) {
                        console.error('[UTMIFY] Webhook purchase error:', utmifyErr);
                    }

                    // Recalcula em vez de incrementar para que qualquer replay
                    // permaneça idempotente.
                    const { count: paidSalesCount } = await supabase
                        .from('orders')
                        .select('id', { count: 'exact', head: true })
                        .eq('product_id', order.product_id)
                        .eq('status', 'paid');
                    await supabase.from('products')
                        .update({ sales_count: paidSalesCount || 0 })
                        .eq('id', order.product_id);

                    if (!order.facebook_capi_sent_at) {
                        try {
                            const capiResult = await sendFacebookEvent({
                                eventName: 'Purchase',
                                product,
                                order,
                                buyer: {
                                    name: order.buyer_name,
                                    email: order.buyer_email,
                                    phone: order.buyer_phone
                                },
                                eventId: order.facebook_event_id || order.id
                            });

                            if ((capiResult as any).ok) {
                                await supabase.from('orders')
                                    .update({ facebook_capi_sent_at: new Date().toISOString() })
                                    .eq('id', order.id);
                            } else if (!(capiResult as any).skipped) {
                                console.warn('[FACEBOOK CAPI] Webhook purchase not sent:', capiResult);
                            }
                        } catch (fbErr) {
                            console.error('[FACEBOOK CAPI] Webhook purchase error:', fbErr);
                        }
                    }
                    
                    // Enroll user if digital product
                    if (product.type === 'digital' && order.buyer_email) {
                        const normalizedEmail = order.buyer_email.toLowerCase().trim();
                        const { data: existingUser } = await supabase
                            .from('users')
                            .select('id, email')
                            .ilike('email', normalizedEmail)
                            .single();

                        if (existingUser) {
                            await supabase.from('enrollments').upsert({
                                user_id: existingUser.id,
                                product_id: order.product_id,
                                order_id: order.id,
                                status: 'active'
                            }, { onConflict: 'user_id, product_id' });
                        }
                    }
                }
            }

            // Notificação única e padronizada para PIX, cartão e demais vendas.
            try {
                await notifyApprovedOrder(order, {
                    name: productName,
                    image_url: productData?.image_url,
                });
            } catch (notificationError) {
                console.error('Error sending approved sale notification:', notificationError);
            }

            // Envia email de compra aprovada para o comprador
            if (order.buyer_email) {
                // Garante que o nome do produto está correto — busca direto se necessário
                let emailProductName = productName;
                if ((!emailProductName || emailProductName === 'Produto') && order.product_id) {
                    const { data: prod } = await supabase
                        .from('products').select('name').eq('id', order.product_id).single();
                    if (prod?.name) emailProductName = prod.name;
                }

                const rl = await checkRateLimit({ key: `email:purchase:order:${order.id}`, limit: 1, windowSecs: 86400, failOpen: true });
                if (rl.allowed) {
                    try {
                        await sendPurchaseApprovedEmail({
                            buyerName: order.buyer_name || 'cliente',
                            buyerEmail: order.buyer_email,
                            productName: emailProductName,
                            amount: (order.amount / 100).toFixed(2),
                            paymentMethod: order.payment_method || 'pix',
                            orderId: order.id,
                        });
                    } catch (err: any) {
                        console.error('[EMAIL] Erro ao enviar email de compra:', err?.message);
                    }
                } else {
                    console.warn(`[EMAIL] Rate limit atingido para email de compra do pedido ${order.id}`);
                }
            }
            const { error: paidProcessedError } = await supabase
                .from('orders')
                .update({
                    paid_processed_at: new Date().toISOString(),
                    paid_processing_token: null,
                })
                .eq('id', order.id)
                .eq('paid_processing_token', activeWebhookEventKey);
            if (paidProcessedError) throw paidProcessedError;
        } else {
            // For other statuses (failed, etc.)
            await supabase.from('transactions')
                .update({ status: newStatus === 'failed' ? 'failed' : newStatus })
                .eq('order_id', order.id).eq('type', 'sale');
        }

        // Create refund transaction if needed
        if (transactionType === 'refund') {
            await saveTransactionByProviderEvent({
                id: uuidv4(), user_id: order.seller_id, order_id: order.id,
                type: 'refund', amount: order.amount, amount_display: order.amount_display,
                status: 'confirmed', description: `Estorno do pedido ${order.id}`,
                provider_event_key: `order-refund:${activeWebhookEventKey}`,
            });
        }

        // NOTIFICAR WEBHOOK DO USUÁRIO
        try {
            const { data: seller } = await supabase
                .from('users')
                .select('webhook_url, webhook_urls')
                .eq('id', order.seller_id)
                .single();
            const webhookUrls = normalizeWebhookUrls(seller?.webhook_urls, seller?.webhook_url);

            if (webhookUrls.length > 0) {
                const payload = {
                    event: `order.${newStatus}`,
                    data: {
                        id: order.id,
                        transaction_id: order.id, // Adicionado para compatibilidade
                        status: newStatus,
                        amount: order.amount,
                        amount_display: (order.amount / 100).toFixed(2),
                        description: order.description,
                        payment_method: order.payment_method,
                        customer: {
                            name: order.buyer_name,
                            email: order.buyer_email,
                            cpf: order.buyer_cpf,
                            phone: order.buyer_phone
                        },
                        created_at: order.created_at,
                        updated_at: new Date().toISOString()
                    }
                };

                console.log(`Sending ${webhookUrls.length} webhook(s) to user ${order.seller_id}`);
                const results = await Promise.allSettled(webhookUrls.map((url) => sendWebhookPayload(url, payload)));
                results.forEach((result, index) => {
                    if (result.status === 'rejected') {
                        console.error(`Error sending user webhook ${webhookUrls[index]}:`, result.reason);
                    } else if (!result.value.ok) {
                        console.error(`User webhook returned ${result.value.status} for ${result.value.url}: ${result.value.error || ''}`);
                    }
                });
            }
        } catch (webhookError) {
            console.error('Error sending user webhook:', webhookError);
        }

        return webhookSuccess({ received: true });
    } catch (err) {
        if (activeWebhookEventKey) await failWebhookEvent(activeWebhookEventKey, err);
        console.error('Webhook error:', err);
        return jsonError('Webhook processing error', 500);
    }
}
