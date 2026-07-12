export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);

    try {
        const ip =
            req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
            req.headers.get('x-real-ip') ||
            'unknown';

        const rlIp = await checkRateLimit({ key: `upload:ip:${ip}`, limit: 60, windowSecs: 3600, failOpen: true });
        if (!rlIp.allowed) return rateLimitResponse(rlIp.resetAt);

        const rlUser = await checkRateLimit({ key: `upload:user:${auth.user.id}`, limit: 60, windowSecs: 3600, failOpen: true });
        if (!rlUser.allowed) return rateLimitResponse(rlUser.resetAt);

        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return jsonError('Nenhum arquivo enviado');
        }

        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');

        if (!isImage && !isVideo) {
            return jsonError('Apenas imagens e vídeos são permitidos');
        }

        // Validate file size
        // Max 5MB for images, 50MB for videos
        const maxSize = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
        if (file.size > maxSize) {
            return jsonError(isVideo ? 'Vídeo muito grande (máximo 50MB)' : 'Imagem muito grande (máximo 5MB)');
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `${auth.user.id}/${fileName}`;

        const buffer = await file.arrayBuffer();

        const { data, error } = await supabase.storage
            .from('products')
            .upload(filePath, buffer, {
                contentType: file.type,
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error('Storage upload error:', error);
            return jsonError('Erro ao subir imagem: ' + error.message);
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('products')
            .getPublicUrl(filePath);

        return jsonSuccess({ url: publicUrl });
    } catch (err: any) {
        console.error('Upload error:', err);
        return jsonError('Erro interno no servidor', 500);
    }
}
