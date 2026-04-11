export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

const MAX_SIZE = 200 * 1024 * 1024; // 200MB

export async function POST(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) return jsonError('Nenhum arquivo enviado');
        if (file.size > MAX_SIZE) return jsonError('Arquivo muito grande (máximo 200MB)');

        const fileExt = file.name.split('.').pop() || 'bin';
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `${auth.user.id}/files/${fileName}`;

        const buffer = await file.arrayBuffer();

        const { error } = await supabase.storage
            .from('products')
            .upload(filePath, buffer, {
                contentType: file.type || 'application/octet-stream',
                cacheControl: '3600',
                upsert: false
            });

        if (error) return jsonError('Erro ao fazer upload: ' + error.message);

        const { data: { publicUrl } } = supabase.storage
            .from('products')
            .getPublicUrl(filePath);

        return jsonSuccess({
            url: publicUrl,
            name: file.name,
            type: file.type,
            size: file.size
        });
    } catch (err: any) {
        return jsonError('Erro interno no servidor', 500);
    }
}
