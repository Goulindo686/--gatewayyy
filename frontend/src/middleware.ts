import { NextRequest, NextResponse } from 'next/server';
import {
    EDGE_DOMAIN_HOST_HEADER,
    EDGE_DOMAIN_SIGNATURE_HEADER,
    EDGE_DOMAIN_TIMESTAMP_HEADER,
    verifyEdgeDomainSignature
} from '@/lib/edge-domain-signature';

const blockedPathPrefixes = [
    '/.git',
    '/cgi-bin',
    '/phpmyadmin',
    '/vendor',
    '/wp-admin',
];

const blockedExactPaths = new Set([
    '/.env',
    '/.env.local',
    '/adminer.php',
    '/phpinfo.php',
    '/wp-config.php',
    '/wp-login.php',
    '/xmlrpc.php',
]);

function normalizeRequestHostname(value: string | null): string {
    return String(value || '')
        .split(',')[0]
        .trim()
        .split(':')[0]
        .replace(/\.$/, '')
        .toLowerCase();
}

async function signedStoreHostname(req: NextRequest): Promise<string> {
    const secret = process.env.CUSTOM_DOMAINS_EDGE_SECRET;
    const hostname = normalizeRequestHostname(req.headers.get(EDGE_DOMAIN_HOST_HEADER));
    const timestamp = req.headers.get(EDGE_DOMAIN_TIMESTAMP_HEADER) || '';
    const signature = req.headers.get(EDGE_DOMAIN_SIGNATURE_HEADER) || '';
    if (!secret || !hostname || !timestamp || !signature) return '';

    const valid = await verifyEdgeDomainSignature({
        secret,
        method: req.method,
        hostname,
        pathWithSearch: `${req.nextUrl.pathname}${req.nextUrl.search}`,
        timestamp,
        signature
    });
    return valid ? hostname : '';
}

export async function middleware(req: NextRequest) {
    const pathname = req.nextUrl.pathname.toLowerCase();
    const shouldBlock =
        blockedExactPaths.has(pathname) ||
        blockedPathPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

    if (shouldBlock) {
        return new NextResponse('Not found', {
            status: 404,
            headers: {
                'Cache-Control': 'public, max-age=3600',
                'X-Robots-Tag': 'noindex',
            },
        });
    }

    // Custom domains use the same storefront page without changing the public URL.
    if (pathname === '/') {
        // Cloudflare signs the original store hostname before proxying to the
        // canonical Vercel origin. Unsigned forwarded-host headers are never
        // trusted, preventing direct spoofing against the public API/origin.
        const edgeHostname = await signedStoreHostname(req);
        const hostname = edgeHostname
            || normalizeRequestHostname(req.headers.get('host'))
            || normalizeRequestHostname(req.nextUrl.hostname);
        const platformHosts = new Set(
            [
                'goupay.com.br',
                'www.goupay.com.br',
                process.env.VERCEL_URL,
                process.env.VERCEL_PROJECT_PRODUCTION_URL,
                ...(process.env.PLATFORM_HOSTNAMES || '').split(',')
            ]
                .filter(Boolean)
                .map(value => String(value).trim().toLowerCase())
        );

        try {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL;
            if (appUrl) platformHosts.add(new URL(appUrl).hostname.toLowerCase());
        } catch {
            // A malformed optional URL should not break request routing.
        }

        const isPlatformHost = hostname === 'localhost'
            || hostname === '127.0.0.1'
            || hostname.endsWith('.vercel.app')
            || [...platformHosts].some(host => hostname === host || hostname.endsWith(`.${host}`));

        if (hostname && !isPlatformHost) {
            const rewriteUrl = req.nextUrl.clone();
            rewriteUrl.pathname = `/store/${encodeURIComponent(hostname)}`;
            return NextResponse.rewrite(rewriteUrl);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
