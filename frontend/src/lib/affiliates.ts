import 'server-only';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createHash, randomBytes } from 'crypto';
import type { NextRequest } from 'next/server';
import { fetchAll, supabase } from '@/lib/db';
import { PagarmeService } from '@/lib/pagarme';
import {
    affiliateCommissionStatusForOrder,
    calculateAffiliateCommission,
    normalizeAffiliateReference,
    normalizeAffiliateRateBps,
    summarizeAffiliateBalance,
} from '@/lib/affiliates-core';
import type { AffiliateBalanceCommission } from '@/lib/affiliates-core';

export type AffiliateAttribution = {
    affiliateId: string;
    programId: string;
    affiliationId: string;
    clickId: string;
    recipientId: string;
    commissionRateBps: number;
    commissionBaseAmount: number;
    commissionAmount: number;
    eligibleGrossAmount: number;
    eligiblePlatformFeeAmount: number;
    sellerAmount: number;
    holdDays: number;
    commissionOnRenewals: boolean;
    termsVersion: number;
    chargebackLiable: boolean;
};

type ResolveAffiliateAttributionInput = {
    req: NextRequest;
    productId: string;
    producerId: string;
    grossAmount: number;
    platformFeeAmount: number;
    eligibleGrossAmount?: number;
    allowCommissionOnBumps?: boolean;
    buyerEmail?: string;
    buyerDocument?: string;
    buyerPhone?: string;
    attributionToken?: string;
};

type CommissionSnapshot = {
    affiliate_id?: string | null;
    affiliate_program_id?: string | null;
    affiliate_affiliation_id?: string | null;
    affiliate_click_id?: string | null;
    affiliate_recipient_id?: string | null;
    affiliate_commission_rate_bps?: number | null;
    affiliate_commission_base_amount?: number | null;
    affiliate_commission_amount?: number | null;
    affiliate_hold_days?: number | null;
    affiliate_terms_version?: number | null;
    affiliate_chargeback_liable?: boolean | null;
};

