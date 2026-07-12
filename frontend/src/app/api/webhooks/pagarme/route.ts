export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { supabase } from '@/lib/db';
import { jsonError, jsonSuccess } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { notifySale } from '@/lib/telegram';
import { sendPushNotification } from '@/lib/webpush';
import { sendPurchaseApprovedEmail } from '@/lib/email';
import { sendFacebookEvent } from '@/lib/facebook-capi';
import { sendPaidOrderToUtmify } from '@/lib/utmify';

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

    const candidates = new Set<string>([
        sha1,
        sha256,
        `sha1=${sha1}`,
        `sha256=${sha256}`,
    ]);

    return candidates.has(provided) || candidates.has(providedHex);
}

export async function POST(req: NextRequest) {
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

        const eventId = String(data?.id || '');
        if (eventId) {
            const rlEvent = await checkRateLimit({ key: `webhook:pagarme:event:${eventId}`, limit: 20, windowSecs: 3600, failOpen: true });
            if (!rlEvent.allowed) return jsonError('Too many requests', 429);
        }

        console.log('Webhook received:', type, 'ID:', data.id, 'Order ID:', data.order?.id);

        if (!type || !data) return jsonError('Invalid webhook', 400);

        let order;

        // ESTRATÉGIA 1: Buscar por ID da Cobrança (Charge ID)
        if (data.id && type.startsWith('charge.')) {
            const { data: o } = await supabase
                .from('orders').select('*').eq('pagarme_charge_id', data.id).single();
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
            data?.order_id ||
            data?.orderId ||
            (type.startsWith('order.') ? data.id : undefined);

        // ESTRATÉGIA 4: Buscar por Order ID quando vier como order_id/orderId em eventos de charge.*
        if (!order && pagarmeOrderId) {
            const { data: o } = await supabase
                .from('orders').select('*').eq('pagarme_order_id', pagarmeOrderId).single();
            if (o) order = o;
        }

        // ─── BILLING CHARGES LOOKUP ─────────────────────────────────────────
        // If order not found in 'orders' table, check 'billings' table
        if (!order && !type.includes('transfer') && !type.includes('subscription')) {
            let billing = null;

            // Try by charge ID
            if (data.id && type.startsWith('charge.')) {
                const { data: b } = await supabase
                    .from('billings').select('*').eq('pagarme_charge_id', data.id).single();
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
                                const amountFormatted = new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                }).format(billing.amount / 100);

                                // 1. Notificar Vendedor (Telegram)
                                await notifySale(seller.id, {
                                    product_name: billing.description || 'Cobrança Avulsa',
                                    amount: billing.amount,
                                    payment_method: 'PIX',
                                    customer_name: 'Pagamento de Cobrança'
                                });

                                // 2. Notificar Vendedor (Web Push)
                                await sendPushNotification(seller.id, {
                                    title: '💰 Cobrança Recebida!',
                                    body: `${billing.description || 'Cobrança'} • ${amountFormatted}`,
                                    url: '/dashboard/billings',
                                });

                                // 3. Notificar Admin sobre a taxa (Web Push)
                                if (billing.fee_amount > 0) {
                                    const { data: admins } = await supabase
                                        .from('users')
                                        .select('id')
                                        .eq('role', 'admin');

                                    if (admins && admins.length > 0) {
                                        const feeFormatted = new Intl.NumberFormat('pt-BR', {
                                            style: 'currency',
                                            currency: 'BRL',
                                        }).format(billing.fee_amount / 100);

                                        await Promise.allSettled(
                                            admins.map((a: any) =>
                                                sendPushNotification(a.id, {
                                                    title: '📈 Taxa de Cobrança',
                                                    body: `${feeFormatted} • De: ${seller.name || seller.email}`,
                                                    url: '/admin/transactions',
                                                })
                                            )
                                        );
                                    }
                                }
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
                }

                return jsonSuccess({ received: true });
            }
        }
        // ─── END BILLING CHARGES LOOKUP ─────────────────────────────────────

        if (!order && !type.includes('transfer') && pagarmeOrderId) {
            let txStatus: string | null = null;

            if (type === 'order.paid' || type === 'charge.paid') txStatus = 'confirmed';
            else if (type === 'order.payment_failed' || type === 'charge.payment_failed') txStatus = 'failed';
            else if (type === 'charge.refunded') txStatus = 'refunded';
            else if (type === 'charge.chargedback') txStatus = 'chargeback';

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
                    return jsonSuccess({ received: true });
                }
            }
        }

        if (!order && type.includes('transfer')) {
            // Lógica de transferência (mantida abaixo)
        } else if (!order) {
            console.log('Order not found for webhook:', type, data.id, 'pagarmeOrderId:', pagarmeOrderId);
            return jsonSuccess({ received: true }); 
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
                return jsonSuccess({ received: true });
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
                return jsonSuccess({ received: true });

            // ─── Subscription Events ────────────────────────────────────────
            case 'subscription.created':
                await supabase.from('subscriptions')
                    .update({ status: 'active' })
                    .eq('pagarme_subscription_id', data.id);
                return jsonSuccess({ received: true });

            case 'subscription.payment_succeeded':
            case 'subscription.cycle_ended': {
                await supabase.from('subscriptions')
                    .update({ status: 'active', current_period_start: new Date().toISOString() })
                    .eq('pagarme_subscription_id', data.id);

                // Registra transação de receita recorrente
                const { data: sub } = await supabase
                    .from('subscriptions')
                    .select('*, subscription_plans(name)')
                    .eq('pagarme_subscription_id', data.id)
                    .single();

                if (sub) {
                    await supabase.from('transactions').insert({
                        id: uuidv4(),
                        user_id: sub.seller_id,
                        type: 'subscription_payment',
                        amount: sub.amount,
                        status: 'confirmed',
                        description: `Cobrança recorrente — ${sub.subscription_plans?.name || 'Assinatura'} — ${sub.customer_email}`
                    });
                }
                return jsonSuccess({ received: true });
            }

            case 'subscription.payment_failed':
                await supabase.from('subscriptions')
                    .update({ status: 'past_due' })
                    .eq('pagarme_subscription_id', data.id);
                return jsonSuccess({ received: true });

            case 'subscription.canceled':
                await supabase.from('subscriptions')
                    .update({ status: 'canceled', canceled_at: new Date().toISOString() })
                    .eq('pagarme_subscription_id', data.id);

                // Revogar enrollment do produto vinculado
                {
                    const { data: canceledSub } = await supabase
                        .from('subscriptions')
                        .select('subscription_plan_id, customer_email')
                        .eq('pagarme_subscription_id', data.id)
                        .single();

                    if (canceledSub?.subscription_plan_id) {
                        const { data: plan } = await supabase
                            .from('subscription_plans')
                            .select('product_id')
                            .eq('id', canceledSub.subscription_plan_id)
                            .single();

                        if (plan?.product_id && canceledSub.customer_email) {
                            const { data: user } = await supabase
                                .from('users')
                                .select('id')
                                .ilike('email', canceledSub.customer_email)
                                .single();

                            if (user) {
                                await supabase.from('enrollments')
                                    .update({ status: 'inactive' })
                                    .eq('user_id', user.id)
                                    .eq('product_id', plan.product_id);
                            }
                        }
                    }
                }
                return jsonSuccess({ received: true });

            default:
                return jsonSuccess({ received: true });
        }

        // Update order status
        if (order.status === 'paid' && newStatus === 'paid') {
            try {
                await sendPaidOrderToUtmify(order);
            } catch (utmifyErr) {
                console.error('[UTMIFY] Paid duplicate sync error:', utmifyErr);
            }
            return jsonSuccess({ received: true }); // Already processed
        }

        await supabase.from('orders').update({ status: newStatus }).eq('id', order.id);
        order = { ...order, status: newStatus };

        if (newStatus === 'paid') {
            // IDEMPOTÊNCIA: verifica se a taxa já foi inserida para este pedido
            const { data: existingFee } = await supabase
                .from('transactions')
                .select('id')
                .eq('order_id', order.id)
                .eq('type', 'fee')
                .maybeSingle();

            if (existingFee) {
                try {
                    await sendPaidOrderToUtmify(order);
                } catch (utmifyErr) {
                    console.error('[UTMIFY] Existing fee sync error:', utmifyErr);
                }
                // Pagamento já foi processado completamente — ignora reenvio
                console.log('Webhook duplicado ignorado para pedido:', order.id);
                return jsonSuccess({ received: true });
            }

            // Get platform fee percentage
            let feePercentage = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || '2');
            let sellerDisplayName: string | null = null;
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
            try {
                const { data: sellerUser } = await supabase
                    .from('users')
                    .select('role, name, email, utmify_enabled, utmify_api_token')
                    .eq('id', order.seller_id)
                    .single();
                if (sellerUser?.role === 'admin') {
                    feePercentage = 0;
                }
                sellerDisplayName = sellerUser?.name || sellerUser?.email || null;
            } catch {}
            const feeAmount = feePercentage > 0
                ? (order.payment_method === 'credit_card'
                    ? Math.min(order.amount, Math.round(order.amount * (feePercentage / 100)))
                    : Math.min(200, order.amount))
                : 0;

            // Update original 'sale' or 'api_sale' transaction to confirmed
            await supabase.from('transactions')
                .update({ status: 'confirmed' })
                .eq('order_id', order.id)
                .in('type', ['sale', 'api_sale']);

            if (feeAmount > 0) {
                const feeLabel = order.payment_method === 'credit_card' ? `${feePercentage}% (cartão)` : 'R$ 2,00 (PIX)';
                await supabase.from('transactions').insert({
                    user_id: order.seller_id,
                    order_id: order.id,
                    type: 'fee',
                    amount: feeAmount,
                    status: 'confirmed',
                    description: `Taxa de plataforma (${feeLabel}) - Pedido ${order.id}`
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

                    // Update sales count
                    await supabase.from('products')
                        .update({ sales_count: (product.sales_count || 0) + 1 })
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

            // Send Web Push Notification (Admin: taxa recebida)
            try {
                if (feeAmount > 0) {
                    const { data: admins } = await supabase
                        .from('users')
                        .select('id')
                        .eq('role', 'admin');

                    const feeFormatted = new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                    }).format(feeAmount / 100);

                    const sellerLabel = sellerDisplayName || order.seller_id;
                    const body = `${feeFormatted} • ${sellerLabel} • ${productName}`;

                    if (admins && admins.length > 0) {
                        await Promise.allSettled(
                            admins.map((a: any) =>
                                sendPushNotification(a.id, {
                                    title: '📈 Taxa Recebida',
                                    body,
                                    url: '/admin/transactions',
                                })
                            )
                        );
                    }
                }
            } catch (adminPushError) {
                console.error('Error sending Admin Push notification:', adminPushError);
            }

            // Send Telegram Notification
            try {
                const customerName = order.buyer_name || order.buyer_email || 'Cliente';
                const paymentMethod = order.payment_method || 'PIX';
                
                await notifySale(order.seller_id, {
                    product_name: productName,
                    amount: order.amount,
                    payment_method: paymentMethod,
                    customer_name: customerName,
                    image_url: productData?.image_url
                });
            } catch (error) {
                console.error('Error sending Telegram notification:', error);
            }

            // Send Web Push Notification
            try {
                const amountFormatted = new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                }).format(order.amount / 100);

                await sendPushNotification(order.seller_id, {
                    title: '💰 Venda Aprovada!',
                    body: `${productName} • ${amountFormatted}`,
                    url: '/dashboard',
                });
            } catch (pushError) {
                console.error('Error sending Push notification:', pushError);
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
        } else {
            // For other statuses (failed, etc.)
            await supabase.from('transactions')
                .update({ status: newStatus === 'failed' ? 'failed' : newStatus })
                .eq('order_id', order.id).eq('type', 'sale');
        }

        // Create refund transaction if needed
        if (transactionType === 'refund') {
            await supabase.from('transactions').insert({
                id: uuidv4(), user_id: order.seller_id, order_id: order.id,
                type: 'refund', amount: order.amount, amount_display: order.amount_display,
                status: 'confirmed', description: `Estorno do pedido ${order.id}`
            });
        }

        // NOTIFICAR WEBHOOK DO USUÁRIO
        try {
            const { data: seller } = await supabase
                .from('users')
                .select('webhook_url')
                .eq('id', order.seller_id)
                .single();

            if (seller?.webhook_url) {
                console.log(`Sending webhook to user ${order.seller_id}: ${seller.webhook_url}`);
                await fetch(seller.webhook_url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
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
                    })
                });
            }
        } catch (webhookError) {
            console.error('Error sending user webhook:', webhookError);
        }

        return jsonSuccess({ received: true });
    } catch (err) {

        console.error('Webhook error:', err);
        return jsonError('Webhook processing error', 500);
    }
}
