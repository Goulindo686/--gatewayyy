const { supabase } = require('../config/database');
const pagarmeService = require('../services/pagarme.service');

class CheckoutController {
    async processPayment(req, res, next) {
        try {
            const { product_id, payment_method, buyer, card_data } = req.body;

            // Get product
            const { data: product, error: productError } = await supabase
                .from('products')
                .select('*')
                .eq('id', product_id)
                .eq('status', 'active')
                .single();

            if (productError || !product) {
                return res.status(404).json({ error: 'Produto não encontrado ou inativo.' });
            }

            // Get seller's recipient
            const { data: recipient } = await supabase
                .from('recipients')
                .select('*')
                .eq('user_id', product.user_id)
                .eq('status', 'active')
                .single();

            if (!recipient?.pagarme_recipient_id) {
                return res.status(400).json({ error: 'Vendedor não possui conta de recebimento ativa.' });
            }

            // Get platform settings
            const { data: settings } = await supabase
                .from('platform_settings')
                .select('*')
                .single();

            const platformRecipientId = settings?.platform_recipient_id || process.env.PLATFORM_RECIPIENT_ID;
            const { data: sellerUser } = await supabase
                .from('users')
                .select('id, role')
                .eq('id', product.user_id)
                .single();
            let feePercentage = settings?.fee_percentage || 15;
            let sellerRecipientId = recipient.pagarme_recipient_id;
            if (sellerUser?.role === 'admin') {
                feePercentage = 0;
            }

            // Create order on Pagar.me
            const pagarmeOrder = await pagarmeService.createOrder({
                product,
                buyer,
                paymentMethod: payment_method,
                cardData: card_data,
                sellerId: product.user_id,
                platformRecipientId,
                sellerRecipientId,
                feePercentage
            });

            const charge = pagarmeOrder.charges?.[0];

            // Create order record
            const orderData = {
                product_id: product.id,
                seller_id: product.user_id,
                buyer_name: buyer.name,
                buyer_email: buyer.email?.toLowerCase().trim(),
                buyer_cpf: buyer.cpf,
                buyer_phone: buyer.phone,
                amount: product.price,
                payment_method,
                status: charge?.status === 'paid' ? 'paid' : 'pending',
                pagarme_order_id: pagarmeOrder.id,
                pagarme_charge_id: charge?.id
            };

            // Pix-specific data
            if (payment_method === 'pix' && charge?.last_transaction) {
                orderData.pix_qr_code = charge.last_transaction.qr_code;
                orderData.pix_qr_code_url = charge.last_transaction.qr_code_url;
                orderData.pix_expires_at = charge.last_transaction.expires_at;
            }

            // Credit card specific data
            if (payment_method === 'credit_card' && charge?.last_transaction) {
                orderData.card_last_digits = charge.last_transaction.card?.last_four_digits;
                orderData.card_brand = charge.last_transaction.card?.brand;
                orderData.installments = card_data?.installments || 1;
            }

            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert(orderData)
                .select()
                .single();

            if (orderError) throw orderError;

            // If paid immediately (credit card), create transaction records
            if (charge?.status === 'paid') {
                await this._createTransactionRecords(order, product, feePercentage);
            }

            // Build response
            const response = {
                order: {
                    id: order.id,
                    status: order.status,
                    amount: order.amount,
                    amount_display: (order.amount / 100).toFixed(2),
                    payment_method: order.payment_method
                }
            };

            if (payment_method === 'pix') {
                response.pix = {
                    qr_code: order.pix_qr_code,
                    qr_code_url: order.pix_qr_code_url,
                    expires_at: order.pix_expires_at
                };
            }

            if (payment_method === 'credit_card') {
                response.card = {
                    last_digits: order.card_last_digits,
                    brand: order.card_brand
                };
            }

            res.status(201).json(response);
        } catch (error) {
            next(error);
        }
    }

    async _createTransactionRecords(order, product, feePercentage) {
        const feeAmount = Math.round(order.amount * feePercentage / 100);
        const sellerAmount = order.amount - feeAmount;

        // Seller transaction
        await supabase.from('transactions').insert({
            order_id: order.id,
            user_id: order.seller_id,
            type: 'sale',
            amount: sellerAmount,
            status: 'confirmed',
            description: `Venda: ${product.name}`
        });

            if (feeAmount > 0) {
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
            }

        // Update product sales count
        await supabase.rpc('increment_sales_count', { p_id: product.id }).catch(() => {
            // If RPC doesn't exist, update manually
            supabase
                .from('products')
                .update({ sales_count: (product.sales_count || 0) + 1 })
                .eq('id', product.id);
        });
    }

