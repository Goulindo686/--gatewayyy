export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { supabase } from '@/lib/db';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import {
    CustomDomainValidationError,
    isPlatformDomain,
    normalizeCustomDomain
} from '@/lib/custom-domain-utils';
import {
    addProjectDomain,
    buildDomainSnapshot,
    getDomainConfig,
    isVercelDomainIntegrationConfigured,
    removeProjectDomain,
    verifyProjectDomain,
    VercelDomainError
} from '@/lib/vercel-domains';

const DOMAIN_FIELDS = 'id, domain, apex_domain, status, verified, verification_records, dns_records, last_error, verified_at, created_at, updated_at';

function isMissingMigration(error: { code?: string; message?: string } | null | undefined): boolean {
    return error?.code === '42P01'
        || error?.code === 'PGRST205'
        || /store_custom_domains/i.test(error?.message || '');
}

function clientIp(req: NextRequest): string {
    return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || req.headers.get('x-real-ip')
        || 'unknown';
}

function providerError(error: unknown) {
    if (!(error instanceof VercelDomainError)) return jsonError('Não foi possível processar o domínio.', 500);
    if (error.code === 'NOT_CONFIGURED') return jsonError(error.message, 503);
    if (error.status === 409) return jsonError('Este domínio já está conectado a outro projeto ou conta.', 409);
    if (error.status === 401 || error.status === 403) {
        return jsonError('A integração não tem permissão para gerenciar este domínio.', 503);
    }
    if (error.status === 404) return jsonError('O domínio não foi encontrado no provedor.', 404);
    return jsonError('O provedor não conseguiu validar o domínio agora. Tente novamente em instantes.', error.status >= 500 ? error.status : 400);
}

async function readOwnDomain(userId: string) {
    const result = await supabase
        .from('store_custom_domains')
        .select(DOMAIN_FIELDS)
        .eq('user_id', userId)
        .limit(1);
    return { row: result.data?.[0] || null, error: result.error };
}

async function rateLimitMutation(req: NextRequest, userId: string, action: string, limit: number) {
    return checkRateLimit({
        key: `store-domain:${action}:${userId}:${clientIp(req)}`,
        limit,
        windowSecs: 3600,
        failOpen: false
    });
}

export async function GET(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);

    const { row, error } = await readOwnDomain(auth.user.id);
    if (error) {
        if (isMissingMigration(error)) {
            return jsonSuccess({
                domain: null,
                integration_configured: isVercelDomainIntegrationConfigured(),
                migration_required: true
            });
        }
        console.error('Store domain load error:', error);
        return jsonError('Erro ao carregar o domínio da loja.', 500);
    }

    return jsonSuccess({
        domain: row,
        integration_configured: isVercelDomainIntegrationConfigured(),
        migration_required: false
    });
}

