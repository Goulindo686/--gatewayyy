const HOST_HEADER = 'x-goupay-custom-host';
const TIMESTAMP_HEADER = 'x-goupay-edge-timestamp';
const SIGNATURE_HEADER = 'x-goupay-edge-signature';

function normalizeHostname(value) {
    return String(value || '')
        .trim()
        .split(':')[0]
        .replace(/\.$/, '')
        .toLowerCase();
}

function toHex(buffer) {
    return [...new Uint8Array(buffer)]
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
}

async function sign(secret, method, hostname, pathWithSearch, timestamp) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const payload = [method.toUpperCase(), hostname, pathWithSearch, timestamp].join('\n');
    return toHex(await crypto.subtle.sign('HMAC', key, encoder.encode(payload)));
}

function protectedHostnames(env, originHostname) {
    return new Set([
        originHostname,
        normalizeHostname(env.CNAME_TARGET),
        ...String(env.PLATFORM_HOSTNAMES || '')
            .split(',')
            .map(normalizeHostname)
    ].filter(Boolean));
}

export default {
    async fetch(request, env) {
        if (!env.ORIGIN_URL || !env.EDGE_SHARED_SECRET) {
            return new Response('Store domain proxy is not configured.', { status: 503 });
        }

        const incomingUrl = new URL(request.url);
        const originBase = new URL(env.ORIGIN_URL);
        const hostname = normalizeHostname(incomingUrl.hostname);
        const platformHosts = protectedHostnames(env, originBase.hostname);

        // These hosts must be excluded from the wildcard Worker route. Keeping
        // this guard prevents a routing mistake from serving a store over an
        // official GouPay hostname.
        if (!hostname || platformHosts.has(hostname) || hostname.endsWith('.goupay.com.br')) {
            return new Response('Not found', {
                status: 404,
                headers: { 'Cache-Control': 'no-store' }
            });
        }

        const targetUrl = new URL(`${incomingUrl.pathname}${incomingUrl.search}`, originBase);
        const timestamp = String(Math.floor(Date.now() / 1000));
        const pathWithSearch = `${incomingUrl.pathname}${incomingUrl.search}`;
        const signature = await sign(
            env.EDGE_SHARED_SECRET,
            request.method,
            hostname,
            pathWithSearch,
            timestamp
        );
        const headers = new Headers(request.headers);
        headers.delete(HOST_HEADER);
        headers.delete(TIMESTAMP_HEADER);
        headers.delete(SIGNATURE_HEADER);
        headers.set(HOST_HEADER, hostname);
        headers.set(TIMESTAMP_HEADER, timestamp);
        headers.set(SIGNATURE_HEADER, signature);
        headers.set('x-forwarded-proto', 'https');

        const proxyRequest = new Request(targetUrl, {
            method: request.method,
            headers,
            body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
            redirect: 'manual'
        });

        return fetch(proxyRequest);
    }
};