    async processStoreCheckout(req, res, next) {
        try {
            const { items_cart, payment_method, buyer, card_data, store_slug } = req.body;

            if (!items_cart || items_cart.length === 0) {
                return res.status(400).json({ error: 'Carrinho vazio.' });
            }

            // Get the first product to find the seller/store
            const { data: firstProduct } = await supabase
                .from('products')
                .select('user_id')
                .eq('id', items_cart[0].id)
                .single();

            if (!firstProduct) {
                return res.status(404).json({ error: 'Vendedor não encontrado.' });
            }

            const sellerId = firstProduct.user_id;

            // Get seller's recipient
            const { data: recipient } = await supabase
                .from('recipients')
                .select('*')
                .eq('user_id', sellerId)
                .eq('status', 'active')
                .single();

            if (!recipient?.pagarme_recipient_id) {
                return res.status(400).json({ error: 'O vendedor desta loja ainda não ativou os pagamentos.' });
            }

            // Get platform settings & fees
            const { data: settings } = await supabase.from('platform_settings').select('*').single();
            const platformRecipientId = settings?.platform_recipient_id || process.env.PLATFORM_RECIPIENT_ID;
            const { data: sellerUser } = await supabase
                .from('users')
                .select('id, role')
                .eq('id', sellerId)
                .single();
            let feePercentage = settings?.fee_percentage || 15;
            if (sellerUser?.role === 'admin') {
                feePercentage = 0;
            }

            // Create Pagarme Cart Order
            const pagarmeOrder = await pagarmeService.createMultiItemOrder({
                items: items_cart,
                buyer,
                paymentMethod: payment_method,
                cardData: card_data,
                sellerId,
                platformRecipientId,
                sellerRecipientId: recipient.pagarme_recipient_id,
                feePercentage
            });

            const charge = pagarmeOrder.charges?.[0];
            const totalAmountCents = pagarmeOrder.amount;

            const orderData = {
                product_id: items_cart[0].id,
                seller_id: sellerId,
                buyer_name: buyer.name || 'Cliente',
                buyer_email: buyer.email?.toLowerCase().trim(),
                buyer_cpf: buyer.cpf || '00000000000',
                buyer_phone: buyer.phone || '11999999999',
                amount: totalAmountCents,
                payment_method,
                status: charge?.status === 'paid' ? 'paid' : 'pending',
                pagarme_order_id: pagarmeOrder.id,
                pagarme_charge_id: charge?.id
            };

            if (payment_method === 'pix' && charge?.last_transaction) {
                orderData.pix_qr_code = charge.last_transaction.qr_code;
                orderData.pix_qr_code_url = charge.last_transaction.qr_code_url;
                orderData.pix_expires_at = charge.last_transaction.expires_at;
            }

            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert(orderData)
                .select()
                .single();

            if (orderError) throw orderError;

            // Build simplified response for frontend
            const response = {
                order: {
                    id: order.id,
                    status: order.status,
                    amount_display: (totalAmountCents / 100).toFixed(2),
                    payment_method: order.payment_method
                }
            };

            if (payment_method === 'pix') {
                response.pix = {
                    qr_code: order.pix_qr_code,
                    qr_code_url: order.pix_qr_code_url,
                    expires_at: order.pix_expires_at
                };
            }

            res.status(201).json(response);
        } catch (error) {
            console.error('Store Checkout Error:', error.response?.data || error.message || error);
            next(error);
        }
    }

    async getOrderStatus(req, res, next) {
        try {
            const { data: order, error } = await supabase
                .from('orders')
                .select('id, status, payment_method, amount, pix_qr_code, pix_qr_code_url, pix_expires_at, created_at, seller_id, buyer_email')
                .eq('id', req.params.id)
                .single();

            if (error || !order) {
                return res.status(404).json({ error: 'Pedido não encontrado.' });
            }

            // --- AUTHORIZATION CHECK ---
            const isSeller = req.user && req.user.id === order.seller_id;
            const isAdmin = req.user && req.user.role === 'admin';
            const isBuyer = req.user && req.user.email?.toLowerCase().trim() === order.buyer_email?.toLowerCase().trim();

            if (!isSeller && !isAdmin && !isBuyer) {
                if (!req.user) {
                   return res.json({ 
                       order: { 
                           id: order.id, 
                           status: order.status, 
                           amount_display: (order.amount / 100).toFixed(2),
                           payment_method: order.payment_method,
                           pix_qr_code: order.pix_qr_code,
                           pix_qr_code_url: order.pix_qr_code_url
                       } 
                   });
                }
                return res.status(403).json({ error: 'Acesso não autorizado a este pedido.' });
            }

            res.json({ order: { ...order, amount_display: (order.amount / 100).toFixed(2) } });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new CheckoutController();
