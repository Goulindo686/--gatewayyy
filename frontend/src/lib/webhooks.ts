import 'server-only';

import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export class WebhookUrlValidationError extends Error {}

const BLOCKED_HOST_SUFFIXES = ['.localhost', '.local', '.internal', '.lan', '.home', '.test'];

function isPrivateIpv4(address: string): boolean {
    const parts = address.split('.').map(Number);
    if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
    const [a, b, c] = parts;
    return a === 0
        || a === 10
        || a === 127
        || (a === 100 && b >= 64 && b <= 127)
        || (a === 169 && b === 254)
        || (a === 172 && b >= 16 && b <= 31)
        || (a === 192 && b === 168)
        || (a === 192 && b === 0 && (c === 0 || c === 2))
        || (a === 198 && (b === 18 || b === 19))
        || (a === 198 && b === 51 && c === 100)
        || (a === 203 && b === 0 && c === 113)
        || a >= 224;
}

function isPrivateAddress(address: string): boolean {
    const normalized = address.toLowerCase().split('%')[0];
    if (isIP(normalized) === 4) return isPrivateIpv4(normalized);
    if (isIP(normalized) !== 6) return true;

    const mappedIpv4 = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
    if (mappedIpv4) return isPrivateIpv4(mappedIpv4);
    return normalized === '::'
        || normalized === '::1'
        || normalized.startsWith('fc')
        || normalized.startsWith('fd')
        || /^fe[89ab]/.test(normalized)
        || normalized.startsWith('2001:db8:');
}

function parseWebhookUrl(value: string): URL {
    if (value.length > 2048) throw new WebhookUrlValidationError('URL de webhook muito longa');
    let parsed: URL;
    try {
        parsed = new URL(value);
    } catch {
        throw new WebhookUrlValidationError('URL de webhook inválida');
    }

    const allowHttpInDevelopment = process.env.NODE_ENV !== 'production';
    if (parsed.protocol !== 'https:' && !(allowHttpInDevelopment && parsed.protocol === 'http:')) {
        throw new WebhookUrlValidationError('O webhook deve usar HTTPS');
    }
    if (parsed.username || parsed.password) throw new WebhookUrlValidationError('Credenciais não são permitidas na URL do webhook');

    const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
    if (!hostname
        || hostname === 'localhost'
        || BLOCKED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
        || (isIP(hostname) > 0 && isPrivateAddress(hostname))) {
        throw new WebhookUrlValidationError('Destino de webhook não permitido');
    }
    return parsed;
}

async function validateWebhookDestination(value: string): Promise<URL> {
    const parsed = parseWebhookUrl(value);
    const hostname = parsed.hostname.replace(/^\[|\]$/g, '');
    if (isIP(hostname) === 0) {
        let addresses: Array<{ address: string }>;
        try {
            addresses = await lookup(hostname, { all: true, verbatim: true });
        } catch {
            throw new WebhookUrlValidationError('Não foi possível resolver o destino do webhook');
        }
        if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
            throw new WebhookUrlValidationError('Destino de webhook não permitido');
        }
    }
    return parsed;
}

export function normalizeWebhookUrls(value: unknown, fallback?: unknown): string[] {
    const values: string[] = [];

    const collect = (input: unknown) => {
        if (!input) return;
        if (Array.isArray(input)) {
            input.forEach(collect);
            return;
        }
        if (typeof input !== 'string') throw new WebhookUrlValidationError('URL de webhook inválida');
        input
            .split(/\r?\n|,/)
            .map((url) => url.trim())
            .filter(Boolean)
            .forEach((url) => values.push(parseWebhookUrl(url).toString()));
    };

    collect(value);
    if (values.length === 0) collect(fallback);
    const unique = Array.from(new Set(values));
    if (unique.length > 5) throw new WebhookUrlValidationError('Use no máximo 5 URLs de webhook');
    return unique;
}

export async function sendWebhookPayload(
    url: string,
    payload: unknown,
    options: { timeoutMs?: number } = {},
) {
    const safeUrl = await validateWebhookDestination(url);
    const startTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 10_000);
    try {
        const response = await fetch(safeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal,
            redirect: 'manual',
        });
        const duration = Date.now() - startTime;
        const redirected = response.status >= 300 && response.status < 400;
        const ok = response.ok && !redirected;

        return {
            url: safeUrl.toString(),
            ok,
            status: response.status,
            duration,
            error: ok ? null : (redirected ? 'Redirecionamentos não são permitidos' : 'O destino recusou o webhook'),
        };
    } finally {
        clearTimeout(timeout);
    }
}
