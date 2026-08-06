import 'server-only';
import { randomUUID } from 'node:crypto';
import { supabase } from './db';
import {
    assertSupportChatEncryptionConfigured,
    decryptSupportMessage,
    encryptSupportMessage,
} from './support-chat-crypto';

export type SupportThreadStatus = 'open' | 'pending_seller' | 'pending_buyer' | 'resolved' | 'archived';

type BuyerSupportUser = {
    id?: string;
    email?: string;
    email_verified?: boolean;
};

type SupportThreadRecord = {
    id: string;
    seller_id: string;
    status: SupportThreadStatus;
    buyer_email: string;
    buyer_name?: string | null;
    buyer_user_id?: string | null;
};

type StoredSupportMessage = {
    id: string;
    thread_id: string;
    sender_type: 'buyer' | 'seller' | 'admin' | 'system';
    sender_user_id: string | null;
    sender_name: string;
    body: string;
    body_ciphertext: string | null;
    body_iv: string | null;
    body_auth_tag: string | null;
    encryption_version: number | null;
    attachment_url: string | null;
    attachment_name: string | null;
    attachment_type: string | null;
    created_at: string;
};

const SUPPORT_MESSAGE_PLACEHOLDER = '[mensagem protegida]';
const SUPPORT_MESSAGE_PREVIEW = 'Nova mensagem protegida';

