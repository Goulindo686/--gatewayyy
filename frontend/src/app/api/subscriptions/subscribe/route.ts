import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { jsonError, jsonSuccess } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { CARD_PLATFORM_FEE_PERCENTAGE, PagarmeService } from '@/lib/pagarme';
import {
    affiliateOrderSnapshot,
    recordSubscriptionInitialCommission,
    resolveAffiliateAttribution,
    syncInitialSubscriptionAffiliateCommission,
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
        const ip =
            req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
            req.headers.get('x-real-ip') ||
            'unknown';

        const rlIp = await checkRateLimit({ key: `subscriptions:subscribe:ip:${ip}`, limit: 10, windowSecs: 3600, failOpen: false });
        if (!rlIp.allowed) return rateLimitResponse(rlIp.resetAt);

        const body = await req.json();
        const { plan_id, customer, card, address } = body;
        const affiliateReferenceProvided = typeof body.affiliate_ref === 'string'
            && body.affiliate_ref.trim().length > 0;
        const affiliateReference = normalizeAffiliateReference(body.affiliate_ref);
        if (affiliateReferenceProvided && !affiliateReference) {
            return jsonError('Link de afiliado invalido. Abra novamente o link recebido antes de pagar.', 400);
        }

        if (!plan_id || !customer?.name || !customer?.email || !customer?.cpf)
            return jsonError('Dados incompletos');
        if (!card?.number || !card?.holder_name || !card?.exp_month || !card?.exp_year || !card?.cvv)
            return jsonError('Dados do cartão incompletos');

        const normalizedEmail = String(customer.email).toLowerCase().trim();
        const rlEmail = await checkRateLimit({ key: `subscriptions:subscribe:email:${normalizedEmail}`, limit: 3, windowSecs: 3600, failOpen: false });
        if (!rlEmail.allowed) return rateLimitResponse(rlEmail.resetAt);

        // Busca o plano
        const { data: plan } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('id', plan_id)
            .eq('status', 'active')
            .single();

        if (!plan) return jsonError('Plano não encontrado', 404);
        if (!plan.pagarme_plan_id) return jsonError('Plano não configurado no gateway', 400);

        const { data: sellerUser, error: sellerUserErr } = await supabase
            .from('users')
            .select('status, role')
            .eq('id', plan.user_id)
            .single();

        if (sellerUserErr || !sellerUser) return jsonError('Vendedor não encontrado', 404);
        if (sellerUser.status === 'blocked') return jsonError('Conta do vendedor está bloqueada. Não é possível criar assinatura.', 403);

        // Busca recipient do vendedor
        const { data: recipient } = await supabase
            .from('recipients').select('pagarme_recipient_id').eq('user_id', plan.user_id).single();
        if (!recipient) return jsonError('Vendedor não configurado para receber', 400);

        // Cartão sempre usa split de 2% para a GouPay; apenas contas admin são isentas.
        let feePercentage = sellerUser.role === 'admin' ? 0 : CARD_PLATFORM_FEE_PERCENTAGE;
        let platformFeeAmount = PagarmeService.calculatePlatformFeeCents({
            amountCents: plan.amount,
            paymentMethod: 'credit_card',
            feePercentage,
        });
        const resolveAttributionForFee = (feeAmount: number) => plan.product_id
            ? resolveAffiliateAttribution({
                req,
                productId: plan.product_id,
                producerId: plan.user_id,
                grossAmount: plan.amount,
                platformFeeAmount: feeAmount,
                buyerEmail: customer.email,
                buyerDocument: customer.cpf,
                buyerPhone: customer.phone,
                attributionToken: affiliateReference || undefined,
            })
            : null;
        let affiliateAttribution: AffiliateAttribution | null = await resolveAttributionForFee(platformFeeAmount);
        if (affiliateAttribution) {
            const affiliatePlatformFeeAmount = calculateAffiliatePlatformFee({
                grossAmount: plan.amount,
                currentPlatformFeeAmount: platformFeeAmount,
                paymentMethod: 'credit_card',
            });
            if (affiliatePlatformFeeAmount !== platformFeeAmount) {
                const repricedAttribution = await resolveAttributionForFee(affiliatePlatformFeeAmount);
                if (repricedAttribution) {
                    affiliateAttribution = repricedAttribution;
                    platformFeeAmount = affiliatePlatformFeeAmount;
                    feePercentage = CARD_PLATFORM_FEE_PERCENTAGE;
                } else {
                    return jsonError('Nao foi possivel calcular a divisao desta venda de afiliado. Tente novamente.', 409);
                }
            }
        }
        const platformRecipientId = String(process.env.PLATFORM_RECIPIENT_ID || '').trim().toLowerCase();
        const sellerRecipientId = String(recipient.pagarme_recipient_id || '').trim().toLowerCase();
        const affiliateRecipientId = String(affiliateAttribution?.recipientId || '').trim().toLowerCase();
        if (affiliateAttribution && (
            affiliateRecipientId === sellerRecipientId
            || (platformRecipientId && affiliateRecipientId === platformRecipientId)
        )) {
            console.error('[AFFILIATES] Subscription recipient conflict; checkout blocked.');
            return jsonError('Os recebedores desta venda de afiliado estao em conflito. Corrija as contas antes de pagar.', 409);
        }

        const requestedSessionId = String(body.checkout_session_id || '');
        if (!/^[a-zA-Z0-9-]{8,64}$/.test(requestedSessionId)) {
            return jsonError('Sessao de assinatura invalida. Recarregue a pagina e tente novamente.', 400);
        }
        const sessionId = requestedSessionId;
        let localSubscriptionId = uuidv4();
        activeIdempotencyKey = createProviderIdempotencyKey('subscription', [
            plan.user_id,
            plan.id,
            sessionId,
        ]);
        const requestHash = hashPaymentRequest({
            seller_id: plan.user_id,
            plan_id: plan.id,
            session_id: sessionId,
            amount: plan.amount,
            buyer_name: String(customer.name || '').trim(),
            buyer_email: normalizedEmail,
            buyer_document: String(customer.cpf || '').replace(/\D/g, ''),
            buyer_phone: String(customer.phone || '').replace(/\D/g, ''),
            buyer_address: address || null,
            card: {
                number: String(card.number || '').replace(/\D/g, ''),
                holder_name: card.holder_name,
                exp_month: card.exp_month,
                exp_year: card.exp_year,
                cvv: card.cvv,
            },
            affiliate_click_id: affiliateAttribution?.clickId || null,
        });
        const paymentAttempt = await beginPaymentAttempt({
            idempotencyKey: activeIdempotencyKey,
            scope: 'subscription',
            requestHash,
            localReferenceId: localSubscriptionId,
        });
        if (paymentAttempt.state === 'completed') {
            return jsonSuccess(paymentAttempt.response, 200);
        }
        if (paymentAttempt.state === 'in_progress') {
            return jsonError('Esta assinatura ja esta sendo processada. Aguarde alguns segundos.', 409);
        }
        if (paymentAttempt.state === 'conflict') {
            return jsonError('Esta sessao de assinatura ja foi usada com outros dados. Recarregue a pagina.', 409);
        }
        localSubscriptionId = paymentAttempt.attempt.local_reference_id;
        const { data: recoveredSubscription } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('id', localSubscriptionId)
            .maybeSingle();
        if (recoveredSubscription?.pagarme_subscription_id) {
            await syncInitialSubscriptionAffiliateCommission(
                recoveredSubscription.id,
                recoveredSubscription.status === 'active'
                    ? 'active'
                    : ['failed', 'canceled', 'cancelled'].includes(recoveredSubscription.status)
                        ? 'failed'
                        : 'pending',
                recoveredSubscription.affiliate_hold_days || 0,
            );
            const recoveredResponse = {
                subscription: recoveredSubscription,
                pagarme_status: recoveredSubscription.status,
            };
            await completePaymentAttempt(
                activeIdempotencyKey,
                recoveredSubscription.pagarme_subscription_id,
                recoveredResponse,
            );
            return jsonSuccess(recoveredResponse, 200);
        }

        // Cria assinatura no Pagar.me
        const pagarmeSub = await PagarmeService.createSubscription({
            plan_id: plan.pagarme_plan_id,
            customer,
            card,
            address,
            seller_recipient_id: recipient.pagarme_recipient_id,
            platform_fee_percentage: feePercentage,
            amount: plan.amount,
            affiliate_recipient_id: affiliateAttribution?.recipientId,
            affiliate_commission_amount: affiliateAttribution?.commissionAmount,
            idempotency_key: activeIdempotencyKey,
        });

        if (pagarmeSub.status === 'canceled' || pagarmeSub.status === 'failed') {
            await failPaymentAttempt(activeIdempotencyKey, new Error('Assinatura recusada pelo gateway.'));
            return jsonError('Assinatura recusada pelo gateway. Verifique os dados do cartão.', 400);
        }

        // Calcula próximo período
        const now = new Date();
        const periodEnd = new Date(now);
        if (plan.interval === 'month') periodEnd.setMonth(periodEnd.getMonth() + (plan.interval_count || 1));
        else if (plan.interval === 'week') periodEnd.setDate(periodEnd.getDate() + 7 * (plan.interval_count || 1));
        else if (plan.interval === 'year') periodEnd.setFullYear(periodEnd.getFullYear() + (plan.interval_count || 1));

        const initialCycleReference = pagarmeSub?.current_cycle?.id
            || pagarmeSub?.current_cycle?.start_at
            || pagarmeSub?.cycle?.id
            || null;
        const initialPaymentId = pagarmeSub?.current_cycle?.charge?.id
            || pagarmeSub?.current_cycle?.invoice?.charge?.id
            || pagarmeSub?.charge?.id
            || pagarmeSub?.invoice?.charge?.id
            || null;

        // Salva assinatura no banco
        const { data: insertedSubscription, error } = await supabase.from('subscriptions').insert({
            id: localSubscriptionId,
            seller_id: plan.user_id,
            subscription_plan_id: plan.id,
            pagarme_subscription_id: pagarmeSub.id,
            pagarme_plan_id: plan.pagarme_plan_id,
            customer_name: customer.name,
            customer_email: customer.email.toLowerCase().trim(),
            customer_cpf: customer.cpf.replace(/\D/g, ''),
            amount: plan.amount,
            status: pagarmeSub.status === 'active' ? 'active' : 'pending',
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            checkout_idempotency_key: activeIdempotencyKey,
            affiliate_initial_cycle_reference: initialCycleReference,
            affiliate_initial_payment_id: initialPaymentId,
            ...affiliateOrderSnapshot(affiliateAttribution),
            ...(affiliateAttribution ? {
                // A Pagar.me reaplica o split da assinatura em todos os ciclos.
                affiliate_commission_on_renewals: true,
                affiliate_hold_days: affiliateAttribution.holdDays,
            } : {}),
        }).select().single();

        let subscription = insertedSubscription;
        if (error?.code === '23505') {
            const { data: existingSubscription } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('pagarme_subscription_id', pagarmeSub.id)
                .maybeSingle();
            subscription = existingSubscription;
        } else if (error) {
            throw error;
        }
        if (!subscription) throw new Error('Nao foi possivel salvar a assinatura.');

        if (affiliateAttribution) {
            await recordSubscriptionInitialCommission({
                subscriptionId: subscription.id,
                producerId: plan.user_id,
                productId: plan.product_id,
                grossAmount: plan.amount,
                platformFeeAmount,
                subscriptionStatus: subscription.status,
                attribution: affiliateAttribution,
                providerPaymentId: initialPaymentId,
            });
        }

        const response = {
            subscription,
            pagarme_status: pagarmeSub.status
        };
        await completePaymentAttempt(activeIdempotencyKey, pagarmeSub.id, response);
        return jsonSuccess(response, 201);
    } catch (err: any) {
        if (activeIdempotencyKey) await failPaymentAttempt(activeIdempotencyKey, err);
        const msg = err.response?.data?.message || err.message;
        console.error('Subscribe error:', err.response?.data || err.message);
        return jsonError('Erro ao criar assinatura: ' + msg, 500);
    }
}
