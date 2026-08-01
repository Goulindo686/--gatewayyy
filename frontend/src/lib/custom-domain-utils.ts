import { isIP } from 'node:net';
import { domainToASCII } from 'node:url';

export class CustomDomainValidationError extends Error {}

const RESERVED_SUFFIXES = ['.local', '.localhost', '.internal', '.test', '.invalid', '.example'];

function configuredPlatformHosts(): Set<string> {
    const values = (process.env.PLATFORM_HOSTNAMES || '')
        .split(',')
        .map(value => value.trim().toLowerCase())
        .filter(Boolean);
    values.push('goupay.com.br', 'www.goupay.com.br');
    if (process.env.VERCEL_URL) values.push(process.env.VERCEL_URL.toLowerCase());
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) values.push(process.env.VERCEL_PROJECT_PRODUCTION_URL.toLowerCase());

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl) {
        try {
            values.push(new URL(appUrl).hostname.toLowerCase());
        } catch {
            // A malformed app URL should not prevent domain validation.
        }
    }

    return new Set(values);
}

export function normalizeCustomDomain(input: unknown): string {
    if (typeof input !== 'string' || !input.trim()) {
        throw new CustomDomainValidationError('Informe um domínio válido.');
    }

    const raw = input.trim();
    const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
    let parsed: URL;

    try {
        parsed = new URL(candidate);
    } catch {
        throw new CustomDomainValidationError('Informe somente o domínio, como minhaloja.com.br.');
    }

    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.port) {
        throw new CustomDomainValidationError('Informe somente o domínio, sem porta ou credenciais.');
    }
    if ((parsed.pathname && parsed.pathname !== '/') || parsed.search || parsed.hash) {
        throw new CustomDomainValidationError('Informe o domínio sem caminhos, parâmetros ou fragmentos.');
    }

    const hostname = domainToASCII(parsed.hostname.replace(/\.$/, '')).toLowerCase();
    if (!hostname || hostname.length > 253 || isIP(hostname) || !hostname.includes('.')) {
        throw new CustomDomainValidationError('Use um domínio público válido.');
    }
    if (hostname.startsWith('*.') || RESERVED_SUFFIXES.some(suffix => hostname.endsWith(suffix))) {
        throw new CustomDomainValidationError('Esse domínio não pode ser conectado.');
    }

    const labels = hostname.split('.');
    if (labels.some(label => !label || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))) {
        throw new CustomDomainValidationError('O formato do domínio é inválido.');
    }

    return hostname;
}

export function isPlatformDomain(domain: string): boolean {
    const normalized = domain.toLowerCase();
    return normalized === 'localhost'
        || normalized === '127.0.0.1'
        || normalized.endsWith('.vercel.app')
        || [...configuredPlatformHosts()].some(host => normalized === host || normalized.endsWith(`.${host}`));
}
