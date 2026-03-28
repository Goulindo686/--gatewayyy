const { supabase } = require('../config/database');
const FacebookService = require('../services/facebook.service');
const TelegramService = require('../services/telegram.service');

class WebhookController {
    async handlePagarme(req, res, next) {
        try {
            // Verify signature
            const signature = req.headers['x-pagarme-signature'];
            const webhookSecret = process.env.PAGARME_WEBHOOK_SECRET;

            if (webhookSecret && signature) {
                const crypto = require('crypto');
                const rawBody = req.rawBody || JSON.stringify(req.body);
                const expectedSignature = crypto
                    .createHmac('sha256', webhookSecret)
                    .update(rawBody)
                    .digest('hex');

                if (signature !== expectedSignature) {
                    console.log('[SECURITY-WARNING] Invalid webhook signature detected!');
                    return res.status(401).json({ error: 'Assinatura inválida.' });
                }
            } else if (process.env.NODE_ENV === 'production') {
                console.log('[SECURITY-WARNING] Missing webhook signature or secret in production!');
                return res.status(401).json({ error: 'Assinatura necessária.' });
            }

            const event = req.body;
            console.log('Webhook received (verified):', event.type, event.data?.id);

            switch (event.type) {
                case 'charge.paid':
                    await this._handleChargePaid(event.data);
                    break;
                case 'charge.payment_failed':
                    await this._handleChargeFailed(event.data);
                    break;
                case 'charge.refunded':
                    await this._handleChargeRefunded(event.data);
                    break;
                case 'charge.chargeback':
                    await this._handleChargeback(event.data);
                    break;
                default:
                    console.log('Unhandled webhook event:', event.type);
            }

            res.status(200).json({ received: true });
        } catch (error) {
            console.error('Webhook error:', error);
            res.status(200).json({ received: true }); // Always return 200 to Pagar.me
        }
    }

    async handleTelegram(req, res) {
        try {
            const message = req.body.message;
            if (message) {
                await TelegramService.handleWebhook(message);
            }
            res.status(200).send('OK');
        } catch (error) {
            console.error('Telegram webhook error:', error);
            res.status(500).send('Error');
        }
    }