export function affiliateCookieName(productId: string) {
    return `gp_aff_${String(productId).replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

export function hashAffiliateValue(value: string) {
    return createHash('sha256').update(value).digest('hex');
}

export function createAffiliateToken() {
    return randomBytes(32).toString('base64url');
}

export function createAffiliateCode() {
    return randomBytes(9).toString('base64url');
}

export function safeAffiliateDestination(path: unknown, productId: string) {
    const normalized = String(path || '').trim();
    if (
        normalized.startsWith('/')
        && !normalized.startsWith('//')
        && !normalized.includes('\\')
        && !/[\u0000-\u001f\u007f]/.test(normalized)
        && (
            normalized === `/checkout/${productId}`
            || normalized.startsWith(`/checkout/${productId}?`)
        )
    ) {
        return normalized;
    }
    return `/checkout/${productId}`;
}

export async function ensureAffiliatePayoutControl(userId: string, recipientId?: string) {
    const { data: recipientRows, error: recipientError } = await supabase
        .from('recipients')
        .select('id, pagarme_recipient_id, affiliate_payout_controlled_at')
        .eq('user_id', userId)
        .not('pagarme_recipient_id', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(1);
    if (recipientError) throw recipientError;

    const recipient = recipientRows?.[0];
    if (!recipient?.pagarme_recipient_id) {
        throw new Error('Recebedor do afiliado nao encontrado.');
    }
    if (recipientId && recipient.pagarme_recipient_id !== recipientId) {
        throw new Error('Recebedor do afiliado foi alterado. Tente novamente.');
    }
    if (recipient.affiliate_payout_controlled_at) return recipient;

    try {
        await PagarmeService.updateRecipientTransferSettings(recipient.pagarme_recipient_id, {
            transfer_enabled: false,
        });
        const now = new Date().toISOString();
        const { error } = await supabase
            .from('recipients')
            .update({
                affiliate_payout_controlled_at: now,
                affiliate_payout_control_error: null,
            })
            .eq('id', recipient.id);
        if (error) throw error;
        return { ...recipient, affiliate_payout_controlled_at: now };
    } catch (error) {
        await supabase
            .from('recipients')
            .update({
                affiliate_payout_control_error: error instanceof Error
                    ? error.message.slice(0, 1000)
                    : 'Falha ao proteger repasses do afiliado',
            })
            .eq('id', recipient.id);
        throw error;
    }
}

export async function getAffiliateWithdrawalReserve(userId: string) {
    await promoteAvailableAffiliateCommissions(userId);
    const { data, error } = await supabase
        .from('affiliate_commissions')
        .select('status, commission_amount, risk_reserve_amount, risk_reserve_released_at')
        .eq('affiliate_id', userId)
        .or('status.eq.approved,risk_reserve_amount.gt.0');
    if (error) {
        if (isMissingAffiliateSchema(error)) return { heldAmount: 0, riskAmount: 0, total: 0 };
        throw error;
    }

    const heldAmount = (data || [])
        .filter((row: any) => row.status === 'approved')
        .reduce((sum: number, row: any) => sum + Math.max(0, Number(row.commission_amount || 0)), 0);
    const riskAmount = (data || [])
        .filter((row: any) => !row.risk_reserve_released_at)
        .reduce((sum: number, row: any) => sum + Math.max(0, Number(row.risk_reserve_amount || 0)), 0);
    return { heldAmount, riskAmount, total: heldAmount + riskAmount };
}

export async function getAffiliateBalanceSummary(userId: string) {
    await promoteAvailableAffiliateCommissions(userId);

    try {
        const commissions = await fetchAll<AffiliateBalanceCommission>(
            supabase
                .from('affiliate_commissions')
                .select(
                    'status, commission_amount, available_at, risk_reserve_amount, risk_reserve_released_at',
                )
                .eq('affiliate_id', userId)
                .order('created_at', { ascending: false }),
        );
        return summarizeAffiliateBalance(commissions);
    } catch (error) {
        if (isMissingAffiliateSchema(error)) return summarizeAffiliateBalance([]);
        throw error;
    }
}

function availableAtFromHoldDays(holdDays: number) {
    const availableAt = new Date();
    availableAt.setUTCDate(availableAt.getUTCDate() + Math.max(0, Math.trunc(holdDays || 0)));
    return availableAt.toISOString();
}

function commissionLifecycle(status: string, holdDays: number) {
    const now = new Date().toISOString();
    if (status === 'approved' || status === 'available') {
        return {
            status,
            approved_at: now,
            available_at: status === 'available' ? now : availableAtFromHoldDays(holdDays),
            reversed_at: null,
            reversal_reason: null,
        };
    }
    if (status === 'refunded' || status === 'chargeback' || status === 'failed' || status === 'cancelled') {
        return {
            status,
            reversed_at: now,
            reversal_reason: status,
        };
    }
    return { status: 'pending' };
}

function isMissingAffiliateSchema(error: any) {
    const code = String(error?.code || '');
    const message = String(error?.message || '');
    return code === '42P01'
        || code === '42703'
        || code === 'PGRST204'
        || code === 'PGRST205'
        || /affiliate_(programs|clicks|affiliations|links|commissions)/i.test(message) && /does not exist|schema cache/i.test(message);
}

export async function resolveAffiliateAttribution(
    input: ResolveAffiliateAttributionInput,
): Promise<AffiliateAttribution | null> {
    const cookieToken = normalizeAffiliateReference(
        input.req.cookies.get(affiliateCookieName(input.productId))?.value,
    );
    const rawToken = cookieToken || normalizeAffiliateReference(input.attributionToken);
    if (!rawToken) return null;

    try {
        const { data: click, error: clickError } = await supabase
            .from('affiliate_clicks')
            .select('id, link_id, program_id, affiliation_id, affiliate_id, product_id, expires_at')
            .eq('token_hash', hashAffiliateValue(rawToken))
            .eq('product_id', input.productId)
            .gt('expires_at', new Date().toISOString())
            .maybeSingle();

        if (clickError) {
            if (isMissingAffiliateSchema(clickError)) return null;
            throw clickError;
        }
        if (!click || click.affiliate_id === input.producerId) return null;

        const [{ data: program }, { data: affiliation }, { data: link }, { data: affiliateUser }] = await Promise.all([
            supabase
                .from('affiliate_programs')
                .select('id, producer_id, product_id, status, commission_rate_bps, commission_on_bumps, commission_on_renewals, hold_days, terms_version')
                .eq('id', click.program_id)
                .eq('producer_id', input.producerId)
                .eq('product_id', input.productId)
                .eq('status', 'active')
                .maybeSingle(),
            supabase
                .from('affiliate_affiliations')
                .select('id, affiliate_id, status, custom_commission_rate_bps, accepted_commission_rate_bps, accepted_terms_version, accepted_hold_days, accepted_commission_on_bumps, accepted_commission_on_renewals')
                .eq('id', click.affiliation_id)
                .eq('program_id', click.program_id)
                .eq('affiliate_id', click.affiliate_id)
                .eq('status', 'approved')
                .maybeSingle(),
            supabase
                .from('affiliate_links')
                .select('id, is_active')
                .eq('id', click.link_id)
                .eq('affiliation_id', click.affiliation_id)
                .eq('is_active', true)
                .maybeSingle(),
            supabase
                .from('users')
                .select('id, status, email, cpf_cnpj, phone')
                .eq('id', click.affiliate_id)
                .maybeSingle(),
        ]);

        if (!program || !affiliation || !link || !affiliateUser || affiliateUser.status === 'blocked') return null;
        const buyerEmail = String(input.buyerEmail || '').trim().toLowerCase();
        const affiliateEmail = String(affiliateUser.email || '').trim().toLowerCase();
        const buyerDocument = String(input.buyerDocument || '').replace(/\D/g, '');
        const affiliateDocument = String(affiliateUser.cpf_cnpj || '').replace(/\D/g, '');
        const buyerPhone = String(input.buyerPhone || '').replace(/\D/g, '');
        const affiliatePhone = String(affiliateUser.phone || '').replace(/\D/g, '');
        if ((buyerEmail && affiliateEmail && buyerEmail === affiliateEmail)
            || (buyerDocument && affiliateDocument && buyerDocument === affiliateDocument)
            || (
                buyerPhone.length >= 10
                && affiliatePhone.length >= 10
                && buyerPhone.slice(-10) === affiliatePhone.slice(-10)
            )) {
            console.warn('[AFFILIATES] Self-referral ignored.');
            return null;
        }

        const { data: recipients, error: recipientError } = await supabase
            .from('recipients')
            .select('pagarme_recipient_id, status, updated_at')
            .eq('user_id', click.affiliate_id)
            .not('pagarme_recipient_id', 'is', null)
            .order('updated_at', { ascending: false })
            .limit(1);

        if (recipientError) throw recipientError;
        const recipient = recipients?.[0];
        if (!recipient?.pagarme_recipient_id || recipient.status === 'refused' || recipient.status === 'suspended') {
            return null;
        }
        await ensureAffiliatePayoutControl(click.affiliate_id, recipient.pagarme_recipient_id);

        const grossAmount = Math.max(0, Math.round(Number(input.grossAmount) || 0));
        const platformFeeAmount = Math.min(grossAmount, Math.max(0, Math.round(Number(input.platformFeeAmount) || 0)));
        const commissionOnBumps = affiliation.accepted_commission_on_bumps
            ?? program.commission_on_bumps;
        const requestedEligibleGross = commissionOnBumps && input.allowCommissionOnBumps !== false
            ? grossAmount
            : Math.max(0, Math.round(Number(input.eligibleGrossAmount ?? grossAmount) || 0));
        const eligibleGrossAmount = Math.min(grossAmount, requestedEligibleGross);
        const eligiblePlatformFeeAmount = grossAmount > 0
            ? Math.min(eligibleGrossAmount, Math.round(platformFeeAmount * (eligibleGrossAmount / grossAmount)))
            : 0;
        const commissionRateBps = normalizeAffiliateRateBps(
            affiliation.accepted_commission_rate_bps
                ?? affiliation.custom_commission_rate_bps
                ?? program.commission_rate_bps,
        );
        const commission = calculateAffiliateCommission({
            grossAmount: eligibleGrossAmount,
            platformFeeAmount: eligiblePlatformFeeAmount,
            commissionRateBps,
        });

        if (commission.commissionAmount <= 0) return null;

        return {
            affiliateId: click.affiliate_id,
            programId: click.program_id,
            affiliationId: click.affiliation_id,
            clickId: click.id,
            recipientId: recipient.pagarme_recipient_id,
            commissionRateBps,
            commissionBaseAmount: commission.commissionBaseAmount,
            commissionAmount: commission.commissionAmount,
            eligibleGrossAmount,
            eligiblePlatformFeeAmount,
            sellerAmount: grossAmount - platformFeeAmount - commission.commissionAmount,
            holdDays: Math.max(
                0,
                Math.trunc(affiliation.accepted_hold_days ?? program.hold_days ?? 0),
            ),
            commissionOnRenewals: Boolean(
                affiliation.accepted_commission_on_renewals
                ?? program.commission_on_renewals,
            ),
            termsVersion: Math.max(
                1,
                Math.trunc(affiliation.accepted_terms_version || program.terms_version || 1),
            ),
            chargebackLiable: true,
        };
    } catch (error) {
        if (isMissingAffiliateSchema(error)) return null;
        console.error('[AFFILIATES] Attribution lookup failed:', error);
        return null;
    }
}

export function affiliateOrderSnapshot(attribution: AffiliateAttribution | null) {
    if (!attribution) return {};
    return {
        affiliate_id: attribution.affiliateId,
        affiliate_program_id: attribution.programId,
        affiliate_affiliation_id: attribution.affiliationId,
        affiliate_click_id: attribution.clickId,
        affiliate_recipient_id: attribution.recipientId,
        affiliate_commission_rate_bps: attribution.commissionRateBps,
        affiliate_commission_base_amount: attribution.commissionBaseAmount,
        affiliate_commission_amount: attribution.commissionAmount,
        affiliate_hold_days: attribution.holdDays,
        affiliate_terms_version: attribution.termsVersion,
        affiliate_chargeback_liable: attribution.chargebackLiable,
    };
}

export async function recordOrderAffiliateCommission(input: {
    orderId: string;
    producerId: string;
    productId: string;
    grossAmount: number;
    platformFeeAmount: number;
    orderStatus: string;
    attribution: AffiliateAttribution;
}) {
    const status = affiliateCommissionStatusForOrder(input.orderStatus);
    const values = {
        order_id: input.orderId,
        affiliate_id: input.attribution.affiliateId,
        producer_id: input.producerId,
        product_id: input.productId,
        program_id: input.attribution.programId,
        affiliation_id: input.attribution.affiliationId,
        click_id: input.attribution.clickId,
        source_type: 'order',
        gross_amount: input.grossAmount,
        platform_fee_amount: input.platformFeeAmount,
        commission_base_amount: input.attribution.commissionBaseAmount,
        commission_rate_bps: input.attribution.commissionRateBps,
        commission_amount: input.attribution.commissionAmount,
        payout_recipient_id: input.attribution.recipientId,
        terms_version: input.attribution.termsVersion,
        chargeback_liable: input.attribution.chargebackLiable,
        ...commissionLifecycle(status, input.attribution.holdDays),
    };

    const { error } = await supabase
        .from('affiliate_commissions')
        .upsert(values, { onConflict: 'order_id' });
    if (error) throw error;
}

export async function syncOrderAffiliateCommission(
    order: CommissionSnapshot & { id: string; seller_id: string; product_id?: string | null; amount: number; platform_fee_amount?: number | null },
    orderStatus: string,
) {
    if (!order.affiliate_id || !order.affiliate_commission_amount || !order.affiliate_recipient_id) return;

    const holdDays = Math.max(0, Math.trunc(order.affiliate_hold_days || 0));
    const status = affiliateCommissionStatusForOrder(orderStatus);
    const { data: existing } = await supabase
        .from('affiliate_commissions')
        .select('id, status, risk_reserve_amount')
        .eq('order_id', order.id)
        .maybeSingle();
    const terminalStatuses = ['refunded', 'chargeback', 'failed', 'cancelled'];
    if (status === 'approved' && existing && terminalStatuses.includes(existing.status)) return;
    if (status === 'approved' && existing && ['approved', 'available'].includes(existing.status)) return;
    if (status === 'pending' && existing && existing.status !== 'pending') return;
    const riskReserveAmount = status === 'chargeback'
        && !order.affiliate_chargeback_liable
        && existing
        && ['approved', 'available'].includes(existing.status)
        ? order.affiliate_commission_amount
        : Math.max(0, Number(existing?.risk_reserve_amount || 0));
    const values = {
        order_id: order.id,
        affiliate_id: order.affiliate_id,
        producer_id: order.seller_id,
        product_id: order.product_id || null,
        program_id: order.affiliate_program_id || null,
        affiliation_id: order.affiliate_affiliation_id || null,
        click_id: order.affiliate_click_id || null,
        source_type: 'order',
        gross_amount: order.amount,
        platform_fee_amount: order.platform_fee_amount || 0,
        commission_base_amount: order.affiliate_commission_base_amount || 0,
        commission_rate_bps: order.affiliate_commission_rate_bps || 1,
        commission_amount: order.affiliate_commission_amount,
        payout_recipient_id: order.affiliate_recipient_id,
        terms_version: order.affiliate_terms_version || null,
        chargeback_liable: Boolean(order.affiliate_chargeback_liable),
        risk_reserve_amount: riskReserveAmount,
        ...commissionLifecycle(status, holdDays),
    };
    const { error } = await supabase
        .from('affiliate_commissions')
        .upsert(values, { onConflict: 'order_id' });
    if (error && !isMissingAffiliateSchema(error)) throw error;
}

export async function recordSubscriptionInitialCommission(input: {
    subscriptionId: string;
    producerId: string;
    productId?: string | null;
    grossAmount: number;
    platformFeeAmount: number;
    subscriptionStatus: string;
    attribution: AffiliateAttribution;
    providerPaymentId?: string | null;
}) {
    const status = input.subscriptionStatus === 'active' ? 'approved' : 'pending';
    const values = {
        subscription_id: input.subscriptionId,
        affiliate_id: input.attribution.affiliateId,
        producer_id: input.producerId,
        product_id: input.productId || null,
        program_id: input.attribution.programId,
        affiliation_id: input.attribution.affiliationId,
        click_id: input.attribution.clickId,
        source_type: 'subscription_initial',
        gross_amount: input.grossAmount,
        platform_fee_amount: input.platformFeeAmount,
        commission_base_amount: input.attribution.commissionBaseAmount,
        commission_rate_bps: input.attribution.commissionRateBps,
        commission_amount: input.attribution.commissionAmount,
        payout_recipient_id: input.attribution.recipientId,
        provider_payment_id: input.providerPaymentId || null,
        terms_version: input.attribution.termsVersion,
        chargeback_liable: input.attribution.chargebackLiable,
        ...commissionLifecycle(status, input.attribution.holdDays),
    };

    const { data: existing } = await supabase
        .from('affiliate_commissions')
        .select('id, status')
        .eq('subscription_id', input.subscriptionId)
        .eq('source_type', 'subscription_initial')
        .maybeSingle();
    if (
        existing
        && ['refunded', 'chargeback', 'failed', 'cancelled'].includes(existing.status)
        && (status === 'approved' || status === 'pending')
    ) {
        return;
    }
    const query = existing
        ? supabase.from('affiliate_commissions').update(values).eq('id', existing.id)
        : supabase.from('affiliate_commissions').insert(values);
    const { error } = await query;
    if (error) throw error;
}

export async function recordSubscriptionRenewalCommission(
    subscription: CommissionSnapshot & {
        id: string;
        seller_id: string;
        subscription_plan_id?: string | null;
        amount: number;
        affiliate_commission_on_renewals?: boolean | null;
        affiliate_hold_days?: number | null;
    },
    providerEventId: string,
    providerPaymentId?: string | null,
) {
    if (!subscription.affiliate_id
        || !subscription.affiliate_recipient_id
        || !subscription.affiliate_commission_amount
        || !subscription.affiliate_commission_on_renewals) {
        return;
    }

    let productId: string | null = null;
    if (subscription.subscription_plan_id) {
        const { data: plan } = await supabase
            .from('subscription_plans')
            .select('product_id')
            .eq('id', subscription.subscription_plan_id)
            .maybeSingle();
        productId = plan?.product_id || null;
    }

    const commissionBaseAmount = subscription.affiliate_commission_base_amount || 0;
    const platformFeeAmount = Math.max(0, subscription.amount - commissionBaseAmount);
    const values = {
        subscription_id: subscription.id,
        provider_event_id: providerEventId,
        provider_payment_id: providerPaymentId || null,
        affiliate_id: subscription.affiliate_id,
        producer_id: subscription.seller_id,
        product_id: productId,
        program_id: subscription.affiliate_program_id || null,
        affiliation_id: subscription.affiliate_affiliation_id || null,
        click_id: subscription.affiliate_click_id || null,
        source_type: 'subscription_renewal',
        gross_amount: subscription.amount,
        platform_fee_amount: platformFeeAmount,
        commission_base_amount: commissionBaseAmount,
        commission_rate_bps: subscription.affiliate_commission_rate_bps || 1,
        commission_amount: subscription.affiliate_commission_amount,
        payout_recipient_id: subscription.affiliate_recipient_id,
        terms_version: subscription.affiliate_terms_version || null,
        chargeback_liable: Boolean(subscription.affiliate_chargeback_liable),
        ...commissionLifecycle('approved', subscription.affiliate_hold_days || 0),
    };

    const { error } = await supabase
        .from('affiliate_commissions')
        .upsert(values, { onConflict: 'provider_event_id', ignoreDuplicates: true });
    if (error && !isMissingAffiliateSchema(error)) throw error;
}

export async function syncInitialSubscriptionAffiliateCommission(
    subscriptionId: string,
    subscriptionStatus: 'active' | 'pending' | 'failed',
    holdDays: number,
) {
    const status = subscriptionStatus === 'active'
        ? 'approved'
        : subscriptionStatus === 'failed'
            ? 'failed'
            : 'pending';
    const { data: existing, error: existingError } = await supabase
        .from('affiliate_commissions')
        .select('id, status')
        .eq('subscription_id', subscriptionId)
        .eq('source_type', 'subscription_initial')
        .maybeSingle();
    if (existingError) {
        if (isMissingAffiliateSchema(existingError)) return;
        throw existingError;
    }
    if (!existing) {
        const { data: subscription, error: subscriptionError } = await supabase
            .from('subscriptions')
            .select('*, subscription_plans(product_id)')
            .eq('id', subscriptionId)
            .maybeSingle();
        if (subscriptionError) throw subscriptionError;
        if (
            !subscription?.affiliate_id
            || !subscription.affiliate_recipient_id
            || !subscription.affiliate_commission_amount
        ) {
            return;
        }

        const grossAmount = Math.max(0, Math.round(Number(subscription.amount || 0)));
        const commissionBaseAmount = Math.min(
            grossAmount,
            Math.max(0, Math.round(Number(subscription.affiliate_commission_base_amount || 0))),
        );
        const productId = Array.isArray(subscription.subscription_plans)
            ? subscription.subscription_plans[0]?.product_id
            : subscription.subscription_plans?.product_id;
        const { error: insertError } = await supabase
            .from('affiliate_commissions')
            .insert({
                subscription_id: subscription.id,
                affiliate_id: subscription.affiliate_id,
                producer_id: subscription.seller_id,
                product_id: productId || null,
                program_id: subscription.affiliate_program_id,
                affiliation_id: subscription.affiliate_affiliation_id,
                click_id: subscription.affiliate_click_id,
                source_type: 'subscription_initial',
                gross_amount: grossAmount,
                platform_fee_amount: Math.max(0, grossAmount - commissionBaseAmount),
                commission_base_amount: commissionBaseAmount,
                commission_rate_bps: subscription.affiliate_commission_rate_bps || 1,
                commission_amount: subscription.affiliate_commission_amount,
                payout_recipient_id: subscription.affiliate_recipient_id,
                provider_payment_id: subscription.affiliate_initial_payment_id || null,
                terms_version: subscription.affiliate_terms_version || null,
                chargeback_liable: Boolean(subscription.affiliate_chargeback_liable),
                ...commissionLifecycle(status, holdDays),
            });
        if (insertError && insertError.code !== '23505') {
            if (isMissingAffiliateSchema(insertError)) return;
            throw insertError;
        }
        return;
    }
    if (status === 'approved' && ['approved', 'available'].includes(existing.status)) return;
    if (
        status === 'approved'
        && ['refunded', 'chargeback', 'failed', 'cancelled'].includes(existing.status)
    ) {
        return;
    }
    const { error } = await supabase
        .from('affiliate_commissions')
        .update(commissionLifecycle(status, holdDays))
        .eq('subscription_id', subscriptionId)
        .eq('source_type', 'subscription_initial');
    if (error && !isMissingAffiliateSchema(error)) throw error;
}

export async function reverseSubscriptionAffiliateCommission(input: {
    subscriptionId: string;
    providerPaymentId?: string | null;
    status: 'refunded' | 'chargeback' | 'failed' | 'cancelled';
}) {
    let query = supabase
        .from('affiliate_commissions')
        .select('id, status, commission_amount, risk_reserve_amount, chargeback_liable')
        .eq('subscription_id', input.subscriptionId);
    if (input.providerPaymentId) {
        query = query.eq('provider_payment_id', input.providerPaymentId);
    } else {
        query = query.eq('source_type', 'subscription_initial');
    }
    const result = await query;
    let rows = result.data;
    const error = result.error;
    if (error) {
        if (isMissingAffiliateSchema(error)) return;
        throw error;
    }
    if (input.providerPaymentId && !rows?.length) {
        const { data: unresolvedRows, error: unresolvedError } = await supabase
            .from('affiliate_commissions')
            .select('id, status, commission_amount, risk_reserve_amount, chargeback_liable')
            .eq('subscription_id', input.subscriptionId)
            .is('provider_payment_id', null)
            .not('status', 'in', '("refunded","chargeback","failed","cancelled")')
            .limit(2);
        if (unresolvedError) {
            if (isMissingAffiliateSchema(unresolvedError)) return;
            throw unresolvedError;
        }
        // Legacy subscriptions did not store the payment ID. Only infer the
        // target when exactly one unreversed commission can match.
        if (unresolvedRows?.length === 1) rows = unresolvedRows;
    }

    for (const row of rows || []) {
        if (['refunded', 'chargeback', 'failed', 'cancelled'].includes(row.status)) continue;
        const riskReserveAmount = input.status === 'chargeback'
            && !row.chargeback_liable
            && ['approved', 'available'].includes(row.status)
            ? Math.max(Number(row.risk_reserve_amount || 0), Number(row.commission_amount || 0))
            : Math.max(0, Number(row.risk_reserve_amount || 0));
        const { error: updateError } = await supabase
            .from('affiliate_commissions')
            .update({
                ...commissionLifecycle(input.status, 0),
                risk_reserve_amount: riskReserveAmount,
            })
            .eq('id', row.id);
        if (updateError) throw updateError;
    }
}

export async function promoteAvailableAffiliateCommissions(userId?: string) {
    let query = supabase
        .from('affiliate_commissions')
        .update({ status: 'available' })
        .eq('status', 'approved')
        .lte('available_at', new Date().toISOString());
    if (userId) query = query.or(`affiliate_id.eq.${userId},producer_id.eq.${userId}`);
    const { error } = await query;
    if (error && !isMissingAffiliateSchema(error)) throw error;
}

export async function ensureAffiliateLink(input: {
    affiliationId: string;
    productId: string;
}) {
    const { data: existing } = await supabase
        .from('affiliate_links')
        .select('*')
        .eq('affiliation_id', input.affiliationId)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1);
    if (existing?.[0]) return existing[0];

    for (let attempt = 0; attempt < 3; attempt += 1) {
        const { data, error } = await supabase
            .from('affiliate_links')
            .insert({
                affiliation_id: input.affiliationId,
                code: createAffiliateCode(),
                destination_path: `/checkout/${input.productId}`,
                is_active: true,
            })
            .select()
            .single();
        if (!error && data) return data;
        if (error?.code !== '23505') throw error;
    }
    throw new Error('Nao foi possivel gerar um link de afiliado unico.');
}
