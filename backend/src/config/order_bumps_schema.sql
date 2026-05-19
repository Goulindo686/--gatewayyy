-- ============================================
-- Order Bumps Schema
-- Ofertas adicionais exibidas no checkout
-- ============================================

CREATE TABLE IF NOT EXISTS order_bumps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Produto ofertado no bump
  bump_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  bump_plan_id UUID REFERENCES product_plans(id) ON DELETE SET NULL,

  -- Conteúdo do bump
  title TEXT NOT NULL DEFAULT 'Oferta Especial',
  description TEXT,
  call_to_action TEXT DEFAULT 'Sim! Quero adicionar esta oferta',

  -- Preço customizado (opcional — se NULL usa o preço do produto/plano)
  custom_price INTEGER, -- em centavos

  -- Configurações visuais
  badge_text TEXT DEFAULT 'OFERTA EXCLUSIVA',
  badge_color VARCHAR(20) DEFAULT '#E17055',

  -- Controle
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Itens de order bump adicionados a um pedido
CREATE TABLE IF NOT EXISTS order_bump_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_bump_id UUID NOT NULL REFERENCES order_bumps(id) ON DELETE SET NULL,
  bump_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  bump_plan_id UUID REFERENCES product_plans(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL, -- valor pago em centavos
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_order_bumps_product_id ON order_bumps(product_id);
CREATE INDEX IF NOT EXISTS idx_order_bumps_user_id ON order_bumps(user_id);
CREATE INDEX IF NOT EXISTS idx_order_bump_items_order_id ON order_bump_items(order_id);

-- RLS
ALTER TABLE order_bumps ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_bump_items ENABLE ROW LEVEL SECURITY;

-- Vendedor gerencia seus próprios bumps
CREATE POLICY "order_bumps_manage_own"
ON order_bumps FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Leitura pública dos bumps ativos (para o checkout)
CREATE POLICY "order_bumps_public_read"
ON order_bumps FOR SELECT
TO public
USING (is_active = TRUE);

-- Vendedor vê os itens de bump dos seus pedidos
CREATE POLICY "order_bump_items_seller_read"
ON order_bump_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_bump_items.order_id
    AND o.seller_id = auth.uid()
  )
);
