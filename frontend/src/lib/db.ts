import 'server-only';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
    if (!_supabase) {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_KEY;
        if (!url || !key) {
            throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
        }
        _supabase = createClient(url, key);
    }
    return _supabase;
}

// Convenience getter for backward compatibility
export const supabase = new Proxy({} as SupabaseClient, {
    get(_, prop) {
        return (getSupabase() as any)[prop];
    }
});

/**
 * Helper to fetch all rows from a Supabase query, bypassing the default 1000 row limit.
 * Use this only when you need to perform client-side aggregation (sums, etc) on large datasets.
 */
export async function fetchAll<T = any>(queryBuilder: any): Promise<T[]> {
    let allData: T[] = [];
    let from = 0;
    const step = 1000;

    while (true) {
        const { data, error } = await queryBuilder.range(from, from + step - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        
        allData.push(...data);
        if (data.length < step) break;
        from += step;
    }

    return allData;
}

