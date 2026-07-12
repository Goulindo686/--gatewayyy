const { supabase } = require('../config/database');
const pagarmeService = require('../services/pagarme.service');

class CheckoutController {
    async processPayment(req, res, next) {
        try {
            const { product_id, payment_method, buyer, card_data, selected_bumps } = req.body;

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

            const { data: sellerUser, error: sellerUserError } = await supabase
                .from('users')
                .select('id, role, status')
                .eq('id', product.user_id)
                .single();
            if (sellerUserError || !sellerUser) {
                return res.status(404).json({ error: 'Vendedor não encontrado.' });
            }
            if (sellerUser.status === 'blocked') {
                return res.status(403).json({ error: 'Conta do vendedor está bloqueada. Não é possível gerar o Pix para esta compra.' });
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

            // Bloqueia pedido duplicado: mesmo email + produto com status pending nos últimos 10 minutos
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
            const { data: recentPending } = await supabase
                .from('orders')
                .select('id, created_at')
                .eq('product_id', product_id)
                .eq('buyer_email', buyer.email?.toLowerCase().trim())
                .eq('status', 'pending')
                .gte('created_at', tenMinutesAgo)
                .limit(1);

            if (recentPending && recentPending.length > 0) {
                return res.status(429).json({
                    error: 'Você já possui um pedido pendente para este produto. Aguarde alguns minutos antes de tentar novamente.'
                });
            }

            // Get platform settings
            const { data: settings } = await supabase
                .from('platform_settings')
                .select('*')
                .single();

            const platformRecipientId = settings?.platform_recipient_id || process.env.PLATFORM_RECIPIENT_ID;
            let feePercentage = settings?.fee_percentage || 15;
            let sellerRecipientId = recipient.pagarme_recipient_id;
            if (sellerUser?.role === 'admin') {
                feePercentage = 0;
            }

            // Resolve order bumps selecionados
            let bumpItems = [];
            let bumpTotalCents = 0;
            if (Array.isArray(selected_bumps) && selected_bumps.length > 0) {
                // Suporta tanto array de strings (legado) quanto array de objetos {bump_id, plan_id}
                const bumpIds = selected_bumps.map(b => typeof b === 'string' ? b : b.bump_id);
                const bumpPlanMap = {};
                for (const b of selected_bumps) {
                    if (typeof b === 'object' && b.bump_id && b.plan_id) {
                        bumpPlanMap[b.bump_id] = b.plan_id;
                    }
                }

                const { data: bumps } = await supabase
                    .from('order_bumps')
                    .select(`
                        id, custom_price, bump_product_id, bump_plan_id,
                        bump_product:bump_product_id (id, price),
                        bump_plan:bump_plan_id (id, price)
                    `)
                    .eq('product_id', product_id)
                    .eq('is_active', true)
                    .in('id', bumpIds);

                for (const bump of (bumps || [])) {
                    let price = 0;

                    if (bump.custom_price) {
                        // Preço customizado definido pelo vendedor — usa direto
                        price = bump.custom_price;
                    } else if (bump.bump_plan_id && bump.bump_plan?.price) {
                        // Plano fixo definido pelo vendedor
                        price = bump.bump_plan.price;
                    } else {
                        // Plano escolhido pelo comprador no checkout
                        const chosenPlanId = bumpPlanMap[bump.id];
                        if (chosenPlanId) {
                            const { data: chosenPlan } = await supabase
                                .from('product_plans')
                                .select('id, price')
                                .eq('id', chosenPlanId)
                                .eq('product_id', bump.bump_product_id)
                                .single();
                            if (chosenPlan?.price) {
                                price = chosenPlan.price;
                            }
                        }
                        // Fallback: preço base do produto do bump
                        if (!price && bump.bump_product?.price) {
                            price = bump.bump_product.price;
                        }
                    }

                    if (price > 0) {
                        bumpItems.push({
                            bump,
                            price,
                            chosen_plan_id: bumpPlanMap[bump.id] || bump.bump_plan_id || null
                        });
                        bumpTotalCents += price;
                    }
                }
            }

            const mainProductPrice = product.price;
            const totalAmountCents = mainProductPrice + bumpTotalCents;

            // Create order on Pagar.me
            const pagarmeOrder = await pagarmeService.createOrder({
                product,
                buyer,
                paymentMethod: payment_method,
                cardData: card_data,
                sellerId: product.user_id,
                platformRecipientId,
                sellerRecipientId,
                feePercentage,
                totalAmount: totalAmountCents
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
                amount: totalAmountCents,
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

            // Salva os itens de order bump
            if (bumpItems.length > 0) {
                const bumpInserts = bumpItems.map(({ bump, price, chosen_plan_id }) => ({
                    order_id: order.id,
                    order_bump_id: bump.id,
                    bump_product_id: bump.bump_product_id,
                    bump_plan_id: chosen_plan_id || null,
                    amount: price
                }));
                await supabase.from('order_bump_items').insert(bumpInserts);
            }

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
        // Taxa da plataforma:
        //   PIX    → R$2,00 fixo + 1,09%
        //   Cartão → 2% sobre o total
        let feeAmount;
        if (order.payment_method === 'credit_card') {
            feeAmount = Math.round(order.amount * 0.02);
        } else {
            const percentFee = Math.round(order.amount * 0.0109);
            feeAmount = Math.min(200 + percentFee, order.amount);
        }
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
                description: `Taxa plataforma: R$1,50 fixo`
            });
            await supabase.from('platform_fees').insert({
                order_id: order.id,
                amount: feeAmount,
                percentage: 0
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

            const { data: sellerUser, error: sellerUserError } = await supabase
                .from('users')
                .select('id, role, status')
                .eq('id', sellerId)
                .single();
            if (sellerUserError || !sellerUser) {
                return res.status(404).json({ error: 'Vendedor não encontrado.' });
            }
            if (sellerUser.status === 'blocked') {
                return res.status(403).json({ error: 'Conta do vendedor está bloqueada. Não é possível gerar o Pix para esta compra.' });
            }

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

            // Bloqueia pedido duplicado: mesmo email + mesmo carrinho (primeiro item) nos últimos 5 minutos
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
            const { data: recentStorePending } = await supabase
                .from('orders')
                .select('id')
                .eq('product_id', items_cart[0].id)
                .eq('buyer_email', buyer.email?.toLowerCase().trim())
                .eq('status', 'pending')
                .gte('created_at', fiveMinutesAgo)
                .limit(1);

            if (recentStorePending && recentStorePending.length > 0) {
                return res.status(429).json({
                    error: 'Você já possui um pedido pendente. Aguarde alguns minutos antes de tentar novamente.'
                });
            }

            // Get platform settings & fees
            const { data: settings } = await supabase.from('platform_settings').select('*').single();
            const platformRecipientId = settings?.platform_recipient_id || process.env.PLATFORM_RECIPIENT_ID;
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
