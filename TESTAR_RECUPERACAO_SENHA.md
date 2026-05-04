# 🧪 Guia de Teste - Recuperação de Senha

## 📋 Pré-requisitos

- ✅ Backend rodando (`npm run dev` na pasta backend)
- ✅ Frontend rodando (`npm run dev` na pasta frontend)
- ✅ Banco de dados Supabase configurado
- ✅ Pelo menos 1 usuário cadastrado no sistema

## 🎯 Cenários de Teste

### ✅ Teste 1: Fluxo Completo de Recuperação

**Objetivo:** Testar o fluxo completo de recuperação de senha

**Passos:**

1. **Acesse a página de login:**
   ```
   http://localhost:3000/login
   ```

2. **Clique em "Esqueceu a senha?"**
   - Deve redirecionar para `/forgot-password`

3. **Digite um email cadastrado:**
   - Exemplo: `usuario@teste.com`
   - Clique em "Enviar Link de Recuperação"

4. **Verifique o console do backend:**
   ```
   === PASSWORD RESET REQUEST ===
   Email: usuario@teste.com
   Reset URL: http://localhost:3000/reset-password?token=abc123...
   Token: abc123-def456-ghi789
   Expires: 2026-05-04T15:30:00.000Z
   ==============================
   ```

5. **Copie o Reset URL do console**

6. **Cole no navegador:**
   - Deve abrir a página de redefinição de senha

7. **Digite uma nova senha:**
   - Senha: `novaSenha123`
   - Confirmar: `novaSenha123`
   - Clique em "Redefinir Senha"

8. **Verifique a mensagem de sucesso:**
   - Deve mostrar: "Senha alterada com sucesso!"
   - Deve redirecionar para `/login` após 2 segundos

9. **Faça login com a nova senha:**
   - Email: `usuario@teste.com`
   - Senha: `novaSenha123`
   - Deve fazer login com sucesso ✅

---

### ✅ Teste 2: Email Não Cadastrado

**Objetivo:** Verificar que o sistema não revela se o email existe

**Passos:**

1. Acesse `/forgot-password`
2. Digite um email não cadastrado: `naoexiste@teste.com`
3. Clique em "Enviar Link de Recuperação"
4. **Resultado esperado:**
   - Mensagem: "Se o email existir, instruções de recuperação serão enviadas."
   - Nenhum email é enviado
   - Nenhum token é gerado
   - Sistema não revela que o email não existe ✅

---

### ✅ Teste 3: Token Expirado

**Objetivo:** Verificar que tokens expirados não funcionam

**Passos:**

1. **Simule um token expirado no banco:**
   ```sql
   -- Execute no Supabase SQL Editor
   UPDATE users 
   SET password_reset_token = 'token-teste-expirado',
       password_reset_expires = NOW() - INTERVAL '2 hours'
   WHERE email = 'usuario@teste.com';
   ```

2. **Tente acessar:**
   ```
   http://localhost:3000/reset-password?token=token-teste-expirado
   ```

3. **Digite uma nova senha e envie**

4. **Resultado esperado:**
   - Erro: "Token expirado. Solicite um novo link de recuperação." ✅

---

### ✅ Teste 4: Token Inválido

**Objetivo:** Verificar que tokens inválidos são rejeitados

**Passos:**

1. **Acesse com token falso:**
   ```
   http://localhost:3000/reset-password?token=token-invalido-123
   ```

2. **Digite uma senha e envie**

3. **Resultado esperado:**
   - Erro: "Token inválido ou expirado" ✅

---

### ✅ Teste 5: Senhas Não Coincidem

**Objetivo:** Validar confirmação de senha

**Passos:**

1. Solicite recuperação de senha normalmente
2. Acesse o link de reset
3. **Digite senhas diferentes:**
   - Senha: `senha123`
   - Confirmar: `senha456`
4. Clique em "Redefinir Senha"

5. **Resultado esperado:**
   - Erro: "As senhas não coincidem" ✅

---

