-- SQL para o Sistema de Loja Avançado
-- Execute este script no editor SQL do seu Supabase

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de Categorias da Loja
CREATE TABLE IF NOT EXISTS store_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    image_url TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, slug)
);

-- 2. Ativar RLS nas Categorias
ALTER TABLE store_categories ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de RLS para Categorias
CREATE POLICY "Users can manage their own categories" 
ON store_categories FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Categories are publicly visible" 
ON store_categories FOR SELECT 
USING (true);

-- 4. Adicionar colunas necessárias na tabela de produtos (se não existirem)
ALTER TABLE products ADD COLUMN IF NOT EXISTS store_category_id UUID REFERENCES store_categories(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS show_in_store BOOLEAN DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS store_sort_order INTEGER NOT NULL DEFAULT 0;

-- 5. Adicionar colunas de loja na tabela de usuários (se não existirem)
ALTER TABLE users ADD COLUMN IF NOT EXISTS store_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS store_slug TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS store_description TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS store_active BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS store_theme TEXT DEFAULT 'light';
ALTER TABLE users ADD COLUMN IF NOT EXISTS store_banner_url TEXT;

-- 6. Garantir que o RLS de usuários permita a leitura pública do perfil de loja
-- Se o RLS estiver ativado na tabela de usuários, precisamos permitir que 
-- qualquer um veja as colunas da loja dos usuários ativos.

DROP POLICY IF EXISTS "Public can view store profiles" ON users;
CREATE VIEW IF NOT EXISTS user_profiles AS
SELECT id, name, avatar_url, store_name, store_slug, store_description
FROM users
WHERE store_active = true;
GRANT SELECT ON TABLE user_profiles TO anon, authenticated;

-- Caso a tabela de usuários não tenha RLS ativado, mas você queira ativar:
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 7. Verificar se os produtos também estão visíveis publicamente
DROP POLICY IF EXISTS "Public can view store products" ON products;
CREATE POLICY "Public can view store products" 
ON products FOR SELECT 
USING (show_in_store = true AND status = 'active');

-- 8. Adicionar índice para busca rápida por slug
CREATE INDEX IF NOT EXISTS idx_users_store_slug ON users(store_slug);
