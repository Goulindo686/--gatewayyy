import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { enforceContentRateLimit, getOwnedModule } from '@/lib/content-access';
import { normalizeHttpUrl, normalizeOrder, normalizeSafeText, requestBodyTooLarge, SecurityValidationError } from '@/lib/request-security';

export async function GET(req: NextRequest, { params }: { params: Promise<{ moduleId: string }> }) {
    const { moduleId } = await params;
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);
    const limited = await enforceContentRateLimit(auth.user.id, 'read');
    if (limited) return limited;
    if (!await getOwnedModule(moduleId, auth.user.id)) return jsonError('Módulo não encontrado', 404);

    const { data: lessons, error } = await supabase
        .from('product_lessons')
        .select('*')
        .eq('module_id', moduleId)
        .order('order', { ascending: true });

    if (error) return jsonError('Erro ao carregar aulas');
    return jsonSuccess({ lessons });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ moduleId: string }> }) {
    const { moduleId } = await params;
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);
    const limited = await enforceContentRateLimit(auth.user.id, 'write');
    if (limited) return limited;
    if (requestBodyTooLarge(req, 65_536)) return jsonError('Requisição muito grande', 413);
    if (!await getOwnedModule(moduleId, auth.user.id)) return jsonError('Módulo não encontrado', 404);

    try {
        const body = await req.json();
        const title = normalizeSafeText(body.title, { field: 'Título', maxLength: 200, required: true });
        const description = normalizeSafeText(body.description, { field: 'Descrição', maxLength: 5_000 });
        const content = normalizeSafeText(body.content, { field: 'Conteúdo', maxLength: 50_000 });
        const videoUrl = normalizeHttpUrl(body.video_url, { field: 'URL do vídeo' });
        const videoSource = normalizeSafeText(body.video_source || 'youtube', { field: 'Fonte do vídeo', maxLength: 40, required: true });

        const { data: lesson, error } = await supabase
            .from('product_lessons')
            .insert({
                module_id: moduleId,
                title,
                description,
                video_url: videoUrl,
                video_source: videoSource,
                order: normalizeOrder(body.order),
                content,
            })
            .select()
            .single();

        if (error) return jsonError('Erro ao criar aula');
        return jsonSuccess({ lesson, message: 'Aula criada com sucesso!' }, 201);
    } catch (err) {
        if (err instanceof SecurityValidationError) return jsonError(err.message, 400);
        return jsonError('Dados inválidos', 400);
    }
}
