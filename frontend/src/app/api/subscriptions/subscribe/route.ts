import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { jsonError, jsonSuccess } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { CARD_PLATFORM_FEE_PERCENTAGE, PagarmeService } from '@/lib/pagarme';
import {
    affiliateOrderSnapshot,
    recordSubscriptionInitialCommission,
    resolveAffiliateAttribution,
    type AffiliateAttribution,
} from '@/lib/affiliates';
import { calculateAffiliatePlatformFee, normalizeAffiliateReference } from '@/lib/affiliates-core';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
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
                attributionToken: affiliateReference || undefined,
            })
            : null;
        let affiliateAttribution: AffiliateAttribution | null = await resolveAttributionForFee(platformFeeAmount);
        if (affiliateReference && !affiliateAttribution) {
            return jsonError('Nao foi possivel validar este link de afiliado. Abra novamente o link antes de pagar.', 409);
        }
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
        });

        if (pagarmeSub.status === 'canceled' || pagarmeSub.status === 'failed') {
            return jsonError('Assinatura recusada pelo gateway. Verifique os dados do cartão.', 400);
        }

        // Calcula próximo período
        const now = new Date();
        const periodEnd = new Date(now);
        if (plan.interval === 'month') periodEnd.setMonth(periodEnd.getMonth() + (plan.interval_count || 1));
        else if (plan.interval === 'week') periodEnd.setDate(periodEnd.getDate() + 7 * (plan.interval_count || 1));
        else if (plan.interval === 'year') periodEnd.setFullYear(periodEnd.getFullYear() + (plan.interval_count || 1));

        // Salva assinatura no banco
        const { data: subscription, error } = await supabase.from('subscriptions').insert({
            id: uuidv4(),
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
            ...affiliateOrderSnapshot(affiliateAttribution),
            ...(affiliateAttribution ? {
                affiliate_commission_on_renewals: affiliateAttribution.commissionOnRenewals,
                affiliate_hold_days: affiliateAttribution.holdDays,
            } : {}),
        }).select().single();

        if (error) return jsonError('Erro ao salvar assinatura: ' + error.message);

        if (affiliateAttribution) {
            try {
                await recordSubscriptionInitialCommission({
                    subscriptionId: subscription.id,
                    producerId: plan.user_id,
                    productId: plan.product_id,
                    grossAmount: plan.amount,
                    platformFeeAmount,
                    subscriptionStatus: subscription.status,
                    attribution: affiliateAttribution,
                });
            } catch (affiliateError) {
                console.error('[AFFILIATES] Failed to persist initial subscription commission:', affiliateError);
            }
        }

        return jsonSuccess({
            subscription,
            pagarme_status: pagarmeSub.status
        }, 201);
    } catch (err: any) {
        const msg = err.response?.data?.message || err.message;
        console.error('Subscribe error:', err.response?.data || err.message);
        return jsonError('Erro ao criar assinatura: ' + msg, 500);
    }
}
