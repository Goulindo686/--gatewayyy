# 📧 Configurar Recuperação de Senha com Supabase

## 🎯 Visão Geral

O Supabase já possui um sistema completo de autenticação com envio de emails integrado! Vamos usar o **Supabase Auth** para enviar emails de recuperação de senha automaticamente, sem precisar configurar SMTP ou serviços externos.

## ✅ Vantagens do Supabase Auth

- ✅ **Emails automáticos** - Supabase envia os emails
- ✅ **Templates personalizáveis** - Customize o visual dos emails
- ✅ **Gratuito** - Incluído no plano free
- ✅ **Seguro** - Tokens gerenciados pelo Supabase
- ✅ **Sem configuração SMTP** - Funciona out-of-the-box
- ✅ **Rate limiting integrado** - Proteção contra spam

## 🔧 Configuração no Supabase Dashboard

### Passo 1: Acessar Configurações de Email

1. Acesse seu projeto no [Supabase Dashboard](https://app.supabase.com)
2. Vá em **Authentication** → **Email Templates**
3. Você verá os templates disponíveis:
   - Confirm signup
   - Invite user
   - Magic Link
   - **Reset Password** ← Este é o que vamos usar
   - Change Email Address

### Passo 2: Configurar o Template de Reset Password

1. Clique em **Reset Password**
2. Você verá o template padrão:

```html
<h2>Reset Password</h2>

<p>Follow this link to reset the password for your user:</p>
<p><a href="{{ .SiteURL }}/reset-password?token={{ .Token }}">Reset Password</a></p>
```

3. **Personalize o template** (opcional):

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f7;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f7; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 16px 16px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px;">🔐 Recuperação de Senha</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="margin: 0 0 20px; color: #1d1d1f; font-size: 16px;">
                                Olá,
                            </p>
                            <p style="margin: 0 0 20px; color: #1d1d1f; font-size: 16px;">
                                Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha:
                            </p>
                            
                            <!-- Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="{{ .SiteURL }}/reset-password?token={{ .Token }}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px;">
                                            Redefinir Minha Senha
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 20px 0; color: #86868b; font-size: 14px;">
                                Ou copie e cole este link no seu navegador:
                            </p>
                            <p style="margin: 0 0 20px; padding: 12px; background-color: #f5f5f7; border-radius: 8px; color: #667eea; font-size: 13px; word-break: break-all;">
                                {{ .SiteURL }}/reset-password?token={{ .Token }}
                            </p>
                            
                            <div style="margin: 30px 0; padding: 16px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 8px;">
                                <p style="margin: 0; color: #856404; font-size: 14px;">
                                    ⚠️ <strong>Importante:</strong> Este link expira em 1 hora por segurança.
                                </p>
                            </div>
                            
                            <p style="margin: 20px 0 0; color: #86868b; font-size: 14px;">
                                Se você não solicitou a redefinição de senha, ignore este email.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px; background-color: #f5f5f7; border-top: 1px solid #e5e5e7; border-radius: 0 0 16px 16px;">
                            <p style="margin: 0; color: #86868b; font-size: 13px; text-align: center;">
                                Gateway de Pagamentos
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
```

4. Clique em **Save**

### Passo 3: Configurar Site URL

1. Vá em **Authentication** → **URL Configuration**
2. Configure:
   - **Site URL:** `https://seu-dominio.com` (produção) ou `http://localhost:3000` (desenvolvimento)
   - **Redirect URLs:** Adicione:
     - `https://seu-dominio.com/reset-password`
     - `http://localhost:3000/reset-password` (para desenvolvimento)

### Passo 4: Configurar Email Settings (Opcional)

Por padrão, o Supabase usa o próprio servidor de email deles. Para usar seu próprio domínio:

1. Vá em **Project Settings** → **Auth** → **SMTP Settings**
2. Configure seu SMTP (opcional):
   - **Host:** smtp.gmail.com
   - **Port:** 587
   - **Username:** seu-email@gmail.com
   - **Password:** sua-senha-de-app
   - **Sender email:** noreply@seu-dominio.com
   - **Sender name:** Gateway de Pagamentos

**Nota:** Se não configurar SMTP customizado, o Supabase usa o servidor deles (funciona perfeitamente).

## 🔄 Atualizar o Código

Agora vou criar uma versão que usa o Supabase Auth:

### Opção 1: Usar Supabase Auth Completo (Recomendado)

Vantagens:
- ✅ Emails enviados automaticamente
- ✅ Tokens gerenciados pelo Supabase
- ✅ Mais seguro
- ✅ Menos código para manter

### Opção 2: Sistema Híbrido (Atual)

Vantagens:
- ✅ Mantém controle total
- ✅ Usa tabela users existente
- ✅ Compatível com sistema atual

## 📝 Implementação Recomendada

Vou criar uma versão que usa o **Supabase Auth** para enviar emails, mas mantém a compatibilidade com a tabela `users` existente.

### Como Funciona:

1. **Usuário solicita recuperação** → `/forgot-password`
2. **Sistema chama Supabase Auth** → `supabase.auth.resetPasswordForEmail()`
3. **Supabase envia email automaticamente** com link
4. **Usuário clica no link** → `/reset-password?token=XXX`
5. **Sistema valida token e atualiza senha** → Supabase Auth + tabela users

## 🧪 Testar em Desenvolvimento

### 1. Configurar Site URL para localhost:

No Supabase Dashboard:
- **Site URL:** `http://localhost:3000`
- **Redirect URLs:** `http://localhost:3000/reset-password`

### 2. Testar o fluxo:

```bash
# 1. Inicie o servidor
cd frontend
npm run dev

# 2. Acesse
http://localhost:3000/forgot-password

# 3. Digite seu email
# 4. Verifique sua caixa de entrada
# 5. Clique no link do email
# 6. Redefina a senha
```

### 3. Verificar emails de teste:

Durante desenvolvimento, o Supabase pode enviar emails para uma caixa de teste. Verifique:
- Sua caixa de entrada real
- Pasta de spam
- Console do Supabase (alguns planos mostram logs de email)

## 🚀 Deploy em Produção

### 1. Atualizar Site URL:

No Supabase Dashboard:
- **Site URL:** `https://seu-dominio.com`
- **Redirect URLs:** `https://seu-dominio.com/reset-password`

### 2. Variáveis de Ambiente:

```env
# Frontend (.env.local)
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
NEXT_PUBLIC_APP_URL=https://seu-dominio.com

# Backend (.env)
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=sua-service-role-key
FRONTEND_URL=https://seu-dominio.com
```

### 3. Deploy:

```bash
# Commit e push
git add .
git commit -m "feat: Configura recuperação de senha com Supabase Auth"
git push origin main

# Vercel fará deploy automaticamente
```

## 📧 Customizar Emails (Avançado)

### Variáveis Disponíveis nos Templates:

- `{{ .Email }}` - Email do usuário
- `{{ .Token }}` - Token de recuperação
- `{{ .SiteURL }}` - URL do site configurada
- `{{ .TokenHash }}` - Hash do token
- `{{ .RedirectTo }}` - URL de redirecionamento

### Exemplo de Template Avançado:

```html
<h2>Olá!</h2>
<p>Você solicitou redefinir sua senha para <strong>{{ .Email }}</strong></p>
<p><a href="{{ .SiteURL }}/reset-password?token={{ .Token }}">Clique aqui para redefinir</a></p>
<p>Este link expira em 1 hora.</p>
<p>Se você não solicitou isso, ignore este email.</p>
```

## 🔐 Segurança

O Supabase Auth já implementa:

- ✅ **Tokens únicos** - Cada solicitação gera novo token
- ✅ **Expiração automática** - Tokens expiram em 1 hora
- ✅ **Rate limiting** - Proteção contra spam
- ✅ **Tokens de uso único** - Token é invalidado após uso
- ✅ **Criptografia** - Tokens são criptografados

## 📊 Monitoramento

### Ver logs de email:

1. Acesse **Authentication** → **Users**
2. Clique em um usuário
3. Veja o histórico de emails enviados

### Métricas:

- **Authentication** → **Logs** - Ver tentativas de login/reset
- **Database** → **Table Editor** → `auth.users` - Ver usuários

## ❓ Troubleshooting

### Email não está chegando:

1. ✅ Verifique pasta de spam
2. ✅ Confirme Site URL está correto
3. ✅ Verifique se email está cadastrado
4. ✅ Veja logs no Supabase Dashboard
5. ✅ Teste com outro email

### Link não funciona:

1. ✅ Verifique Redirect URLs no Supabase
2. ✅ Confirme que página `/reset-password` existe
3. ✅ Veja se token está na URL
4. ✅ Verifique se não expirou (1 hora)

### Erro "Invalid token":

1. ✅ Token pode ter expirado
2. ✅ Token já foi usado
3. ✅ Solicite novo link de recuperação

## 🎉 Pronto!

Agora você tem um sistema de recuperação de senha profissional usando o Supabase Auth, sem precisar configurar SMTP ou serviços externos!

**Próximo passo:** Vou atualizar o código para usar o Supabase Auth automaticamente.
