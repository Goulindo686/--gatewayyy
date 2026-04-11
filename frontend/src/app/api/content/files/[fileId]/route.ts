import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
    const { fileId } = await params;
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);

    // Verifica ownership via join
    const { data: file } = await supabase
        .from('product_files')
        .select('lesson_id, product_lessons(module_id, product_modules(product_id, products(user_id)))')
        .eq('id', fileId)
        .single();

    if (!file) return jsonError('Arquivo não encontrado', 404);

    const owner = (file.product_lessons as any)?.product_modules?.products?.user_id;
    if (owner !== auth.user.id) return jsonError('Acesso negado', 403);

    const { error } = await supabase
        .from('product_files')
        .delete()
        .eq('id', fileId);

    if (error) return jsonError('Erro ao remover arquivo');
    return jsonSuccess({ message: 'Arquivo removido!' });
}
