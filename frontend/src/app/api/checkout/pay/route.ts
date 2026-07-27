export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { CARD_PLATFORM_FEE_PERCENTAGE, PagarmeService } from '@/lib/pagarme';
import { jsonError, jsonSuccess } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { sendPurchaseApprovedEmail } from '@/lib/email';
import { sendFacebookEvent } from '@/lib/facebook-capi';
import { decryptUtmifyToken, sendUtmifyOrderWithLog } from '@/lib/utmify';
import { normalizeInstallments, validateCreditCardBuyer } from '@/lib/checkout-validation';
import { sendApprovedSaleNotification } from '@/lib/sale-notifications';
import { classifyCardPaymentFailure, classifyCardProviderRequestError, isPagarmePaymentFailed } from '@/lib/card-payment-failure';
import { formatPixFeeLabel, resolveSellerPixFee } from '@/lib/seller-pix-fee';
import {
    affiliateCookieName,
    affiliateOrderSnapshot,
    recordOrderAffiliateCommission,
    resolveAffiliateAttribution,
    syncOrderAffiliateCommission,
    type AffiliateAttribution,
} from '@/lib/affiliates';
import { calculateAffiliatePlatformFee, normalizeAffiliateReference } from '@/lib/affiliates-core';
import {
    beginPaymentAttempt,
    completePaymentAttempt,
    createProviderIdempotencyKey,
    failPaymentAttempt,
    hashPaymentRequest,
} from '@/lib/payment-security';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
    let activeIdempotencyKey: string | null = null;
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
        const { product_id, buyer, card_token, plan_id, selected_bumps } = body;
        const affiliateReferenceProvided = typeof body.affiliate_ref === 'string'
            && body.affiliate_ref.trim().length > 0;
        const affiliateReference = normalizeAffiliateReference(body.affiliate_ref);
        if (affiliateReferenceProvided && !affiliateReference) {
            return jsonError('Link de afiliado invalido. Abra novamente o link recebido antes de pagar.', 400);
        }
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

        let cardInstallments: number | null = null;
        if (normalizedPaymentMethod === 'credit_card') {
            if (body.card_data) {
                return jsonError('Este checkout esta desatualizado. Recarregue a pagina antes de pagar.', 400);
            }

            const buyerError = validateCreditCardBuyer(buyer);
            if (buyerError) return jsonError(buyerError, 400);
            if (!/^token_[a-zA-Z0-9]+$/.test(String(card_token || ''))) {
                return jsonError('O token seguro do cartao expirou. Confira os dados e tente novamente.', 400);
            }

            cardInstallments = normalizeInstallments(body.installments);
            if (!cardInstallments) return jsonError('Quantidade de parcelas invalida.', 400);
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
        } else if (normalizedPaymentMethod === 'credit_card') {
            feePercentage = CARD_PLATFORM_FEE_PERCENTAGE;
        }

        const itemCode = (value: unknown, fallback: string) => {
            const cleaned = String(value || fallback).replace(/[^a-zA-Z0-9_-]/g, '');
            return (cleaned || fallback).slice(0, 52);
        };

        const baseCents = selectedPlan
            ? Number(selectedPlan.price) || 0
            : (typeof product.price === 'number'
                ? (product.price >= 100 ? Math.round(product.price) : Math.round(product.price * 100))
                : Math.round(parseFloat(product.price_display) * 100));

        const pagarmeItems = [{
            amount: baseCents,
            description: String(selectedPlan?.name ? `${product.name} - ${selectedPlan.name}` : product.name).slice(0, 256),
            quantity: 1,
            code: itemCode(selectedPlan?.id || product.id, product.id),
        }];

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
                        bump_product:bump_product_id (id, name, price),
                        bump_plan:bump_plan_id (id, name, price)
                    `)
                    .eq('product_id', product_id)
                    .eq('is_active', true)
                    .in('id', bumpIds);

                for (const bump of (bumps || [])) {
                    let priceCents = 0;
                    let itemName = 'Oferta adicional';
                    let codeSource = bump.id;
                    const bumpPlan = Array.isArray(bump.bump_plan) ? bump.bump_plan[0] : bump.bump_plan;
                    const bumpProduct = Array.isArray(bump.bump_product) ? bump.bump_product[0] : bump.bump_product;

                    if (bump.custom_price != null) {
                        priceCents = Number(bump.custom_price) || 0;
                        itemName = bumpProduct?.name || bumpPlan?.name || itemName;
                    } else if (bump.bump_plan_id && bumpPlan?.price != null) {
                        priceCents = Number(bumpPlan.price) || 0;
                        itemName = bumpPlan?.name || bumpProduct?.name || itemName;
                        codeSource = bumpPlan?.id || codeSource;
                    } else {
                        const chosenPlanId = bumpPlanMap[bump.id];
                        if (chosenPlanId) {
                            const { data: chosenPlan } = await supabase
                                .from('product_plans')
                                .select('id, name, price')
                                .eq('id', chosenPlanId)
                                .eq('product_id', bump.bump_product_id)
                                .single();
                            if (chosenPlan?.price != null) {
                                priceCents = Number(chosenPlan.price) || 0;
                                itemName = chosenPlan?.name || bumpProduct?.name || itemName;
                                codeSource = chosenPlan?.id || codeSource;
                            }
                        }

                        if (!priceCents && bumpProduct?.price != null) {
                            priceCents = Number(bumpProduct.price) || 0;
                            itemName = bumpProduct?.name || itemName;
                            codeSource = bumpProduct?.id || codeSource;
                        }
                    }

                    if (priceCents > 0) {
                        pagarmeItems.push({
                            amount: priceCents,
                            description: String(itemName).slice(0, 256),
                            quantity: 1,
                            code: itemCode(codeSource, bump.id),
                        });
                    }
                }
            }
        }

        let orderId = uuidv4();
        let pagarmeOrder;
        let totalCents = 0;
        let appliedPlatformFeeAmount = 0;
        let appliedFeeLabel = 'isento';
        let affiliateAttribution: AffiliateAttribution | null = null;
        const hasAffiliateIntent = Boolean(
            affiliateReference
            || normalizeAffiliateReference(
                req.cookies.get(affiliateCookieName(product.id))?.value,
            ),
        );
        try {
            totalCents = pagarmeItems.reduce((sum, item) => sum + (item.amount * item.quantity), 0);
            if (totalCents <= 0) return jsonError('Valor do pedido invalido.', 400);

            if (normalizedPaymentMethod === 'credit_card') {
                appliedPlatformFeeAmount = PagarmeService.calculatePlatformFeeCents({
                    amountCents: totalCents,
                    paymentMethod: normalizedPaymentMethod,
                    feePercentage,
                });
                appliedFeeLabel = `${feePercentage}% (cartao)`;
            } else if (sellerUser.role !== 'admin') {
                const resolvedPixFee = await resolveSellerPixFee({
                    sellerId: product.user_id,
                    amountCents: totalCents,
                    defaultFeeCents: feePercentage > 0 ? 200 : 0,
                });
                appliedPlatformFeeAmount = resolvedPixFee.amountCents;
                appliedFeeLabel = formatPixFeeLabel(resolvedPixFee);
            }

            const resolveAttributionForFee = (platformFeeAmount: number) => resolveAffiliateAttribution({
                req,
                productId: product.id,
                producerId: product.user_id,
                grossAmount: totalCents,
                platformFeeAmount,
                eligibleGrossAmount: baseCents,
                buyerEmail: buyer.email,
                buyerDocument: buyer.cpf,
                buyerPhone: buyer.phone,
                attributionToken: affiliateReference || undefined,
            });

            affiliateAttribution = await resolveAttributionForFee(appliedPlatformFeeAmount);
            if (hasAffiliateIntent && !affiliateAttribution) {
                return jsonError('Nao foi possivel validar este link de afiliado. Abra novamente o link antes de pagar.', 409);
            }
            if (affiliateAttribution) {
                const affiliatePlatformFeeAmount = calculateAffiliatePlatformFee({
                    grossAmount: totalCents,
                    currentPlatformFeeAmount: appliedPlatformFeeAmount,
                    paymentMethod: normalizedPaymentMethod,
                });
                if (affiliatePlatformFeeAmount !== appliedPlatformFeeAmount) {
                    const repricedAttribution = await resolveAttributionForFee(affiliatePlatformFeeAmount);
                    if (repricedAttribution) {
                        affiliateAttribution = repricedAttribution;
                        appliedPlatformFeeAmount = affiliatePlatformFeeAmount;
                        if (normalizedPaymentMethod === 'credit_card') {
                            feePercentage = CARD_PLATFORM_FEE_PERCENTAGE;
                            appliedFeeLabel = `${CARD_PLATFORM_FEE_PERCENTAGE}% (cartao afiliado)`;
                        } else {
                            appliedFeeLabel = `R$ ${(affiliatePlatformFeeAmount / 100).toFixed(2).replace('.', ',')} (PIX afiliado)`;
                        }
                    } else {
                        return jsonError('Nao foi possivel calcular a divisao desta venda de afiliado. Tente novamente.', 409);
                    }
                }
            }
            const platformRecipientId = (process.env.PLATFORM_RECIPIENT_ID || '').trim().toLowerCase();
            const sellerRecipientId = String(recipient.pagarme_recipient_id || '').trim().toLowerCase();
            const affiliateRecipientId = String(affiliateAttribution?.recipientId || '').trim().toLowerCase();
            if (affiliateAttribution && (
                affiliateRecipientId === sellerRecipientId
                || (platformRecipientId && affiliateRecipientId === platformRecipientId)
            )) {
                console.error('[AFFILIATES] Recipient conflict; affiliate checkout blocked.');
                return jsonError('Os recebedores desta venda de afiliado estao em conflito. Corrija as contas antes de pagar.', 409);
            }

            console.log('CHECKOUT SPLIT CONFIG:', {
                seller_recipient_id: recipient.pagarme_recipient_id,
                platform_recipient_id: process.env.PLATFORM_RECIPIENT_ID,
                platform_fee_amount: appliedPlatformFeeAmount,
                platform_fee_rule: appliedFeeLabel,
                affiliate_commission_amount: affiliateAttribution?.commissionAmount || 0,
            });

            const ipHeader = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';
            const ip = ipHeader.split(',')[0].trim() || undefined;
            const requestedSessionId = String(body.checkout_session_id || '');
            if (!/^[a-zA-Z0-9-]{8,64}$/.test(requestedSessionId)) {
                return jsonError('Sessao de checkout invalida. Recarregue a pagina e tente novamente.', 400);
            }
            const sessionId = requestedSessionId;
            const requestedPlatform = String(body.device_platform || '').toUpperCase();
            const devicePlatform = /^[A-Z0-9_-]{2,64}$/.test(requestedPlatform)
                ? requestedPlatform
                : 'WEB';
            const requestedThreeDsTransactionId = String(body.three_ds_transaction_id || '');
            const threeDsTransactionId = /^[a-zA-Z0-9_-]{8,128}$/.test(requestedThreeDsTransactionId)
                ? requestedThreeDsTransactionId
                : undefined;
            activeIdempotencyKey = createProviderIdempotencyKey('checkout', [
                product.user_id,
                product.id,
                sessionId,
                normalizedPaymentMethod,
            ]);
            const requestHash = hashPaymentRequest({
                seller_id: product.user_id,
                product_id: product.id,
                session_id: sessionId,
                payment_method: normalizedPaymentMethod,
                amount: totalCents,
                buyer_name: String(buyer.name || '').trim(),
                buyer_email: String(buyer.email || '').trim().toLowerCase(),
                buyer_document: String(buyer.cpf || '').replace(/\D/g, ''),
                buyer_phone: String(buyer.phone || '').replace(/\D/g, ''),
                buyer_address: buyer.address || null,
                installments: cardInstallments,
                items: pagarmeItems,
                affiliate_click_id: affiliateAttribution?.clickId || null,
            });
            const paymentAttempt = await beginPaymentAttempt({
                idempotencyKey: activeIdempotencyKey,
                scope: 'checkout',
                requestHash,
                localReferenceId: orderId,
            });
            if (paymentAttempt.state === 'completed') {
                return jsonSuccess(paymentAttempt.response, 200);
            }
            if (paymentAttempt.state === 'in_progress') {
                return jsonError('Este pagamento ja esta sendo processado. Aguarde alguns segundos.', 409);
            }
            if (paymentAttempt.state === 'conflict') {
                return jsonError('Esta sessao de checkout ja foi usada com outros dados. Recarregue a pagina.', 409);
            }
            orderId = paymentAttempt.attempt.local_reference_id;
            const { data: recoveredOrder } = await supabase
                .from('orders')
                .select('*')
                .eq('id', orderId)
                .maybeSingle();
            if (recoveredOrder?.pagarme_order_id) {
                await syncOrderAffiliateCommission(recoveredOrder, recoveredOrder.status);
                const { error: recoveredSaleError } = await supabase
                    .from('transactions')
                    .upsert({
                        user_id: product.user_id,
                        order_id: recoveredOrder.id,
                        type: 'sale',
                        amount: recoveredOrder.amount,
                        status: recoveredOrder.status === 'paid' ? 'confirmed' : 'pending',
                        description: `Venda: ${product.name}${selectedPlan ? ` - ${selectedPlan.name}` : ''}`,
                        provider_event_key: `order-sale:${recoveredOrder.id}`,
                    }, { onConflict: 'provider_event_key' });
                if (recoveredSaleError) throw recoveredSaleError;
                const recoveredResponse: Record<string, unknown> = {
                    order: {
                        id: recoveredOrder.id,
                        status: recoveredOrder.status,
                        amount_display: recoveredOrder.amount_display,
                        payment_method: recoveredOrder.payment_method,
                    },
                };
                if (recoveredOrder.payment_method === 'pix') {
                    recoveredResponse.pix = {
                        qr_code: recoveredOrder.pix_qr_code,
                        qr_code_url: recoveredOrder.pix_qr_code_url,
                        expires_at: recoveredOrder.pix_expires_at,
                    };
                } else {
                    recoveredResponse.card = {
                        last_digits: recoveredOrder.card_last_digits,
                        brand: recoveredOrder.card_brand,
                        installments: recoveredOrder.installments,
                    };
                }
                await completePaymentAttempt(
                    activeIdempotencyKey,
                    recoveredOrder.pagarme_order_id,
                    recoveredResponse,
                );
                return jsonSuccess(recoveredResponse, 200);
            }
            pagarmeOrder = await PagarmeService.createOrder({
                amount: totalCents,
                payment_method: normalizedPaymentMethod,
                customer: buyer,
                card_token: normalizedPaymentMethod === 'credit_card' ? card_token : undefined,
                installments: normalizedPaymentMethod === 'credit_card' ? cardInstallments || 1 : undefined,
                seller_recipient_id: recipient.pagarme_recipient_id,
                platform_fee_percentage: feePercentage,
                platform_fee_amount: normalizedPaymentMethod === 'pix' && (
                    sellerUser.role !== 'admin' || affiliateAttribution
                )
                    ? appliedPlatformFeeAmount
                    : undefined,
                affiliate_recipient_id: affiliateAttribution?.recipientId,
                affiliate_commission_amount: affiliateAttribution?.commissionAmount,
                metadata: affiliateAttribution ? {
                    affiliate_program_id: affiliateAttribution.programId,
                    affiliate_id: affiliateAttribution.affiliateId,
                } : undefined,
                ip,
                session_id: sessionId,
                device_platform: devicePlatform,
                order_code: orderId,
                idempotency_key: activeIdempotencyKey,
                three_ds_transaction_id: normalizedPaymentMethod === 'credit_card' ? threeDsTransactionId : undefined,
                items: pagarmeItems
            });
        } catch (pagarmeErr: any) {
            if (activeIdempotencyKey) await failPaymentAttempt(activeIdempotencyKey, pagarmeErr);
            const errorBody = pagarmeErr.response?.data;
            const providerStatus = pagarmeErr.response?.status;
            const providerMessage = String(errorBody?.message || pagarmeErr.message || '');
            const cardFailure = normalizedPaymentMethod === 'credit_card'
                ? classifyCardProviderRequestError(pagarmeErr)
                : null;
            console.error('[CHECKOUT] Provider request failed:', {
                status: providerStatus,
                message: providerMessage.slice(0, 300),
                payment_method: normalizedPaymentMethod,
                card_failure_category: cardFailure?.category,
            });

            if (cardFailure) {
                return jsonError(cardFailure.message, 400);
            }
            return jsonError('Nao foi possivel processar o pagamento agora. Confira os dados e tente novamente.', 400);
        }

        const charge = pagarmeOrder.charges?.[0];

        // --- ERROR DETECTION ---
        if (isPagarmePaymentFailed(pagarmeOrder)) {
            if (activeIdempotencyKey) {
                await failPaymentAttempt(activeIdempotencyKey, new Error('Pagamento recusado pelo provedor.'));
            }
            if (normalizedPaymentMethod !== 'credit_card') {
                console.error('[CHECKOUT PIX] Payment failed:', {
                    pagarme_order_id: pagarmeOrder?.id,
                    charge_id: charge?.id,
                    charge_status: charge?.status,
                    order_status: pagarmeOrder?.status,
                });
                return jsonError('Nao foi possivel gerar o pagamento agora. Tente novamente.', 400);
            }
            const failure = classifyCardPaymentFailure(pagarmeOrder);
            console.error('[CHECKOUT CARD] Payment declined:', failure.diagnostics);
            return jsonError(failure.message, 400);
        }

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
        const { error: orderInsertError } = await supabase.from('orders').insert({
            id: orderId, seller_id: product.user_id, product_id: product.id,
            buyer_name: buyer.name, buyer_email: buyer.email, buyer_cpf: buyer.cpf,
            buyer_phone: buyer.phone?.replace(/\D/g, ''),
            amount: totalCents,
            platform_fee_amount: appliedPlatformFeeAmount,
            payment_method: normalizedPaymentMethod, status: charge?.status === 'paid' ? 'paid' : 'pending',
            pagarme_order_id: pagarmeOrder.id, pagarme_charge_id: charge?.id,
            pix_qr_code: pix?.qr_code,
            pix_qr_code_url: pix?.qr_code_url,
            pix_expires_at: pix?.expires_at,
            card_last_digits: normalizedPaymentMethod === 'credit_card' ? charge?.last_transaction?.card?.last_four_digits : null,
            card_brand: normalizedPaymentMethod === 'credit_card' ? charge?.last_transaction?.card?.brand : null,
            installments: normalizedPaymentMethod === 'credit_card' ? cardInstallments : 1,
            facebook_event_id: orderId,
            facebook_fbp: typeof facebook.fbp === 'string' ? facebook.fbp : null,
            facebook_fbc: typeof facebook.fbc === 'string' ? facebook.fbc : null,
            client_ip: clientIp,
            client_user_agent: clientUserAgent,
            checkout_idempotency_key: activeIdempotencyKey,
            ...(charge?.status === 'paid' ? {
                paid_processing_token: activeIdempotencyKey,
                paid_processing_started_at: new Date().toISOString(),
            } : {}),
            ...affiliateOrderSnapshot(affiliateAttribution),
        });
        if (orderInsertError) throw orderInsertError;

        if (affiliateAttribution) {
            await recordOrderAffiliateCommission({
                orderId,
                producerId: product.user_id,
                productId: product.id,
                grossAmount: totalCents,
                platformFeeAmount: appliedPlatformFeeAmount,
                orderStatus: charge?.status === 'paid' ? 'paid' : 'pending',
                attribution: affiliateAttribution,
            });
        }

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
        const { error: saleTransactionError } = await supabase.from('transactions').upsert({
            id: uuidv4(), user_id: product.user_id, order_id: orderId,
            type: 'sale', amount: totalCents,
            status: charge?.status === 'paid' ? 'confirmed' : 'pending',
            description: `Venda: ${product.name}${selectedPlan ? ` - ${selectedPlan.name}` : ''}`,
            provider_event_key: `order-sale:${orderId}`,
        }, { onConflict: 'provider_event_key' });
        if (saleTransactionError) throw saleTransactionError;

        // If paid immediately, create fee transaction and update sales count
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

            const feeAmount = appliedPlatformFeeAmount;
            if (feeAmount > 0) {
                const { error: feeTransactionError } = await supabase.from('transactions').upsert({
                    id: uuidv4(), user_id: product.user_id, order_id: orderId,
                    type: 'fee', amount: feeAmount,
                    status: 'confirmed',
                    description: `Taxa de plataforma (${appliedFeeLabel}) - Pedido ${orderId}`,
                    provider_event_key: `order-fee:${orderId}`,
                }, { onConflict: 'provider_event_key' });
                if (feeTransactionError) throw feeTransactionError;
            }

            const { count: paidSalesCount } = await supabase
                .from('orders')
                .select('id', { count: 'exact', head: true })
                .eq('product_id', product.id)
                .eq('status', 'paid');
            await supabase.from('products')
                .update({ sales_count: paidSalesCount || 0 })
                .eq('id', product.id);

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

            try {
                await sendApprovedSaleNotification({
                    orderId,
                    sellerId: product.user_id,
                    amountCents: totalCents,
                    platformFeeAmountCents: appliedPlatformFeeAmount,
                    affiliate: affiliateAttribution ? {
                        userId: affiliateAttribution.affiliateId,
                        commissionAmountCents: affiliateAttribution.commissionAmount,
                    } : null,
                    paymentMethod: normalizedPaymentMethod,
                    productName: product.name,
                    customerName: buyer.name,
                    imageUrl: product.image_url,
                    url: '/dashboard',
                });
            } catch (notificationError) {
                console.error('[CHECKOUT] Approved sale notification error:', notificationError);
            }
            const { error: paidProcessedError } = await supabase
                .from('orders')
                .update({
                    paid_processed_at: new Date().toISOString(),
                    paid_processing_token: null,
                })
                .eq('id', orderId)
                .eq('paid_processing_token', activeIdempotencyKey);
            if (paidProcessedError) throw paidProcessedError;
        }

        // Build response
        const response: any = {
            order: {
                id: orderId,
                status: charge?.status || 'pending',
                amount_display: amountDisplay,
                payment_method: normalizedPaymentMethod,
            }
        };

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
                if (activeIdempotencyKey) {
                    await failPaymentAttempt(activeIdempotencyKey, new Error('Pagar.me nao retornou o QR Code.'));
                }
                return jsonError('O pedido foi gerado, mas o Pagar.me não retornou o QR Code.', 502);
            }
        }

        if (normalizedPaymentMethod === 'credit_card') {
            response.card = {
                last_digits: charge?.last_transaction?.card?.last_four_digits || null,
                brand: charge?.last_transaction?.card?.brand || null,
                installments: cardInstallments,
            };
        }

        if (activeIdempotencyKey) {
            await completePaymentAttempt(activeIdempotencyKey, pagarmeOrder.id, response);
        }
        return jsonSuccess(response, 201);
    } catch (err: any) {
        if (activeIdempotencyKey) await failPaymentAttempt(activeIdempotencyKey, err);
        const errorData = err.response?.data || err.message;
        console.error('Checkout error details:', {
            error: typeof errorData === 'string' ? errorData.slice(0, 500) : 'provider_error',
            stack: err.stack,
        });

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
