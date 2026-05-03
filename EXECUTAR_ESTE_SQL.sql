-- ============================================
-- EXECUTE ESTE SQL NO SUPABASE
-- ============================================
-- 1. Acesse: https://supabase.com/dashboard
-- 2. Selecione seu projeto
-- 3. Vá em: SQL Editor (menu lateral)
-- 4. Clique em: "New Query"
-- 5. Cole este SQL completo
-- 6. Clique em: "Run" (ou Ctrl+Enter)
-- ============================================

-- Criar tabela para páginas geradas
CREATE TABLE IF NOT EXISTS generated_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  template VARCHAR(50) NOT NULL,
  theme JSONB NOT NULL DEFAULT '{}',
  components JSONB NOT NULL DEFAULT '[]',
  is_published BOOLEAN DEFAULT FALSE,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, slug)
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_generated_pages_user_id ON generated_pages(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_pages_slug ON generated_pages(slug);
CREATE INDEX IF NOT EXISTS idx_generated_pages_is_published ON generated_pages(is_published);
CREATE INDEX IF NOT EXISTS idx_generated_pages_created_at ON generated_pages(created_at DESC);

-- Ativar RLS (Row Level Security)
ALTER TABLE generated_pages ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Users can view own pages" ON generated_pages;
DROP POLICY IF EXISTS "Users can create own pages" ON generated_pages;
DROP POLICY IF EXISTS "Users can update own pages" ON generated_pages;
DROP POLICY IF EXISTS "Users can delete own pages" ON generated_pages;
DROP POLICY IF EXISTS "Published pages are publicly visible" ON generated_pages;

-- Criar políticas de segurança
CREATE POLICY "Users can view own pages"
  ON generated_pages
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own pages"
  ON generated_pages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pages"
  ON generated_pages
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pages"
  ON generated_pages
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Published pages are publicly visible"
  ON generated_pages
  FOR SELECT
  USING (is_published = true);

-- Remover função antiga se existir
DROP FUNCTION IF EXISTS update_generated_pages_updated_at() CASCADE;

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_generated_pages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS trigger_update_generated_pages_updated_at ON generated_pages;

-- Criar trigger para atualizar updated_at
CREATE TRIGGER trigger_update_generated_pages_updated_at
  BEFORE UPDATE ON generated_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_generated_pages_updated_at();

-- Adicionar comentários para documentação
COMMENT ON TABLE generated_pages IS 'Armazena páginas e lojas geradas pelo gerador inteligente';
COMMENT ON COLUMN generated_pages.id IS 'Identificador único da página';
COMMENT ON COLUMN generated_pages.user_id IS 'ID do usuário proprietário da página';
COMMENT ON COLUMN generated_pages.name IS 'Nome da página';
COMMENT ON COLUMN generated_pages.slug IS 'URL amigável da página';
COMMENT ON COLUMN generated_pages.template IS 'Tipo de template usado (sales-page, store, landing, custom)';
COMMENT ON COLUMN generated_pages.theme IS 'Configurações de tema (cores, fontes, etc)';
COMMENT ON COLUMN generated_pages.components IS 'Array de componentes da página';
COMMENT ON COLUMN generated_pages.is_published IS 'Se a página está publicada e visível publicamente';
COMMENT ON COLUMN generated_pages.views IS 'Contador de visualizações da página';

-- ============================================
-- PRONTO! Se executou sem erros, está tudo OK!
-- ============================================
-- Agora você pode salvar páginas no gerador
-- ============================================
