export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { jsonError, jsonSuccess } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { notifySale } from '@/lib/telegram';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { type, data } = body;

        if (!type || !data) return jsonError('Invalid webhook', 400);

        const chargeId = data.id;

        // Find order by charge id
        const { data: order } = await supabase
            .from('orders').select('*').eq('pagarme_charge_id', chargeId).single();

        if (!order) return jsonSuccess({ received: true }); // Ignore unknown charges

        let newStatus = order.status;
        let transactionType = 'sale';

        switch (type) {
            case 'charge.paid':
                newStatus = 'paid';
                break;
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
                await supabase.from('withdrawals')
                    .update({ status: 'completed', updated_at: new Date().toISOString() })
                    .eq('pagarme_transfer_id', data.id);
                return jsonSuccess({ received: true });
            case 'transfer.failed':
                // Update withdrawal status to failed
                await supabase.from('withdrawals')
                    .update({ status: 'failed', updated_at: new Date().toISOString() })
                    .eq('pagarme_transfer_id', data.id);

                // Also update the transaction status
                const { data: withdrawal } = await supabase.from('withdrawals')
                    .select('user_id, amount')
                    .eq('pagarme_transfer_id', data.id)
                    .single();

                if (withdrawal) {
                    await supabase.from('transactions')
                        .update({ status: 'failed' })
                        .eq('user_id', withdrawal.user_id)
                        .eq('type', 'withdrawal')
                        .eq('amount', withdrawal.amount)
                        .order('created_at', { ascending: false })
                        .limit(1);
                }
                return jsonSuccess({ received: true });
            default:
                return jsonSuccess({ received: true });
        }

        // Update order status
        if (order.status === 'paid' && newStatus === 'paid') {
            return jsonSuccess({ received: true }); // Already processed
        }

        await supabase.from('orders').update({ status: newStatus }).eq('id', order.id);

        if (newStatus === 'paid') {
            // Get platform fee percentage
            let feePercentage = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || '2');
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
            const feeAmount = Math.round(order.amount * (feePercentage / 100));

            // Update original 'sale' transaction to confirmed and adjust to net amount
            // Or keep it as full amount and create a separate 'fee' transaction (matches frontend stats logic)
            await supabase.from('transactions')
                .update({ status: 'confirmed' })
                .eq('order_id', order.id).eq('type', 'sale');

            // Create fee transaction
            await supabase.from('transactions').insert({
                user_id: order.seller_id,
                order_id: order.id,
                type: 'fee',
                amount: feeAmount,
                status: 'confirmed',
                description: `Taxa de plataforma (${feePercentage}%) - Pedido ${order.id}`
            });

            // Fetch product data for notification and stats
            let productName = 'Produto';
            let productData = null;

            if (order.product_id) {
                const { data: product } = await supabase
                    .from('products')
                    .select('id, name, sales_count, type, image_url')
                    .eq('id', order.product_id)
                    .single();
                
                if (product) {
                    productData = product;
                    productName = product.name || 'Produto';

                    // Update sales count
                    await supabase.from('products')
                        .update({ sales_count: (product.sales_count || 0) + 1 })
                        .eq('id', order.product_id);
                    
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
