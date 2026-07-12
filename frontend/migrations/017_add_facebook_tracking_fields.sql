ALTER TABLE orders
ADD COLUMN IF NOT EXISTS facebook_event_id TEXT,
ADD COLUMN IF NOT EXISTS facebook_fbp TEXT,
ADD COLUMN IF NOT EXISTS facebook_fbc TEXT,
ADD COLUMN IF NOT EXISTS client_ip TEXT,
ADD COLUMN IF NOT EXISTS client_user_agent TEXT,
ADD COLUMN IF NOT EXISTS facebook_capi_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_facebook_event_id
ON orders (facebook_event_id);