export async function POST(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);

    const rateLimit = await rateLimitMutation(req, auth.user.id, 'connect', 5);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit.resetAt);

    let domain: string;
    try {
        const body = await req.json();
        domain = normalizeCustomDomain(body.domain);
    } catch (error) {
        if (error instanceof CustomDomainValidationError) return jsonError(error.message);
        return jsonError('Dados inválidos.');
    }

    if (isPlatformDomain(domain)) return jsonError('Esse endereço pertence à plataforma e não pode ser conectado.');

    const [{ row: ownDomain, error: ownError }, storeResult] = await Promise.all([
        readOwnDomain(auth.user.id),
        supabase.from('users').select('store_slug').eq('id', auth.user.id).limit(1)
    ]);

    if (ownError) {
        if (isMissingMigration(ownError)) {
            return jsonError('Execute a migration 030_add_store_custom_domains.sql no Supabase antes de conectar.', 503);
        }
        return jsonError('Erro ao validar o domínio.', 500);
    }
    if (storeResult.error || !storeResult.data?.[0]?.store_slug) {
        return jsonError('Configure e salve o link da sua loja antes de conectar um domínio.');
    }
    if (ownDomain) {
        if (ownDomain.domain === domain) return jsonSuccess({ domain: ownDomain });
        return jsonError('Remova o domínio atual antes de conectar outro.', 409);
    }

    const collision = await supabase
        .from('store_custom_domains')
        .select('id')
        .ilike('domain', domain)
        .neq('user_id', auth.user.id)
        .limit(1);
    if (collision.error) return jsonError('Erro ao validar a disponibilidade do domínio.', 500);
    if ((collision.data || []).length > 0) return jsonError('Este domínio já está vinculado a outra loja.', 409);

    let addedToProvider = false;
    try {
        const projectDomain = await addProjectDomain(domain);
        addedToProvider = true;

        const config = await getDomainConfig(domain);
        const snapshot = buildDomainSnapshot(domain, projectDomain, config);
        const now = new Date().toISOString();
        const insert = await supabase
            .from('store_custom_domains')
            .insert({
                user_id: auth.user.id,
                domain,
                apex_domain: snapshot.apexDomain,
                status: snapshot.status,
                verified: snapshot.verified,
                verification_records: snapshot.verificationRecords,
                dns_records: snapshot.dnsRecords,
                last_error: snapshot.lastError,
                verified_at: snapshot.status === 'active' ? now : null,
                updated_at: now
            })
            .select(DOMAIN_FIELDS)
            .limit(1);

        if (insert.error || !insert.data?.[0]) {
            if (addedToProvider) await removeProjectDomain(domain).catch(() => undefined);
            console.error('Store domain insert error:', insert.error);
            return jsonError('Não foi possível salvar o domínio. Nenhuma alteração foi mantida.', 500);
        }

        return jsonSuccess({ domain: insert.data[0], message: 'Domínio adicionado. Configure os registros DNS exibidos.' }, 201);
    } catch (error) {
        if (addedToProvider) await removeProjectDomain(domain).catch(() => undefined);
        return providerError(error);
    }
}

export async function PUT(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);

    const rateLimit = await rateLimitMutation(req, auth.user.id, 'verify', 20);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit.resetAt);

    const { row, error } = await readOwnDomain(auth.user.id);
    if (error || !row) return jsonError('Nenhum domínio conectado.', 404);

    try {
        const verifiedDomain = await verifyProjectDomain(row.domain);
        const config = await getDomainConfig(row.domain);
        const snapshot = buildDomainSnapshot(row.domain, verifiedDomain, config);
        const now = new Date().toISOString();
        const update = await supabase
            .from('store_custom_domains')
            .update({
                apex_domain: snapshot.apexDomain,
                status: snapshot.status,
                verified: snapshot.verified,
                verification_records: snapshot.verificationRecords,
                dns_records: snapshot.dnsRecords,
                last_error: snapshot.lastError,
                verified_at: snapshot.status === 'active' ? (row.verified_at || now) : null,
                updated_at: now
            })
            .eq('id', row.id)
            .eq('user_id', auth.user.id)
            .select(DOMAIN_FIELDS)
            .limit(1);

        if (update.error || !update.data?.[0]) return jsonError('Erro ao atualizar a verificação do domínio.', 500);
        const message = snapshot.status === 'active'
            ? 'Domínio verificado e ativo.'
            : 'O DNS ainda não foi reconhecido. Aguarde a propagação e tente novamente.';
        return jsonSuccess({ domain: update.data[0], message });
    } catch (providerFailure) {
        return providerError(providerFailure);
    }
}

export async function DELETE(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);

    const rateLimit = await rateLimitMutation(req, auth.user.id, 'remove', 5);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit.resetAt);

    const { row, error } = await readOwnDomain(auth.user.id);
    if (error || !row) return jsonError('Nenhum domínio conectado.', 404);

    try {
        await removeProjectDomain(row.domain);
    } catch (providerFailure) {
        if (!(providerFailure instanceof VercelDomainError) || providerFailure.status !== 404) {
            return providerError(providerFailure);
        }
    }

    const removal = await supabase
        .from('store_custom_domains')
        .delete()
        .eq('id', row.id)
        .eq('user_id', auth.user.id);
    if (removal.error) return jsonError('O domínio foi removido do provedor, mas não do cadastro. Tente novamente.', 500);

    return jsonSuccess({ message: 'Domínio removido. A URL original da loja continua disponível.' });
}
