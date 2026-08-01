import 'server-only';

export type DnsInstruction = {
    type: 'CNAME' | 'TXT';
    name: string;
    value: string;
    purpose: 'routing' | 'verification';
    proxied?: boolean;
};

type CloudflareValidationRecord = {
    cname?: string;
    cname_target?: string;
    txt_name?: string;
    txt_value?: string;
};

export type CloudflareCustomHostname = {
    id: string;
    hostname: string;
    status?: string;
    ownership_verification?: {
        type?: string;
        name?: string;
        value?: string;
    };
    verification_errors?: string[];
    ssl?: {
        status?: string;
        method?: string;
        validation_errors?: Array<{ message?: string }>;
        validation_records?: CloudflareValidationRecord[];
    };
};

type CloudflareEnvelope<T> = {
    success: boolean;
    result?: T;
    errors?: Array<{ code?: number; message?: string }>;
};

type DomainIntegrationConfig = {
    token: string;
    zoneId: string;
    cnameTarget: string;
};

export class CloudflareDomainError extends Error {
    constructor(
        message: string,
        public readonly status: number,
        public readonly code?: string
    ) {
        super(message);
    }
}

function cleanHostname(value: string | undefined): string {
    return String(value || '')
        .trim()
        .replace(/^https?:\/\//i, '')
        .split('/')[0]
        .replace(/\.$/, '')
        .toLowerCase();
}

function getConfig(): DomainIntegrationConfig {
    const token = process.env.CUSTOM_DOMAINS_CLOUDFLARE_API_TOKEN;
    const zoneId = process.env.CUSTOM_DOMAINS_CLOUDFLARE_ZONE_ID;
    const cnameTarget = cleanHostname(process.env.CUSTOM_DOMAINS_CLOUDFLARE_CNAME_TARGET);

    if (!token || !zoneId || !cnameTarget || !cnameTarget.includes('.')) {
        throw new CloudflareDomainError(
            'A integração de domínios da Cloudflare ainda não foi configurada.',
            503,
            'NOT_CONFIGURED'
        );
    }

    return { token, zoneId, cnameTarget };
}

export function isCloudflareDomainIntegrationConfigured(): boolean {
    try {
        getConfig();
        return true;
    } catch {
        return false;
    }
}

async function cloudflareRequest<T>(path: string, init: RequestInit = {}, requireResult = true): Promise<T> {
    const { token } = getConfig();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);

    try {
        const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
            ...init,
            signal: controller.signal,
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...init.headers
            },
            cache: 'no-store'
        });
        const payload = await response.json().catch(() => ({})) as CloudflareEnvelope<T>;

        if (!response.ok || payload.success !== true || (requireResult && payload.result === undefined)) {
            const firstError = payload.errors?.[0];
            throw new CloudflareDomainError(
                firstError?.message || 'A Cloudflare recusou a solicitação do domínio.',
                response.status || 502,
                firstError?.code === undefined ? undefined : String(firstError.code)
            );
        }

        return payload.result as T;
    } catch (error) {
        if (error instanceof CloudflareDomainError) throw error;
        if (error instanceof Error && error.name === 'AbortError') {
            throw new CloudflareDomainError('A Cloudflare demorou para responder.', 504, 'TIMEOUT');
        }
        throw new CloudflareDomainError('Não foi possível comunicar com a Cloudflare.', 502, 'NETWORK_ERROR');
    } finally {
        clearTimeout(timeout);
    }
}

function customHostnamePath(hostnameId = ''): string {
    const { zoneId } = getConfig();
    const suffix = hostnameId ? `/${encodeURIComponent(hostnameId)}` : '';
    return `/zones/${encodeURIComponent(zoneId)}/custom_hostnames${suffix}`;
}

export function addCloudflareCustomHostname(domain: string): Promise<CloudflareCustomHostname> {
    return cloudflareRequest(customHostnamePath(), {
        method: 'POST',
        body: JSON.stringify({
            hostname: domain,
            ssl: {
                method: 'http',
                type: 'dv',
                settings: {
                    min_tls_version: '1.2',
                    tls_1_3: 'on',
                    http2: 'on'
                }
            }
        })
    });
}

export function getCloudflareCustomHostname(hostnameId: string): Promise<CloudflareCustomHostname> {
    return cloudflareRequest(customHostnamePath(hostnameId));
}

