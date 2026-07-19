-- Taxa Pix individual por vendedor.
-- A ausencia de registro mantém a taxa global vigente para o vendedor.

CREATE TABLE IF NOT EXISTS seller_pix_fee_settings (
    seller_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    fee_type VARCHAR(20) NOT NULL CHECK (fee_type IN ('exempt', 'fixed', 'percentage')),
    fixed_fee_cents INTEGER,
    percentage NUMERIC(7,4),
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT seller_pix_fee_value_check CHECK (
        (fee_type = 'exempt' AND fixed_fee_cents IS NULL AND percentage IS NULL)
        OR (fee_type = 'fixed' AND fixed_fee_cents IS NOT NULL AND fixed_fee_cents > 0 AND percentage IS NULL)
        OR (fee_type = 'percentage' AND percentage IS NOT NULL AND percentage > 0 AND percentage <= 100 AND fixed_fee_cents IS NULL)
    )
);

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS platform_fee_amount INTEGER;

COMMENT ON TABLE seller_pix_fee_settings IS 'Excecao individual da taxa da plataforma para vendas Pix; sem registro usa a taxa global.';
COMMENT ON COLUMN seller_pix_fee_settings.fee_type IS 'exempt = sem taxa da plataforma; fixed = valor fixo; percentage = percentual sobre a venda.';
COMMENT ON COLUMN seller_pix_fee_settings.fixed_fee_cents IS 'Taxa fixa da plataforma em centavos.';
COMMENT ON COLUMN seller_pix_fee_settings.percentage IS 'Taxa percentual da plataforma. Nao inclui a tarifa de processamento do Pagar.me.';
COMMENT ON COLUMN orders.platform_fee_amount IS 'Taxa da plataforma aplicada no momento da venda, em centavos; nao inclui tarifas do Pagar.me.';

ALTER TABLE seller_pix_fee_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Seller pix fees admin read" ON seller_pix_fee_settings;
CREATE POLICY "Seller pix fees admin read"
ON seller_pix_fee_settings FOR SELECT
TO authenticated
USING (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() AND u.role = 'admin'
));

DROP POLICY IF EXISTS "Seller pix fees admin manage" ON seller_pix_fee_settings;
CREATE POLICY "Seller pix fees admin manage"
ON seller_pix_fee_settings FOR ALL
TO authenticated
USING (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() AND u.role = 'admin'
))
WITH CHECK (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() AND u.role = 'admin'
));
