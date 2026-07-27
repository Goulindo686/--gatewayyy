-- Affiliate security hardening.
-- Additive and backwards-compatible with migration 025.

ALTER TABLE affiliate_programs
    ADD COLUMN IF NOT EXISTS terms_version INTEGER NOT NULL DEFAULT 1
        CHECK (terms_version >= 1),
    ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS invite_last_rotated_at TIMESTAMPTZ;

UPDATE affiliate_programs
SET invite_expires_at = COALESCE(invite_expires_at, NOW() + INTERVAL '30 days'),
    invite_last_rotated_at = COALESCE(invite_last_rotated_at, created_at, NOW());

ALTER TABLE affiliate_affiliations
    ADD COLUMN IF NOT EXISTS accepted_terms_version INTEGER,
    ADD COLUMN IF NOT EXISTS accepted_commission_rate_bps INTEGER
        CHECK (
            accepted_commission_rate_bps IS NULL
            OR accepted_commission_rate_bps BETWEEN 1 AND 9000
        ),
    ADD COLUMN IF NOT EXISTS accepted_hold_days INTEGER
        CHECK (accepted_hold_days IS NULL OR accepted_hold_days BETWEEN 0 AND 180),
    ADD COLUMN IF NOT EXISTS accepted_commission_on_bumps BOOLEAN,
    ADD COLUMN IF NOT EXISTS accepted_commission_on_renewals BOOLEAN;

UPDATE affiliate_affiliations a
SET accepted_terms_version = COALESCE(a.accepted_terms_version, p.terms_version, 1),
    accepted_commission_rate_bps = COALESCE(
        a.accepted_commission_rate_bps,
        a.custom_commission_rate_bps,
        p.commission_rate_bps
    ),
    accepted_hold_days = COALESCE(a.accepted_hold_days, p.hold_days),
    accepted_commission_on_bumps = COALESCE(
        a.accepted_commission_on_bumps,
        p.commission_on_bumps
    ),
    accepted_commission_on_renewals = COALESCE(
        a.accepted_commission_on_renewals,
        p.commission_on_renewals
    )
FROM affiliate_programs p
WHERE p.id = a.program_id
  AND (
      a.accepted_terms_version IS NULL
      OR a.accepted_commission_rate_bps IS NULL
      OR a.accepted_hold_days IS NULL
      OR a.accepted_commission_on_bumps IS NULL
      OR a.accepted_commission_on_renewals IS NULL
  );

ALTER TABLE recipients
    ADD COLUMN IF NOT EXISTS affiliate_payout_controlled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS affiliate_payout_control_error TEXT;

ALTER TABLE affiliate_commissions
    ADD COLUMN IF NOT EXISTS provider_payment_id TEXT,
    ADD COLUMN IF NOT EXISTS terms_version INTEGER,
    ADD COLUMN IF NOT EXISTS chargeback_liable BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS risk_reserve_amount INTEGER NOT NULL DEFAULT 0
        CHECK (risk_reserve_amount >= 0),
    ADD COLUMN IF NOT EXISTS risk_reserve_released_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_provider_payment
    ON affiliate_commissions(provider_payment_id)
    WHERE provider_payment_id IS NOT NULL;

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS checkout_idempotency_key TEXT,
    ADD COLUMN IF NOT EXISTS affiliate_hold_days INTEGER,
    ADD COLUMN IF NOT EXISTS affiliate_terms_version INTEGER,
    ADD COLUMN IF NOT EXISTS affiliate_chargeback_liable BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS paid_processing_token TEXT,
    ADD COLUMN IF NOT EXISTS paid_processing_started_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS paid_processed_at TIMESTAMPTZ;

-- Historical paid orders have already passed through the legacy side effects.
-- Marking them avoids replaying counters and notifications after this migration.
UPDATE orders
SET paid_processed_at = COALESCE(paid_processed_at, created_at, NOW())
WHERE status = 'paid' AND paid_processed_at IS NULL;

