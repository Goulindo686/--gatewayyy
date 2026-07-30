export const dynamic = 'force-dynamic';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { supabase } from '@/lib/db';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { encryptUniqueDeliveryFile } from '@/lib/unique-delivery-crypto';
import {
    UNIQUE_DELIVERY_BUCKET,
    UNIQUE_DELIVERY_MAX_FILE_BYTES,
    normalizeUniqueDeliveryContentType,
    normalizeUniqueDeliveryFilename,
    requestIp,
    requireOwnedProduct,
    withSensitiveResponseHeaders,
} from '@/lib/unique-deliveries';

type RouteContext = {
    params: Promise<{ id: string; deliveryId: string }>;
};

export async function POST(req: NextRequest, { params }: RouteContext) {
    const { id: productId, deliveryId } = await params;
    const auth = await getAuthUser(req);
    if (!auth) {
        return withSensitiveResponseHeaders(jsonError('Nao autorizado', 401));
    }

    try {
        const product = await requireOwnedProduct(productId, auth.user.id);
        if (!product) {
            return withSensitiveResponseHeaders(jsonError('Entrega nao encontrada', 404));
        }

        const [ipLimit, userLimit] = await Promise.all([
            checkRateLimit({
                key: `unique-delivery:file:ip:${requestIp(req)}`,
                limit: 40,
                windowSecs: 3600,
                failOpen: false,
            }),
            checkRateLimit({
                key: `unique-delivery:file:user:${auth.user.id}`,
                limit: 40,
                windowSecs: 3600,
                failOpen: false,
            }),
        ]);
        if (!ipLimit.allowed) return rateLimitResponse(ipLimit.resetAt);
        if (!userLimit.allowed) return rateLimitResponse(userLimit.resetAt);

        const { data: item, error: itemError } = await supabase
            .from('unique_delivery_items')
            .select('id, status')
            .eq('id', deliveryId)
            .eq('product_id', productId)
            .eq('seller_id', auth.user.id)
            .maybeSingle();
        if (itemError) throw itemError;
        if (!item || item.status !== 'available') {
            return withSensitiveResponseHeaders(jsonError('Entrega nao encontrada', 404));
        }

        const formData = await req.formData();
        const file = formData.get('file');
        if (!(file instanceof File)) {
            return withSensitiveResponseHeaders(jsonError('Selecione um arquivo.'));
        }
        if (file.size < 1 || file.size > UNIQUE_DELIVERY_MAX_FILE_BYTES) {
            return withSensitiveResponseHeaders(
                jsonError('O arquivo deve ter no maximo 15 MB.', 413),
            );
        }

        const filename = normalizeUniqueDeliveryFilename(file.name);
        const fileId = uuidv4();
        const encrypted = encryptUniqueDeliveryFile(
            productId,
            deliveryId,
            fileId,
            Buffer.from(await file.arrayBuffer()),
            {
                filename,
                contentType: normalizeUniqueDeliveryContentType(file.type),
            },
        );
        const storagePath = `${auth.user.id}/${productId}/${deliveryId}/${fileId}.enc`;
        const encryptedBytes = Buffer.from(encrypted.bytes.ciphertext, 'base64');

        const { error: uploadError } = await supabase.storage
            .from(UNIQUE_DELIVERY_BUCKET)
            .upload(storagePath, encryptedBytes, {
                contentType: 'application/octet-stream',
                cacheControl: '0',
                upsert: false,
            });
        if (uploadError) {
            return withSensitiveResponseHeaders(
                jsonError('Nao foi possivel armazenar o arquivo protegido.', 500),
            );
        }

        const { error: insertError } = await supabase
            .from('unique_delivery_files')
            .insert({
                id: fileId,
                item_id: deliveryId,
                product_id: productId,
                seller_id: auth.user.id,
                storage_path: storagePath,
                metadata_ciphertext: encrypted.metadata.ciphertext,
                metadata_iv: encrypted.metadata.iv,
                metadata_auth_tag: encrypted.metadata.authTag,
                file_iv: encrypted.bytes.iv,
                file_auth_tag: encrypted.bytes.authTag,
                encryption_version: encrypted.bytes.encryptionVersion,
                size_bytes: file.size,
            });
        if (insertError) {
            await supabase.storage.from(UNIQUE_DELIVERY_BUCKET).remove([storagePath]);
            throw insertError;
        }

        return withSensitiveResponseHeaders(jsonSuccess({
            file: { id: fileId, protected: true, size: file.size },
        }, 201));
    } catch (error: any) {
        if (/tipo de arquivo|UNIQUE_DELIVERY_ENCRYPTION_KEY/i.test(String(error?.message || ''))) {
            const status = /UNIQUE_DELIVERY_ENCRYPTION_KEY/.test(error.message) ? 503 : 400;
            return withSensitiveResponseHeaders(jsonError(
                status === 503 ? 'Criptografia do modulo nao configurada.' : error.message,
                status,
            ));
        }
        console.error('[UNIQUE DELIVERY] Failed to upload encrypted file');
        return withSensitiveResponseHeaders(
            jsonError('Erro ao proteger o arquivo.', 500),
        );
    }
}
