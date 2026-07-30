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
4. Faça o deploy. Na aba `Entregas Únicas`, escolha entre `Área de Membros`
   e `Entrega Única` para cada produto.

## Garantias implementadas

- os payloads usam AES-256-GCM com IV aleatório e AAD vinculada ao produto e item;
- fingerprints HMAC evitam cadastrar a mesma entrega duas vezes sem expor seu
  conteúdo;
- as tabelas não possuem acesso para `anon` ou `authenticated`;
- a alocação usa `FOR UPDATE SKIP LOCKED` e índices únicos no PostgreSQL;
- uma entrega atribuída nunca retorna ao estoque;
- o comprador precisa autenticar uma conta com e-mail verificado idêntico ao
  e-mail normalizado de um pedido pago;
- respostas sensíveis usam `no-store` e todo acesso é auditado;
- o vendedor não recebe o plaintext de volta após salvar.

O módulo de Entrega Única aceita somente texto e links. Uploads e downloads de
arquivos continuam disponíveis apenas na Área de Membros.

## Modalidade por produto

- `Área de Membros`: novas compras recebem a matrícula no conteúdo compartilhado.
- `Entrega Única`: novas compras recebem somente uma linha exclusiva do estoque.
- a modalidade é registrada no momento da compra; trocar a seleção não revoga
  entregas nem acessos concedidos anteriormente.

Não remova a chave enquanto existirem entregas cadastradas: sem ela os dados
continuam protegidos, mas não podem ser abertos. Guarde uma cópia em um cofre de
segredos com acesso restrito.
