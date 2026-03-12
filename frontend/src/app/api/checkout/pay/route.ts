export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { PagarmeService } from '@/lib/pagarme';
import { jsonError, jsonSuccess, generateToken, hashPassword } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { product_id, buyer, card_data } = body;
        const enableCreditCard = process.env.ENABLE_CREDIT_CARD ? (process.env.ENABLE_CREDIT_CARD === 'true') : true;
        const normalizedPaymentMethod = (body.payment_method === 'card' ? 'credit_card' : body.payment_method) || 'pix';

        const extractPix = (pagarmeOrder: any) => {
            const charge = pagarmeOrder?.charges?.[0];
            const lastTransaction = charge?.last_transaction;

            const candidates = [
                lastTransaction?.pix,
                lastTransaction,
                charge?.pix,
                pagarmeOrder?.payments?.[0]?.pix,
                pagarmeOrder?.payments?.[0],
            ].filter(Boolean);

            for (const c of candidates) {
                const qrCode = c?.qr_code || c?.qrCode;
                const qrCodeUrl = c?.qr_code_url || c?.qrCodeUrl;
                const expiresAt = c?.expires_at || c?.expiresAt;

                if (qrCode || qrCodeUrl) {
                    return { qr_code: qrCode, qr_code_url: qrCodeUrl, expires_at: expiresAt };
                }
            }

            return null;
        };

        if (normalizedPaymentMethod !== 'pix' && normalizedPaymentMethod !== 'credit_card') {
            return jsonError('Método de pagamento inválido');
        }

        if (normalizedPaymentMethod === 'credit_card' && !enableCreditCard) {
            return jsonError('Pagamento por cartão está desativado no momento');
        }

        if (!product_id || !buyer?.name || !buyer?.email || !buyer?.cpf) {
            return jsonError('Dados incompletos');
        }

        // Get product
        const { data: product } = await supabase
            .from('products').select('*').eq('id', product_id).eq('status', 'active').single();

        if (!product) return jsonError('Produto não encontrado', 404);

        // Get seller recipient
        const { data: recipient } = await supabase
            .from('recipients').select('pagarme_recipient_id').eq('user_id', product.user_id).single();

        if (!recipient) return jsonError('Vendedor não configurado para receber', 400);

        const { data: sellerUser } = await supabase
            .from('users')
            .select('role')
            .eq('id', product.user_id)
            .single();

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
        if (sellerUser?.role === 'admin') {
            feePercentage = 0;
        }

        // Create Pagar.me order
        const platformRecipientId = process.env.PLATFORM_RECIPIENT_ID;
        console.log('DEBUG PIX GENERATION:', {
            seller_recipient_id: recipient.pagarme_recipient_id,
            platform_recipient_id: platformRecipientId,
            seller_percentage: 100 - feePercentage,
            platform_percentage: feePercentage
        });

        let pagarmeOrder;
        try {
            const amountCents = typeof product.price === 'number'
                ? (product.price >= 100 ? Math.round(product.price) : Math.round(product.price * 100))
                : Math.round(parseFloat(product.price_display) * 100);
            const ipHeader = req.headers.get('x-forwarded-for') || '';
            const ip = ipHeader.split(',')[0].trim() || undefined;
            const sessionId = uuidv4();
            pagarmeOrder = await PagarmeService.createOrder({
                amount: amountCents,
                payment_method: normalizedPaymentMethod,
                customer: buyer,
                card_data: normalizedPaymentMethod === 'credit_card' ? card_data : undefined,
                seller_recipient_id: recipient.pagarme_recipient_id,
                platform_fee_percentage: feePercentage,
                ip,
                session_id: sessionId
            });
        } catch (pagarmeErr: any) {
            console.error('Pagar.me API Error:', pagarmeErr.response?.data || pagarmeErr.message);
            const errorBody = pagarmeErr.response?.data;
            const errorMsg = errorBody?.message || 
                           (errorBody?.errors ? JSON.stringify(errorBody.errors) : pagarmeErr.message);
            return jsonError(`Erro na API de Pagamento: ${errorMsg}`, 400);
        }

        const charge = pagarmeOrder.charges?.[0];

        // --- ERROR DETECTION ---
        if (charge?.status === 'failed' || pagarmeOrder.status === 'failed') {
            const lt = charge?.last_transaction;
            const ge = lt?.gateway_response?.errors;
            const af = lt?.antifraud_response;
            let msg = '';
            if (af && typeof af === 'object') {
                msg = 'Transação reprovada pelo Antifraude.';
                if (typeof af.status === 'string') msg += ` Status: ${af.status}.`;
                if (typeof af.reason === 'string') msg += ` Motivo: ${af.reason}.`;
            } else if (ge && Array.isArray(ge) && ge.length) {
                msg = ge.map((e: any) => e.message).join('; ');
            } else if (typeof lt?.acquirer_message === 'string') {
                msg = /aprovad/i.test(lt.acquirer_message) ? 'Transação não capturada. Aguarde confirmação ou tente novamente.' : lt.acquirer_message;
            } else {
                msg = 'Transação recusada.';
            }
            console.error('Pagar.me Order Failed:', JSON.stringify(pagarmeOrder, null, 2));
            return jsonError(`Pagamento Recusado: ${msg}`, 400);
        }

        const orderId = uuidv4();

        let pix: { qr_code?: string; qr_code_url?: string; expires_at?: string } | null = null;
        if (normalizedPaymentMethod === 'pix') {
            pix = extractPix(pagarmeOrder);
            if (!pix) {
                try {
                    const hydrated = await PagarmeService.getOrder(pagarmeOrder.id);
                    pix = extractPix(hydrated);
                    if (pix) pagarmeOrder = hydrated;
                } catch (e) {
                }
            }
        }

        // Calculate amount display safely
        const amountDisplay = product.price_display || (() => {
            const cents = typeof product.price === 'number'
                ? (product.price >= 100 ? product.price : Math.round(product.price * 100))
                : Math.round(parseFloat(product.price) * 100);
            return (cents / 100).toFixed(2);
        })();

        // Save order
        await supabase.from('orders').insert({
            id: orderId, seller_id: product.user_id, product_id: product.id,
            buyer_name: buyer.name, buyer_email: buyer.email, buyer_cpf: buyer.cpf,
            amount: Math.round(parseFloat(amountDisplay) * 100),
            payment_method: normalizedPaymentMethod, status: charge?.status === 'paid' ? 'paid' : 'pending',
            pagarme_order_id: pagarmeOrder.id, pagarme_charge_id: charge?.id,
            pix_qr_code: pix?.qr_code,
            pix_qr_code_url: pix?.qr_code_url,
            pix_expires_at: pix?.expires_at
        });

        // Save transaction
        await supabase.from('transactions').insert({
            id: uuidv4(), user_id: product.user_id, order_id: orderId,
            type: 'sale', amount: Math.round(parseFloat(amountDisplay) * 100),
            // amount_display removed to prevent schema errors
            status: charge?.status === 'paid' ? 'confirmed' : 'pending',
            description: `Venda: ${product.name}`
        });

        // If paid immediately, create fee transaction and update sales count
        let buyerUser: any = null;
        if (charge?.status === 'paid') {
            const feeAmount = Math.round(Math.round(parseFloat(amountDisplay) * 100) * (feePercentage / 100));
            if (feeAmount > 0) {
                await supabase.from('transactions').insert({
                    id: uuidv4(), user_id: product.user_id, order_id: orderId,
                    type: 'fee', amount: feeAmount,
                    status: 'confirmed',
                    description: `Taxa de plataforma (${feePercentage}%) - Pedido ${orderId}`
                });
            }

            await supabase.from('products')
                .update({ sales_count: (product.sales_count || 0) + 1 })
                .eq('id', product.id);

            // AUTO-ENROLLMENT: Find or create buyer user and enroll them
            const { data: existingUser } = await supabase
                .from('users')
                .select('id, name, email, role')
                .ilike('email', buyer.email.toLowerCase().trim())
                .single();

            if (existingUser) {
                buyerUser = existingUser;
            } else {
                // Create new customer account
                const newUserId = uuidv4();
                const tempPassword = uuidv4().substring(0, 12);
                const hashedPw = await hashPassword(tempPassword);

                const baseUserData: any = {
                    id: newUserId,
                    email: buyer.email.toLowerCase().trim(),
                    name: buyer.name,
                    role: 'customer',
                    status: 'active'
                };

                let newUser: any = null;
                let createErr: any = null;

                ({ data: newUser, error: createErr } = await supabase
                    .from('users')
                    .insert({ ...baseUserData, password_hash: hashedPw })
                    .select('id, name, email, role')
                    .single());

                if (createErr && /password_hash/i.test(createErr.message || '')) {
                    ({ data: newUser, error: createErr } = await supabase
                        .from('users')
                        .insert({ ...baseUserData, password: hashedPw })
                        .select('id, name, email, role')
                        .single());
                }

                if (!createErr && newUser) buyerUser = newUser;
            }

            if (buyerUser) {
                // Enroll buyer in the product
                await supabase.from('enrollments').upsert({
                    user_id: buyerUser.id,
                    product_id: product.id,
                    order_id: orderId,
                    status: 'active'
                }, { onConflict: 'user_id, product_id' });
            }
        }

        // Build response
        const response: any = {
            order: { id: orderId, status: charge?.status || 'pending', amount_display: amountDisplay }
        };

        // If paid immediately, include auto-login token for buyer
        if (charge?.status === 'paid' && buyerUser) {
            const token = generateToken({ id: buyerUser.id, email: buyerUser.email, role: buyerUser.role });
            response.auth = {
                token,
                user: { id: buyerUser.id, name: buyerUser.name, email: buyerUser.email, role: buyerUser.role }
            };
        }

        if (normalizedPaymentMethod === 'pix') {
            if (pix?.qr_code || pix?.qr_code_url) {
                response.pix = {
                    qr_code: pix.qr_code,
                    qr_code_url: pix.qr_code_url,
                    expires_at: pix.expires_at
                };
            } else {
                console.error('[PAY API] Pix data NOT found', JSON.stringify({
                    pagarme_order_id: pagarmeOrder?.id,
                    pagarme_status: pagarmeOrder?.status,
                    has_charges: !!pagarmeOrder?.charges?.length,
                    charge_status: pagarmeOrder?.charges?.[0]?.status,
                    has_last_transaction: !!pagarmeOrder?.charges?.[0]?.last_transaction
                }));
                return jsonError('O pedido foi gerado, mas o Pagar.me não retornou o QR Code.', 502);
            }
        }

        return jsonSuccess(response, 201);
    } catch (err: any) {
        const errorData = err.response?.data || err.message;
        console.error('Checkout error details:', JSON.stringify({
            error: errorData,
            stack: err.stack,
            request: err.config?.data ? JSON.parse(err.config.data) : 'N/A'
        }, null, 2));

        // Return a more descriptive error if it's a Pagar.me validation error
        let message = 'Erro ao processar pagamento';
        if (typeof errorData === 'string') {
            message = errorData;
        } else if (errorData?.message) {
            message = errorData.message;
        } else if (errorData?.errors?.[0]?.message) {
            message = errorData.errors[0].message;
        }
        
        return jsonError(message, 500);
    }
}
