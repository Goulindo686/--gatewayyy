export const dynamic = 'force-dynamic';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest } from 'next/server';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { supabase } from '@/lib/db';
import {
    UNIQUE_DELIVERY_BUCKET,
    requireOwnedProduct,
    withSensitiveResponseHeaders,
} from '@/lib/unique-deliveries';

type RouteContext = {
    params: Promise<{ id: string; deliveryId: string }>;
};

export async function DELETE(req: NextRequest, { params }: RouteContext) {
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

        const { data: files, error: filesError } = await supabase
            .from('unique_delivery_files')
            .select('storage_path')
            .eq('item_id', deliveryId)
            .eq('seller_id', auth.user.id);
        if (filesError) throw filesError;

        const paths = (files || []).map((file: any) => file.storage_path);
        if (paths.length) {
            const { error: storageError } = await supabase.storage
                .from(UNIQUE_DELIVERY_BUCKET)
                .remove(paths);
            if (storageError) {
                return withSensitiveResponseHeaders(
                    jsonError('Nao foi possivel remover os arquivos protegidos.', 500),
                );
            }
        }

        const { error } = await supabase
            .from('unique_delivery_items')
            .delete()
            .eq('id', deliveryId)
            .eq('product_id', productId)
            .eq('seller_id', auth.user.id)
            .eq('status', 'available');
        if (error) throw error;

        return withSensitiveResponseHeaders(jsonSuccess({ deleted: true }));
    } catch {
        console.error('[UNIQUE DELIVERY] Failed to delete inventory item');
        return withSensitiveResponseHeaders(
            jsonError('Erro ao excluir a entrega.', 500),
        );
    }
}