### ✅ Teste 6: Senha Muito Curta

**Objetivo:** Validar tamanho mínimo da senha

**Passos:**

1. Solicite recuperação de senha
2. Acesse o link de reset
3. **Digite senha curta:**
   - Senha: `123`
   - Confirmar: `123`
4. Clique em "Redefinir Senha"

5. **Resultado esperado:**
   - Erro: "A senha deve ter no mínimo 6 caracteres" ✅

---

### ✅ Teste 7: Rate Limiting

**Objetivo:** Verificar proteção contra spam

**Passos:**

1. Acesse `/forgot-password`
2. **Envie 4 solicitações seguidas** com o mesmo email
3. Na 4ª tentativa:

4. **Resultado esperado:**
   - Erro: "Too many requests" (Rate limit atingido)
   - Bloqueio por 1 hora ✅

---

### ✅ Teste 8: Múltiplas Solicitações

**Objetivo:** Verificar que apenas o último token é válido

**Passos:**

1. Solicite recuperação de senha (gera token1)
2. Copie o link do console
3. **Solicite novamente** (gera token2)
4. Copie o novo link
5. Tente usar o **primeiro link (token1)**

6. **Resultado esperado:**
   - Token1 deve ser inválido (foi substituído por token2)
   - Apenas token2 funciona ✅

---

## 🔍 Verificações no Banco de Dados

### Verificar Token Gerado:

```sql
SELECT 
    email, 
    password_reset_token, 
    password_reset_expires,
    password_reset_expires > NOW() as is_valid
FROM users 
WHERE email = 'usuario@teste.com';
```

### Verificar Senha Foi Alterada:

```sql
SELECT 
    email,
    password_hash,
    password_reset_token,
    updated_at
FROM users 
WHERE email = 'usuario@teste.com';
```

**Após reset bem-sucedido:**
- `password_hash` deve ser diferente
- `password_reset_token` deve ser `NULL`
- `password_reset_expires` deve ser `NULL`
- `updated_at` deve ser recente

---

## 📊 Checklist de Testes

Use este checklist para garantir que tudo está funcionando:

- [ ] ✅ Fluxo completo funciona (solicitar → resetar → login)
- [ ] ✅ Email não cadastrado não revela informação
- [ ] ✅ Token expira após 1 hora
- [ ] ✅ Token inválido é rejeitado
- [ ] ✅ Senhas devem coincidir
- [ ] ✅ Senha mínima de 6 caracteres
- [ ] ✅ Rate limiting funciona (3 tentativas/hora)
- [ ] ✅ Apenas último token é válido
- [ ] ✅ Token é deletado após uso
- [ ] ✅ Senha antiga não funciona mais
- [ ] ✅ Nova senha funciona no login
- [ ] ✅ Link "Voltar para login" funciona
- [ ] ✅ Botão "Esqueceu a senha?" no login funciona
- [ ] ✅ UI responsiva (mobile/desktop)
- [ ] ✅ Mostrar/ocultar senha funciona

---

## 🐛 Problemas Comuns

### Problema: "Token inválido" mesmo com token correto

**Solução:**
1. Verifique se o token no banco está correto
2. Confirme que não expirou (< 1 hora)
3. Veja se há espaços extras na URL

### Problema: Console não mostra o link

**Solução:**
1. Verifique se o backend está rodando
2. Veja os logs do terminal do backend
3. Confirme que o email existe no banco

### Problema: Senha não está sendo alterada

**Solução:**
1. Verifique conexão com Supabase
2. Veja logs de erro no console
3. Confirme que o token é válido

---

## 🎉 Teste Bem-Sucedido

Se todos os testes passaram, você verá:

✅ Usuário consegue recuperar senha
✅ Sistema é seguro (não vaza informações)
✅ Tokens expiram corretamente
✅ Rate limiting protege contra spam
✅ Validações funcionam
✅ UI é intuitiva e responsiva

**Sistema de recuperação de senha está funcionando perfeitamente!** 🚀
