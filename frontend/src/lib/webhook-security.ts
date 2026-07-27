import 'server-only';

import { createHash } from 'crypto';
import { supabase } from './db';

export function createWebhookEventKey(
    eventType: string,
    rawBody: string,
    providerEventId?: string | null,
) {
    const payloadHash = createHash('sha256').update(rawBody).digest('hex');
    const stableProviderEventId = String(providerEventId || '').trim().slice(0, 200);
    const eventKey = createHash('sha256')
        .update(`${eventType}:${stableProviderEventId || payloadHash}`)
        .digest('hex');
    return { eventKey, payloadHash };
}

export async function beginWebhookEvent(input: {
    eventKey: string;
    eventType: string;
    payloadHash: string;
    providerObjectId?: string | null;
}) {
    const { error: insertError } = await supabase
        .from('pagarme_webhook_events')
        .insert({
            event_key: input.eventKey,
            event_type: input.eventType,
            provider_object_id: input.providerObjectId || null,
            payload_hash: input.payloadHash,
            status: 'processing',
        });
    if (!insertError) return { acquired: true, duplicate: false };
    if (insertError.code !== '23505') throw insertError;

    const { data: existing, error } = await supabase
        .from('pagarme_webhook_events')
        .select('status, updated_at, attempt_count, payload_hash')
        .eq('event_key', input.eventKey)
        .single();
    if (error || !existing) throw error || new Error('Evento de webhook nao encontrado.');
    if (existing.payload_hash !== input.payloadHash || existing.status === 'completed') {
        return { acquired: false, duplicate: true };
    }

    const updatedAt = new Date(existing.updated_at || 0).getTime();
    if (
        existing.status === 'processing'
        && Number.isFinite(updatedAt)
        && Date.now() - updatedAt < 2 * 60 * 1000
    ) {
        return { acquired: false, duplicate: true };
    }

    const { data: resumed, error: resumeError } = await supabase
        .from('pagarme_webhook_events')
        .update({
            status: 'processing',
            attempt_count: Math.max(1, Number(existing.attempt_count || 1)) + 1,
            last_error: null,
        })
        .eq('event_key', input.eventKey)
        .eq('updated_at', existing.updated_at)
        .select('event_key')
        .maybeSingle();
    if (resumeError) throw resumeError;
    return { acquired: Boolean(resumed), duplicate: !resumed };
}

export async function completeWebhookEvent(eventKey: string) {
    const { error } = await supabase
        .from('pagarme_webhook_events')
        .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            last_error: null,
        })
        .eq('event_key', eventKey);
    if (error) throw error;
}

export async function failWebhookEvent(eventKey: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error || 'Falha desconhecida');
    await supabase
        .from('pagarme_webhook_events')
        .update({
            status: 'failed',
            last_error: message.slice(0, 1000),
        })
        .eq('event_key', eventKey);
}
