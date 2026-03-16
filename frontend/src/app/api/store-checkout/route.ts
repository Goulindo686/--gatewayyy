import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { PagarmeService } from '@/lib/pagarme';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { items: items_cart, buyer, store_slug } = body;
        const enableCreditCard = process.env.ENABLE_CREDIT_CARD ? (process.env.ENABLE_CREDIT_CARD === 'true') : false;
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

        if (!items_cart || items_cart.length === 0) {
            return NextResponse.json({ error: 'Carrinho vazio.' }, { status: 400 });
        }

        if (!buyer?.email || !buyer?.name || !buyer?.cpf) {
            return NextResponse.json({ error: 'Dados do comprador incompletos (E-mail, Nome e CPF são obrigatórios).' }, { status: 400 });
        }

        // 1. Get the seller/store ID from the first product
        const { data: firstProduct, error: productErr } = await supabase
            .from('products')
            .select('user_id')
            .eq('id', items_cart[0].id)
            .single();

        if (productErr || !firstProduct) {
            console.error('Product fetch error:', productErr);
            return NextResponse.json({ error: 'Vendedor não encontrado ou produto inválido.' }, { status: 404 });
        }

        const sellerId = firstProduct.user_id;

        // 2. Get seller's recipient ID (Matching standalone system: remove status filter)
        const { data: recipient } = await supabase
            .from('recipients')
            .select('pagarme_recipient_id')
            .eq('user_id', sellerId)
            .single();

        if (!recipient?.pagarme_recipient_id) {
            return NextResponse.json({ error: 'O vendedor desta loja ainda não ativou os pagamentos.' }, { status: 400 });
        }

        // 3. Get platform settings (fees & platform recipient)
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
        const platformRecipientId = process.env.PLATFORM_RECIPIENT_ID;
        try {
            const { data: sellerUser } = await supabase
                .from('users')
                .select('role')
                .eq('id', sellerId)
                .single();
            if (sellerUser?.role === 'admin') {
                feePercentage = 0;
            }
        } catch {}

        // Diagnostic log for server-side troubleshooting
        console.log('DIAGNOSTIC - Checkout Config:', {
            seller_id: sellerId,
            seller_recipient: recipient.pagarme_recipient_id,
            platform_recipient: platformRecipientId,
            fee_percentage: feePercentage
        });

        // 4. Create Pagar.me Order (EXACT Mirror of Standalone System)
        const totalAmountCents = items_cart.reduce((sum: number, item: any) => sum + Math.round(item.price * 100 * item.quantity), 0);
        const method = normalizedPaymentMethod;

        if (method !== 'pix' && method !== 'credit_card') {
            return NextResponse.json({ error: 'Método de pagamento inválido.' }, { status: 400 });
        }

        if (method === 'credit_card' && !enableCreditCard) {
            return NextResponse.json({ error: 'Pagamento por cartão está desativado no momento.' }, { status: 400 });
        }

        let pagarmeOrder;
        try {
            // we use the same "createOrder" used by the standalone system that works
            const ipHeader = (typeof (req as any)?.headers?.get === 'function' ? (req as any).headers.get('x-forwarded-for') : '') || '';
            const ip = (ipHeader || '').split(',')[0].trim() || undefined;
            const sessionId = uuidv4();
            pagarmeOrder = await PagarmeService.createOrder({
                amount: totalAmountCents,
                payment_method: method,
                customer: buyer,
                seller_recipient_id: recipient.pagarme_recipient_id,
                platform_fee_percentage: feePercentage,
                card_data: method === 'credit_card' ? body.card_data : undefined,
                ip,
                session_id: sessionId
            } as any);
        } catch (pagarmeErr: any) {
            const errorBody = pagarmeErr.response?.data;
            const detailedErrors = errorBody?.errors
                ? Object.entries(errorBody.errors).map(([field, msgs]: any) => `${field}: ${msgs.join(', ')}`).join('; ')
                : null;

            const errorMessage = detailedErrors || errorBody?.message || pagarmeErr.message || 'Erro desconhecido';
            console.error('Checkout Error (Final Sync):', JSON.stringify(errorBody || errorMessage, null, 2));

            return NextResponse.json({
                error: `Erro no Checkout: ${errorMessage}`,
                diagnostic: {
                    type: errorBody ? 'PAGARME_API' : 'INTERNAL_JS',
                    seller_recipient: recipient.pagarme_recipient_id,
                    platform_recipient: platformRecipientId || 'MISSING_ENV',
                    raw_error: errorBody || pagarmeErr.message
                }
            }, { status: 400 });
        }

        const charge = pagarmeOrder.charges?.[0];
        const lastTransaction = charge?.last_transaction;

        // --- ERROR DETECTION ---
        if (charge?.status === 'failed' || pagarmeOrder.status === 'failed') {
            const lt = lastTransaction;
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
            return NextResponse.json({
                error: `Pagamento Recusado: ${msg}`,
                status: charge?.status || pagarmeOrder.status,
                pagarme_id: pagarmeOrder.id
            }, { status: 400 });
        }

        // 5. Save Order to Supabase with Bulletproof Extraction
        const orderData: any = {
            product_id: items_cart[0].id,
            seller_id: sellerId,
            buyer_name: buyer.name || 'Cliente',
            buyer_email: buyer.email?.toLowerCase().trim(),
            buyer_cpf: buyer.cpf?.replace(/\D/g, '') || '00000000000',
            buyer_phone: buyer.phone?.replace(/\D/g, '') || '11999999999',
            amount: totalAmountCents,
            amount_display: (totalAmountCents / 100).toFixed(2),
            payment_method: method,
            status: charge?.status === 'paid' ? 'paid' : 'pending',
            pagarme_order_id: pagarmeOrder.id,
            pagarme_charge_id: charge?.id,
            installments: body.card_data?.installments || 1
        };

        // EXTREMTELY ROBUST PIX EXTRACTION
        if (method === 'pix') {
            let pix = extractPix(pagarmeOrder);
            if (!pix) {
                try {
                    const hydrated = await PagarmeService.getOrder(pagarmeOrder.id);
                    pix = extractPix(hydrated);
                    if (pix) pagarmeOrder = hydrated;
                } catch (e) {
                }
            }

            orderData.pix_qr_code = pix?.qr_code;
            orderData.pix_qr_code_url = pix?.qr_code_url;
            orderData.pix_expires_at = pix?.expires_at;

            if (!orderData.pix_qr_code && !orderData.pix_qr_code_url) {
                console.error('[STORE CHECKOUT] Pix data NOT found', JSON.stringify({
                    pagarme_order_id: pagarmeOrder?.id,
                    pagarme_status: pagarmeOrder?.status,
                    has_charges: !!pagarmeOrder?.charges?.length,
                    charge_status: pagarmeOrder?.charges?.[0]?.status,
                    has_last_transaction: !!pagarmeOrder?.charges?.[0]?.last_transaction
                }));

                return NextResponse.json(
                    { error: 'O pedido foi gerado, mas o Pagar.me não retornou o QR Code.' },
                    { status: 502 }
                );
            }
        }

        if (method === 'credit_card' && lastTransaction) {
            orderData.card_last_digits = lastTransaction.card?.last_four_digits;
            orderData.card_brand = lastTransaction.card?.brand;
        }

        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert(orderData)
            .select()
            .single();

        if (orderError) {
            console.error('Supabase Order Save Error:', orderError);
            throw orderError;
        }

        // 6. Return response to frontend (Match backend response style)
        const response: any = {
            order: {
                id: order.id,
                status: order.status,
                amount_display: order.amount_display,
                payment_method: order.payment_method
            }
        };

        if (method === 'pix') {
            response.pix = {
                qr_code: order.pix_qr_code,
                qr_code_url: order.pix_qr_code_url,
                expires_at: order.pix_expires_at
            };
        }

        if (method === 'credit_card') {
            response.card = {
                last_digits: order.card_last_digits,
                brand: order.card_brand
            };
        }

        return NextResponse.json(response, { status: 201 });

    } catch (err: any) {
        console.error('Unfied Checkout Error:', err.response?.data || err.message);

        return NextResponse.json(
            { error: err.response?.data?.error || err.message || 'Erro interno ao processar checkout' },
            { status: 500 }
        );
    }
}
