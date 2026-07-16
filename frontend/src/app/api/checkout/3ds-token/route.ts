import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const TDS_URLS = {
    test: 'https://3ds-sdx.stone.com.br/v2',
    live: 'https://3ds.stone.com.br/v2',
};

function getEnvironment(secretKey: string) {
    const configured = String(process.env.PAGARME_3DS_ENV || '').toLowerCase();
    if (configured === 'test' || configured === 'sandbox') return 'test';
    if (configured === 'live' || configured === 'production') return 'live';
    return /^sk_test/i.test(secretKey) ? 'test' : 'live';
}

export async function POST() {
    const enabled = process.env.ENABLE_CREDIT_CARD_3DS !== 'false';
    const secretKey = (
        process.env.PAGARME_3DS_SECRET_KEY ||
        process.env.STONE_3DS_SECRET_KEY ||
        process.env.PAGARME_API_KEY ||
        ''
    ).trim();

    if (!enabled || !secretKey) {
        return NextResponse.json({ enabled: false });
    }

    const environment = getEnvironment(secretKey);
    const baseUrl = TDS_URLS[environment];

    try {
        const response = await fetch(`${baseUrl}/tds-token`, {
            method: 'GET',
            headers: {
                Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
            },
            cache: 'no-store',
        });

        const payload = await response.json().catch(() => null);
        const token = typeof payload?.tds_token === 'string' ? payload.tds_token : '';
        if (!response.ok || !token) {
            console.error('[3DS] Token generation failed:', {
                status: response.status,
                message: typeof payload?.message === 'string' ? payload.message.slice(0, 200) : undefined,
            });
            return NextResponse.json({ enabled: false });
        }

        return NextResponse.json({
            enabled: true,
            token,
            environment,
            library_url: environment === 'test'
                ? 'https://3ds-nx-js.stone.com.br/test/v2/3ds2.min.js'
                : 'https://3ds-nx-js.stone.com.br/live/v2/3ds2.min.js',
        });
    } catch (error) {
        console.error('[3DS] Token request error:', error);
        return NextResponse.json({ enabled: false });
    }
}
