import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { normalizeStoreStyle } from '@/lib/store-builder';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const configuredPublicKey = (
        process.env.PAGARME_PUBLIC_KEY ||
        process.env.NEXT_PUBLIC_PAGARME_PUBLIC_KEY ||
        ''
    ).trim();
    const publicKey = configuredPublicKey;
    const hasPublicKey = /^pk_[a-zA-Z0-9_-]{8,}$/.test(publicKey);
    const enabledByEnvironment = process.env.ENABLE_CREDIT_CARD !== 'false';
    const storeSlug = String(req.nextUrl.searchParams.get('store_slug') || '').trim().toLowerCase();
    let enabledByStore = true;

    if (storeSlug) {
        if (!/^[a-z0-9-]{2,80}$/.test(storeSlug)) {
            enabledByStore = false;
        } else {
            const { data: store, error } = await supabase
                .from('users')
                .select('store_active, store_style_config')
                .ilike('store_slug', storeSlug)
                .limit(1)
                .maybeSingle();

            enabledByStore = !error
                && store?.store_active === true
                && normalizeStoreStyle(store.store_style_config).show_credit_card !== false;
        }
    }

    const creditCardEnabled = enabledByEnvironment && hasPublicKey && enabledByStore;

    const response = NextResponse.json({
        credit_card: {
            enabled: creditCardEnabled,
            public_key: hasPublicKey ? publicKey : null,
            reason: !hasPublicKey
                ? 'missing_public_key'
                : !enabledByStore
                    ? 'disabled_by_store'
                    : !enabledByEnvironment
                        ? 'disabled_by_environment'
                        : null,
        },
    });
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
}
