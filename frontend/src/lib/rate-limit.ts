import { supabase } from './db';

/**
 * Rate limiter baseado no Supabase — funciona em ambiente serverless (Vercel).
 * Usa a tabela `rate_limits` para contar requisições por chave dentro de uma janela de tempo.
 *
 * Execute o SQL abaixo no Supabase antes de usar:
 *
 * CREATE TABLE IF NOT EXISTS rate_limits (
 *   key TEXT NOT NULL,
 *   window_start TIMESTAMPTZ NOT NULL,
 *   count INTEGER DEFAULT 1,
 *   PRIMARY KEY (key, window_start)
 * );
 * CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key);
 */

interface RateLimitOptions {
    key: string;        // identificador único (ip, api_key, email, etc.)
    limit: number;      // máximo de requisições permitidas
    windowSecs: number; // janela de tempo em segundos
    failOpen?: boolean;
}

interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: Date;
}

export async function checkRateLimit({ key, limit, windowSecs, failOpen = true }: RateLimitOptions): Promise<RateLimitResult> {
    const now = new Date();
    // Arredonda para o início da janela atual
    const windowMs = windowSecs * 1000;
    const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
    const resetAt = new Date(windowStart.getTime() + windowMs);

    try {
        // Tenta inserir ou incrementar o contador
        const { data, error } = await supabase.rpc('increment_rate_limit', {
            p_key: key,
            p_window_start: windowStart.toISOString(),
            p_window_secs: windowSecs
        });

        if (error) {
            // Se a função RPC não existir, usa fallback com upsert manual
            return await fallbackRateLimit({ key, limit, windowStart, resetAt, windowSecs, failOpen });
        }

        const count = data as number;
        return {
            allowed: count <= limit,
            remaining: Math.max(0, limit - count),
            resetAt
        };
    } catch {
        return failOpen ? { allowed: true, remaining: limit, resetAt } : { allowed: false, remaining: 0, resetAt };
    }
}

async function fallbackRateLimit({ key, limit, windowStart, resetAt, windowSecs, failOpen }: {
    key: string;
    limit: number;
    windowStart: Date;
    resetAt: Date;
    windowSecs: number;
    failOpen: boolean;
}): Promise<RateLimitResult> {
    try {
        if (Math.random() < 0.01) {
            const cleanupBeforeMs = Date.now() - Math.max(3600_000, windowSecs * 5 * 1000);
            await supabase
                .from('rate_limits')
                .delete()
                .lt('window_start', new Date(cleanupBeforeMs).toISOString());
        }
    } catch {
        if (!failOpen) {
            return { allowed: false, remaining: 0, resetAt };
        }
    }

    // Busca contagem atual
    const { data: existing } = await supabase
        .from('rate_limits')
        .select('count')
        .eq('key', key)
        .eq('window_start', windowStart.toISOString())
        .single();

    const currentCount = (existing?.count || 0) + 1;

    if (existing) {
        await supabase
            .from('rate_limits')
            .update({ count: currentCount })
            .eq('key', key)
            .eq('window_start', windowStart.toISOString());
    } else {
        const { error } = await supabase
            .from('rate_limits')
            .insert({ key, window_start: windowStart.toISOString(), count: 1 });
        if (error) {
            await supabase
                .from('rate_limits')
                .update({ count: currentCount })
                .eq('key', key)
                .eq('window_start', windowStart.toISOString());
        }
    }

    return {
        allowed: currentCount <= limit,
        remaining: Math.max(0, limit - currentCount),
        resetAt
    };
}

export function rateLimitResponse(resetAt: Date) {
    return Response.json(
        { error: 'Muitas requisições. Tente novamente em alguns instantes.' },
        {
            status: 429,
            headers: {
                'Retry-After': String(Math.ceil((resetAt.getTime() - Date.now()) / 1000)),
                'X-RateLimit-Reset': resetAt.toISOString()
            }
        }
    );
}
