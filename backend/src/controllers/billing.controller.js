const { supabase } = require('../config/database');
const pagarmeService = require('../services/pagarme.service');
const { pagarmeApi } = require('../config/pagarme');
const { v4: uuidv4 } = require('uuid');
const { resolveSellerPixFee } = require('../services/seller-pix-fee.service');

class BillingController {
    /**
     * Create a new billing charge
     */
    async createCharge(req, res, next) {
        try {
            const { amount, description } = req.body;
            const userId = req.user.id;

            // Validate amount
            if (!amount || amount <= 0) {
                return res.status(400).json({ error: 'Valor inválido.' });
            }

            // Convert to cents
            const amountCents = Math.round(amount * 100);

            // Get user data
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('id, name, email, role, status')
                .eq('id', userId)
                .single();

            if (userError || !user) {
                return res.status(404).json({ error: 'Usuário não encontrado.' });
            }

            if (user.status === 'blocked') {
                return res.status(403).json({ error: 'Sua conta está bloqueada.' });
            }

            // Get user's recipient
            const { data: recipient } = await supabase
                .from('recipients')
                .select('*')
                .eq('user_id', userId)
                .eq('status', 'active')
                .single();

            if (!recipient?.pagarme_recipient_id) {
                return res.status(400).json({ 
                    error: 'Você precisa configurar sua conta de recebimento primeiro.' 
                });
            }

            // Get platform settings
            const { data: settings } = await supabase
                .from('platform_settings')
                .select('*')
                .single();

            const platformRecipientId = settings?.platform_recipient_id || process.env.PLATFORM_RECIPIENT_ID;
            
            let platformFeeAmount = 0;
            let sellerAmount = amountCents;

            if (user.role !== 'admin') {
                platformFeeAmount = await resolveSellerPixFee({
                    sellerId: userId,
                    amountCents,
                    defaultFeeCents: settings?.fee_percentage === undefined || Number(settings.fee_percentage) > 0 ? 200 : 0
                });
                sellerAmount = amountCents - platformFeeAmount;
            }

            // Create order on Pagar.me with split
            const orderData = {
                items: [{
                    amount: amountCents,
                    description: description || 'Cobrança',
                    quantity: 1,
                    code: uuidv4()
                }],
                customer: {
                    name: 'Cliente',
                    email: 'cliente@example.com',
                    document: '00000000000',
                    type: 'individual'
                },
                payments: [{
                    payment_method: 'pix',
                    pix: { expires_in: 86400 } // 24 hours
                }]
            };

            // Add split rules if not admin
            const hasSellerRecipient = !!recipient.pagarme_recipient_id;
            const includePlatformFee = !!(platformRecipientId && platformRecipientId !== recipient.pagarme_recipient_id && platformFeeAmount > 0);
            
            if (hasSellerRecipient) {
                const splitRules = [
                    {
                        amount: sellerAmount,
                        recipient_id: recipient.pagarme_recipient_id,
                        type: 'flat',
                        options: { charge_processing_fee: true, liable: true, charge_remainder_fee: true }
                    }
                ];

                if (includePlatformFee) {
                    splitRules.push({
                        amount: platformFeeAmount,
                        recipient_id: platformRecipientId,
                        type: 'flat',
                        options: { charge_processing_fee: false, liable: false, charge_remainder_fee: false }
                    });
                }

                orderData.payments[0].split = splitRules;
            }

            const response = await pagarmeApi.post('/orders', orderData);
            const pagarmeOrder = response.data;
            const charge = pagarmeOrder.charges?.[0];

            // Save billing charge to database
            const billingData = {
                user_id: userId,
                amount: amountCents,
                fee_amount: platformFeeAmount,
                net_amount: sellerAmount,
                description: description || 'Cobrança',
                status: 'pending',
                pagarme_order_id: pagarmeOrder.id,
                pagarme_charge_id: charge?.id,
                pix_qr_code: charge?.last_transaction?.qr_code,
                pix_qr_code_url: charge?.last_transaction?.qr_code_url,
                pix_expires_at: charge?.last_transaction?.expires_at
            };

            const { data: billing, error: billingError } = await supabase
                .from('billings')
                .insert(billingData)
                .select()
                .single();

            if (billingError) throw billingError;

            res.status(201).json({
                billing: {
                    id: billing.id,
                    amount: billing.amount,
                    amount_display: (billing.amount / 100).toFixed(2),
                    fee_amount: billing.fee_amount,
                    fee_display: (billing.fee_amount / 100).toFixed(2),
                    net_amount: billing.net_amount,
                    net_display: (billing.net_amount / 100).toFixed(2),
                    description: billing.description,
                    status: billing.status,
                    pix_qr_code: billing.pix_qr_code,
                    pix_qr_code_url: billing.pix_qr_code_url,
                    pix_expires_at: billing.pix_expires_at,
                    created_at: billing.created_at
                }
            });
        } catch (error) {
            console.error('Create billing charge error:', error.response?.data || error.message);
            next(error);
        }
    }

