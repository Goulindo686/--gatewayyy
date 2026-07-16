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

function getLibraryUrl(environment: 'test' | 'live') {
    return environment === 'test'
        ? 'https://3ds-nx-js.stone.com.br/test/v2/3ds2.min.js'
        : 'https://3ds-nx-js.stone.com.br/live/v2/3ds2.min.js';
}

function safeReportValue(value: unknown, maxLength: number) {
    return typeof value === 'string'
        ? value.replace(/[^\w .:/-]/g, '').slice(0, maxLength)
        : '';
}

export async function POST(request: Request) {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;

    if (body.action === 'report') {
        const rawStatus = Number(body.status);
        console.error('[3DS CLIENT] Authentication report:', {
            code: safeReportValue(body.code, 80),
            status: Number.isFinite(rawStatus) ? rawStatus : undefined,
            message: safeReportValue(body.message, 200),
            path: safeReportValue(body.path, 160),
        });
        return NextResponse.json({ ok: true });
    }

    const enabled = process.env.ENABLE_CREDIT_CARD_3DS !== 'false';
    const required = process.env.REQUIRE_CREDIT_CARD_3DS === 'true';
    const secretKey = (
        process.env.PAGARME_3DS_SECRET_KEY ||
        process.env.STONE_3DS_SECRET_KEY ||
        process.env.PAGARME_API_KEY ||
        ''
    ).trim();

    if (!enabled) {
        return NextResponse.json({ enabled: false, required: false, reason: 'disabled' });
    }

    if (!secretKey) {
        return NextResponse.json({ enabled: false, required, reason: 'not_configured' });
    }

    const environment = getEnvironment(secretKey);
    const baseUrl = TDS_URLS[environment];
    const libraryUrl = getLibraryUrl(environment);

    if (body.config_only === true) {
        return NextResponse.json({
            enabled: true,
            required,
            environment,
            library_url: libraryUrl,
        });
    }

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
            return NextResponse.json({ enabled: false, required, reason: 'provider_unavailable' });
        }

        return NextResponse.json({
            enabled: true,
            required,
            token,
            environment,
            library_url: libraryUrl,
        });
    } catch (error) {
        console.error('[3DS] Token request error:', error);
        return NextResponse.json({ enabled: false, required, reason: 'provider_unavailable' });
    }
}
