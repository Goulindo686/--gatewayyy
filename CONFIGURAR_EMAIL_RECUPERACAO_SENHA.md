# 📧 Configuração de Email para Recuperação de Senha

## ✅ Sistema Implementado

O sistema de recuperação de senha foi implementado com sucesso! Agora os usuários podem:

1. ✅ Solicitar recuperação de senha na página `/forgot-password`
2. ✅ Receber um link de redefinição por email (token válido por 1 hora)
3. ✅ Redefinir a senha na página `/reset-password?token=XXX`
4. ✅ Fazer login com a nova senha

## 🎯 Páginas Criadas

### 1. **Página de Esqueci Minha Senha**
- **URL:** `/forgot-password`
- **Funcionalidade:** Usuário digita o email e recebe link de recuperação
- **Segurança:** Não revela se o email existe no sistema

### 2. **Página de Redefinir Senha**
- **URL:** `/reset-password?token=XXX`
- **Funcionalidade:** Usuário define nova senha usando o token recebido
- **Validação:** Token expira em 1 hora
- **UX:** Mostra/oculta senha, confirma senha

## 📁 Arquivos Criados/Modificados

### Frontend:
- ✅ `frontend/src/app/reset-password/page.tsx` - Página de redefinição
- ✅ `frontend/src/app/api/auth/reset-password/route.ts` - API de reset
- ✅ `frontend/src/app/api/auth/forgot-password/route.ts` - API melhorada
- ✅ `frontend/src/app/forgot-password/page.tsx` - Já existia, mantido

### Backend:
- ✅ `backend/src/services/email.service.js` - Serviço de envio de emails
- ✅ `backend/src/controllers/auth.controller.js` - Controller atualizado

## 🔧 Como Funciona (Atualmente)

### Modo de Desenvolvimento:
Por padrão, o sistema está configurado para **logar o link de recuperação no console** ao invés de enviar email real. Isso é útil para desenvolvimento e testes.

Quando um usuário solicita recuperação:
1. Sistema gera um token único (UUID)
2. Token é salvo no banco com validade de 1 hora
3. **Link é exibido no console do servidor**
4. Usuário pode copiar o link do console e acessar

**Exemplo de log:**
```
=== PASSWORD RESET REQUEST ===
Email: usuario@email.com
Reset URL: http://localhost:3000/reset-password?token=abc123...
Token: abc123-def456-ghi789
Expires: 2026-05-04T15:30:00.000Z
==============================
```

## 📮 Configurar Envio Real de Emails

Para enviar emails reais em produção, você tem 3 opções:

### **Opção 1: Nodemailer com SMTP (Recomendado)**

1. **Instale o Nodemailer:**
```bash
cd backend
npm install nodemailer
```

2. **Configure as variáveis de ambiente** (`.env`):
```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app
SMTP_FROM=noreply@goupay.com.br
FRONTEND_URL=https://seu-dominio.com
```

3. **Descomente o código no `email.service.js`:**

Abra `backend/src/services/email.service.js` e descomente a seção:
```javascript
// Example with nodemailer (requires: npm install nodemailer)
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@goupay.com.br',
    to: email,
    subject: 'Recuperação de Senha - Gateway de Pagamentos',
    text: textContent,
    html: htmlContent
});
```

### **Opção 2: SendGrid**

1. **Instale o SDK:**
```bash
npm install @sendgrid/mail
```

2. **Configure:**
```javascript
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

await sgMail.send({
    to: email,
    from: 'noreply@goupay.com.br',
    subject: 'Recuperação de Senha',
    text: textContent,
    html: htmlContent
});
```

### **Opção 3: Resend (Moderno e Simples)**

1. **Instale:**
```bash
npm install resend
```

2. **Configure:**
```javascript
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
    from: 'noreply@goupay.com.br',
    to: email,
    subject: 'Recuperação de Senha',
    html: htmlContent
});
```

## 🔐 Segurança Implementada

✅ **Token único (UUID)** - Impossível de adivinhar
✅ **Expiração de 1 hora** - Token expira automaticamente
✅ **Hash de senha (bcrypt)** - Senhas nunca são armazenadas em texto puro
✅ **Rate limiting** - Máximo 3 tentativas por hora
✅ **Não revela emails** - Sempre retorna sucesso, mesmo se email não existir
✅ **Token de uso único** - Token é deletado após uso

## 🧪 Como Testar

### 1. **Teste Local (Desenvolvimento):**

```bash
# 1. Inicie o backend
cd backend
npm run dev

# 2. Inicie o frontend (outro terminal)
cd frontend
npm run dev

# 3. Acesse http://localhost:3000/forgot-password
# 4. Digite um email cadastrado
# 5. Veja o link no console do backend
# 6. Copie e cole o link no navegador
# 7. Defina nova senha
# 8. Faça login com a nova senha
```

### 2. **Teste com Email Real:**

Depois de configurar SMTP:
```bash
# 1. Configure as variáveis de ambiente
# 2. Reinicie o servidor
# 3. Solicite recuperação de senha
# 4. Verifique sua caixa de entrada
# 5. Clique no link do email
# 6. Redefina a senha
```

## 📧 Template de Email

O email enviado é profissional e responsivo:

- ✅ Design moderno com gradiente
- ✅ Botão destacado para ação
- ✅ Link alternativo para copiar/colar
- ✅ Aviso de expiração (1 hora)
- ✅ Instruções claras
- ✅ Responsivo (funciona em mobile)

## 🚀 Deploy em Produção

### Variáveis de Ambiente Necessárias:

```env
# Backend (.env)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app
SMTP_FROM=noreply@goupay.com.br
FRONTEND_URL=https://seu-dominio.com
JWT_SECRET=seu-secret-super-seguro

# Frontend (.env.local)
NEXT_PUBLIC_APP_URL=https://seu-dominio.com
```

### Checklist de Deploy:

- [ ] Configurar SMTP ou serviço de email
- [ ] Definir `FRONTEND_URL` correto
- [ ] Testar envio de email em staging
- [ ] Verificar rate limiting está ativo
- [ ] Confirmar que tokens expiram corretamente
- [ ] Testar fluxo completo de recuperação

## 🔍 Troubleshooting

### Email não está sendo enviado:
1. Verifique as credenciais SMTP no `.env`
2. Veja os logs do console para erros
3. Teste com um serviço de email de teste (Mailtrap, Ethereal)

### Token inválido ou expirado:
1. Verifique se o token está correto na URL
2. Confirme que não passou 1 hora desde a solicitação
3. Solicite um novo link de recuperação

### Link não funciona:
1. Verifique se `FRONTEND_URL` está correto
2. Confirme que a página `/reset-password` está acessível
3. Veja se há erros no console do navegador

## 📚 Recursos Adicionais

### Provedores de Email Recomendados:

1. **Gmail SMTP** (Grátis, 500 emails/dia)
   - Fácil de configurar
   - Requer senha de app (2FA)

2. **SendGrid** (100 emails/dia grátis)
   - API simples
   - Bom para produção

3. **Resend** (3.000 emails/mês grátis)
   - Moderno e fácil
   - Ótima documentação

4. **Amazon SES** (62.000 emails/mês grátis)
   - Escalável
   - Requer configuração AWS

## ✅ Status Atual

- ✅ Sistema de recuperação implementado
- ✅ Páginas criadas e funcionais
- ✅ Segurança implementada
- ✅ Template de email profissional
- ⚠️ **Envio de email real precisa ser configurado**

---

**Próximo Passo:** Configure um provedor de email (SMTP, SendGrid, ou Resend) para enviar emails reais em produção.