    /**
     * Get all billings for current user
     */
    async getUserBillings(req, res, next) {
        try {
            const userId = req.user.id;
            const { status, limit = 50, offset = 0 } = req.query;

            let query = supabase
                .from('billings')
                .select('*', { count: 'exact' })
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (status) {
                query = query.eq('status', status);
            }

            const { data: billings, error, count } = await query;

            if (error) throw error;

            const formattedBillings = billings.map(b => ({
                ...b,
                amount_display: (b.amount / 100).toFixed(2),
                fee_display: (b.fee_amount / 100).toFixed(2),
                net_display: (b.net_amount / 100).toFixed(2)
            }));

            res.json({
                billings: formattedBillings,
                total: count,
                limit: parseInt(limit),
                offset: parseInt(offset)
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get billing statistics
     */
    async getBillingStats(req, res, next) {
        try {
            const userId = req.user.id;

            // Get all billings for user
            const { data: billings, error } = await supabase
                .from('billings')
                .select('status, amount, fee_amount, net_amount')
                .eq('user_id', userId);

            if (error) throw error;

            const stats = {
                total_billings: billings.length,
                pending: billings.filter(b => b.status === 'pending').length,
                paid: billings.filter(b => b.status === 'paid').length,
                expired: billings.filter(b => b.status === 'expired').length,
                cancelled: billings.filter(b => b.status === 'cancelled').length,
                total_amount: billings.reduce((sum, b) => sum + b.amount, 0),
                total_paid: billings.filter(b => b.status === 'paid').reduce((sum, b) => sum + b.amount, 0),
                total_fees: billings.filter(b => b.status === 'paid').reduce((sum, b) => sum + b.fee_amount, 0),
                total_net: billings.filter(b => b.status === 'paid').reduce((sum, b) => sum + b.net_amount, 0)
            };

            res.json({
                stats: {
                    ...stats,
                    total_amount_display: (stats.total_amount / 100).toFixed(2),
                    total_paid_display: (stats.total_paid / 100).toFixed(2),
                    total_fees_display: (stats.total_fees / 100).toFixed(2),
                    total_net_display: (stats.total_net / 100).toFixed(2)
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get single billing by ID
     */
    async getBillingById(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const isAdmin = req.user.role === 'admin';

            let query = supabase
                .from('billings')
                .select('*')
                .eq('id', id);

            // Non-admin users can only see their own billings
            if (!isAdmin) {
                query = query.eq('user_id', userId);
            }

            const { data: billing, error } = await query.single();

            if (error || !billing) {
                return res.status(404).json({ error: 'Cobrança não encontrada.' });
            }

            res.json({
                billing: {
                    ...billing,
                    amount_display: (billing.amount / 100).toFixed(2),
                    fee_display: (billing.fee_amount / 100).toFixed(2),
                    net_display: (billing.net_amount / 100).toFixed(2)
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Cancel a billing (only if pending)
     */
    async cancelBilling(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            const { data: billing, error: fetchError } = await supabase
                .from('billings')
                .select('*')
                .eq('id', id)
                .eq('user_id', userId)
                .single();

            if (fetchError || !billing) {
                return res.status(404).json({ error: 'Cobrança não encontrada.' });
            }

            if (billing.status !== 'pending') {
                return res.status(400).json({ error: 'Apenas cobranças pendentes podem ser canceladas.' });
            }

            const { error: updateError } = await supabase
                .from('billings')
                .update({ status: 'cancelled', updated_at: new Date().toISOString() })
                .eq('id', id);

            if (updateError) throw updateError;

            res.json({ message: 'Cobrança cancelada com sucesso.' });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new BillingController();
