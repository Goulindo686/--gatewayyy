export const dynamic = 'force-dynamic';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest } from 'next/server';
import { getAuthUser, jsonError } from '@/lib/auth';
import { supabase } from '@/lib/db';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import {
    decryptUniqueDeliveryFile,
    hashUniqueDeliveryIp,
} from '@/lib/unique-delivery-crypto';
import {
    UNIQUE_DELIVERY_BUCKET,
    requestIp,
    withSensitiveResponseHeaders,
} from '@/lib/unique-deliveries';

type RouteContext = {
    params: Promise<{ fulfillmentId: string; fileId: string }>;
};

function contentDispositionFilename(filename: string) {
    const encoded = encodeURIComponent(filename)
        .replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
    return `attachment; filename*=UTF-8''${encoded}`;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
    const { fulfillmentId, fileId } = await params;
    const auth = await getAuthUser(req);
    if (!auth || auth.user.email_verified !== true) {
        return withSensitiveResponseHeaders(jsonError('Arquivo nao encontrado', 404));
    }

    const normalizedEmail = String(auth.user.email || '').toLowerCase().trim();
    if (!normalizedEmail) {
        return withSensitiveResponseHeaders(jsonError('Arquivo nao encontrado', 404));
    }

    try {
        const ip = requestIp(req);
        const [ipLimit, userLimit] = await Promise.all([
            checkRateLimit({
                key: `unique-delivery:download:ip:${ip}`,
                limit: 120,
                windowSecs: 3600,
                failOpen: false,
            }),
            checkRateLimit({
                key: `unique-delivery:download:user:${auth.user.id}`,
                limit: 120,
                windowSecs: 3600,
                failOpen: false,
            }),
        ]);
        if (!ipLimit.allowed) return rateLimitResponse(ipLimit.resetAt);
        if (!userLimit.allowed) return rateLimitResponse(userLimit.resetAt);

        const { data: fulfillment, error: fulfillmentError } = await supabase
            .from('unique_delivery_fulfillments')
            .select('id, order_id, product_id, seller_id, item_id')
            .eq('id', fulfillmentId)
            .eq('status', 'assigned')
            .maybeSingle();
        if (fulfillmentError) throw fulfillmentError;
        if (!fulfillment) {
            return withSensitiveResponseHeaders(jsonError('Arquivo nao encontrado', 404));
        }

        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('id, seller_id, status')
            .eq('id', fulfillment.order_id)
            .eq('seller_id', fulfillment.seller_id)
            .eq('buyer_email_normalized', normalizedEmail)
            .eq('status', 'paid')
            .maybeSingle();
        if (orderError) throw orderError;
        if (!order) {
            return withSensitiveResponseHeaders(jsonError('Arquivo nao encontrado', 404));
        }

        const { data: file, error: fileError } = await supabase
            .from('unique_delivery_files')
            .select(`
                id,
                item_id,
                product_id,
                seller_id,
                storage_path,
                metadata_ciphertext,
                metadata_iv,
                metadata_auth_tag,
                file_iv,
                file_auth_tag,
                encryption_version,
                size_bytes
            `)
            .eq('id', fileId)
            .eq('item_id', fulfillment.item_id)
            .eq('product_id', fulfillment.product_id)
            .eq('seller_id', fulfillment.seller_id)
            .maybeSingle();
        if (fileError) throw fileError;
        if (!file) {
            return withSensitiveResponseHeaders(jsonError('Arquivo nao encontrado', 404));
        }

        const { data: encryptedObject, error: downloadError } = await supabase.storage
            .from(UNIQUE_DELIVERY_BUCKET)
            .download(file.storage_path);
        if (downloadError || !encryptedObject) throw downloadError || new Error('Missing file');

        const encryptedCiphertext = Buffer.from(
            await encryptedObject.arrayBuffer(),
        ).toString('base64');
        const decrypted = decryptUniqueDeliveryFile(
            fulfillment.product_id,
            fulfillment.item_id,
            file.id,
            {
                ciphertext: encryptedCiphertext,
                iv: file.file_iv,
                authTag: file.file_auth_tag,
                encryptionVersion: file.encryption_version,
            },
            {
                ciphertext: file.metadata_ciphertext,
                iv: file.metadata_iv,
                authTag: file.metadata_auth_tag,
                encryptionVersion: file.encryption_version,
            },
        );

        await supabase.from('unique_delivery_access_logs').insert({
            fulfillment_id: fulfillment.id,
            user_id: auth.user.id,
            file_id: file.id,
            action: 'download',
            ip_hash: hashUniqueDeliveryIp(ip),
        });

        const response = new Response(new Uint8Array(decrypted.bytes), {
            status: 200,
            headers: {
                'Content-Type': decrypted.metadata.contentType || 'application/octet-stream',
                'Content-Length': String(decrypted.bytes.length),
                'Content-Disposition': contentDispositionFilename(decrypted.metadata.filename),
            },
        });
        return withSensitiveResponseHeaders(response);
    } catch (error: any) {
        if (/UNIQUE_DELIVERY_ENCRYPTION_KEY/.test(String(error?.message || ''))) {
            return withSensitiveResponseHeaders(
                jsonError('Arquivo protegido temporariamente indisponivel.', 503),
            );
        }
        console.error('[UNIQUE DELIVERY] Failed to download protected file');
        return withSensitiveResponseHeaders(jsonError('Arquivo nao encontrado', 404));
    }
}
