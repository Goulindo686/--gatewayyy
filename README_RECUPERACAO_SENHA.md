# Recuperação de senha

O sistema atual usa um token próprio armazenado no Supabase e envia o link pelo SMTP configurado no frontend Next.js.

Fluxo:

1. `/forgot-password` recebe o e-mail.
2. `/api/auth/forgot-password` procura o usuário.
3. A API cria um token com validade de uma hora.
4. O Nodemailer envia o link pelo SMTP.
5. `/reset-password` valida o token e atualiza a senha com bcrypt.
6. O token é apagado depois do uso.

O Supabase é usado como banco de dados nesse fluxo; ele não é o remetente do e-mail.

Para configurar, testar e publicar o SMTP da GoDaddy, consulte:

- [`CONFIGURAR_EMAIL_RECUPERACAO_SENHA.md`](./CONFIGURAR_EMAIL_RECUPERACAO_SENHA.md)

Arquivos ativos:

- `frontend/src/lib/smtp.ts`
- `frontend/src/lib/email.ts`
- `frontend/src/app/api/auth/forgot-password/route.ts`
- `frontend/src/app/api/auth/reset-password/route.ts`
