import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { enforceContentRateLimit, getOwnedFile } from '@/lib/content-access';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
    const { fileId } = await params;
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);
    const limited = await enforceContentRateLimit(auth.user.id, 'write');
    if (limited) return limited;
    const ownedFile = await getOwnedFile(fileId, auth.user.id);
    if (!ownedFile) return jsonError('Arquivo não encontrado', 404);

    const { error } = await supabase
        .from('product_files')
        .delete()
        .eq('id', fileId)
        .eq('lesson_id', ownedFile.lesson_id);

    if (error) return jsonError('Erro ao remover arquivo');
    return jsonSuccess({ message: 'Arquivo removido!' });
}
