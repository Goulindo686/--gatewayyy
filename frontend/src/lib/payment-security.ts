import 'server-only';

import { createHash } from 'crypto';
import { supabase } from './db';

export type PaymentAttemptScope = 'checkout' | 'store_checkout' | 'subscription';

type StoredAttempt = {
    id: string;
    idempotency_key: string;
    scope: PaymentAttemptScope;
    request_hash: string;
    local_reference_id: string;
    status: 'processing' | 'completed' | 'failed';
    provider_resource_id?: string | null;
    response_payload?: Record<string, unknown> | null;
    updated_at: string;
    attempt_count: number;
};

export type PaymentAttemptResult =
    | { state: 'started' | 'resumed'; attempt: StoredAttempt }
    | { state: 'completed'; attempt: StoredAttempt; response: Record<string, unknown> }
    | { state: 'in_progress' | 'conflict'; attempt: StoredAttempt };

function stableValue(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(stableValue);
    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, item]) => [key, stableValue(item)]),
        );
    }
    return value;
}

export function hashPaymentRequest(value: unknown) {
    return createHash('sha256')
        .update(JSON.stringify(stableValue(value)))
        .digest('hex');
}

export function createProviderIdempotencyKey(scope: PaymentAttemptScope, parts: unknown[]) {
    const digest = hashPaymentRequest([scope, ...parts]);
    return `goupay-${scope}-${digest.slice(0, 40)}`;
}

export async function beginPaymentAttempt(input: {
    idempotencyKey: string;
    scope: PaymentAttemptScope;
    requestHash: string;
    localReferenceId: string;
}): Promise<PaymentAttemptResult> {
    const { data: inserted, error: insertError } = await supabase
        .from('payment_attempts')
        .insert({
            idempotency_key: input.idempotencyKey,
            scope: input.scope,
            request_hash: input.requestHash,
            local_reference_id: input.localReferenceId,
            status: 'processing',
        })
        .select('*')
        .single();

    if (!insertError && inserted) {
        return { state: 'started', attempt: inserted as StoredAttempt };
    }
    if (insertError?.code !== '23505') throw insertError;

    const { data: existing, error: existingError } = await supabase
        .from('payment_attempts')
        .select('*')
        .eq('idempotency_key', input.idempotencyKey)
        .single();
    if (existingError || !existing) throw existingError || new Error('Tentativa de pagamento nao encontrada.');

    const attempt = existing as StoredAttempt;
    if (attempt.scope !== input.scope || attempt.request_hash !== input.requestHash) {
        return { state: 'conflict', attempt };
    }
    if (attempt.status === 'completed' && attempt.response_payload) {
        return { state: 'completed', attempt, response: attempt.response_payload };
    }

    const updatedAt = new Date(attempt.updated_at || 0).getTime();
    const isFreshProcessing = attempt.status === 'processing'
        && Number.isFinite(updatedAt)
        && Date.now() - updatedAt < 2 * 60 * 1000;
    if (isFreshProcessing) return { state: 'in_progress', attempt };

    const { data: resumed, error: resumeError } = await supabase
        .from('payment_attempts')
        .update({
            status: 'processing',
            last_error: null,
            attempt_count: Math.max(1, Number(attempt.attempt_count || 1)) + 1,
        })
        .eq('id', attempt.id)
        .eq('updated_at', attempt.updated_at)
        .select('*')
        .maybeSingle();
    if (resumeError) throw resumeError;
    if (!resumed) return { state: 'in_progress', attempt };
    return { state: 'resumed', attempt: resumed as StoredAttempt };
}

export async function completePaymentAttempt(
    idempotencyKey: string,
    providerResourceId: string | null | undefined,
    response: Record<string, unknown>,
) {
    const { error } = await supabase
        .from('payment_attempts')
        .update({
            status: 'completed',
            provider_resource_id: providerResourceId || null,
            response_payload: response,
            last_error: null,
            completed_at: new Date().toISOString(),
        })
        .eq('idempotency_key', idempotencyKey);
    if (error) throw error;
}

export async function failPaymentAttempt(idempotencyKey: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error || 'Falha desconhecida');
    await supabase
        .from('payment_attempts')
        .update({
            status: 'failed',
            last_error: message.slice(0, 1000),
        })
        .eq('idempotency_key', idempotencyKey);
}
