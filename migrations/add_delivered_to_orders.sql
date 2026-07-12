-- Adiciona coluna delivered na tabela orders
-- Execute este SQL no painel do Supabase (SQL Editor)

ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_note TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_delivered ON orders(delivered);
