# Proxy de domínios das lojas na Cloudflare

Este Worker recebe apenas domínios personalizados das lojas. Os domínios
oficiais da GouPay continuam na Vercel e não podem ser incluídos na rota do
Worker.

## Configuração da zona SaaS

1. Na zona `goupay.com.br`, habilite **SSL/TLS > Custom Hostnames**.
2. Crie `fallback-lojas.goupay.com.br` como `AAAA 100::`, com proxy ativado.
3. Defina `fallback-lojas.goupay.com.br` como Fallback Origin.
4. Crie `lojas.goupay.com.br` como CNAME para o fallback, com proxy ativado.
5. Use `lojas.goupay.com.br` em `CUSTOM_DOMAINS_CLOUDFLARE_CNAME_TARGET`.

## Worker

1. Copie `wrangler.toml.example` para `wrangler.toml` fora do Git ou configure
   as mesmas variáveis pelo painel da Cloudflare.
2. Ajuste `ORIGIN_URL` para a URL canônica `*.vercel.app` do projeto verdadeiro.
3. Gere um segredo com pelo menos 32 bytes aleatórios.
4. Salve o segredo no Worker como `EDGE_SHARED_SECRET`.
5. Salve o mesmo segredo na Vercel como `CUSTOM_DOMAINS_EDGE_SECRET`.
6. Publique o Worker.

## Rotas obrigatórias

Crie primeiro uma rota com **Worker: None** para cada hostname oficial da
GouPay. Não use uma exclusão ampla para `*.goupay.com.br`, pois o CNAME técnico
das lojas também fica nesse sufixo. Exemplo com os hostnames atuais:

1. `goupay.com.br/*` -> None
2. `www.goupay.com.br/*` -> None
3. `carteira.goupay.com.br/*` -> None
4. Repita para qualquer outro hostname oficial existente
5. `*/*` -> `goupay-store-domain-proxy`

Rotas mais específicas prevalecem sobre `*/*`. O domínio personalizado do
cliente mantém o próprio Host e, portanto, entra na rota do Worker.

## Token usado pelo backend

Crie um API Token limitado à zona da GouPay com a permissão
`Zone > SSL and Certificates > Edit`. Nunca use Global API Key e nunca exponha
o token ao frontend.

Variáveis da aplicação na Vercel:

```env
CUSTOM_DOMAINS_CLOUDFLARE_API_TOKEN=
CUSTOM_DOMAINS_CLOUDFLARE_ZONE_ID=
CUSTOM_DOMAINS_CLOUDFLARE_CNAME_TARGET=lojas.goupay.com.br
CUSTOM_DOMAINS_EDGE_SECRET=
```

Depois de configurar, execute a migration
`frontend/migrations/031_migrate_store_domains_to_cloudflare.sql` no Supabase.
