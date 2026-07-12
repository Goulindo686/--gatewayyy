export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { PagarmeService } from '@/lib/pagarme';
import { jsonError, jsonSuccess, generateToken, hashPassword } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { sendPurchaseApprovedEmail } from '@/lib/email';
import { sendFacebookEvent } from '@/lib/facebook-capi';
import { decryptUtmifyToken, sendUtmifyOrderWithLog } from '@/lib/utmify';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
    try {
        const contentType = req.headers.get('content-type') || '';
        if (!contentType.toLowerCase().includes('application/json')) {
            return jsonError('Content-Type inválido (use application/json)', 415);
        }

        // Rate limit por IP: 10 checkouts por hora
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
        const rlIp = await checkRateLimit({ key: `checkout:ip:${ip}`, limit: 10, windowSecs: 3600, failOpen: false });
        if (!rlIp.allowed) return rateLimitResponse(rlIp.resetAt);

        const body = await req.json();
        const { product_id, buyer, card_data, plan_id, selected_bumps } = body;
        const facebook = body.facebook || {};
        const tracking = body.tracking || {};
        const normalizeTracking = (input: any) => {
            const allowed = [
                'src', 'sck',
                'utm_id', 'utm_source', 'utm_campaign', 'utm_medium', 'utm_content', 'utm_term',
                'fbclid', 'gclid', 'ttclid', 'msclkid',
                'campaign_id', 'adset_id', 'ad_id',
                'campaign_name', 'adset_name', 'ad_name',
                'fbp', 'fbc',
                'landing_url', 'referrer', 'captured_at'
            ];
            const out: Record<string, string> = {};
            for (const key of allowed) {
                const value = input?.[key];
                if (typeof value === 'string' && value.trim()) out[key] = value.trim().slice(0, 1000);
            }
            return out;
        };
        const trackingParams = normalizeTracking(tracking);

        // Rate limit por email: 5 checkouts por hora
        if (buyer?.email) {
            const rlEmail = await checkRateLimit({ key: `checkout:email:${buyer.email.toLowerCase().trim()}`, limit: 5, windowSecs: 3600, failOpen: false });
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

        // Optional plan
        let selectedPlan: any = null;
        if (plan_id) {
            const { data: plan } = await supabase
                .from('product_plans')
                .select('*')
                .eq('id', plan_id)
                .eq('product_id', product.id)
                .single();
            if (plan) selectedPlan = plan;
        }

        // Get seller recipient
        const { data: recipient } = await supabase
            .from('recipients').select('pagarme_recipient_id').eq('user_id', product.user_id).single();

        if (!recipient) return jsonError('Vendedor não configurado para receber', 400);

        const { data: sellerUser } = await supabase
            .from('users')
            .select('role, status')
            .eq('id', product.user_id)
            .single();

        if (!sellerUser) return jsonError('Vendedor não encontrado', 404);

        if (sellerUser.status === 'blocked') {
            const msg = normalizedPaymentMethod === 'pix'
                ? 'Conta do vendedor está bloqueada. Não é possível gerar o Pix para esta compra.'
                : 'Conta do vendedor está bloqueada. Não é possível processar esta compra.';
            return jsonError(msg, 403);
        }

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

        let bumpTotalCents = 0;
        if (Array.isArray(selected_bumps) && selected_bumps.length > 0) {
            const bumpIds = selected_bumps
                .map((b: any) => (typeof b === 'string' ? b : b?.bump_id))
                .filter(Boolean);

            const bumpPlanMap: Record<string, string> = {};
            for (const b of selected_bumps) {
                if (typeof b === 'object' && b?.bump_id && b?.plan_id) {
                    bumpPlanMap[String(b.bump_id)] = String(b.plan_id);
                }
            }

            if (bumpIds.length > 0) {
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
                    let priceCents = 0;
                    const bumpPlan = Array.isArray(bump.bump_plan) ? bump.bump_plan[0] : bump.bump_plan;
                    const bumpProduct = Array.isArray(bump.bump_product) ? bump.bump_product[0] : bump.bump_product;

                    if (bump.custom_price != null) {
                        priceCents = Number(bump.custom_price) || 0;
                    } else if (bump.bump_plan_id && bumpPlan?.price != null) {
                        priceCents = Number(bumpPlan.price) || 0;
                    } else {
                        const chosenPlanId = bumpPlanMap[bump.id];
                        if (chosenPlanId) {
                            const { data: chosenPlan } = await supabase
                                .from('product_plans')
                                .select('id, price')
                                .eq('id', chosenPlanId)
                                .eq('product_id', bump.bump_product_id)
                                .single();
                            if (chosenPlan?.price != null) {
                                priceCents = Number(chosenPlan.price) || 0;
                            }
                        }

                        if (!priceCents && bumpProduct?.price != null) {
                            priceCents = Number(bumpProduct.price) || 0;
                        }
                    }

                    if (priceCents > 0) {
                        bumpTotalCents += priceCents;
                    }
                }
            }
        }

        let pagarmeOrder;
        let totalCents = 0;
        try {
            const baseCents = selectedPlan
                ? selectedPlan.price
                : (typeof product.price === 'number'
                    ? (product.price >= 100 ? Math.round(product.price) : Math.round(product.price * 100))
                    : Math.round(parseFloat(product.price_display) * 100));
            totalCents = baseCents + bumpTotalCents;
            const ipHeader = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';
            const ip = ipHeader.split(',')[0].trim() || undefined;
            const sessionId = uuidv4();
            pagarmeOrder = await PagarmeService.createOrder({
                amount: totalCents,
                payment_method: normalizedPaymentMethod,
                customer: buyer,
                card_data: normalizedPaymentMethod === 'credit_card' ? card_data : undefined,
                seller_recipient_id: recipient.pagarme_recipient_id,
                platform_fee_percentage: feePercentage,
                ip,
                session_id: sessionId,
                items: [{
                    amount: totalCents,
                    description: product.name,
                    quantity: 1,
                    code: product.id
                }]
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
        const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || undefined;
        const clientUserAgent = req.headers.get('user-agent') || undefined;

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

        const amountDisplay = (totalCents / 100).toFixed(2);

        // Save order
        await supabase.from('orders').insert({
            id: orderId, seller_id: product.user_id, product_id: product.id,
            buyer_name: buyer.name, buyer_email: buyer.email, buyer_cpf: buyer.cpf,
            buyer_phone: buyer.phone?.replace(/\D/g, ''),
            amount: totalCents,
            payment_method: normalizedPaymentMethod, status: charge?.status === 'paid' ? 'paid' : 'pending',
            pagarme_order_id: pagarmeOrder.id, pagarme_charge_id: charge?.id,
            pix_qr_code: pix?.qr_code,
            pix_qr_code_url: pix?.qr_code_url,
            pix_expires_at: pix?.expires_at,
            facebook_event_id: orderId,
            facebook_fbp: typeof facebook.fbp === 'string' ? facebook.fbp : null,
            facebook_fbc: typeof facebook.fbc === 'string' ? facebook.fbc : null,
            client_ip: clientIp,
            client_user_agent: clientUserAgent
        });

        try {
            await supabase.from('orders')
                .update({
                    utm_source: trackingParams.utm_source || null,
                    utm_campaign: trackingParams.utm_campaign || null,
                    utm_medium: trackingParams.utm_medium || null,
                    utm_content: trackingParams.utm_content || null,
                    utm_term: trackingParams.utm_term || null,
                    utm_src: trackingParams.src || null,
                    utm_sck: trackingParams.sck || null,
                    tracking_params: trackingParams,
                    landing_url: trackingParams.landing_url || null,
                    referrer: trackingParams.referrer || null,
                })
                .eq('id', orderId);
        } catch (utmErr) {
            console.warn('[UTM] Tracking columns not available yet:', utmErr);
        }

        // Save transaction
        await supabase.from('transactions').insert({
            id: uuidv4(), user_id: product.user_id, order_id: orderId,
            type: 'sale', amount: totalCents,
            status: charge?.status === 'paid' ? 'confirmed' : 'pending',
            description: `Venda: ${product.name}${selectedPlan ? ` - ${selectedPlan.name}` : ''}`
        });

        // If paid immediately, create fee transaction and update sales count
        let buyerUser: any = null;
        if (charge?.status === 'paid') {
            try {
                const { data: seller } = await supabase
                    .from('users')
                    .select('utmify_enabled, utmify_api_token')
                    .eq('id', product.user_id)
                    .single();
                const utmifyToken = decryptUtmifyToken(seller?.utmify_api_token);
                if (seller?.utmify_enabled && utmifyToken) {
                    const utmifyResult = await sendUtmifyOrderWithLog({
                        token: utmifyToken,
                        sellerId: product.user_id,
                        product,
                        status: 'paid',
                        order: {
                            id: orderId,
                            seller_id: product.user_id,
                            product_id: product.id,
                            buyer_name: buyer.name,
                            buyer_email: buyer.email,
                            buyer_phone: buyer.phone?.replace(/\D/g, ''),
                            buyer_cpf: buyer.cpf,
                            amount: totalCents,
                            payment_method: normalizedPaymentMethod,
                            status: 'paid',
                            created_at: new Date().toISOString(),
                            client_ip: clientIp,
                            utm_source: trackingParams.utm_source || null,
                            utm_campaign: trackingParams.utm_campaign || null,
                            utm_medium: trackingParams.utm_medium || null,
                            utm_content: trackingParams.utm_content || null,
                            utm_term: trackingParams.utm_term || null,
                            utm_src: trackingParams.src || null,
                            utm_sck: trackingParams.sck || null,
                            tracking_params: trackingParams,
                            landing_url: trackingParams.landing_url || null,
                            referrer: trackingParams.referrer || null,
                        }
                    });
                    if ((utmifyResult as any).ok) {
                        await supabase.from('orders').update({ utmify_sent_at: new Date().toISOString(), utmify_last_error: null }).eq('id', orderId);
                    } else if (!(utmifyResult as any).skipped) {
                        await supabase.from('orders').update({ utmify_last_error: (utmifyResult as any).error || 'Erro UTMify' }).eq('id', orderId);
                    }
                }
            } catch (utmifyErr) {
                console.error('[UTMIFY] Immediate purchase error:', utmifyErr);
            }

            try {
                const capiResult = await sendFacebookEvent({
                    eventName: 'Purchase',
                    product,
                    order: {
                        id: orderId,
                        amount: totalCents,
                        facebook_event_id: orderId,
                        facebook_fbp: facebook.fbp,
                        facebook_fbc: facebook.fbc,
                        client_ip: clientIp,
                        client_user_agent: clientUserAgent
                    },
                    buyer,
                    eventId: orderId,
                    eventSourceUrl: facebook.event_source_url,
                    ip: clientIp,
                    userAgent: clientUserAgent,
                    fbp: facebook.fbp,
                    fbc: facebook.fbc
                });

                if ((capiResult as any).ok) {
                    await supabase.from('orders')
                        .update({ facebook_capi_sent_at: new Date().toISOString() })
                        .eq('id', orderId);
                } else if (!(capiResult as any).skipped) {
                    console.warn('[FACEBOOK CAPI] Purchase not sent:', capiResult);
                }
            } catch (fbErr) {
                console.error('[FACEBOOK CAPI] Purchase error:', fbErr);
            }

            const feeAmount = feePercentage > 0
                ? (normalizedPaymentMethod === 'credit_card'
                    ? Math.min(totalCents, Math.round(totalCents * (feePercentage / 100)))
                    : Math.min(200, totalCents))
                : 0;
            if (feeAmount > 0) {
                const feeLabel = normalizedPaymentMethod === 'credit_card' ? `${feePercentage}% (cartão)` : 'R$ 2,00 (PIX)';
                await supabase.from('transactions').insert({
                    id: uuidv4(), user_id: product.user_id, order_id: orderId,
                    type: 'fee', amount: feeAmount,
                    status: 'confirmed',
                    description: `Taxa de plataforma (${feeLabel}) - Pedido ${orderId}`
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

            // Envia email de compra aprovada
            try {
                const buyerEmail = buyer.email.toLowerCase().trim();
                const rlEmailSend = await checkRateLimit({ key: `email:purchase:buyer:${buyerEmail}`, limit: 3, windowSecs: 3600, failOpen: true });
                if (rlEmailSend.allowed) {
                    await sendPurchaseApprovedEmail({
                        buyerName: buyer.name,
                        buyerEmail: buyer.email,
                        productName: product.name,
                        amount: amountDisplay,
                        paymentMethod: normalizedPaymentMethod,
                        orderId,
                    });
                    console.log(`[EMAIL] Email de compra enviado para ${buyer.email}`);
                } else {
                    console.warn(`[EMAIL] Rate limit atingido para envio de email de compra: ${buyerEmail}`);
                }
            } catch (emailErr: any) {
                console.error('[EMAIL] Erro ao enviar email de compra:', emailErr?.message);
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
