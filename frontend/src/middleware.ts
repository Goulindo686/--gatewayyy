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

    if (!shouldBlock) return NextResponse.next();

    return new NextResponse('Not found', {
        status: 404,
        headers: {
            'Cache-Control': 'public, max-age=3600',
            'X-Robots-Tag': 'noindex',
        },
    });
}

export const config = {
    matcher: [
        '/.env',
        '/.env.local',
        '/.git/:path*',
        '/adminer.php',
        '/cgi-bin/:path*',
        '/phpinfo.php',
        '/phpmyadmin/:path*',
        '/vendor/:path*',
        '/wp-admin/:path*',
        '/wp-config.php',
        '/wp-login.php',
        '/xmlrpc.php',
    ],
};
