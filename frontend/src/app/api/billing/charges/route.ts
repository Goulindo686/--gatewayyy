export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { PagarmeService } from '@/lib/pagarme';
import { resolveSellerPixFee } from '@/lib/seller-pix-fee';
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
        const { amount, description, customer_name, customer_doc } = await req.json();

        // Validate amount
        if (!amount || amount <= 0) {
            return jsonError('Valor inválido.', 400);
        }

        // Convert to cents
        const amountCents = Math.round(amount * 100);

        if (amountCents < 100) {
            return jsonError('Valor mínimo é R$ 1,00', 400);
        }

        // Get user data WITH cpf_cnpj and phone (needed for Pagar.me fallback)
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, name, email, role, status, cpf_cnpj, phone')
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
            .select('pagarme_recipient_id')
            .eq('user_id', userId)
            .single();

        if (!recipient?.pagarme_recipient_id) {
            return jsonError('Você precisa configurar sua conta de recebimento primeiro nas configurações.', 400);
        }

        // Calculate Platform Fee - same logic as V1 PIX API
        let feePercentage = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || '2');
        try {
            const { data: settingsRow } = await supabase
                .from('platform_settings')
                .select('fee_percentage')
                .limit(1)
                .single();
            if (settingsRow?.fee_percentage !== undefined) {
                feePercentage = settingsRow.fee_percentage;
            }
        } catch {}
        if (user.role === 'admin') {
            feePercentage = 0;
        }

        // A tarifa do Pagar.me continua sendo cobrada pelo proprio split. Este
        // valor representa somente a taxa configuravel da plataforma.
        const platformFeeAmount = user.role === 'admin'
            ? 0
            : (await resolveSellerPixFee({
                sellerId: userId,
                amountCents,
                defaultFeeCents: feePercentage > 0 ? 200 : 0,
            })).amountCents;
        const sellerAmount = amountCents - platformFeeAmount;

        // Use real customer data if provided, otherwise fallback to seller's data
        const finalCustomerName = customer_name || user.name || 'Cliente';
        const finalCustomerDoc = (customer_doc || user.cpf_cnpj || '').replace(/\D/g, '');
        
        if (!finalCustomerDoc) {
            return jsonError('Você precisa informar o CPF/CNPJ do cliente ou cadastrar o seu nas configurações.', 400);
        }

        // Create order on Pagar.me — SAME way as V1 PIX API (which works)
        let pagarmeOrder;
        try {
            pagarmeOrder = await PagarmeService.createOrder({
                amount: amountCents,
                payment_method: 'pix',
                customer: {
                    name: finalCustomerName,
                    email: user.email, // We use seller's email for notifications if customer email not provided
                    cpf: finalCustomerDoc,
                    phone: user.phone?.replace(/\D/g, '') || '11999999999'
                },
                seller_recipient_id: recipient.pagarme_recipient_id,
                platform_fee_percentage: feePercentage,
                platform_fee_amount: user.role === 'admin' ? undefined : platformFeeAmount,
            });
        } catch (pagarmeErr: any) {
            console.error('[BILLING] Pagar.me API Error:', pagarmeErr.response?.data || pagarmeErr.message);
            const errorBody = pagarmeErr.response?.data;
            const errorMsg = errorBody?.message ||
                (errorBody?.errors ? JSON.stringify(errorBody.errors) : pagarmeErr.message);
            return jsonError(`Erro na API de Pagamento: ${errorMsg}`, 400);
        }

        // Extract PIX data — SAME extractPix as V1 PIX API
        const extractPix = (order: any) => {
            const ch = order?.charges?.[0];
            const lt = ch?.last_transaction;
            const candidates = [
                lt?.pix,
                lt,
                ch?.pix,
                order?.payments?.[0]?.pix,
                order?.payments?.[0],
                ch?.last_transaction,
                order
            ].filter(Boolean);

            for (const c of candidates) {
                const qrCode = c?.qr_code || c?.qrCode;
                const qrCodeUrl = c?.qr_code_url || c?.qrCodeUrl;
                const expiresAt = c?.expires_at || c?.expiresAt;
                if (qrCode || qrCodeUrl) {
                    return { qr_code: qrCode, qr_code_url: qrCodeUrl, expires_at: expiresAt };
                }
            }
            return { qr_code: null, qr_code_url: null, expires_at: null };
        };

        const pixData = extractPix(pagarmeOrder);

        // Handle missing PIX data — SAME error handling as V1 PIX API
        if (!pixData.qr_code) {
            console.error('[BILLING] Pagar.me Response (Missing QR):', JSON.stringify(pagarmeOrder, null, 2));

            const orderStatus = pagarmeOrder.status;
            const charges = pagarmeOrder.charges || [];
            const lastChargeStatus = charges[0]?.status;

            if (orderStatus === 'failed' || lastChargeStatus === 'failed') {
                const failedCharge = charges[0];
                const transaction = failedCharge?.last_transaction;
                const acquirerMsg = transaction?.acquirer_message || 'Transação recusada pelo gateway';
                const gatewayErrors = transaction?.gateway_response?.errors;
                const userMsg = gatewayErrors?.length
                    ? gatewayErrors.map((e: any) => e.message).join('; ')
                    : acquirerMsg;

                return jsonError(`Pagamento recusado: ${userMsg}`, 400);
            }

            // Try fetching hydrated order
            try {
                const hydrated = await PagarmeService.getOrder(pagarmeOrder.id);
                const hydratedPix = extractPix(hydrated);
                if (hydratedPix.qr_code) {
                    pixData.qr_code = hydratedPix.qr_code;
                    pixData.qr_code_url = hydratedPix.qr_code_url;
                    pixData.expires_at = hydratedPix.expires_at;
                    pagarmeOrder = hydrated;
                }
            } catch (e) {
                console.error('[BILLING] Hydration failed:', e);
            }

            if (!pixData.qr_code) {
                return jsonError('O Pagar.me não retornou o QR Code Pix. Tente novamente.', 500);
            }
        }

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
            pix_qr_code: pixData.qr_code,
            pix_qr_code_url: pixData.qr_code_url,
            pix_expires_at: pixData.expires_at
        };

        const { data: billing, error: billingError } = await supabase
            .from('billings')
            .insert(billingData)
            .select()
            .single();

        if (billingError) {
             console.error('[BILLING CHARGES POST] DB Error:', billingError);
             return jsonError('Erro ao salvar cobrança no banco de dados.', 500);
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
        if (error.response?.data) {
            const msg = error.response.data?.message || 'Erro no processamento do pagamento';
            return jsonError(msg, error.response.status || 400);
        }
        return jsonError(error.message || 'Erro ao processar cobrança', 500);
    }
}
