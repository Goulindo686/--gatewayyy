-- Adiciona campo de descrição/features nos planos de produto
ALTER TABLE product_plans ADD COLUMN IF NOT EXISTS description TEXT;
