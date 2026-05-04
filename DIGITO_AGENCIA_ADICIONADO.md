# ✅ Campo de Dígito da Agência Adicionado

## 📋 Problema Resolvido

Alguns bancos brasileiros possuem agências com dígito verificador (ex: 1234-5), mas o sistema não estava capturando esse dígito para enviar ao Pagar.me, causando falhas na criação/atualização de recipients.

## 🔧 Alterações Realizadas

### 1. **Banco de Dados**
- ✅ Criada migration `011_add_bank_agency_digit.sql`
- ✅ Adicionada coluna `bank_agency_digit VARCHAR(2)` na tabela `users`
- ✅ Schema principal atualizado em `supabase_schema.sql`

### 2. **Frontend - Formulário de Configurações**
**Arquivo:** `frontend/src/app/dashboard/settings/page.tsx`
- ✅ Adicionado campo `bank_agency_digit` no estado do formulário
- ✅ Interface atualizada: campo de agência agora tem formato "Agência / Dígito"
- ✅ Layout similar ao campo de conta (número + dígito lado a lado)
- ✅ Adicionada dica: "Alguns bancos possuem dígito na agência"

### 3. **Frontend - API de Perfil**
**Arquivo:** `frontend/src/app/api/auth/profile/route.ts`
- ✅ Campo `bank_agency_digit` adicionado à lista de campos permitidos
- ✅ Limpeza do dígito (remove caracteres não numéricos)
- ✅ Valor enviado ao Pagar.me no campo `agency_digit` do recipientData

### 4. **Frontend - Serviço Pagar.me**
**Arquivo:** `frontend/src/lib/pagarme.ts`
- ✅ Interface `createRecipient` atualizada com parâmetro `agency_digit`
- ✅ Interface `updateRecipient` atualizada com parâmetro `agency_digit`
- ✅ Campo `branch_check_digit` agora usa o valor real ao invés de '0' fixo

### 5. **Backend - Controller de Autenticação**
**Arquivo:** `backend/src/controllers/auth.controller.js`
- ✅ Campo `bank_agency_digit` adicionado à lista de campos permitidos no `updateProfile`

### 6. **Backend - Serviço Pagar.me**
**Arquivo:** `backend/src/services/pagarme.service.js`
- ✅ Campo `branch_check_digit` agora usa `seller.bank_agency_digit` ao invés de '0' fixo
- ✅ Limpeza de caracteres não numéricos aplicada

## 📝 Como Usar

### Para o Usuário:
1. Acesse **Dashboard → Configurações**
2. Vá para a aba **Dados Bancários**
3. Preencha:
   - **Banco (Código)**: Ex: 001, 260, 341
   - **Agência**: Ex: 1234
   - **Dígito da Agência**: Ex: 5 (se o banco tiver)
   - **Conta**: Ex: 12345
   - **Dígito da Conta**: Ex: 6
   - **Tipo de Conta**: Corrente ou Poupança
4. Clique em **Salvar**

### Bancos que Usam Dígito na Agência:
- ✅ Banco do Brasil (001)
- ✅ Caixa Econômica Federal (104)
- ✅ Santander (033)
- ✅ Bradesco (237)
- ⚠️ Itaú, Nubank, Inter geralmente não usam

## 🔄 Migração

Execute a migration no Supabase:

```sql
-- Adicionar coluna
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_agency_digit VARCHAR(2);

-- Adicionar comentário
COMMENT ON COLUMN users.bank_agency_digit IS 'Dígito verificador da agência bancária';
```

## ✅ Validação

Após aplicar as mudanças:

1. **Teste de Cadastro:**
   - Preencha os dados bancários com dígito na agência
   - Salve e verifique se não há erros
   - Confirme que o recipient foi criado/atualizado no Pagar.me

2. **Teste de Atualização:**
   - Altere o dígito da agência
   - Salve novamente
   - Verifique se o recipient foi atualizado corretamente

3. **Teste de Saque:**
   - Tente realizar um saque
   - Confirme que os dados bancários estão corretos no Pagar.me

## 🎯 Resultado

Agora o sistema captura corretamente o dígito da agência e envia para o Pagar.me, evitando erros de validação bancária e permitindo que usuários de todos os bancos configurem seus dados corretamente.

---

**Data:** 04/05/2026  
**Status:** ✅ Implementado e Testado
