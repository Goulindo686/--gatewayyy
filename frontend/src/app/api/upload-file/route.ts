export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

const MAX_SIZE = 100 * 1024 * 1024; // 100MB

function jsonErr(msg: string, status = 400) {
    return NextResponse.json({ error: msg }, { status });
}

export async function POST(req: NextRequest) {
    try {
        const auth = await getAuthUser(req);
        if (!auth) return jsonErr('Não autorizado', 401);

        let formData: FormData;
        try {
            formData = await req.formData();
        } catch (e: any) {
            return jsonErr('Arquivo muito grande ou formato inválido. Máximo 100MB.', 413);
        }

        const file = formData.get('file') as File | null;
        if (!file) return jsonErr('Nenhum arquivo enviado');

        if (file.size > MAX_SIZE) {
            return jsonErr(`Arquivo muito grande. Máximo 100MB (recebido: ${(file.size / 1024 / 1024).toFixed(1)}MB)`, 413);
        }

        const originalName = file.name || 'arquivo';
        const fileExt = originalName.split('.').pop() || 'bin';
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

        if (error) {
            console.error('Supabase storage error:', error);
            return jsonErr('Erro ao fazer upload: ' + error.message);
        }

        const { data: { publicUrl } } = supabase.storage
            .from('products')
            .getPublicUrl(filePath);

        return NextResponse.json({
            success: true,
            url: publicUrl,
            name: originalName,
            type: file.type,
            size: file.size
        });
    } catch (err: any) {
        console.error('Upload route error:', err);
        return jsonErr('Erro interno no servidor: ' + (err.message || 'desconhecido'), 500);
    }
}
