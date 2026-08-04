import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { enforceContentRateLimit, getOwnedLesson } from '@/lib/content-access';
import { normalizeHttpUrl, normalizeSafeText, requestBodyTooLarge, SecurityValidationError } from '@/lib/request-security';

export async function GET(req: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
    const { lessonId } = await params;
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);
    const limited = await enforceContentRateLimit(auth.user.id, 'read');
    if (limited) return limited;
    if (!await getOwnedLesson(lessonId, auth.user.id)) return jsonError('Aula não encontrada', 404);

    const { data, error } = await supabase
        .from('product_files')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('created_at', { ascending: true });

    if (error) return jsonError('Erro ao listar arquivos');
    return jsonSuccess({ files: data });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
    const { lessonId } = await params;
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);
    const limited = await enforceContentRateLimit(auth.user.id, 'write');
    if (limited) return limited;
    if (requestBodyTooLarge(req, 16_384)) return jsonError('Requisição muito grande', 413);
    if (!await getOwnedLesson(lessonId, auth.user.id)) return jsonError('Aula não encontrada', 404);

    try {
        const { title, file_url, file_type } = await req.json();
        const safeTitle = normalizeSafeText(title, { field: 'Título', maxLength: 200, required: true });
        const safeUrl = normalizeHttpUrl(file_url, { field: 'URL do arquivo', required: true });
        const safeType = normalizeSafeText(file_type || 'file', { field: 'Tipo do arquivo', maxLength: 40, required: true });

        const { data, error } = await supabase
            .from('product_files')
            .insert({ lesson_id: lessonId, title: safeTitle, file_url: safeUrl, file_type: safeType })
            .select()
            .single();

        if (error) return jsonError('Erro ao adicionar arquivo');
        return jsonSuccess({ file: data, message: 'Arquivo adicionado!' }, 201);
    } catch (err) {
        if (err instanceof SecurityValidationError) return jsonError(err.message, 400);
        return jsonError('Dados inválidos', 400);
    }
}