    async _handleChargePaid(charge) {
        const { data: order } = await supabase
            .from('orders')
            .select('*, products(*)')
            .eq('pagarme_charge_id', charge.id)
            .single();

        if (!order) {
            console.log(`[WEBHOOK-DEBUG] Order not found for charge ID: ${charge.id}`);
            return;
        }

        if (order.status === 'paid') {
            console.log(`[WEBHOOK] Order ${order.id} is already marked as paid. Skipping.`);
            return;
        }

        // IDEMPOTÊNCIA: verifica se fee já foi registrada para evitar duplicatas em reenvios
        const { data: existingFee } = await supabase
            .from('transactions')
            .select('id')
            .eq('order_id', order.id)
            .eq('type', 'fee')
            .maybeSingle();

        if (existingFee) {
            console.log(`[WEBHOOK] Duplicata ignorada para pedido: ${order.id}`);
            return;
        }

        console.log(`[WEBHOOK] Marcando pedido ${order.id} como pago...`);
        // Update order status
        await supabase
            .from('orders')
            .update({ status: 'paid', updated_at: new Date().toISOString() })
            .eq('id', order.id);

        // Get platform fee
        const { data: settings } = await supabase
            .from('platform_settings')
            .select('fee_percentage')
            .single();

        const feePercentage = settings?.fee_percentage || 15;
        const feeAmount = Math.round(order.amount * feePercentage / 100);
        const sellerAmount = order.amount - feeAmount;

        // Create transaction records
        await supabase.from('transactions').insert({
            order_id: order.id,
            user_id: order.seller_id,
            type: 'sale',
            amount: sellerAmount,
            status: 'confirmed',
            description: `Venda: ${order.products?.name || 'Produto'}`
        });

        await supabase.from('transactions').insert({
            order_id: order.id,
            user_id: order.seller_id,
            type: 'fee',
            amount: feeAmount,
            status: 'confirmed',
            description: `Taxa plataforma: ${feePercentage}%`
        });

        await supabase.from('platform_fees').insert({
            order_id: order.id,
            amount: feeAmount,
            percentage: feePercentage
        });

        // Update product sales count
        if (order.product_id) {
            const { data: product } = await supabase
                .from('products')
                .select('*') // Get all fields including pixel settings
                .eq('id', order.product_id)
                .single();

            if (product) {
                await supabase
                    .from('products')
                    .update({ sales_count: (product.sales_count || 0) + 1 })
                    .eq('id', order.product_id);

                // Send Facebook CAPI Event
                await FacebookService.sendPurchaseEvent(order, product);
            }

            // Send Telegram Notification
            try {
                await TelegramService.notifySale(order.seller_id, {
                    product_name: order.products?.name || 'Produto',
                    amount: order.amount,
                    payment_method: charge.payment_method,
                    customer_name: charge.customer?.name || 'Cliente'
                });
            } catch (tgError) {
                console.error('Telegram Notification Error:', tgError);
            }

            // AUTO-ENROLLMENT for digital products
            if (product?.type === 'digital' && order.buyer_email) {
                try {
                    const normalizedEmail = order.buyer_email.toLowerCase().trim();
                    console.log(`[WEBHOOK-DEBUG] Processing auto-enrollment for: ${normalizedEmail}`);

                    // 1. Check if user already exists (Case-insensitive)
                    const { data: users, error: userFetchErr } = await supabase.from('users').select('id, email');
                    if (userFetchErr) console.error('[WEBHOOK-DEBUG] Error fetching users:', userFetchErr.message);

                    let user = users?.find(u => u.email?.toLowerCase().trim() === normalizedEmail);

                    // 2. Create user if doesn't exist
                    if (!user) {
                        console.log(`[WEBHOOK-DEBUG] No user found for ${normalizedEmail}. Auto-creating customer account...`);
                        const { data: newUser, error: createError } = await supabase
                            .from('users')
                            .insert({
                                name: order.buyer_name || 'Estudante',
                                email: order.buyer_email,
                                password_hash: 'INITIAL_PAYMENT_PENDING_SET',
                                role: 'customer',
                                status: 'active'
                            })
                            .select()
                            .single();

                        if (createError) {
                            console.error('[WEBHOOK-DEBUG] User creation failed:', createError.message);
                        } else {
                            user = newUser;
                            console.log(`[WEBHOOK-DEBUG] New user created: ${user.id}`);
                        }
                    } else {
                        console.log(`[WEBHOOK-DEBUG] Existing user found: ${user.id}`);
                    }

                    // 3. Create enrollment
                    if (user) {
                        console.log(`[WEBHOOK-DEBUG] Enrolling user ${user.id} in product ${order.product_id}...`);
                        const { error: enrollError } = await supabase
                            .from('enrollments')
                            .upsert({
                                user_id: user.id,
                                product_id: order.product_id,
                                order_id: order.id,
                                status: 'active'
                            });

                        if (enrollError) {
                            console.error(`[WEBHOOK-DEBUG] Enrollment failed:`, enrollError.message);
                        } else {
                            console.log(`[WEBHOOK-DEBUG] Auto-enrollment SUCCESS for ${order.buyer_email}`);
                        }
                    }
                } catch (enrollErr) {
                    console.error('[WEBHOOK-DEBUG] Internal auto-enrollment exception:', enrollErr.message);
                }
            } else {
                console.log(`[WEBHOOK-DEBUG] Auto-enrollment skipped. Type: ${product?.type}, Email present: ${!!order.buyer_email}`);
            }
        }

        console.log(`Order ${order.id} paid. Seller: R$${(sellerAmount / 100).toFixed(2)}, Fee: R$${(feeAmount / 100).toFixed(2)}`);
    }

    async _handleChargeFailed(charge) {
        await supabase
            .from('orders')
            .update({ status: 'failed', updated_at: new Date().toISOString() })
            .eq('pagarme_charge_id', charge.id);
    }

    async _handleChargeRefunded(charge) {
        const { data: order } = await supabase
            .from('orders')
            .select('*')
            .eq('pagarme_charge_id', charge.id)
            .single();

        if (!order) return;

        await supabase
            .from('orders')
            .update({ status: 'refunded', updated_at: new Date().toISOString() })
            .eq('id', order.id);

        // Create refund transaction
        await supabase.from('transactions').insert({
            order_id: order.id,
            user_id: order.seller_id,
            type: 'refund',
            amount: order.amount,
            status: 'confirmed',
            description: 'Estorno realizado'
        });
    }

    async _handleChargeback(charge) {
        const { data: order } = await supabase
            .from('orders')
            .select('*')
            .eq('pagarme_charge_id', charge.id)
            .single();

        if (!order) return;

        await supabase
            .from('orders')
            .update({ status: 'chargeback', updated_at: new Date().toISOString() })
            .eq('id', order.id);

        await supabase.from('transactions').insert({
            order_id: order.id,
            user_id: order.seller_id,
            type: 'refund',
            amount: order.amount,
            status: 'confirmed',
            description: 'Chargeback - contestação de pagamento'
        });

        console.log(`Chargeback received for order ${order.id}`);
    }
}

module.exports = new WebhookController();
