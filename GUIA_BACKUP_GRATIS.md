# 💾 GUIA: BACKUP AUTOMÁTICO 100% GRÁTIS

## ✅ O QUE FOI CRIADO

Criei um sistema completo de backup automático que:

1. ✅ Roda **automaticamente todo dia às 3h da manhã**
2. ✅ Faz backup de **todas as 11 tabelas** do banco
3. ✅ Salva no **Supabase Storage** (1GB grátis)
4. ✅ Mantém **últimos 30 dias** de backup
5. ✅ Deleta backups antigos automaticamente
6. ✅ **100% GRÁTIS** (usa Vercel Cron grátis)

---

## 📁 ARQUIVOS CRIADOS

### 1. `backend/scripts/backup-database.js`
Script Node.js para fazer backup manual (se precisar)

### 2. `frontend/src/app/api/cron/backup/route.ts`
API que faz o backup automático

### 3. `vercel.json`
Configuração do Vercel Cron (agenda automática)

---

## 🚀 COMO ATIVAR (5 PASSOS)

### **PASSO 1: Criar Bucket no Supabase** (2 minutos)

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em: **Storage** (menu lateral)
4. Clique em: **Create a new bucket**
5. Nome: `backups`
6. **Public:** ❌ NÃO (deixe privado)
7. Clique em: **Create bucket**

✅ Pronto! Bucket criado.

---

### **PASSO 2: Adicionar Variável de Ambiente** (1 minuto)

1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto
3. Vá em: **Settings > Environment Variables**
4. Adicione:

```
Nome: CRON_SECRET
Valor: gere-uma-senha-forte-aqui-123456
Ambientes: ✅ Production, ✅ Preview, ✅ Development
```

**Como gerar senha forte:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

5. Clique em: **Save**

---

### **PASSO 3: Fazer Deploy** (2 minutos)

```bash
cd "GATEWAY/GATEWAY DE PAGAMENTOS"
git add .
git commit -m "feat: adicionar backup automático"
git push
```

A Vercel vai fazer deploy automaticamente! ✅

---

### **PASSO 4: Testar Manualmente** (1 minuto)

Depois do deploy, teste se funciona:

**Opção A: Pelo navegador**
```
https://seu-dominio.vercel.app/api/cron/backup
```

**Opção B: Pelo terminal**
```bash
curl -X POST https://seu-dominio.vercel.app/api/cron/backup \
  -H "Authorization: Bearer sua-senha-do-CRON_SECRET"
```

**Resposta esperada:**
```json
{
  "success": true,
  "filename": "backup-2026-04-28.sql",
  "tables": 11,
  "records": 1523,
  "duration": "2.45s",
  "timestamp": "2026-04-28T06:00:00.000Z"
}
```

---

### **PASSO 5: Verificar no Supabase** (1 minuto)

1. Vá em: **Storage > backups**
2. Você deve ver: `backup-2026-04-28.sql`
3. Clique para baixar e verificar

✅ **FUNCIONOU!** Agora vai rodar automaticamente todo dia às 3h! 🎉

---

## 📊 COMO FUNCIONA

```
Todo dia às 3h da manhã (horário de Brasília):

1. Vercel Cron chama: /api/cron/backup
2. API conecta no Supabase
3. Faz SELECT * em todas as tabelas:
   - users
   - products
   - orders
   - transactions
   - withdrawals
   - recipients
   - platform_fees
   - platform_settings
   - enrollments
   - product_plans
   - subscriptions

4. Gera arquivo SQL com todos os dados
5. Salva no Supabase Storage
6. Deleta backups com mais de 30 dias
7. Pronto! ✅
```

---

## 🔍 COMO RESTAURAR UM BACKUP

### **Opção 1: Pelo Supabase Dashboard (Mais Fácil)**

1. Vá em: **Storage > backups**
2. Clique no backup que quer restaurar
3. Clique em: **Download**
4. Abra o arquivo `.sql` em um editor
5. Vá em: **SQL Editor** no Supabase
6. Cole o conteúdo do arquivo
7. Clique em: **Run**

✅ Dados restaurados!

### **Opção 2: Pelo Terminal (Avançado)**

```bash
# 1. Baixar backup
curl "https://seu-projeto.supabase.co/storage/v1/object/backups/backup-2026-04-28.sql" \
  -H "Authorization: Bearer sua-service-key" \
  -o backup.sql

# 2. Restaurar no banco
psql "sua-connection-string" < backup.sql
```

