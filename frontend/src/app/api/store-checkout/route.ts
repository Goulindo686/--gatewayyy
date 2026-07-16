import { NextResponse, NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { CARD_PLATFORM_FEE_PERCENTAGE, PagarmeService } from '@/lib/pagarme';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { normalizeInstallments, validateCreditCardBuyer } from '@/lib/checkout-validation';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
    try {
        const contentType = req.headers.get('content-type') || '';
        if (!contentType.toLowerCase().includes('application/json')) {
            return NextResponse.json({ error: 'Content-Type inválido (use application/json)' }, { status: 415 });
        }

        // Rate limit por IP: 10 checkouts por hora
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
        const rlIp = await checkRateLimit({ key: `store_checkout:ip:${ip}`, limit: 10, windowSecs: 3600, failOpen: false });
        if (!rlIp.allowed) return rateLimitResponse(rlIp.resetAt);

        const body = await req.json();
        const { items: items_cart, buyer, store_slug } = body;

        // Rate limit por email: 5 checkouts por hora
        if (buyer?.email) {
            const rlEmail = await checkRateLimit({ key: `store_checkout:email:${buyer.email.toLowerCase().trim()}`, limit: 5, windowSecs: 3600, failOpen: false });
            if (!rlEmail.allowed) return rateLimitResponse(rlEmail.resetAt);
        }
        const enableCreditCard = process.env.ENABLE_CREDIT_CARD
            ? (process.env.ENABLE_CREDIT_CARD === 'true')
            : true;
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

        const { data: sellerUser, error: sellerUserErr } = await supabase
            .from('users')
            .select('role, status')
            .eq('id', sellerId)
            .single();

        if (sellerUserErr || !sellerUser) {
            return NextResponse.json({ error: 'Vendedor não encontrado.' }, { status: 404 });
        }

        if (sellerUser.status === 'blocked') {
            const msg = normalizedPaymentMethod === 'pix'
                ? 'Conta do vendedor está bloqueada. Não é possível gerar o Pix para esta compra.'
                : 'Conta do vendedor está bloqueada. Não é possível processar esta compra.';
            return NextResponse.json({ error: msg }, { status: 403 });
        }

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
        if (sellerUser.role === 'admin') {
            feePercentage = 0;
        } else if (normalizedPaymentMethod === 'credit_card') {
            feePercentage = CARD_PLATFORM_FEE_PERCENTAGE;
        }

        // Diagnostic log for server-side troubleshooting
        console.log('DIAGNOSTIC - Checkout Config:', {
            seller_id: sellerId,
            seller_recipient: recipient.pagarme_recipient_id,
            platform_recipient: platformRecipientId,
            platform_fee: normalizedPaymentMethod === 'credit_card'
                ? `${feePercentage}%`
                : (feePercentage > 0 ? 'R$ 2,00' : 'isento')
        });

        // 4. SECURITY: Validate prices from DB — never trust client-side prices
        const productIds = items_cart.map((item: any) => item.id);
        const { data: dbProducts, error: dbProductsErr } = await supabase
            .from('products')
            .select('id, name, price, status')
            .in('id', productIds)
            .eq('status', 'active');

        if (dbProductsErr || !dbProducts || dbProducts.length !== productIds.length) {
            return NextResponse.json({ error: 'Um ou mais produtos não foram encontrados ou estão inativos.' }, { status: 400 });
        }

        const productMap = Object.fromEntries(dbProducts.map((p: any) => [p.id, p]));

        // Build validated cart with DB prices
        const validatedCart = items_cart.map((item: any) => {
            const dbProduct = productMap[item.id];
            return { ...item, price: dbProduct.price / 100, priceCents: dbProduct.price, name: dbProduct.name };
        });

        const totalAmountCents = validatedCart.reduce((sum: number, item: any) => sum + item.priceCents * item.quantity, 0);
        const method = normalizedPaymentMethod;

        if (method !== 'pix' && method !== 'credit_card') {
            return NextResponse.json({ error: 'Método de pagamento inválido.' }, { status: 400 });
        }

        if (method === 'credit_card' && !enableCreditCard) {
            return NextResponse.json({ error: 'Pagamento por cartão está desativado no momento.' }, { status: 400 });
        }

        let cardInstallments: number | null = null;
        if (method === 'credit_card') {
            if (body.card_data) {
                return NextResponse.json({ error: 'Este checkout esta desatualizado. Recarregue a pagina antes de pagar.' }, { status: 400 });
            }
            const buyerError = validateCreditCardBuyer(buyer);
            if (buyerError) return NextResponse.json({ error: buyerError }, { status: 400 });
            if (!/^token_[a-zA-Z0-9]+$/.test(String(body.card_token || ''))) {
                return NextResponse.json({ error: 'O token seguro do cartao expirou. Confira os dados e tente novamente.' }, { status: 400 });
            }
            cardInstallments = normalizeInstallments(body.installments);
            if (!cardInstallments) {
                return NextResponse.json({ error: 'Quantidade de parcelas invalida.' }, { status: 400 });
            }
        }

        const checkoutOrderId = uuidv4();
        let pagarmeOrder;
        try {
            // we use the same "createOrder" used by the standalone system that works
            const ipHeader = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';
            const ip = (ipHeader || '').split(',')[0].trim() || undefined;
            const requestedSessionId = String(body.checkout_session_id || '');
            const sessionId = /^[a-zA-Z0-9-]{8,64}$/.test(requestedSessionId) ? requestedSessionId : uuidv4();
            const requestedPlatform = String(body.device_platform || '').toUpperCase();
            const devicePlatform = /^[A-Z0-9_-]{2,64}$/.test(requestedPlatform) ? requestedPlatform : 'WEB';
            pagarmeOrder = await PagarmeService.createOrder({
                amount: totalAmountCents,
                payment_method: method,
                customer: buyer,
                seller_recipient_id: recipient.pagarme_recipient_id,
                platform_fee_percentage: feePercentage,
                card_token: method === 'credit_card' ? body.card_token : undefined,
                installments: method === 'credit_card' ? cardInstallments || 1 : undefined,
                items: validatedCart.map((item: any) => ({
                    amount: item.priceCents,
                    description: item.name,
                    quantity: item.quantity,
                    code: item.id
                })),
                ip,
                session_id: sessionId,
                device_platform: devicePlatform,
                order_code: checkoutOrderId,
            });
        } catch (pagarmeErr: any) {
            const errorBody = pagarmeErr.response?.data;
            const providerMessage = String(errorBody?.message || pagarmeErr.message || '');
            console.error('[STORE CHECKOUT] Provider request failed:', {
                status: pagarmeErr.response?.status,
                message: providerMessage.slice(0, 300),
                payment_method: method,
            });
            const message = pagarmeErr.response?.status === 412
                ? 'Nao foi possivel validar este cartao. Confira os dados ou tente outro cartao.'
                : 'Nao foi possivel processar o pagamento agora. Confira os dados e tente novamente.';
            return NextResponse.json({ error: message }, { status: 400 });
        }

        const charge = pagarmeOrder.charges?.[0];
        const lastTransaction = charge?.last_transaction;

        // --- ERROR DETECTION ---
        if (charge?.status === 'failed' || pagarmeOrder.status === 'failed') {
            const lt = lastTransaction;
            const ge = lt?.gateway_response?.errors;
            const af = lt?.antifraud_response;
            const antifraudStatus = String(af?.status || '').toLowerCase();
            const antifraudReason = String(af?.reason || '').toLowerCase();
            const wasRejectedByAntifraud = /^(reprov|recus|denied|declined|failed|rejected|blocked)/.test(antifraudStatus)
                || /(high[\s_-]*risk|alto[\s_-]*risco|suspect(?:ed)?[\s_-]*fraud|fraudulent|suspeita.*fraude|bloquead)/.test(antifraudReason);
            let msg = '';
            if (wasRejectedByAntifraud) {
                msg = 'A compra nao foi aprovada pela analise de seguranca. Tente outro cartao ou utilize o Pix.';
            } else if (ge && Array.isArray(ge) && ge.length) {
                msg = 'O banco emissor nao autorizou a compra. Confira os dados ou tente outro cartao.';
            } else if (typeof lt?.acquirer_message === 'string') {
                msg = /aprovad/i.test(lt.acquirer_message)
                    ? 'A transacao foi autorizada, mas ainda nao foi capturada. Aguarde e tente novamente.'
                    : 'O banco emissor nao autorizou a compra. Confira os dados ou tente outro cartao.';
            } else {
                msg = 'A transacao nao foi autorizada. Confira os dados ou tente outro cartao.';
            }
            return NextResponse.json({
                error: msg,
                status: charge?.status || pagarmeOrder.status,
                pagarme_id: pagarmeOrder.id
            }, { status: 400 });
        }

        // 5. Save Order to Supabase with Bulletproof Extraction
        const orderData: any = {
            id: checkoutOrderId,
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
            installments: method === 'credit_card' ? cardInstallments : 1
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
