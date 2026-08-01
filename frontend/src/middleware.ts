import { NextRequest, NextResponse } from 'next/server';

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

export function middleware(req: NextRequest) {
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
        const forwardedHost = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
        const hostname = (forwardedHost || req.headers.get('host') || req.nextUrl.hostname)
            .split(':')[0]
            .replace(/\.$/, '')
            .toLowerCase();
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