ALTER TABLE subscriptions
    ADD COLUMN IF NOT EXISTS checkout_idempotency_key TEXT,
    ADD COLUMN IF NOT EXISTS affiliate_initial_cycle_reference TEXT,
    ADD COLUMN IF NOT EXISTS affiliate_initial_payment_id TEXT,
    ADD COLUMN IF NOT EXISTS affiliate_terms_version INTEGER,
    ADD COLUMN IF NOT EXISTS affiliate_chargeback_liable BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_pagarme_order_unique
    ON orders(pagarme_order_id)
    WHERE pagarme_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_checkout_idempotency_unique
    ON orders(checkout_idempotency_key)
    WHERE checkout_idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_pagarme_subscription_unique
    ON subscriptions(pagarme_subscription_id)
    WHERE pagarme_subscription_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_checkout_idempotency_unique
    ON subscriptions(checkout_idempotency_key)
    WHERE checkout_idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS payment_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key TEXT NOT NULL UNIQUE,
    scope TEXT NOT NULL CHECK (scope IN ('checkout', 'store_checkout', 'subscription')),
    request_hash CHAR(64) NOT NULL,
    local_reference_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'processing'
        CHECK (status IN ('processing', 'completed', 'failed')),
    provider_resource_id TEXT,
    response_payload JSONB,
    last_error TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 1 CHECK (attempt_count >= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_status_updated
    ON payment_attempts(status, updated_at);

CREATE TABLE IF NOT EXISTS pagarme_webhook_events (
    event_key CHAR(64) PRIMARY KEY,
    event_type TEXT NOT NULL,
    provider_object_id TEXT,
    payload_hash CHAR(64) NOT NULL,
    status TEXT NOT NULL DEFAULT 'processing'
        CHECK (status IN ('processing', 'completed', 'failed')),
    attempt_count INTEGER NOT NULL DEFAULT 1 CHECK (attempt_count >= 1),
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pagarme_webhook_events_status_updated
    ON pagarme_webhook_events(status, updated_at);

ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS provider_event_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_provider_event_unique
    ON transactions(provider_event_key)
    WHERE provider_event_key IS NOT NULL;

-- Atomic rate limiter used by all serverless instances.
CREATE OR REPLACE FUNCTION increment_rate_limit(
    p_key TEXT,
    p_window_start TIMESTAMPTZ,
    p_window_secs INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    next_count INTEGER;
BEGIN
    INSERT INTO rate_limits(key, window_start, count)
    VALUES (p_key, p_window_start, 1)
    ON CONFLICT (key, window_start)
    DO UPDATE SET count = rate_limits.count + 1
    RETURNING count INTO next_count;

    RETURN next_count;
END;
$$;

REVOKE ALL ON FUNCTION increment_rate_limit(TEXT, TIMESTAMPTZ, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_rate_limit(TEXT, TIMESTAMPTZ, INTEGER) TO service_role;

-- Affiliate mutations are service-route only. This prevents direct Supabase
-- clients from bypassing invite, approval, terms and ownership checks.
DROP POLICY IF EXISTS "affiliate_programs_marketplace_read" ON affiliate_programs;
DROP POLICY IF EXISTS "affiliate_affiliations_affiliate_request" ON affiliate_affiliations;
DROP POLICY IF EXISTS "affiliate_programs_producer_manage" ON affiliate_programs;
DROP POLICY IF EXISTS "affiliate_programs_producer_read" ON affiliate_programs;
CREATE POLICY "affiliate_programs_producer_read"
ON affiliate_programs FOR SELECT
TO authenticated
USING (
    producer_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM products p
        WHERE p.id = product_id AND p.user_id = auth.uid()
    )
);

ALTER TABLE payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagarme_webhook_events ENABLE ROW LEVEL SECURITY;

-- These tables are intentionally service-role only. No anon/authenticated
-- policies are created.

DROP TRIGGER IF EXISTS set_payment_attempts_updated_at ON payment_attempts;
CREATE TRIGGER set_payment_attempts_updated_at
BEFORE UPDATE ON payment_attempts
FOR EACH ROW EXECUTE FUNCTION affiliate_set_updated_at();

DROP TRIGGER IF EXISTS set_pagarme_webhook_events_updated_at ON pagarme_webhook_events;
CREATE TRIGGER set_pagarme_webhook_events_updated_at
BEFORE UPDATE ON pagarme_webhook_events
FOR EACH ROW EXECUTE FUNCTION affiliate_set_updated_at();

NOTIFY pgrst, 'reload schema';
