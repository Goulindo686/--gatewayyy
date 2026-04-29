# ⚡ Solução Rápida - Erro ao Criar Cobrança

## ✅ Correções Aplicadas

### 1. Backend - Importação do pagarmeApi
**Commit:** c0f91bc  
**Status:** ✅ Corrigido

### 2. Frontend - URL da API
**Commit:** 914dc15  
**Status:** ✅ Corrigido

---

## 🚀 O QUE FAZER AGORA (Passo a Passo)

### 1️⃣ Atualizar o Código
```bash
cd "GATEWAY/GATEWAY DE PAGAMENTOS"
git pull origin main
```

### 2️⃣ Reiniciar o Frontend
```bash
cd frontend
# Pare o servidor (Ctrl+C)
npm run dev
```

### 3️⃣ Limpar Cache do Navegador
- Pressione `Ctrl+Shift+Delete`
- Marque "Cache" e "Cookies"
- Clique em "Limpar dados"

### 4️⃣ Fazer Logout e Login
- Clique no avatar no canto superior direito
- Clique em "Sair"
- Faça login novamente

### 5️⃣ Testar Criar Cobrança
- Vá em "Cobranças"
- Clique em "Nova Cobrança"
- Digite um valor (ex: 10.00)
- Clique em "Gerar Cobrança"

---

## 🔍 Se Ainda Der Erro

### Verifique o Console do Navegador
1. Pressione `F12`
2. Vá na aba "Console"
3. Procure por erros em vermelho
4. Me envie o erro completo

### Verifique o Backend
1. Olhe o terminal onde o backend está rodando
2. Procure por erros em vermelho
3. Me envie o erro completo

---

## 📋 Checklist Completo

- [ ] Git pull feito
- [ ] Frontend reiniciado
- [ ] Cache do navegador limpo
- [ ] Logout/Login feito
- [ ] Migração do banco executada (SQL)
- [ ] Backend está rodando (porta 3001)
- [ ] Frontend está rodando (porta 3000)

---

## 🆘 Erros Comuns

### Erro: "Failed to fetch"
**Causa:** Backend não está rodando  
**Solução:** Inicie o backend com `npm run dev`

### Erro: "401 Unauthorized"
**Causa:** Token expirado  
**Solução:** Faça logout e login novamente

### Erro: "table billings does not exist"
**Causa:** Migração não foi executada  
**Solução:** Execute o script SQL no Supabase

### Erro: "Você precisa configurar sua conta de recebimento"
**Causa:** Recipient não configurado  
**Solução:** Vá em Configurações → Dados Bancários

---

## 📞 Ainda com Problema?

Me envie:
1. ✅ Print do erro no navegador (F12 → Console)
2. ✅ Print do erro no terminal do backend
3. ✅ Confirmação de que executou a migração SQL
4. ✅ Confirmação de que fez git pull

---

## 🎯 Resumo das Correções

| Problema | Solução | Status |
|----------|---------|--------|
| Importação pagarmeApi | Movido para topo do arquivo | ✅ |
| URL da API no frontend | Adicionado fallback para localhost:3001 | ✅ |
| Deploy no GitHub | Commits enviados | ✅ |

---

**Última Atualização:** 29/04/2026  
**Commits:** c0f91bc, 914dc15  
**Status:** ✅ CORREÇÕES DEPLOYADAS
