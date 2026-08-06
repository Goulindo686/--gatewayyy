export const dynamic = 'force-dynamic';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest } from 'next/server';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { supabase } from '@/lib/db';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import {
    decryptUniqueDeliveryPayload,
    hashUniqueDeliveryIp,
} from '@/lib/unique-delivery-crypto';
import {
    requestIp,
    withSensitiveResponseHeaders,
} from '@/lib/unique-deliveries';

function encryptedPayload(row: any) {
    return {
        ciphertext: row.payload_ciphertext,
        iv: row.payload_iv,
        authTag: row.payload_auth_tag,
        encryptionVersion: row.encryption_version,
    };
}

export async function GET(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) {
        return withSensitiveResponseHeaders(jsonError('Nao autorizado', 401));
    }
    if (auth.user.email_verified !== true) {
        return withSensitiveResponseHeaders(
            jsonError('Confirme seu e-mail antes de acessar suas entregas.', 403),
        );
    }

    const normalizedEmail = String(auth.user.email || '').toLowerCase().trim();
    if (!normalizedEmail) {
        return withSensitiveResponseHeaders(jsonError('Conta sem e-mail valido.', 403));
    }

    try {
        const ip = requestIp(req);
        const [ipLimit, userLimit] = await Promise.all([
            checkRateLimit({
                key: `unique-delivery:view:ip:${ip}`,
                limit: 120,
                windowSecs: 3600,
                failOpen: false,
            }),
            checkRateLimit({
                key: `unique-delivery:view:user:${auth.user.id}`,
                limit: 120,
                windowSecs: 3600,
                failOpen: false,
            }),
        ]);
        if (!ipLimit.allowed) return rateLimitResponse(ipLimit.resetAt);
        if (!userLimit.allowed) return rateLimitResponse(userLimit.resetAt);

        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('id, product_id, seller_id, created_at')
            .eq('buyer_email_normalized', normalizedEmail)
            .eq('status', 'paid')
            .order('created_at', { ascending: false });
        if (ordersError) throw ordersError;
        if (!orders?.length) {
            return withSensitiveResponseHeaders(jsonSuccess({ deliveries: [] }));
        }

        const ordersById = new Map(orders.map((order: any) => [order.id, order]));
        const { data: fulfillments, error: fulfillmentError } = await supabase
            .from('unique_delivery_fulfillments')
            .select('id, order_id, product_id, seller_id, item_id, assigned_at, first_viewed_at, view_count')
            .in('order_id', orders.map((order: any) => order.id))
            .eq('status', 'assigned')
            .order('assigned_at', { ascending: false });
        if (fulfillmentError) throw fulfillmentError;
        if (!fulfillments?.length) {
            return withSensitiveResponseHeaders(jsonSuccess({ deliveries: [] }));
        }

        const validFulfillments = fulfillments.filter((fulfillment: any) => {
            const order: any = ordersById.get(fulfillment.order_id);
            return order
                && order.seller_id === fulfillment.seller_id
                && fulfillment.item_id;
        });
        if (!validFulfillments.length) {
            return withSensitiveResponseHeaders(jsonSuccess({ deliveries: [] }));
        }

        const itemIds = validFulfillments.map((entry: any) => entry.item_id);
        const productIds = Array.from(new Set(
            validFulfillments.map((entry: any) => entry.product_id),
        ));
        const [itemsResult, productsResult] = await Promise.all([
            supabase
                .from('unique_delivery_items')
                .select('id, product_id, seller_id, payload_ciphertext, payload_iv, payload_auth_tag, encryption_version')
                .in('id', itemIds)
                .eq('status', 'assigned'),
            supabase
                .from('products')
                .select('id, user_id, name')
                .in('id', productIds),
        ]);
        if (itemsResult.error || productsResult.error) {
            throw itemsResult.error || productsResult.error;
        }

        const itemsById = new Map((itemsResult.data || []).map((item: any) => [item.id, item]));
        const productsById = new Map((productsResult.data || []).map((product: any) => [product.id, product]));
        const sellerIds = Array.from(new Set(
            (productsResult.data || []).map((product: any) => product.user_id).filter(Boolean),
        ));
        const sellersResult = sellerIds.length
            ? await supabase
                .from('users')
                .select('id, name, store_name, store_slug, store_active')
                .in('id', sellerIds)
            : { data: [] };
        const sellersById = new Map((sellersResult.data || []).map((seller: any) => [seller.id, seller]));

        // A descriptografia acontece somente aqui, depois de comprovar:
        // token valido, e-mail verificado, e-mail da compra, pedido pago,
        // atribuicao atomica e consistencia de seller/produto/item.
        const deliveries = validFulfillments.map((fulfillment: any) => {
            const item: any = itemsById.get(fulfillment.item_id);
            const product: any = productsById.get(fulfillment.product_id);
            if (
                !item
                || !product
                || item.product_id !== fulfillment.product_id
                || item.seller_id !== fulfillment.seller_id
                || product.user_id !== fulfillment.seller_id
            ) {
                throw new Error('Unique delivery ownership chain is inconsistent');
            }

            const payload = decryptUniqueDeliveryPayload(
                fulfillment.product_id,
                item.id,
                encryptedPayload(item),
            );
            const seller: any = sellersById.get(product.user_id);

            return {
                id: fulfillment.id,
                order_id: fulfillment.order_id,
                assigned_at: fulfillment.assigned_at,
                first_viewed_at: fulfillment.first_viewed_at,
                product: {
                    id: product.id,
                    name: product.name,
                },
                seller: seller ? {
                    id: seller.id,
                    name: seller.store_name || seller.name || 'Vendedor',
                    store_slug: seller.store_slug,
                    store_active: seller.store_active === true,
                    store_url: seller.store_slug ? `/store/${seller.store_slug}` : null,
                } : null,
                access: payload.access,
                instructions: payload.instructions,
                custom_text: payload.customText,
                redirect_url: payload.redirectUrl,
                notes: payload.notes,
            };
        });

        const fulfillmentIds = deliveries.map((delivery: any) => delivery.id);
        await Promise.allSettled([
            supabase.rpc('record_unique_delivery_views', {
                p_fulfillment_ids: fulfillmentIds,
            }),
            supabase.from('unique_delivery_access_logs').insert(
                fulfillmentIds.map((fulfillmentId: string) => ({
                    fulfillment_id: fulfillmentId,
                    user_id: auth.user.id,
                    action: 'view',
                    ip_hash: hashUniqueDeliveryIp(ip),
                })),
            ),
        ]);

        return withSensitiveResponseHeaders(jsonSuccess({ deliveries }));
    } catch (error: any) {
        if (/UNIQUE_DELIVERY_ENCRYPTION_KEY/.test(String(error?.message || ''))) {
            return withSensitiveResponseHeaders(
                jsonError('Entrega protegida temporariamente indisponivel.', 503),
            );
        }
        console.error('[UNIQUE DELIVERY] Failed to open buyer deliveries');
        return withSensitiveResponseHeaders(
            jsonError('Nao foi possivel abrir suas entregas protegidas.', 500),
        );
    }
}
