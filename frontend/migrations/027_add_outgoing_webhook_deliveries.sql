-- Durable outbox for merchant webhooks.
-- Financial processing must not depend on the merchant endpoint being online,
-- while failed deliveries still need to be retried.

CREATE TABLE IF NOT EXISTS outgoing_webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    url TEXT NOT NULL CHECK (char_length(url) BETWEEN 1 AND 2048),
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'delivered', 'failed')),
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    next_attempt_at TIMESTAMPTZ DEFAULT NOW(),
    last_attempt_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    last_http_status INTEGER,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_outgoing_webhook_delivery_unique
    ON outgoing_webhook_deliveries(order_id, event_type, url);

CREATE INDEX IF NOT EXISTS idx_outgoing_webhook_delivery_queue
    ON outgoing_webhook_deliveries(status, next_attempt_at)
    WHERE status IN ('pending', 'failed', 'processing');

ALTER TABLE outgoing_webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Intentionally service-role only. Webhook URLs and payloads contain private
-- integration and customer data, so no anon/authenticated policy is created.

CREATE OR REPLACE FUNCTION goupay_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_outgoing_webhook_deliveries_updated_at
    ON outgoing_webhook_deliveries;
CREATE TRIGGER set_outgoing_webhook_deliveries_updated_at
BEFORE UPDATE ON outgoing_webhook_deliveries
FOR EACH ROW EXECUTE FUNCTION goupay_set_updated_at();

CREATE OR REPLACE FUNCTION claim_outgoing_webhook_deliveries(
    p_limit INTEGER DEFAULT 25,
    p_order_id UUID DEFAULT NULL,
    p_event_type TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    url TEXT,
    payload JSONB,
    attempt_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH candidates AS (
        SELECT delivery.id
        FROM outgoing_webhook_deliveries AS delivery
        WHERE delivery.attempt_count < 12
          AND (
              (
                  delivery.status IN ('pending', 'failed')
                  AND COALESCE(delivery.next_attempt_at, NOW()) <= NOW()
              )
              OR (
                  delivery.status = 'processing'
                  AND COALESCE(delivery.last_attempt_at, delivery.updated_at)
                      <= NOW() - INTERVAL '5 minutes'
              )
          )
          AND (p_order_id IS NULL OR delivery.order_id = p_order_id)
          AND (p_event_type IS NULL OR delivery.event_type = p_event_type)
        ORDER BY COALESCE(delivery.next_attempt_at, delivery.created_at), delivery.created_at
        FOR UPDATE SKIP LOCKED
        LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 25), 100))
    ),
    claimed AS (
        UPDATE outgoing_webhook_deliveries AS delivery
        SET
            status = 'processing',
            attempt_count = delivery.attempt_count + 1,
            last_attempt_at = NOW(),
            last_error = NULL
        FROM candidates
        WHERE delivery.id = candidates.id
        RETURNING delivery.id, delivery.url, delivery.payload, delivery.attempt_count
    )
    SELECT claimed.id, claimed.url, claimed.payload, claimed.attempt_count
    FROM claimed;
END;
$$;

REVOKE ALL ON FUNCTION claim_outgoing_webhook_deliveries(INTEGER, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_outgoing_webhook_deliveries(INTEGER, UUID, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
