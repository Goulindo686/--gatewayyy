import 'server-only';

export type DnsInstruction = {
    type: 'A' | 'CNAME' | 'TXT';
    name: string;
    value: string;
    purpose: 'routing' | 'verification';
};

type VercelProjectDomain = {
    name: string;
    apexName?: string;
    verified?: boolean;
    verification?: Array<{ type?: string; domain?: string; value?: string; reason?: string }>;
};

type VercelDomainConfig = {
    configuredBy?: string | null;
    misconfigured?: boolean;
    recommendedIPv4?: Array<{ rank?: number; value?: string[] }>;
    recommendedCNAME?: Array<{ rank?: number; value?: string }>;
};

type DomainIntegrationConfig = {
    token: string;
    projectId: string;
    teamId?: string;
};

export class VercelDomainError extends Error {
    constructor(
        message: string,
        public readonly status: number,
        public readonly code?: string
    ) {
        super(message);
    }
}

function getConfig(): DomainIntegrationConfig {
    const token = process.env.CUSTOM_DOMAINS_VERCEL_TOKEN || process.env.VERCEL_API_TOKEN;
    const projectId = process.env.CUSTOM_DOMAINS_VERCEL_PROJECT_ID || process.env.VERCEL_PROJECT_ID;
    const teamId = process.env.CUSTOM_DOMAINS_VERCEL_TEAM_ID || process.env.VERCEL_TEAM_ID || process.env.VERCEL_ORG_ID;
    if (!token || !projectId) {
        throw new VercelDomainError('A integração de domínios ainda não foi configurada.', 503, 'NOT_CONFIGURED');
    }
    return { token, projectId, teamId };
}

export function isVercelDomainIntegrationConfigured(): boolean {
    const token = process.env.CUSTOM_DOMAINS_VERCEL_TOKEN || process.env.VERCEL_API_TOKEN;
    const projectId = process.env.CUSTOM_DOMAINS_VERCEL_PROJECT_ID || process.env.VERCEL_PROJECT_ID;
    return Boolean(token && projectId);
}

async function vercelRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
    const config = getConfig();
    const url = new URL(`https://api.vercel.com${path}`);
    if (config.teamId) url.searchParams.set('teamId', config.teamId);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);

    try {
        const response = await fetch(url, {
            ...init,
            signal: controller.signal,
            headers: {
                Authorization: `Bearer ${config.token}`,
                'Content-Type': 'application/json',
                ...init.headers
            },
            cache: 'no-store'
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            const error = payload?.error || payload;
            throw new VercelDomainError(
                error?.message || 'O provedor de domínio recusou a solicitação.',
                response.status,
                error?.code
            );
        }
        return payload as T;
    } catch (error) {
        if (error instanceof VercelDomainError) throw error;
        if (error instanceof Error && error.name === 'AbortError') {
            throw new VercelDomainError('O provedor de domínio demorou para responder.', 504, 'TIMEOUT');
        }
        throw new VercelDomainError('Não foi possível comunicar com o provedor de domínio.', 502, 'NETWORK_ERROR');
    } finally {
        clearTimeout(timeout);
    }
}

function projectPath(version: string, suffix: string): string {
    const { projectId } = getConfig();
    return `/${version}/projects/${encodeURIComponent(projectId)}/domains${suffix}`;
}

export function addProjectDomain(domain: string): Promise<VercelProjectDomain> {
    return vercelRequest(projectPath('v10', ''), {
        method: 'POST',
        body: JSON.stringify({ name: domain })
    });
}

export function getProjectDomain(domain: string): Promise<VercelProjectDomain> {
    return vercelRequest(projectPath('v9', `/${encodeURIComponent(domain)}`));
}

export function verifyProjectDomain(domain: string): Promise<VercelProjectDomain> {
    return vercelRequest(projectPath('v9', `/${encodeURIComponent(domain)}/verify`), { method: 'POST' });
}

export function removeProjectDomain(domain: string): Promise<unknown> {
    return vercelRequest(projectPath('v9', `/${encodeURIComponent(domain)}`), { method: 'DELETE' });
}

export function getDomainConfig(domain: string): Promise<VercelDomainConfig> {
    const { projectId } = getConfig();
    const suffix = `/v6/domains/${encodeURIComponent(domain)}/config?projectIdOrName=${encodeURIComponent(projectId)}`;
    return vercelRequest(suffix);
}

function rankedFirst<T extends { rank?: number }>(items: T[] | undefined): T | undefined {
    return [...(items || [])].sort((left, right) => (left.rank ?? 999) - (right.rank ?? 999))[0];
}

function relativeHost(domain: string, apexName: string): string {
    if (domain === apexName) return '@';
    const suffix = `.${apexName}`;
    return domain.endsWith(suffix) ? domain.slice(0, -suffix.length) : domain;
}

export function buildDomainSnapshot(domain: string, project: VercelProjectDomain, config: VercelDomainConfig) {
    const apexName = project.apexName || domain;
    const verificationRecords: DnsInstruction[] = (project.verification || [])
        .filter(item => item.type?.toUpperCase() === 'TXT' && item.domain && item.value)
        .map(item => ({
            type: 'TXT',
            name: String(item.domain),
            value: String(item.value),
            purpose: 'verification'
        }));

    let routingRecord: DnsInstruction;
    if (domain === apexName) {
        const ipv4 = rankedFirst(config.recommendedIPv4)?.value?.[0] || '76.76.21.21';
        routingRecord = { type: 'A', name: '@', value: ipv4, purpose: 'routing' };
    } else {
        const cname = rankedFirst(config.recommendedCNAME)?.value || 'cname.vercel-dns-0.com';
        routingRecord = { type: 'CNAME', name: relativeHost(domain, apexName), value: cname, purpose: 'routing' };
    }

    const active = project.verified === true && config.misconfigured === false;
    return {
        apexDomain: apexName,
        verified: project.verified === true,
        status: active ? 'active' as const : 'pending' as const,
        verificationRecords,
        dnsRecords: [routingRecord],
        lastError: config.misconfigured
            ? 'O DNS ainda não aponta corretamente para a loja.'
            : null
    };
}