export function retryCloudflareValidation(hostnameId: string): Promise<CloudflareCustomHostname> {
    return cloudflareRequest(customHostnamePath(hostnameId), {
        method: 'PATCH',
        body: JSON.stringify({
            ssl: {
                method: 'http',
                type: 'dv',
                settings: {
                    min_tls_version: '1.2',
                    tls_1_3: 'on',
                    http2: 'on'
                }
            }
        })
    });
}

export async function removeCloudflareCustomHostname(hostnameId: string): Promise<void> {
    await cloudflareRequest(customHostnamePath(hostnameId), { method: 'DELETE' }, false);
}

function mapApplicationStatus(hostnameStatus: string, sslStatus: string): 'pending' | 'active' | 'error' {
    if (hostnameStatus === 'active' && sslStatus === 'active') return 'active';
    if (/(blocked|failed|deleted)/i.test(`${hostnameStatus} ${sslStatus}`)) return 'error';
    return 'pending';
}

function readableProviderError(hostname: CloudflareCustomHostname, status: 'pending' | 'active' | 'error'): string | null {
    if (status === 'active') return null;

    const providerMessage = [
        ...(hostname.verification_errors || []),
        ...(hostname.ssl?.validation_errors || []).map(item => item.message || '')
    ].find(Boolean);

    if (/CAA/i.test(providerMessage || '')) {
        return 'O DNS foi encontrado, mas um registro CAA está impedindo a emissão do certificado SSL.';
    }
    if (status === 'error') {
        return 'A Cloudflare não conseguiu ativar este domínio. Confira os registros DNS e tente novamente.';
    }
    if (hostname.status === 'active' && hostname.ssl?.status !== 'active') {
        return 'O domínio foi reconhecido e o certificado SSL ainda está sendo emitido.';
    }
    return 'A Cloudflare ainda não encontrou o CNAME apontando para a GouPay.';
}

function uniqueRecords(records: DnsInstruction[]): DnsInstruction[] {
    const seen = new Set<string>();
    return records.filter(record => {
        const key = `${record.type}:${record.name.toLowerCase()}:${record.value}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

export function buildCloudflareDomainSnapshot(domain: string, hostname: CloudflareCustomHostname) {
    const { cnameTarget } = getConfig();
    const hostnameStatus = hostname.status || 'pending';
    const sslStatus = hostname.ssl?.status || 'pending_validation';
    const status = mapApplicationStatus(hostnameStatus, sslStatus);
    const verificationRecords: DnsInstruction[] = [];

    if (
        hostname.ownership_verification?.type?.toLowerCase() === 'txt'
        && hostname.ownership_verification.name
        && hostname.ownership_verification.value
    ) {
        verificationRecords.push({
            type: 'TXT',
            name: hostname.ownership_verification.name,
            value: hostname.ownership_verification.value,
            purpose: 'verification',
            proxied: false
        });
    }

    // HTTP validation is automatic after the routing CNAME is created. These
    // records are retained for compatibility if the provider changes the DCV
    // method for an existing hostname.
    if (hostname.ssl?.method === 'txt') {
        for (const record of hostname.ssl.validation_records || []) {
            if (record.cname && record.cname_target) {
                verificationRecords.push({
                    type: 'CNAME',
                    name: record.cname,
                    value: record.cname_target,
                    purpose: 'verification',
                    proxied: false
                });
            } else if (record.txt_name && record.txt_value) {
                verificationRecords.push({
                    type: 'TXT',
                    name: record.txt_name,
                    value: record.txt_value,
                    purpose: 'verification',
                    proxied: false
                });
            }
        }
    }

    const dnsRecords: DnsInstruction[] = [{
        type: 'CNAME',
        // A fully-qualified name works for both the zone apex and subdomains
        // in Cloudflare DNS, avoiding guesses about public suffixes.
        name: domain,
        value: cnameTarget,
        purpose: 'routing',
        proxied: true
    }];

    return {
        apexDomain: domain,
        providerHostnameId: hostname.id,
        hostnameStatus,
        sslStatus,
        verified: status === 'active',
        status,
        verificationRecords: uniqueRecords(verificationRecords),
        dnsRecords,
        lastError: readableProviderError(hostname, status)
    };
}
