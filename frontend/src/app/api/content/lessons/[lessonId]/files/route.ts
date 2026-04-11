import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';

// Verifica se a aula pertence ao vendedor logado
async function assertLessonOwnership(lessonId: string, userId: string) {
    const { data } = await supabase
        .from('product_lessons')
        .select('module_id, product_modules(product_id, products(user_id))')
        .eq('id', lessonId)
        .single();
    const owner = (data?.product_modules as any)?.products?.user_id;
    return owner === userId;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
    const { lessonId } = await params;
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);

    const isOwner = await assertLessonOwnership(lessonId, auth.user.id);
    if (!isOwner) return jsonError('Acesso negado', 403);

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

    const isOwner = await assertLessonOwnership(lessonId, auth.user.id);
    if (!isOwner) return jsonError('Acesso negado', 403);

    try {
        const { title, file_url, file_type } = await req.json();
        if (!title || !file_url) return jsonError('Título e URL são obrigatórios');

        const { data, error } = await supabase
            .from('product_files')
            .insert({ lesson_id: lessonId, title, file_url, file_type: file_type || 'file' })
            .select()
            .single();

        if (error) return jsonError('Erro ao adicionar arquivo: ' + error.message);
        return jsonSuccess({ file: data, message: 'Arquivo adicionado!' }, 201);
    } catch {
        return jsonError('Dados inválidos', 400);
    }
}
