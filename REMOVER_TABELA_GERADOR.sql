-- ============================================
-- REMOVER TABELA DO GERADOR INTELIGENTE
-- ============================================
-- Execute este SQL no Supabase para remover
-- TUDO relacionado ao gerador de páginas
-- ============================================

-- ATENÇÃO: Isso vai DELETAR TODOS OS DADOS!
-- Use apenas se quiser começar do zero

-- Remover políticas RLS
DROP POLICY IF EXISTS "Users can view own pages" ON generated_pages;
DROP POLICY IF EXISTS "Users can create own pages" ON generated_pages;
DROP POLICY IF EXISTS "Users can update own pages" ON generated_pages;
DROP POLICY IF EXISTS "Users can delete own pages" ON generated_pages;
DROP POLICY IF EXISTS "Published pages are publicly visible" ON generated_pages;

-- Remover trigger
DROP TRIGGER IF EXISTS trigger_update_generated_pages_updated_at ON generated_pages;

-- Remover função
DROP FUNCTION IF EXISTS update_generated_pages_updated_at() CASCADE;

-- Remover tabela (isso remove automaticamente os índices)
DROP TABLE IF EXISTS generated_pages CASCADE;

-- ============================================
-- PRONTO! Tabela removida completamente
-- ============================================
-- Para criar novamente, execute: EXECUTAR_ESTE_SQL.sql
-- ============================================
