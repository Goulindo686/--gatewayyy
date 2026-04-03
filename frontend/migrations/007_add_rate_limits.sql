-- Tabela de rate limiting (funciona em ambiente serverless como Vercel)
CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    count INTEGER DEFAULT 1,
    PRIMARY KEY (key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key);

-- Limpa registros antigos automaticamente (opcional, rode periodicamente)
-- DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '2 hours';
