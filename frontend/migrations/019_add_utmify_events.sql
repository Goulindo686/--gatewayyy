CREATE TABLE IF NOT EXISTS utmify_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    event_type TEXT DEFAULT 'paid',
    status TEXT DEFAULT 'pending',
    payload JSONB,
    response_status INTEGER,
    response_body JSONB,
    error_message TEXT,
    attempt_count INTEGER DEFAULT 0,
    next_retry_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_utmify_events_seller_created
ON utmify_events (seller_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_utmify_events_retry
ON utmify_events (status, next_retry_at)
WHERE status = 'failed';

CREATE UNIQUE INDEX IF NOT EXISTS idx_utmify_events_order_paid_unique
ON utmify_events (order_id, event_type)
WHERE order_id IS NOT NULL AND event_type = 'paid';
