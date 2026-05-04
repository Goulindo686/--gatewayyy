# ⚡ Guia Rápido - Configurar Email com Supabase

## 🎯 Em 5 Minutos

### 1️⃣ Configurar no Supabase Dashboard

1. **Acesse:** https://app.supabase.com
2. **Selecione seu projeto**
3. **Vá em:** Authentication → URL Configuration
4. **Configure:**
   ```
   Site URL: https://seu-dominio.com
   (ou http://localhost:3000 para desenvolvimento)
   
   Redirect URLs (adicione ambos):
   - https://seu-dominio.com/reset-password
   - http://localhost:3000/reset-password
   ```
5. **Clique em Save**

### 2️⃣ Personalizar Template de Email (Opcional)

1. **Vá em:** Authentication → Email Templates
2. **Clique em:** Reset Password
3. **Cole este template:**

```html
<h2>🔐 Recuperação de Senha</h2>

<p>Olá!</p>

<p>Recebemos uma solicitação para redefinir sua senha.</p>

<p><a href="{{ .SiteURL }}/reset-password?token={{ .Token }}" style="display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Redefinir Senha</a></p>

<p>Ou copie este link:</p>
<p style="background: #f5f5f5; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px;">{{ .SiteURL }}/reset-password?token={{ .Token }}</p>

<p><strong>⚠️ Este link expira em 1 hora.</strong></p>

<p>Se você não solicitou isso, ignore este email.</p>

<hr>
<p style="color: #666; font-size: 12px;">Gateway de Pagamentos</p>
```

4. **Clique em Save**

### 3️⃣ Testar

1. **Acesse:** http://localhost:3000/forgot-password
2. **Digite seu email**
3. **Clique em "Enviar Link"**
4. **Verifique sua caixa de entrada** (pode demorar 1-2 minutos)
5. **Clique no link do email**
6. **Defina nova senha**
7. **Faça login** ✅

## 🚀 Deploy em Produção

### Atualizar Site URL:

1. **Vá em:** Authentication → URL Configuration
2. **Mude Site URL para:** `https://seu-dominio.com`
3. **Adicione Redirect URL:** `https://seu-dominio.com/reset-password`
4. **Save**

### Variáveis de Ambiente (Vercel):

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
NEXT_PUBLIC_APP_URL=https://seu-dominio.com
```

## ✅ Pronto!

Agora o sistema de recuperação de senha está funcionando com emails automáticos do Supabase!

## 📧 Como Funciona

1. **Usuário solicita recuperação** → Sistema chama `supabase.auth.resetPasswordForEmail()`
2. **Supabase envia email automaticamente** com link seguro
3. **Usuário clica no link** → Abre página de redefinição
4. **Usuário define nova senha** → Sistema atualiza via Supabase Auth
5. **Pronto!** Usuário pode fazer login com nova senha

## 🔍 Troubleshooting

### Email não chegou?
- ✅ Verifique pasta de spam
- ✅ Aguarde 2-3 minutos
- ✅ Confirme que Site URL está correto
- ✅ Veja se email está cadastrado no sistema

### Link não funciona?
- ✅ Verifique se Redirect URL está configurado
- ✅ Confirme que página `/reset-password` existe
- ✅ Veja se token está na URL
- ✅ Token expira em 1 hora - solicite novo se expirou

### Erro "Invalid token"?
- ✅ Token pode ter expirado (1 hora)
- ✅ Token já foi usado
- ✅ Solicite novo link de recuperação

## 💡 Dicas

- **Desenvolvimento:** Use `http://localhost:3000` como Site URL
- **Produção:** Use seu domínio real `https://seu-dominio.com`
- **Múltiplos ambientes:** Adicione todos os domínios em Redirect URLs
- **Customização:** Edite o template de email para combinar com sua marca

## 🎨 Template Profissional (Opcional)

Para um email mais bonito, use o template completo em `CONFIGURAR_SUPABASE_EMAIL.md`

---

**Tempo total:** ~5 minutos ⚡
**Custo:** Grátis (incluído no Supabase) 💰
**Manutenção:** Zero 🎉
