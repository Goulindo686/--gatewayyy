-- Affiliate system.
-- This migration is additive: products without an active program keep their
-- current checkout and settlement behavior.

CREATE TABLE IF NOT EXISTS affiliate_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    producer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'inactive'
        CHECK (status IN ('active', 'inactive')),
    enrollment_mode TEXT NOT NULL DEFAULT 'manual'
        CHECK (enrollment_mode IN ('invite', 'manual', 'automatic')),
    commission_rate_bps INTEGER NOT NULL DEFAULT 3000
        CHECK (commission_rate_bps BETWEEN 1 AND 9000),
    attribution_model TEXT NOT NULL DEFAULT 'last_click'
        CHECK (attribution_model IN ('last_click', 'first_click')),
    cookie_days INTEGER NOT NULL DEFAULT 60
        CHECK (cookie_days BETWEEN 1 AND 365),
    marketplace_visible BOOLEAN NOT NULL DEFAULT FALSE,
    commission_on_bumps BOOLEAN NOT NULL DEFAULT TRUE,
    commission_on_renewals BOOLEAN NOT NULL DEFAULT TRUE,
    hold_days INTEGER NOT NULL DEFAULT 7
        CHECK (hold_days BETWEEN 0 AND 180),
    terms_text TEXT,
    invite_code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS affiliate_affiliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES affiliate_programs(id) ON DELETE CASCADE,
    affiliate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'suspended', 'cancelled')),
    custom_commission_rate_bps INTEGER
        CHECK (custom_commission_rate_bps IS NULL OR custom_commission_rate_bps BETWEEN 1 AND 9000),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    terms_accepted_at TIMESTAMPTZ,
    terms_snapshot TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (program_id, affiliate_id)
);