---

## 💰 CUSTOS

| Recurso | Limite Grátis | Seu Uso | Custo |
|---------|---------------|---------|-------|
| Vercel Cron | Ilimitado | 1x/dia | **R$ 0,00** |
| Supabase Storage | 1 GB | ~30 MB | **R$ 0,00** |
| Bandwidth | 5 GB/mês | ~1 MB/dia | **R$ 0,00** |
| **TOTAL** | | | **R$ 0,00** ✅ |

**Explicação:**
- Cada backup tem ~1 MB
- 30 backups = 30 MB
- Muito abaixo do limite de 1 GB grátis!

---

## 📧 ADICIONAR NOTIFICAÇÃO POR EMAIL (OPCIONAL)

Se quiser receber email quando o backup rodar:

### **Opção 1: Usar Resend (Grátis até 3.000 emails/mês)**

```bash
npm install resend
```

```typescript
// No arquivo route.ts, adicionar no final:

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Enviar email de sucesso
await resend.emails.send({
    from: 'backup@seudominio.com',
    to: 'seu-email@gmail.com',
    subject: '✅ Backup realizado com sucesso',
    html: `
        <h2>Backup Concluído</h2>
        <p><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
        <p><strong>Tabelas:</strong> ${validBackups.length}</p>
        <p><strong>Registros:</strong> ${totalRecords}</p>
        <p><strong>Arquivo:</strong> ${filename}</p>
    `
});
```

### **Opção 2: Usar Telegram (Mais Simples)**

Você já tem Telegram configurado! Adicione no final do backup:

```typescript
// Enviar notificação no Telegram
await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        chat_id: 'SEU_CHAT_ID',
        text: `✅ Backup realizado!\n\n📊 Tabelas: ${validBackups.length}\n📝 Registros: ${totalRecords}\n⏱️ Tempo: ${duration}s`
    })
});
```

---

## 🧪 TESTAR AGORA

Quer testar se está funcionando? Execute:

```bash
# Opção 1: Testar script local
cd backend
node scripts/backup-database.js

# Opção 2: Testar API (depois do deploy)
curl -X POST https://seu-dominio.vercel.app/api/cron/backup \
  -H "Authorization: Bearer sua-senha-do-CRON_SECRET"
```

---

## ⚠️ IMPORTANTE

### **Segurança:**
- ✅ Backups são privados (só você acessa)
- ✅ Precisa de senha (CRON_SECRET) para rodar
- ✅ Dados criptografados no Supabase Storage

### **Limitações:**
- ⚠️ Não faz backup de arquivos (imagens, PDFs, etc.)
- ⚠️ Só faz backup dos dados das tabelas
- ⚠️ Limite de 1 GB no Supabase Storage grátis

### **Alternativas se passar de 1 GB:**
1. Compactar backups (adicionar gzip)
2. Manter só 15 dias em vez de 30
3. Usar Google Drive (15 GB grátis)

---

## 🎯 CHECKLIST

- [ ] Bucket 'backups' criado no Supabase
- [ ] Variável CRON_SECRET adicionada na Vercel
- [ ] Deploy feito
- [ ] Backup testado manualmente
- [ ] Backup aparece no Supabase Storage
- [ ] Testou restaurar um backup

---

## 🆘 PROBLEMAS COMUNS

### **Erro: "Bucket not found"**
→ Você esqueceu de criar o bucket 'backups' no Supabase

### **Erro: "Unauthorized"**
→ CRON_SECRET está errado ou não foi configurado

### **Erro: "Storage quota exceeded"**
→ Passou de 1 GB. Deletar backups antigos manualmente.

### **Backup não roda automaticamente**
→ Vercel Cron só funciona em produção, não em preview/dev

---

## 💡 PRÓXIMOS PASSOS

Depois que o backup estiver funcionando:

1. ✅ Teste restaurar um backup (para ter certeza que funciona)
2. ✅ Configure notificação por email/Telegram
3. ✅ Documente onde estão os backups para sua equipe
4. ✅ Adicione no README do projeto

---

## 🚀 QUER MELHORAR?

Posso adicionar:
- 📧 Notificação por email quando backup rodar
- 📱 Notificação no Telegram
- ☁️ Enviar para Google Drive também
- 🗜️ Compactar backups (economizar espaço)
- 📊 Dashboard para ver histórico de backups

É só me avisar! 😊
