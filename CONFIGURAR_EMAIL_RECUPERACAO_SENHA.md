# Configuração de e-mail da GouPay

O frontend Next.js envia todos os e-mails transacionais pelo Nodemailer usando SMTP. O mesmo transporte atende:

- recuperação de senha;
- verificação de e-mail;
- compra aprovada;
- recuperação de venda Pix;
- aviso de conta bloqueada;
- solicitação de exclusão de conta.

O fluxo atual não usa o Supabase Auth nem o backend Express antigo para enviar esses e-mails.

## GoDaddy Professional Email / Titan

Cadastre estas variáveis no projeto do frontend:

```env
SMTP_HOST=smtpout.secureserver.net
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=contato@goupay.com.br
SMTP_PASS=senha-da-caixa-de-email
SMTP_FROM=GouPay <contato@goupay.com.br>
NEXT_PUBLIC_APP_URL=https://www.goupay.com.br
```

Regras importantes:

1. `SMTP_USER` deve ser uma caixa de e-mail real e ativa na GoDaddy.
2. `SMTP_PASS` é a senha dessa caixa, não a senha geral da conta GoDaddy.
3. O endereço de `SMTP_FROM` deve ser o mesmo de `SMTP_USER`, salvo quando a GoDaddy tiver autorizado outro remetente.
4. Nunca salve `SMTP_PASS` no Git.
5. Depois de alterar as variáveis na Vercel, faça um novo deploy.

## Configuração na Vercel

1. Abra o projeto da GouPay na Vercel.
2. Entre em **Settings > Environment Variables**.
3. Cadastre todas as variáveis SMTP.
4. Marque **Production**, **Preview** e **Development** conforme os ambientes usados.
5. Salve e execute um novo deploy de produção.

Alterar uma variável sem gerar um novo deploy não atualiza uma versão que já está publicada.

## Teste seguro

Crie temporariamente `frontend/.env.local` com as variáveis acima e execute:

```bash
cd frontend
npm run email:verify
```

Esse comando testa conexão, TLS e autenticação, sem enviar mensagem.

Para testar a entrega em uma caixa real:

```bash
npm run email:verify -- seu-email-de-teste@gmail.com
```

O teste informa:

- servidor, porta e modo seguro utilizados;
- se a autenticação foi aceita;
- destinatários aceitos ou rejeitados;
- identificador da mensagem.

Apague a senha do `.env.local` quando não precisar mais dela. O arquivo real não deve ser enviado ao Git.

## Teste da recuperação de senha

Depois do deploy:

1. Acesse `https://www.goupay.com.br/forgot-password`.
2. Informe o e-mail de um usuário que realmente exista na tabela `users`.
3. Confira a caixa de entrada e a pasta de spam.
4. Abra o link recebido.
5. Defina uma nova senha e faça login.

A API mostra uma resposta genérica mesmo quando a conta não existe. Esse comportamento evita a descoberta de usuários e não serve, sozinho, como confirmação de entrega.

## Erros comuns

### `EAUTH` ou autenticação recusada

- Confirme a caixa usada em `SMTP_USER`.
- Entre no webmail da GoDaddy com a mesma senha.
- Redefina a senha da caixa caso necessário.
- Não use a senha da conta administrativa da GoDaddy.

### `ECONNECTION`, timeout ou conexão encerrada

- Confirme `SMTP_HOST=smtpout.secureserver.net`.
- Confirme `SMTP_PORT=465`.
- Confirme `SMTP_SECURE=true`.
- Verifique os logs da função na Vercel.

### SMTP aceita, mas o Gmail não recebe

- Confira spam e promoções.
- Use o mesmo domínio e endereço no usuário autenticado e no remetente.
- Verifique SPF, DKIM e DMARC do domínio.
- Aguarde alguns minutos e procure o `Message ID` nos logs.

### Microsoft 365 comprado pela GoDaddy

Essa modalidade utiliza outra configuração:

```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
```

Também é necessário habilitar **SMTP Authentication** para o usuário no painel Email & Office da GoDaddy. Não use essa configuração quando a caixa for Professional Email/Titan.

## Segurança e comportamento do sistema

- A conexão exige TLS 1.2 ou superior.
- Certificados inválidos não são aceitos.
- Ausência de credenciais gera erro explícito nos logs.
- Em uma falha de envio de recuperação, o token que não foi entregue é invalidado.
- A resposta pública continua genérica para não revelar se um e-mail possui conta.
