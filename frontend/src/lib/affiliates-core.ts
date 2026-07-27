export const MIN_AFFILIATE_RATE_BPS = 1;
export const MAX_AFFILIATE_RATE_BPS = 9000;
export const AFFILIATE_PIX_MIN_PLATFORM_FEE_CENTS = 200;
export const AFFILIATE_CARD_MIN_PLATFORM_FEE_BPS = 200;

export function normalizeAffiliateReference(value: unknown) {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return /^[a-zA-Z0-9_-]{32,128}$/.test(normalized) ? normalized : null;
}

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

export type AffiliateBalanceCommission = {
    status: string;
    commission_amount?: number | null;
    available_at?: string | null;
    risk_reserve_amount?: number | null;
    risk_reserve_released_at?: string | null;
};

export type AffiliateBalanceSummary = {
    salesCount: number;
    totalConfirmedAmount: number;
    releasedAmount: number;
    securityHoldAmount: number;
    pendingPaymentAmount: number;
    reversedAmount: number;
    riskReserveAmount: number;
    nextReleaseAmount: number;
    nextReleaseAt: string | null;
    hasActivity: boolean;
};

function toNonNegativeCents(value: number) {
    const normalized = Math.round(Number(value) || 0);
    return Math.max(0, normalized);
}

export function summarizeAffiliateBalance(
    commissions: AffiliateBalanceCommission[],
): AffiliateBalanceSummary {
    const successfulStatuses = new Set(['approved', 'available']);
    const reversedStatuses = new Set(['refunded', 'chargeback', 'failed', 'cancelled']);
    const validRows = Array.isArray(commissions) ? commissions : [];
    const amountOf = (row: AffiliateBalanceCommission) =>
        toNonNegativeCents(Number(row.commission_amount || 0));

    const securityRows = validRows.filter((row) => row.status === 'approved');
    const nextReleaseAt = securityRows
        .map((row) => row.available_at)
        .filter(
            (value): value is string =>
                typeof value === 'string' && Number.isFinite(new Date(value).getTime()),
        )
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0] || null;
    const nextReleaseDate = nextReleaseAt?.slice(0, 10) || null;

    return {
        salesCount: validRows.filter((row) => successfulStatuses.has(row.status)).length,
        totalConfirmedAmount: validRows
            .filter((row) => successfulStatuses.has(row.status))
            .reduce((total, row) => total + amountOf(row), 0),
        releasedAmount: validRows
            .filter((row) => row.status === 'available')
            .reduce((total, row) => total + amountOf(row), 0),
        securityHoldAmount: securityRows.reduce((total, row) => total + amountOf(row), 0),
        pendingPaymentAmount: validRows
            .filter((row) => row.status === 'pending')
            .reduce((total, row) => total + amountOf(row), 0),
        reversedAmount: validRows
            .filter((row) => reversedStatuses.has(row.status))
            .reduce((total, row) => total + amountOf(row), 0),
        riskReserveAmount: validRows
            .filter((row) => !row.risk_reserve_released_at)
            .reduce(
                (total, row) =>
                    total + toNonNegativeCents(Number(row.risk_reserve_amount || 0)),
                0,
            ),
        nextReleaseAmount: nextReleaseDate
            ? securityRows
                .filter((row) => row.available_at?.slice(0, 10) === nextReleaseDate)
                .reduce((total, row) => total + amountOf(row), 0)
            : 0,
        nextReleaseAt,
        hasActivity: validRows.length > 0,
    };
}

export function calculateAffiliatePlatformFee(input: {
    grossAmount: number;
    currentPlatformFeeAmount: number;
    paymentMethod: string;
}) {
    const grossAmount = toNonNegativeCents(input.grossAmount);
    const currentPlatformFeeAmount = Math.min(
        grossAmount,
        toNonNegativeCents(input.currentPlatformFeeAmount),
    );
    const paymentMethod = String(input.paymentMethod || '').toLowerCase();
    const minimumPlatformFeeAmount = paymentMethod === 'credit_card' || paymentMethod === 'card'
        ? Math.min(
            grossAmount,
            Math.round((grossAmount * AFFILIATE_CARD_MIN_PLATFORM_FEE_BPS) / 10_000),
        )
        : Math.min(grossAmount, AFFILIATE_PIX_MIN_PLATFORM_FEE_CENTS);

    return Math.max(currentPlatformFeeAmount, minimumPlatformFeeAmount);
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
