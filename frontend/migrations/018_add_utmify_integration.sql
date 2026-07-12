ALTER TABLE users
ADD COLUMN IF NOT EXISTS utmify_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS utmify_api_token TEXT,
ADD COLUMN IF NOT EXISTS utmify_last_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS utmify_last_error TEXT;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS utm_source TEXT,
ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
ADD COLUMN IF NOT EXISTS utm_medium TEXT,
ADD COLUMN IF NOT EXISTS utm_content TEXT,
ADD COLUMN IF NOT EXISTS utm_term TEXT,
ADD COLUMN IF NOT EXISTS utm_src TEXT,
ADD COLUMN IF NOT EXISTS utm_sck TEXT,
ADD COLUMN IF NOT EXISTS utmify_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS utmify_last_error TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_utm_source
ON orders (utm_source);

CREATE INDEX IF NOT EXISTS idx_orders_utm_campaign
ON orders (utm_campaign);

CREATE INDEX IF NOT EXISTS idx_orders_utmify_sent_at
ON orders (utmify_sent_at);
