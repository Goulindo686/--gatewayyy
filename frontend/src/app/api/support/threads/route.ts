export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { supabase } from '@/lib/db';

export async function GET(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Nao autorizado', 401);

    try {
        const status = req.nextUrl.searchParams.get('status');
        let query = supabase
            .from('support_threads')
            .select(`
                id,
                order_id,
                product_id,
                store_slug,
                buyer_name,
                buyer_email,
                buyer_phone,
                subject,
                status,
                priority,
                source,
                seller_last_read_at,
                buyer_last_read_at,
                last_message_at,
                last_message_preview,
                created_at,
                updated_at
            `)
            .eq('seller_id', auth.user.id)
            .order('last_message_at', { ascending: false, nullsFirst: false })
            .order('created_at', { ascending: false });

        if (status && status !== 'all') query = query.eq('status', status);

        const { data: threads, error } = await query;
        if (error) throw error;

        const productIds = Array.from(new Set((threads || []).map((t: any) => t.product_id).filter(Boolean)));
        const orderIds = Array.from(new Set((threads || []).map((t: any) => t.order_id).filter(Boolean)));

        const [productsResult, ordersResult] = await Promise.all([
            productIds.length
                ? supabase.from('products').select('id, name, image_url').in('id', productIds)
                : Promise.resolve({ data: [] }),
            orderIds.length
                ? supabase.from('orders').select('id, amount_display, status, created_at').in('id', orderIds)
                : Promise.resolve({ data: [] }),
        ]);

        const productsById = new Map((productsResult.data || []).map((product: any) => [product.id, product]));
        const ordersById = new Map((ordersResult.data || []).map((order: any) => [order.id, order]));

        return jsonSuccess({
            threads: (threads || []).map((thread: any) => {
                const lastMessageAt = thread.last_message_at || thread.created_at;
                const sellerLastReadAt = thread.seller_last_read_at ? new Date(thread.seller_last_read_at).getTime() : 0;
                return {
                    ...thread,
                    product: thread.product_id ? productsById.get(thread.product_id) || null : null,
                    order: thread.order_id ? ordersById.get(thread.order_id) || null : null,
                    unread: !thread.seller_last_read_at || new Date(lastMessageAt).getTime() > sellerLastReadAt,
                };
            }),
        });
    } catch (error) {
        console.error('[SUPPORT] Seller inbox failed:', error);
        return jsonError('Nao foi possivel carregar os atendimentos.', 500);
    }
}
