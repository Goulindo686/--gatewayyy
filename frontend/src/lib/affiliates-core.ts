export const MIN_AFFILIATE_RATE_BPS = 1;
export const MAX_AFFILIATE_RATE_BPS = 9000;

export type AffiliateCommissionInput = {
    grossAmount: number;
    platformFeeAmount: number;
    commissionRateBps: number;
};

export type AffiliateCommissionAmounts = {
    grossAmount: number;
    platformFeeAmount: number;
    commissionBaseAmount: number;
    commissionRateBps: number;
    commissionAmount: number;
    sellerAmount: number;
};

function toNonNegativeCents(value: number) {
    const normalized = Math.round(Number(value) || 0);
    return Math.max(0, normalized);
}

export function normalizeAffiliateRateBps(value: number) {
    const normalized = Math.round(Number(value) || 0);
    return Math.max(MIN_AFFILIATE_RATE_BPS, Math.min(MAX_AFFILIATE_RATE_BPS, normalized));
}

export function calculateAffiliateCommission(input: AffiliateCommissionInput): AffiliateCommissionAmounts {
    const grossAmount = toNonNegativeCents(input.grossAmount);
    const platformFeeAmount = Math.min(grossAmount, toNonNegativeCents(input.platformFeeAmount));
    const commissionRateBps = normalizeAffiliateRateBps(input.commissionRateBps);
    const commissionBaseAmount = Math.max(0, grossAmount - platformFeeAmount);
    const rawCommission = Math.round((commissionBaseAmount * commissionRateBps) / 10_000);
    const commissionAmount = Math.min(commissionBaseAmount, Math.max(0, rawCommission));
    const sellerAmount = grossAmount - platformFeeAmount - commissionAmount;

    return {
        grossAmount,
        platformFeeAmount,
        commissionBaseAmount,
        commissionRateBps,
        commissionAmount,
        sellerAmount,
    };
}

export function affiliateCommissionStatusForOrder(orderStatus: string) {
    switch (orderStatus) {
        case 'paid':
            return 'approved';
        case 'refunded':
            return 'refunded';
        case 'chargeback':
            return 'chargeback';
        case 'failed':
        case 'cancelled':
        case 'canceled':
            return 'failed';
        default:
            return 'pending';
    }
}