export function withSupportResponseHeaders(response: Response) {
    response.headers.set('Cache-Control', 'private, no-store, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'no-referrer');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    return response;
}

export function sanitizeSupportMessage(value: unknown) {
    return String(value || '').replace(/\u0000/g, '').trim().slice(0, 4000);
}

function normalizedEmail(value: unknown) {
    return String(value || '').toLowerCase().trim();
}

export async function getOrCreateSupportThreadForBuyer(orderId: string, buyerUser: BuyerSupportUser) {
    const buyerEmail = normalizedEmail(buyerUser?.email);
    if (!buyerUser?.id || !buyerEmail) {
        return { error: 'Entre na sua conta GouPay para acessar o suporte.', status: 401 as const };
    }
    if (buyerUser.email_verified !== true) {
        return { error: 'Confirme seu e-mail antes de abrir o suporte da compra.', status: 403 as const };
    }

    const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, seller_id, product_id, buyer_name, buyer_email, buyer_email_normalized, buyer_phone, status')
        .eq('id', orderId)
        .maybeSingle();

    if (orderError) throw orderError;
    if (!order) return { error: 'Pedido nao encontrado', status: 404 as const };
    if (order.status !== 'paid') {
        return { error: 'O suporte fica disponivel depois da confirmacao do pagamento.', status: 403 as const };
    }
    const orderEmail = normalizedEmail(order.buyer_email_normalized || order.buyer_email);
    if (!orderEmail || orderEmail !== buyerEmail) {
        return { error: 'Esta compra pertence a outro e-mail.', status: 403 as const };
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

    const subject = product?.name ? `Suporte - ${product.name}` : 'Suporte da compra';

    const { data: existing, error: existingError } = await supabase
        .from('support_threads')
        .select('*')
        .eq('order_id', order.id)
        .maybeSingle();
    if (existingError) throw existingError;

    if (existing) {
        if (existing.seller_id !== order.seller_id) {
            throw new Error('Support thread ownership chain is inconsistent');
        }
        if (existing.buyer_user_id && existing.buyer_user_id !== buyerUser.id) {
            return { error: 'Este atendimento pertence a outra conta.', status: 403 as const };
        }

        const { data: updated, error: updateError } = await supabase
            .from('support_threads')
            .update({
                buyer_user_id: buyerUser.id,
                status: existing.status === 'archived' ? 'open' : existing.status,
                updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
            .select('*')
            .single();
        if (updateError) throw updateError;
        return { thread: updated, seller, product };
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
            buyer_user_id: buyerUser.id,
            subject,
            status: 'open',
            priority: 'normal',
            source: 'store',
        })
        .select('*')
        .single();
    if (createError) throw createError;

    return { thread: created, seller, product };
}

export async function validateBuyerThreadUser(threadId: string, buyerUser: BuyerSupportUser) {
    const buyerEmail = normalizedEmail(buyerUser?.email);
    if (!buyerUser?.id || !buyerEmail || buyerUser.email_verified !== true) return null;

    const { data: thread, error } = await supabase
        .from('support_threads')
        .select('*')
        .eq('id', threadId)
        .maybeSingle();

    if (error) throw error;
    if (!thread) return null;

    const threadEmail = normalizedEmail(thread.buyer_email);
    if (thread.buyer_user_id && thread.buyer_user_id !== buyerUser.id) return null;
    if (!thread.buyer_user_id && threadEmail !== buyerEmail) return null;

    if (!thread.buyer_user_id) {
        const { data: updated, error: updateError } = await supabase
            .from('support_threads')
            .update({
                buyer_user_id: buyerUser.id,
                updated_at: new Date().toISOString(),
            })
            .eq('id', thread.id)
            .is('buyer_user_id', null)
            .select('*')
            .maybeSingle();
        if (updateError) throw updateError;
        if (updated) return updated;

        const { data: rebound, error: reboundError } = await supabase
            .from('support_threads')
            .select('*')
            .eq('id', thread.id)
            .maybeSingle();
        if (reboundError) throw reboundError;
        return rebound?.buyer_user_id === buyerUser.id ? rebound : null;
    }

    return thread;
}

export async function listSupportMessages(threadId: string) {
    assertSupportChatEncryptionConfigured();
    const { data, error } = await supabase
        .from('support_messages')
        .select('id, thread_id, sender_type, sender_user_id, sender_name, body, body_ciphertext, body_iv, body_auth_tag, encryption_version, attachment_url, attachment_name, attachment_type, created_at')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });
    if (error) throw error;

    const legacyMessages: StoredSupportMessage[] = [];
    const messages = ((data || []) as StoredSupportMessage[]).map((row) => {
        let body: string;
        if (row.body_ciphertext && row.body_iv && row.body_auth_tag && row.encryption_version) {
            body = decryptSupportMessage(row.thread_id, row.id, {
                ciphertext: row.body_ciphertext,
                iv: row.body_iv,
                authTag: row.body_auth_tag,
                encryptionVersion: row.encryption_version,
            });
        } else {
            body = String(row.body || '');
            legacyMessages.push({ ...row, body });
        }

        return {
            id: row.id,
            thread_id: row.thread_id,
            sender_type: row.sender_type,
            sender_user_id: row.sender_user_id,
            sender_name: row.sender_name,
            body,
            attachment_url: row.attachment_url,
            attachment_name: row.attachment_name,
            attachment_type: row.attachment_type,
            created_at: row.created_at,
        };
    });

    if (legacyMessages.length) {
        await Promise.allSettled(legacyMessages.map(async (row) => {
            const encrypted = encryptSupportMessage(row.thread_id, row.id, row.body);
            const { error: migrationError } = await supabase
                .from('support_messages')
                .update({
                    body: SUPPORT_MESSAGE_PLACEHOLDER,
                    body_ciphertext: encrypted.ciphertext,
                    body_iv: encrypted.iv,
                    body_auth_tag: encrypted.authTag,
                    encryption_version: encrypted.encryptionVersion,
                })
                .eq('id', row.id)
                .eq('thread_id', row.thread_id)
                .is('body_ciphertext', null);
            if (migrationError) throw migrationError;
        }));
    }

    return messages;
}

export async function addSupportMessage(params: {
    thread: SupportThreadRecord;
    senderType: 'buyer' | 'seller' | 'admin' | 'system';
    senderUserId?: string | null;
    senderName: string;
    body: string;
}) {
    const body = sanitizeSupportMessage(params.body);
    if (!body) return { error: 'Digite uma mensagem.', status: 400 as const };

    assertSupportChatEncryptionConfigured();
    const messageId = randomUUID();
    const encrypted = encryptSupportMessage(params.thread.id, messageId, body);
    const now = new Date().toISOString();
    const nextStatus = params.senderType === 'buyer' ? 'pending_seller' : 'pending_buyer';

    const { data: message, error: messageError } = await supabase
        .from('support_messages')
        .insert({
            id: messageId,
            thread_id: params.thread.id,
            sender_type: params.senderType,
            sender_user_id: params.senderUserId || null,
            sender_name: params.senderName || (params.senderType === 'buyer' ? 'Cliente' : 'Vendedor'),
            body: SUPPORT_MESSAGE_PLACEHOLDER,
            body_ciphertext: encrypted.ciphertext,
            body_iv: encrypted.iv,
            body_auth_tag: encrypted.authTag,
            encryption_version: encrypted.encryptionVersion,
        })
        .select('id, thread_id, sender_type, sender_user_id, sender_name, attachment_url, attachment_name, attachment_type, created_at')
        .single();
    if (messageError) throw messageError;

    const updates: Record<string, string> = {
        status: params.thread.status === 'resolved' ? 'open' : nextStatus,
        last_message_at: now,
        last_message_preview: SUPPORT_MESSAGE_PREVIEW,
        updated_at: now,
    };
    if (params.senderType === 'buyer') updates.buyer_last_read_at = now;
    if (params.senderType === 'seller' || params.senderType === 'admin') updates.seller_last_read_at = now;

    const { error: threadError } = await supabase
        .from('support_threads')
        .update(updates)
        .eq('id', params.thread.id);
    if (threadError) throw threadError;

    return { message: { ...message, body } };
}
