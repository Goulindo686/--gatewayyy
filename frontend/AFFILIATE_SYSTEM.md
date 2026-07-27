# Sistema de afiliados

## Ativacao

1. Aplique `migrations/025_add_affiliate_system.sql` no Supabase antes de publicar o codigo.
2. Confirme que `PLATFORM_RECIPIENT_ID` e `PAGARME_API_KEY` estao configurados.
3. Valide em sandbox uma venda Pix, uma venda no cartao, um estorno, um chargeback e uma renovacao.
4. Ative o programa somente nos produtos escolhidos. Todos os programas nascem isolados dos produtos que nao possuem configuracao ativa.

## Regras implementadas

- Um produto pode ter um programa de afiliados.
- Entrada por convite, aprovacao manual ou aprovacao automatica.
- Comissao padrao e comissao personalizada por afiliado.
- Atribuicao por primeiro ou ultimo clique.
- Cookie por produto entre 1 e 365 dias.
- Marketplace opcional.
- Comissao opcional em order bumps e renovacoes.
- Bloqueio de autoafiliacao e de compra pelo proprio afiliado, por email ou CPF/CNPJ.
- Dados pessoais do comprador nao sao expostos ao afiliado.

## Calculo e split

A comissao e calculada em centavos sobre o valor elegivel depois da taxa da plataforma:

```text
base da comissao = valor elegivel - taxa proporcional da plataforma
comissao = base da comissao x percentual do afiliado
vendedor = valor bruto - taxa da plataforma - comissao
```

Quando existe uma atribuicao valida, o pedido e enviado ao Pagar.me com tres recebedores:

- vendedor: responsavel pela tarifa de processamento, saldo restante e responsabilidade financeira;
- afiliado: recebe a comissao fixa em centavos;
- plataforma: recebe a taxa existente.

Sem uma atribuicao valida, o metodo recebe os mesmos parametros e segue o mesmo split usado antes deste modulo.

## Rastreamento

O link publico usa `/a/{codigo}`. O navegador recebe um cookie `HttpOnly`, `SameSite=Lax` e `Secure` em producao. O banco armazena somente o hash SHA-256 do token. IP e user-agent tambem sao armazenados apenas como hash.

Links diretos do produtor nao removem uma atribuicao valida. No modelo de ultimo clique, outro link de afiliado substitui a atribuicao; no modelo de primeiro clique, a primeira atribuicao valida permanece ate expirar.

## Estados financeiros

- `pending`: pagamento ainda nao confirmado;
- `approved`: pagamento confirmado e dentro do prazo de seguranca configurado;
- `available`: prazo interno concluido;
- `refunded`, `chargeback`, `failed` ou `cancelled`: comissao revertida ou invalidada.

O Pagar.me continua sendo a fonte oficial do saldo e da disponibilidade bancaria. O prazo do programa controla a exibicao contabil dentro do gateway e nao altera o calendario de liquidacao definido pelo recebedor no Pagar.me.

## Idempotencia

- Uma unica comissao pode existir por pedido.
- A comissao inicial de uma assinatura e unica por assinatura.
- Renovacoes usam uma chave derivada do ciclo/evento do provedor.
- Webhooks repetidos nao reiniciam o prazo de uma comissao aprovada nem rebaixam uma comissao ja disponivel.
