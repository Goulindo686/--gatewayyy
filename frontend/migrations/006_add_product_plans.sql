CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS product_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_plans_product_id ON product_plans(product_id);

ALTER TABLE product_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Product plans manage own" ON product_plans;
CREATE POLICY "Product plans manage own"
ON product_plans FOR ALL
USING (EXISTS (SELECT 1 FROM products p WHERE p.id = product_id AND p.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM products p WHERE p.id = product_id AND p.user_id = auth.uid()));

DROP POLICY IF EXISTS "Product plans public read" ON product_plans;
CREATE POLICY "Product plans public read"
ON product_plans FOR SELECT
USING (true);
