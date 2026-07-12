-- Pix sales recovery settings and delivery log
CREATE TABLE IF NOT EXISTS sales_recovery_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  delay_minutes INTEGER NOT NULL DEFAULT 30 CHECK (delay_minutes BETWEEN 5 AND 1440),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS sales_recovery_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  buyer_email VARCHAR(255) NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_sales_recovery_settings_enabled
  ON sales_recovery_settings(enabled, product_id);
CREATE INDEX IF NOT EXISTS idx_sales_recovery_emails_order_id
  ON sales_recovery_emails(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_pix_recovery
  ON orders(product_id, created_at)
  WHERE payment_method = 'pix' AND status = 'pending';

ALTER TABLE sales_recovery_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_recovery_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sales recovery settings manage own"
ON sales_recovery_settings FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM products p
    WHERE p.id = product_id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Sales recovery emails view own"
ON sales_recovery_emails FOR SELECT
TO authenticated
USING (user_id = auth.uid());
