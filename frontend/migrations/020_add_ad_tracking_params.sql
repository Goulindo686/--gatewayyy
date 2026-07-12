ALTER TABLE orders
ADD COLUMN IF NOT EXISTS tracking_params JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS landing_url TEXT,
ADD COLUMN IF NOT EXISTS referrer TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_tracking_params_gin
ON orders USING GIN (tracking_params);

CREATE INDEX IF NOT EXISTS idx_orders_tracking_fbclid
ON orders ((tracking_params->>'fbclid'));

CREATE INDEX IF NOT EXISTS idx_orders_tracking_gclid
ON orders ((tracking_params->>'gclid'));

CREATE INDEX IF NOT EXISTS idx_orders_tracking_ttclid
ON orders ((tracking_params->>'ttclid'));
