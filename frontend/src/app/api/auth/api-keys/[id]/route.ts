import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { v4 as uuidv4 } from 'uuid';

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

async function getAuthorizedUser(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth || !auth.user) return { error: jsonError('Nao autorizado', 401) };
    if (auth.tokenPayload?.impersonated_by) {
        return { error: jsonError('Acao bloqueada durante acesso como vendedor', 403) };
    }
    return { auth };
}

async function checkKeyRateLimit(req: NextRequest, userId: string, action: string) {
    const ip =
        req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        req.headers.get('x-real-ip') ||
        'unknown';

    const rl = await checkRateLimit({
        key: `api_keys:${action}:${userId}:${ip}`,
        limit: 20,
        windowSecs: 3600,
        failOpen: true
    });

    return rl.allowed ? null : rateLimitResponse(rl.resetAt);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { auth, error } = await getAuthorizedUser(req);
        if (error) return error;

        const limited = await checkKeyRateLimit(req, auth!.user.id, 'patch');
        if (limited) return limited;

        const { id } = await params;
        const body = await req.json().catch(() => ({}));
        const isActive = body.is_active === true;

        const { data, error: updateError } = await supabase
            .from('api_keys')
            .update({ is_active: isActive })
            .eq('id', id)
            .eq('user_id', auth!.user.id)
            .select()
            .single();

        if (updateError || !data) return jsonError('Chave nao encontrada', 404);

        return jsonSuccess({ key: data });
    } catch (error: unknown) {
        return jsonError(getErrorMessage(error, 'Erro ao atualizar chave'), 500);
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { auth, error } = await getAuthorizedUser(req);
        if (error) return error;

        const limited = await checkKeyRateLimit(req, auth!.user.id, 'renew');
        if (limited) return limited;

        const { id } = await params;
        const newKey = 'gou_live_' + uuidv4().replace(/-/g, '');

        const { data, error: updateError } = await supabase
            .from('api_keys')
            .update({
                api_key: newKey,
                is_active: true,
                last_used_at: null
            })
            .eq('id', id)
            .eq('user_id', auth!.user.id)
            .select()
            .single();

        if (updateError || !data) return jsonError('Chave nao encontrada', 404);

        return jsonSuccess({ key: data });
    } catch (error: unknown) {
        return jsonError(getErrorMessage(error, 'Erro ao renovar chave'), 500);
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { auth, error } = await getAuthorizedUser(req);
        if (error) return error;

        const limited = await checkKeyRateLimit(req, auth!.user.id, 'delete');
        if (limited) return limited;

        const { id } = await params;
        const { error: deleteError } = await supabase
            .from('api_keys')
            .delete()
            .eq('id', id)
            .eq('user_id', auth!.user.id);

        if (deleteError) throw deleteError;

        return jsonSuccess({ success: true });
    } catch (error: unknown) {
        return jsonError(getErrorMessage(error, 'Erro ao apagar chave'), 500);
    }
}
