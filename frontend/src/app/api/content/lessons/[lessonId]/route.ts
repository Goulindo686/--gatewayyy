import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { enforceContentRateLimit, getOwnedLesson } from '@/lib/content-access';
import { normalizeHttpUrl, normalizeOrder, normalizeSafeText, requestBodyTooLarge, SecurityValidationError } from '@/lib/request-security';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
    const { lessonId } = await params;
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);
    const limited = await enforceContentRateLimit(auth.user.id, 'write');
    if (limited) return limited;
    if (requestBodyTooLarge(req, 65_536)) return jsonError('Requisição muito grande', 413);
    const ownedLesson = await getOwnedLesson(lessonId, auth.user.id);
    if (!ownedLesson) return jsonError('Aula não encontrada', 404);

    try {
        const body = await req.json();
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (body.title !== undefined) updates.title = normalizeSafeText(body.title, { field: 'Título', maxLength: 200, required: true });
        if (body.description !== undefined) updates.description = normalizeSafeText(body.description, { field: 'Descrição', maxLength: 5_000 });
        if (body.content !== undefined) updates.content = normalizeSafeText(body.content, { field: 'Conteúdo', maxLength: 50_000 });
        if (body.video_url !== undefined) updates.video_url = normalizeHttpUrl(body.video_url, { field: 'URL do vídeo' });
        if (body.video_source !== undefined) updates.video_source = normalizeSafeText(body.video_source, { field: 'Fonte do vídeo', maxLength: 40, required: true });
        if (body.order !== undefined) updates.order = normalizeOrder(body.order);
        if (Object.keys(updates).length === 1) return jsonError('Nenhum campo válido para atualizar', 400);

        const { data: lesson, error } = await supabase
            .from('product_lessons')
            .update(updates)
            .eq('id', lessonId)
            .eq('module_id', ownedLesson.module_id)
            .select()
            .single();

        if (error) return jsonError('Erro ao atualizar aula');
        return jsonSuccess({ lesson, message: 'Aula atualizada!' });
    } catch (err) {
        if (err instanceof SecurityValidationError) return jsonError(err.message, 400);
        return jsonError('Dados inválidos', 400);
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
    const { lessonId } = await params;
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);
    const limited = await enforceContentRateLimit(auth.user.id, 'write');
    if (limited) return limited;
    const ownedLesson = await getOwnedLesson(lessonId, auth.user.id);
    if (!ownedLesson) return jsonError('Aula não encontrada', 404);

    const { error } = await supabase
        .from('product_lessons')
        .delete()
        .eq('id', lessonId)
        .eq('module_id', ownedLesson.module_id);

    if (error) return jsonError('Erro ao excluir aula');
    return jsonSuccess({ message: 'Aula excluída!' });
}