CREATE TABLE IF NOT EXISTS affiliate_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliation_id UUID NOT NULL REFERENCES affiliate_affiliations(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    destination_path TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS affiliate_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    link_id UUID NOT NULL REFERENCES affiliate_links(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES affiliate_programs(id) ON DELETE CASCADE,
    affiliation_id UUID NOT NULL REFERENCES affiliate_affiliations(id) ON DELETE CASCADE,
    affiliate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    token_hash CHAR(64) NOT NULL UNIQUE,
    landing_path TEXT,
    referrer TEXT,
    ip_hash CHAR(64),
    user_agent_hash CHAR(64),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS affiliate_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS affiliate_program_id UUID REFERENCES affiliate_programs(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS affiliate_affiliation_id UUID REFERENCES affiliate_affiliations(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS affiliate_click_id UUID REFERENCES affiliate_clicks(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS affiliate_recipient_id TEXT,
    ADD COLUMN IF NOT EXISTS affiliate_commission_rate_bps INTEGER,
    ADD COLUMN IF NOT EXISTS affiliate_commission_base_amount INTEGER,
    ADD COLUMN IF NOT EXISTS affiliate_commission_amount INTEGER;

ALTER TABLE subscriptions
    ADD COLUMN IF NOT EXISTS affiliate_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS affiliate_program_id UUID REFERENCES affiliate_programs(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS affiliate_affiliation_id UUID REFERENCES affiliate_affiliations(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS affiliate_click_id UUID REFERENCES affiliate_clicks(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS affiliate_recipient_id TEXT,
    ADD COLUMN IF NOT EXISTS affiliate_commission_rate_bps INTEGER,
    ADD COLUMN IF NOT EXISTS affiliate_commission_base_amount INTEGER,
    ADD COLUMN IF NOT EXISTS affiliate_commission_amount INTEGER,
    ADD COLUMN IF NOT EXISTS affiliate_commission_on_renewals BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS affiliate_hold_days INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS affiliate_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    provider_event_id TEXT,
    affiliate_id UUID NOT NULL REFERENCES users(id),
    producer_id UUID NOT NULL REFERENCES users(id),
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    program_id UUID REFERENCES affiliate_programs(id) ON DELETE SET NULL,
    affiliation_id UUID REFERENCES affiliate_affiliations(id) ON DELETE SET NULL,
    click_id UUID REFERENCES affiliate_clicks(id) ON DELETE SET NULL,
    source_type TEXT NOT NULL
        CHECK (source_type IN ('order', 'subscription_initial', 'subscription_renewal')),
    gross_amount INTEGER NOT NULL CHECK (gross_amount >= 0),
    platform_fee_amount INTEGER NOT NULL DEFAULT 0 CHECK (platform_fee_amount >= 0),
    commission_base_amount INTEGER NOT NULL CHECK (commission_base_amount >= 0),
    commission_rate_bps INTEGER NOT NULL CHECK (commission_rate_bps BETWEEN 1 AND 9000),
    commission_amount INTEGER NOT NULL CHECK (commission_amount >= 0),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'available', 'refunded', 'chargeback', 'failed', 'cancelled')),
    payout_recipient_id TEXT NOT NULL,
    available_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    reversed_at TIMESTAMPTZ,
    reversal_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliate_commissions_order_unique
    ON affiliate_commissions(order_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliate_commissions_event_unique
    ON affiliate_commissions(provider_event_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliate_commissions_initial_subscription_unique
    ON affiliate_commissions(subscription_id)
    WHERE subscription_id IS NOT NULL AND source_type = 'subscription_initial';

CREATE INDEX IF NOT EXISTS idx_affiliate_programs_producer ON affiliate_programs(producer_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_programs_marketplace ON affiliate_programs(status, marketplace_visible);
CREATE INDEX IF NOT EXISTS idx_affiliate_affiliations_affiliate ON affiliate_affiliations(affiliate_id, status);
CREATE INDEX IF NOT EXISTS idx_affiliate_affiliations_program ON affiliate_affiliations(program_id, status);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_affiliation ON affiliate_links(affiliation_id, is_active);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_product_created ON affiliate_clicks(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_affiliate_created ON affiliate_clicks(affiliate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_affiliate_id ON orders(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_affiliate_id ON subscriptions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_affiliate ON affiliate_commissions(affiliate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_producer ON affiliate_commissions(producer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_status ON affiliate_commissions(status, available_at);

CREATE OR REPLACE FUNCTION affiliate_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_affiliate_programs_updated_at ON affiliate_programs;
CREATE TRIGGER set_affiliate_programs_updated_at
BEFORE UPDATE ON affiliate_programs
FOR EACH ROW EXECUTE FUNCTION affiliate_set_updated_at();

DROP TRIGGER IF EXISTS set_affiliate_affiliations_updated_at ON affiliate_affiliations;
CREATE TRIGGER set_affiliate_affiliations_updated_at
BEFORE UPDATE ON affiliate_affiliations
FOR EACH ROW EXECUTE FUNCTION affiliate_set_updated_at();

DROP TRIGGER IF EXISTS set_affiliate_links_updated_at ON affiliate_links;
CREATE TRIGGER set_affiliate_links_updated_at
BEFORE UPDATE ON affiliate_links
FOR EACH ROW EXECUTE FUNCTION affiliate_set_updated_at();

DROP TRIGGER IF EXISTS set_affiliate_commissions_updated_at ON affiliate_commissions;
CREATE TRIGGER set_affiliate_commissions_updated_at
BEFORE UPDATE ON affiliate_commissions
FOR EACH ROW EXECUTE FUNCTION affiliate_set_updated_at();

ALTER TABLE affiliate_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_affiliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "affiliate_programs_producer_manage" ON affiliate_programs;
CREATE POLICY "affiliate_programs_producer_manage"
ON affiliate_programs FOR ALL
TO authenticated
USING (producer_id = auth.uid())
WITH CHECK (producer_id = auth.uid());

DROP POLICY IF EXISTS "affiliate_programs_marketplace_read" ON affiliate_programs;
CREATE POLICY "affiliate_programs_marketplace_read"
ON affiliate_programs FOR SELECT
TO authenticated
USING (status = 'active' AND marketplace_visible = TRUE);

DROP POLICY IF EXISTS "affiliate_affiliations_participant_read" ON affiliate_affiliations;
CREATE POLICY "affiliate_affiliations_participant_read"
ON affiliate_affiliations FOR SELECT
TO authenticated
USING (
    affiliate_id = auth.uid()
    OR EXISTS (
        SELECT 1
        FROM affiliate_programs p
        WHERE p.id = program_id AND p.producer_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "affiliate_affiliations_affiliate_request" ON affiliate_affiliations;
CREATE POLICY "affiliate_affiliations_affiliate_request"
ON affiliate_affiliations FOR INSERT
TO authenticated
WITH CHECK (affiliate_id = auth.uid());

DROP POLICY IF EXISTS "affiliate_links_participant_read" ON affiliate_links;
CREATE POLICY "affiliate_links_participant_read"
ON affiliate_links FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM affiliate_affiliations a
        JOIN affiliate_programs p ON p.id = a.program_id
        WHERE a.id = affiliation_id
          AND (a.affiliate_id = auth.uid() OR p.producer_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "affiliate_commissions_participant_read" ON affiliate_commissions;
CREATE POLICY "affiliate_commissions_participant_read"
ON affiliate_commissions FOR SELECT
TO authenticated
USING (affiliate_id = auth.uid() OR producer_id = auth.uid());

-- Make the new tables and columns immediately visible to Supabase APIs.
NOTIFY pgrst, 'reload schema';
