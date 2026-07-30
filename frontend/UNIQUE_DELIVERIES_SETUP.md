# Entregas Únicas

O módulo é independente da Área de Membros e usa somente as APIs server-side da
aplicação.

## Ativação

1. Execute `migrations/028_add_unique_deliveries.sql` no Supabase.
2. Gere uma chave aleatória de 32 bytes:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

3. Salve o resultado em `UNIQUE_DELIVERY_ENCRYPTION_KEY` no ambiente do
   frontend Next.js. A variável não pode ter o prefixo `NEXT_PUBLIC_`.
4. Faça o deploy e cadastre estoque antes de ativar o módulo em um produto.

## Garantias implementadas

- payloads e arquivos usam AES-256-GCM com IV aleatório e AAD vinculada ao
  produto, item e arquivo;
- fingerprints HMAC evitam cadastrar a mesma entrega duas vezes sem expor seu
  conteúdo;
- tabelas e bucket não possuem acesso para `anon` ou `authenticated`;
- a alocação usa `FOR UPDATE SKIP LOCKED` e índices únicos no PostgreSQL;
- uma entrega atribuída nunca retorna ao estoque;
- o comprador precisa autenticar uma conta com e-mail verificado idêntico ao
  e-mail normalizado de um pedido pago;
- respostas sensíveis usam `no-store`, downloads passam por autorização e todo
  acesso é auditado;
- o vendedor não recebe o plaintext de volta após salvar.

Não remova a chave enquanto existirem entregas cadastradas: sem ela os dados
continuam protegidos, mas não podem ser abertos. Guarde uma cópia em um cofre de
segredos com acesso restrito.
