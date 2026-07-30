export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { supabase } from '@/lib/db';
import {
    UNIQUE_DELIVERY_BUCKET,
    requireOwnedProduct,
    withSensitiveResponseHeaders,
} from '@/lib/unique-deliveries';

type RouteContext = {
    params: Promise<{ id: string; deliveryId: string; fileId: string }>;
};

export async function DELETE(req: NextRequest, { params }: RouteContext) {
    const { id: productId, deliveryId, fileId } = await params;
    const auth = await getAuthUser(req);
    if (!auth) {
        return withSensitiveResponseHeaders(jsonError('Nao autorizado', 401));
    }

    try {
        const product = await requireOwnedProduct(productId, auth.user.id);
        if (!product) {
            return withSensitiveResponseHeaders(jsonError('Arquivo nao encontrado', 404));
        }

        const { data: item, error: itemError } = await supabase
            .from('unique_delivery_items')
            .select('id, status')
            .eq('id', deliveryId)
            .eq('product_id', productId)
            .eq('seller_id', auth.user.id)
            .maybeSingle();
        if (itemError) throw itemError;
        if (!item || item.status !== 'available') {
            return withSensitiveResponseHeaders(jsonError('Arquivo nao encontrado', 404));
        }

        const { data: file, error: fileError } = await supabase
            .from('unique_delivery_files')
            .select('id, storage_path')
            .eq('id', fileId)
            .eq('item_id', deliveryId)
            .eq('product_id', productId)
            .eq('seller_id', auth.user.id)
            .maybeSingle();
        if (fileError) throw fileError;
        if (!file) {
            return withSensitiveResponseHeaders(jsonError('Arquivo nao encontrado', 404));
        }

        const { error: storageError } = await supabase.storage
            .from(UNIQUE_DELIVERY_BUCKET)
            .remove([file.storage_path]);
        if (storageError) throw storageError;

        const { error } = await supabase
            .from('unique_delivery_files')
            .delete()
            .eq('id', file.id)
            .eq('seller_id', auth.user.id);
        if (error) throw error;

        return withSensitiveResponseHeaders(jsonSuccess({ deleted: true }));
    } catch {
        console.error('[UNIQUE DELIVERY] Failed to delete encrypted file');
        return withSensitiveResponseHeaders(
            jsonError('Erro ao excluir o arquivo.', 500),
        );
    }
}

