const { adminSupabase: supabase } = require('../config/database');

const DEFAULT_PIX_FEE_CENTS = 200;

function calculatePixFee(amountCents, setting, defaultFeeCents = DEFAULT_PIX_FEE_CENTS) {
    const amount = Math.max(0, Math.round(Number(amountCents) || 0));
    const fallback = Math.max(0, Math.round(Number(defaultFeeCents) || 0));

    if (!setting) return Math.min(amount, fallback);
    if (setting.fee_type === 'exempt') return 0;
    if (setting.fee_type === 'fixed') {
        return Math.min(amount, Math.max(0, Math.round(Number(setting.fixed_fee_cents) || 0)));
    }

    const percentage = Math.max(0, Math.min(100, Number(setting.percentage) || 0));
    return Math.min(amount, Math.round(amount * percentage / 100));
}

async function resolveSellerPixFee({ sellerId, amountCents, defaultFeeCents = DEFAULT_PIX_FEE_CENTS }) {
    const { data, error } = await supabase
        .from('seller_pix_fee_settings')
        .select('fee_type, fixed_fee_cents, percentage')
        .eq('seller_id', sellerId)
        .maybeSingle();

    const missingTable = error && (
        error.code === '42P01'
        || error.code === 'PGRST205'
        || String(error.message || '').includes('seller_pix_fee_settings')
    );
    if (error && !missingTable) throw error;

    return calculatePixFee(amountCents, missingTable ? null : data, defaultFeeCents);
}

module.exports = {
    DEFAULT_PIX_FEE_CENTS,
    calculatePixFee,
    resolveSellerPixFee,
};
