import 'server-only';

import { getSupabase } from '@/lib/db';

type TransactionEntry = {
    provider_event_key: string;
    [key: string]: unknown;
};

type TransactionWriteResult = {
    data: { id: string } | null;
    error: any | null;
};

/**
 * Persists a provider transaction without PostgREST's ON CONFLICT inference.
 *
 * The production schema may have a partial unique index on provider_event_key.
 * PostgreSQL enforces that index, but PostgREST cannot infer it from a plain
 * ON CONFLICT(provider_event_key). Updating first and retrying after a duplicate
 * keeps the ledger idempotent on both partial and regular unique indexes.
 */
export async function saveTransactionByProviderEvent(
    values: TransactionEntry,
): Promise<TransactionWriteResult> {
    const providerEventKey = String(values.provider_event_key || '').trim();
    if (!providerEventKey) {
        throw new Error('provider_event_key is required for an idempotent transaction');
    }

    const db = getSupabase();
    const {
        id: _ignoredId,
        created_at: _ignoredCreatedAt,
        ...updateValues
    } = values;

    const updateExisting = async (): Promise<TransactionWriteResult> => {
        const { data, error } = await db
            .from('transactions')
            .update(updateValues)
            .eq('provider_event_key', providerEventKey)
            .select('id')
            .maybeSingle();

        return { data, error };
    };

    const existing = await updateExisting();
    if (existing.error || existing.data) {
        return existing;
    }

    const inserted = await db
        .from('transactions')
        .insert(values)
        .select('id')
        .single();

    if (!inserted.error) {
        return inserted;
    }

    // A concurrent request may have inserted the same ledger event after the
    // initial update. The unique index rejects it; update the winner instead.
    if (inserted.error.code === '23505') {
        const recovered = await updateExisting();
        if (recovered.error || recovered.data) {
            return recovered;
        }
    }

    return { data: null, error: inserted.error };
}
