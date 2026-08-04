import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { enforceContentRateLimit, getOwnedModule } from '@/lib/content-access';
import { normalizeOrder, normalizeSafeText, requestBodyTooLarge, SecurityValidationError } from '@/lib/request-security';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ moduleId: string }> }) {
    const { moduleId } = await params;
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);
    const limited = await enforceContentRateLimit(auth.user.id, 'write');
    if (limited) return limited;
    if (requestBodyTooLarge(req, 16_384)) return jsonError('Requisição muito grande', 413);
    const ownedModule = await getOwnedModule(moduleId, auth.user.id);
    if (!ownedModule) return jsonError('Módulo não encontrado', 404);

    try {
        const { title, order } = await req.json();
        const safeTitle = normalizeSafeText(title, { field: 'Título', maxLength: 160, required: true });
        const safeOrder = normalizeOrder(order);

        const { data: module, error } = await supabase
            .from('product_modules')
            .update({ title: safeTitle, order: safeOrder, updated_at: new Date().toISOString() })
            .eq('id', moduleId)
            .eq('product_id', ownedModule.product_id)
            .select()
            .single();

        if (error) return jsonError('Erro ao atualizar módulo');
        return jsonSuccess({ module, message: 'Módulo atualizado!' });
    } catch (err) {
        if (err instanceof SecurityValidationError) return jsonError(err.message, 400);
        return jsonError('Dados inválidos', 400);
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ moduleId: string }> }) {
    const { moduleId } = await params;
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);
    const limited = await enforceContentRateLimit(auth.user.id, 'write');
    if (limited) return limited;
    const ownedModule = await getOwnedModule(moduleId, auth.user.id);
    if (!ownedModule) return jsonError('Módulo não encontrado', 404);

    const { error } = await supabase
        .from('product_modules')
        .delete()
        .eq('id', moduleId)
        .eq('product_id', ownedModule.product_id);

    if (error) return jsonError('Erro ao excluir módulo');
    return jsonSuccess({ message: 'Módulo excluído!' });
}
