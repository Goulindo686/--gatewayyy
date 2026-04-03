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
}

interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: Date;
}

export async function checkRateLimit({ key, limit, windowSecs }: RateLimitOptions): Promise<RateLimitResult> {
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
            return await fallbackRateLimit({ key, limit, windowStart, resetAt });
        }

        const count = data as number;
        return {
            allowed: count <= limit,
            remaining: Math.max(0, limit - count),
            resetAt
        };
    } catch {
        // Em caso de erro no banco, permite a requisição (fail open)
        return { allowed: true, remaining: limit, resetAt };
    }
}

async function fallbackRateLimit({ key, limit, windowStart, resetAt }: {
    key: string; limit: number; windowStart: Date; resetAt: Date;
}): Promise<RateLimitResult> {
    // Limpa janelas antigas primeiro
    await supabase
        .from('rate_limits')
        .delete()
        .lt('window_start', new Date(Date.now() - 3600_000).toISOString());

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
        await supabase
            .from('rate_limits')
            .insert({ key, window_start: windowStart.toISOString(), count: 1 });
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
