import 'server-only';
import { supabase } from '@/lib/db';
import { PIX_PLATFORM_FLAT_FEE_CENTS } from '@/lib/pagarme';

export type SellerPixFeeType = 'default' | 'exempt' | 'fixed' | 'percentage';

export type SellerPixFeeSetting = {
    fee_type: Exclude<SellerPixFeeType, 'default'>;
    fixed_fee_cents: number | null;
    percentage: number | null;
};

export type ResolvedPixFee = {
    amountCents: number;
    feeType: SellerPixFeeType;
    value: number | null;
};

function isMissingFeeSettingsTable(error: unknown) {
    const details = error as { code?: string; message?: string } | null;
    return details?.code === '42P01'
        || details?.code === 'PGRST205'
        || String(details?.message || '').includes('seller_pix_fee_settings');
}

export function calculateSellerPixFee(input: {
    amountCents: number;
    setting?: SellerPixFeeSetting | null;
    defaultFeeCents?: number;
}): ResolvedPixFee {
    const amountCents = Math.max(0, Math.round(Number(input.amountCents) || 0));
    const defaultFeeCents = Math.max(0, Math.round(
        input.defaultFeeCents === undefined ? PIX_PLATFORM_FLAT_FEE_CENTS : input.defaultFeeCents
    ));
    const setting = input.setting;

    if (!setting) {
        return {
            amountCents: Math.min(amountCents, defaultFeeCents),
            feeType: 'default',
            value: defaultFeeCents / 100,
        };
    }

    if (setting.fee_type === 'exempt') {
        return { amountCents: 0, feeType: 'exempt', value: 0 };
    }

    if (setting.fee_type === 'fixed') {
        const fixedFeeCents = Math.max(0, Math.round(Number(setting.fixed_fee_cents) || 0));
        return {
            amountCents: Math.min(amountCents, fixedFeeCents),
            feeType: 'fixed',
            value: fixedFeeCents / 100,
        };
    }

    const percentage = Math.max(0, Math.min(100, Number(setting.percentage) || 0));
    return {
        amountCents: Math.min(amountCents, Math.round(amountCents * percentage / 100)),
        feeType: 'percentage',
        value: percentage,
    };
}

export async function resolveSellerPixFee(input: {
    sellerId: string;
    amountCents: number;
    defaultFeeCents?: number;
}): Promise<ResolvedPixFee> {
    const { data, error } = await supabase
        .from('seller_pix_fee_settings')
        .select('fee_type, fixed_fee_cents, percentage')
        .eq('seller_id', input.sellerId)
        .maybeSingle();

    // Permite publicar o codigo antes da migration sem interromper os checkouts.
    // Nesse intervalo, a taxa global continua sendo aplicada normalmente.
    if (error && !isMissingFeeSettingsTable(error)) throw error;

    return calculateSellerPixFee({
        amountCents: input.amountCents,
        setting: error ? null : data as SellerPixFeeSetting | null,
        defaultFeeCents: input.defaultFeeCents,
    });
}

export function formatPixFeeLabel(fee: ResolvedPixFee) {
    if (fee.feeType === 'exempt') return 'isento (PIX)';
    if (fee.feeType === 'percentage') return `${Number(fee.value || 0).toLocaleString('pt-BR')}% (PIX)`;
    return `R$ ${Number(fee.value || 0).toFixed(2).replace('.', ',')} (PIX)`;
}
