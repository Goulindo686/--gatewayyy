export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import pagarmeApi from '@/lib/pagarme';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
    try {
        const auth = await getAuthUser(req);
        if (!auth) return jsonError('Não autorizado', 401);

        const userId = auth.user.id;
        const url = new URL(req.url);
        const status = url.searchParams.get('status');
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = parseInt(url.searchParams.get('offset') || '0');

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

        if (error) {
            if (error.message?.includes('does not exist')) {
                return jsonSuccess({ billings: [], total: 0, limit, offset });
            }
            throw error;
        }

        const formattedBillings = billings.map((b: any) => ({
            ...b,
            amount_display: (b.amount / 100).toFixed(2),
            fee_display: (b.fee_amount / 100).toFixed(2),
            net_display: (b.net_amount / 100).toFixed(2)
        }));

        return jsonSuccess({
            billings: formattedBillings,
            total: count,
            limit,
            offset
        });
    } catch (error: any) {
        console.error('[BILLING CHARGES GET] Error:', error);
        return jsonError(error.message, 500);
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = await getAuthUser(req);
        if (!auth) return jsonError('Não autorizado', 401);

        const userId = auth.user.id;
        const { amount, description } = await req.json();

        // Validate amount
        if (!amount || amount <= 0) {
            return jsonError('Valor inválido.', 400);
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
            return jsonError('Usuário não encontrado.', 404);
        }

        if (user.status === 'blocked') {
            return jsonError('Sua conta está bloqueada.', 403);
        }

        // Get user's recipient
        const { data: recipient } = await supabase
            .from('recipients')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .single();

        if (!recipient?.pagarme_recipient_id) {
            return jsonError('Você precisa configurar sua conta de recebimento primeiro nas configurações.', 400);
        }

        // Get platform settings
        const { data: settings } = await supabase
            .from('platform_settings')
            .select('*')
            .single();

        const platformRecipientId = settings?.platform_recipient_id || process.env.PLATFORM_RECIPIENT_ID;
        
        // Calculate fees - Admin doesn't pay fees
        const PLATFORM_FLAT_FEE = 150; // R$1,50
        let platformFeeAmount = 0;
        let sellerAmount = amountCents;

        if (user.role !== 'admin') {
            platformFeeAmount = Math.min(PLATFORM_FLAT_FEE, amountCents);
            sellerAmount = amountCents - platformFeeAmount;
        }

        // Create order on Pagar.me with split
        const orderData: any = {
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
            const splitRules: any[] = [
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

        if (billingError) {
             console.error('[BILLING CHARGES POST] DB Error:', billingError);
             return jsonError('Erro ao salvar cobrança no banco de dados. Verifique se as migrações foram executadas.', 500);
        }

        return jsonSuccess({
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
    } catch (error: any) {
        console.error('[BILLING CHARGES POST] Error:', error.response?.data || error.message);
        return jsonError(error.response?.data?.message || error.message || 'Erro ao processar cobrança', 500);
    }
}
