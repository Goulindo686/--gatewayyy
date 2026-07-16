import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const configuredPublicKey = (
        process.env.PAGARME_PUBLIC_KEY ||
        process.env.NEXT_PUBLIC_PAGARME_PUBLIC_KEY ||
        ''
    ).trim();
    const publicKey = configuredPublicKey;
    const hasPublicKey = /^pk_[a-zA-Z0-9_-]{8,}$/.test(publicKey);
    const enabledByEnvironment = process.env.ENABLE_CREDIT_CARD !== 'false';

    const response = NextResponse.json({
        credit_card: {
            enabled: enabledByEnvironment && hasPublicKey,
            public_key: hasPublicKey ? publicKey : null,
            reason: hasPublicKey ? null : 'missing_public_key',
        },
    });
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
}
