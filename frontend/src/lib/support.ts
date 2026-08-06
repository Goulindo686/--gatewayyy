import 'server-only';
import crypto from 'crypto';
import { supabase } from './db';

export type SupportThreadStatus = 'open' | 'pending_seller' | 'pending_buyer' | 'resolved' | 'archived';

export function generateBuyerSupportToken() {
    return crypto.randomBytes(32).toString('base64url');
}

export function hashBuyerSupportToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

export function sanitizeSupportMessage(value: unknown) {
    return String(value || '').trim().slice(0, 4000);
}

export function supportPreview(value: string) {
    return value.replace(/\s+/g, ' ').trim().slice(0, 180);
}

export async function getOrCreateSupportThreadForOrder(orderId: string) {
    const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, seller_id, product_id, buyer_name, buyer_email, buyer_phone, status')
        .eq('id', orderId)
        .maybeSingle();

    if (orderError) throw orderError;
    if (!order) return { error: 'Pedido nao encontrado', status: 404 as const };
    if (order.status !== 'paid') {
        return { error: 'O suporte fica disponivel depois da confirmacao do pagamento.', status: 403 as const };
    }

    const [{ data: seller }, { data: product }] = await Promise.all([
        supabase
            .from('users')
            .select('id, store_slug, store_name, name')
            .eq('id', order.seller_id)
            .maybeSingle(),
        supabase
            .from('products')
            .select('id, name')
            .eq('id', order.product_id)
            .maybeSingle(),
    ]);

    const token = generateBuyerSupportToken();
    const tokenHash = hashBuyerSupportToken(token);
    const subject = product?.name ? `Suporte - ${product.name}` : 'Suporte da compra';

    const { data: existing, error: existingError } = await supabase
        .from('support_threads')
        .select('*')
        .eq('order_id', order.id)
        .maybeSingle();
    if (existingError) throw existingError;

    if (existing) {
        const { data: updated, error: updateError } = await supabase
            .from('support_threads')
            .update({
                buyer_access_token_hash: tokenHash,
                status: existing.status === 'archived' ? 'open' : existing.status,
                updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
            .select('*')
            .single();
        if (updateError) throw updateError;
        return { thread: updated, token, seller, product };
    }

    const { data: created, error: createError } = await supabase
        .from('support_threads')
        .insert({
            seller_id: order.seller_id,
            order_id: order.id,
            product_id: order.product_id,
            store_slug: seller?.store_slug || null,
            buyer_name: order.buyer_name || 'Cliente',
            buyer_email: order.buyer_email,
            buyer_phone: order.buyer_phone || null,
            subject,
            status: 'open',
            priority: 'normal',
            source: 'store',
            buyer_access_token_hash: tokenHash,
        })
        .select('*')
        .single();
    if (createError) throw createError;

    return { thread: created, token, seller, product };
}

export async function validateBuyerThreadAccess(threadId: string, token: string) {
    if (!token || token.length < 20) return null;

    const { data: thread, error } = await supabase
        .from('support_threads')
        .select('*')
        .eq('id', threadId)
        .maybeSingle();

    if (error) throw error;
    if (!thread?.buyer_access_token_hash) return null;

    const provided = hashBuyerSupportToken(token);
    const expected = String(thread.buyer_access_token_hash);
    const providedBuffer = Buffer.from(provided, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    if (providedBuffer.length !== expectedBuffer.length) return null;
    if (!crypto.timingSafeEqual(providedBuffer, expectedBuffer)) return null;

    return thread;
}

export async function listSupportMessages(threadId: string) {
    const { data, error } = await supabase
        .from('support_messages')
        .select('id, thread_id, sender_type, sender_user_id, sender_name, body, attachment_url, attachment_name, attachment_type, created_at')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
}

export async function addSupportMessage(params: {
    thread: any;
    senderType: 'buyer' | 'seller' | 'admin' | 'system';
    senderUserId?: string | null;
    senderName: string;
    body: string;
}) {
    const body = sanitizeSupportMessage(params.body);
    if (!body) return { error: 'Digite uma mensagem.', status: 400 as const };

    const now = new Date().toISOString();
    const nextStatus = params.senderType === 'buyer' ? 'pending_seller' : 'pending_buyer';

    const { data: message, error: messageError } = await supabase
        .from('support_messages')
        .insert({
            thread_id: params.thread.id,
            sender_type: params.senderType,
            sender_user_id: params.senderUserId || null,
            sender_name: params.senderName || (params.senderType === 'buyer' ? 'Cliente' : 'Vendedor'),
            body,
        })
        .select('id, thread_id, sender_type, sender_user_id, sender_name, body, attachment_url, attachment_name, attachment_type, created_at')
        .single();
    if (messageError) throw messageError;

    const updates: any = {
        status: params.thread.status === 'resolved' ? 'open' : nextStatus,
        last_message_at: now,
        last_message_preview: supportPreview(body),
        updated_at: now,
    };
    if (params.senderType === 'buyer') updates.buyer_last_read_at = now;
    if (params.senderType === 'seller' || params.senderType === 'admin') updates.seller_last_read_at = now;

    const { error: threadError } = await supabase
        .from('support_threads')
        .update(updates)
        .eq('id', params.thread.id);
    if (threadError) throw threadError;

    return { message };
}
