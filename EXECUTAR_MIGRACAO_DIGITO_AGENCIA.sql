-- ============================================
-- MIGRATION: Adicionar Dígito da Agência
-- Data: 04/05/2026
-- Descrição: Adiciona campo para dígito verificador da agência bancária
-- ============================================

-- 1. Adicionar coluna bank_agency_digit
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_agency_digit VARCHAR(2);

-- 2. Adicionar comentário para documentação
COMMENT ON COLUMN users.bank_agency_digit IS 'Dígito verificador da agência bancária (alguns bancos como BB, Caixa, Santander possuem)';

-- 3. Verificar se a coluna foi criada
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'bank_agency_digit';

-- 4. (Opcional) Se você quiser definir um valor padrão para registros existentes
-- UPDATE users SET bank_agency_digit = '0' WHERE bank_agency_digit IS NULL AND bank_agency IS NOT NULL;

-- ============================================
-- RESULTADO ESPERADO:
-- ✅ Coluna bank_agency_digit criada com sucesso
-- ✅ Tipo: VARCHAR(2)
-- ✅ Permite NULL (usuários podem não ter dígito)
-- ============================================
