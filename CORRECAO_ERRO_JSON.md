# 🔧 Correção do Erro "is not valid JSON"

## ❌ Erro Encontrado
```
Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

## ✅ Correção Aplicada

### Problema
O `pagarmeApi` estava sendo importado dentro da função `createCharge`, o que poderia causar problemas de importação.

### Solução
Movido a importação para o topo do arquivo.

**Antes:**
```javascript
// Dentro da função
const { pagarmeApi } = require('../config/pagarme');
const response = await pagarmeApi.post('/orders', orderData);
```

**Depois:**
```javascript
// No topo do arquivo
const { pagarmeApi } = require('../config/pagarme');

// Dentro da função
const response = await pagarmeApi.post('/orders', orderData);
```

---

## 📋 Checklist de Verificação

Para garantir que tudo funcione, verifique:

### 1. ✅ Migração do Banco de Dados
**IMPORTANTE:** Você executou a migração?

```sql
-- Acesse Supabase SQL Editor e execute:
-- Arquivo: EXECUTAR_MIGRACAO_COBRANCAS.sql
```

**Como verificar:**
```sql
SELECT * FROM billings LIMIT 1;
```

Se retornar erro "table does not exist", você precisa executar a migração!

---

### 2. ✅ Backend Atualizado

**Reinicie o backend:**
```bash
cd "GATEWAY/GATEWAY DE PAGAMENTOS/backend"
# Pare o servidor (Ctrl+C)
npm run dev
```

**Verifique se não há erros no console**

---

### 3. ✅ Variáveis de Ambiente

Verifique se o arquivo `.env` tem:

```env
# Pagar.me
PAGARME_API_KEY=sk_test_...
PLATFORM_RECIPIENT_ID=re_...

# Supabase
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
```

---

### 4. ✅ Recipient Configurado

Você precisa ter um recipient ativo no Pagar.me.

**Como verificar:**
1. Acesse o dashboard
2. Vá em **Configurações** → **Dados Bancários**
3. Preencha todos os dados
4. Salve

---

## 🧪 Teste Novamente

Após verificar todos os itens acima:

1. **Reinicie o backend** (Ctrl+C e `npm run dev`)
2. **Limpe o cache do navegador** (Ctrl+Shift+Delete)
3. **Faça logout e login novamente**
4. **Tente criar uma cobrança**

---

## 🔍 Ainda com Erro?

### Verifique os Logs do Backend

No terminal do backend, procure por:

```
Create billing charge error: ...
```

### Erros Comuns:

#### Erro: "table billings does not exist"
**Solução:** Execute a migração do banco de dados

#### Erro: "Você precisa configurar sua conta de recebimento"
**Solução:** Configure seus dados bancários no dashboard

#### Erro: "PAGARME_API_KEY is undefined"
**Solução:** Verifique o arquivo `.env` do backend

#### Erro: "Network Error"
**Solução:** Verifique se o backend está rodando na porta 3001

---

## 📞 Debug Passo a Passo

### 1. Teste o Backend Diretamente

```bash
# Teste se o backend está respondendo
curl http://localhost:3001/api/health

# Deve retornar:
{"status":"ok","timestamp":"...","version":"1.0.0"}
```

### 2. Teste a Autenticação

```bash
# Substitua SEU_TOKEN pelo token do localStorage
curl -H "Authorization: Bearer SEU_TOKEN" \
  http://localhost:3001/api/billing/stats

# Deve retornar estatísticas (mesmo que zeradas)
```

### 3. Verifique o Supabase

```sql
-- No Supabase SQL Editor:

-- 1. Verificar se tabela existe
SELECT * FROM billings LIMIT 1;

-- 2. Verificar se você tem recipient
SELECT * FROM recipients WHERE user_id = 'SEU_USER_ID';

-- 3. Verificar suas configurações
SELECT * FROM users WHERE id = 'SEU_USER_ID';
```

---

## ✅ Correção Deployada

A correção já foi enviada para o GitHub:

**Commit:** c0f91bc  
**Mensagem:** fix: Corrige importacao do pagarmeApi no billing controller

**Para atualizar seu código local:**
```bash
cd "GATEWAY/GATEWAY DE PAGAMENTOS"
git pull origin main
```

---

## 🎯 Próximos Passos

1. ✅ **Pull** do código atualizado
2. ✅ **Executar** migração do banco (se ainda não fez)
3. ✅ **Reiniciar** backend
4. ✅ **Limpar** cache do navegador
5. ✅ **Testar** novamente

---

## 📊 Status da Correção

| Item | Status |
|------|--------|
| **Código Corrigido** | ✅ Sim |
| **Deploy no GitHub** | ✅ Sim |
| **Commit** | c0f91bc |
| **Testado** | ⏳ Aguardando |

---

**Data:** 29/04/2026  
**Status:** ✅ CORREÇÃO APLICADA  
**Ação Necessária:** Reiniciar backend e testar
