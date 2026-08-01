-- Migra somente o provedor dos domínios personalizados das lojas.
-- Domínios oficiais da GouPay não são alterados por esta migration.

ALTER TABLE public.store_custom_domains
    ADD COLUMN IF NOT EXISTS provider TEXT,
    ADD COLUMN IF NOT EXISTS provider_hostname_id TEXT,
    ADD COLUMN IF NOT EXISTS hostname_status TEXT,
    ADD COLUMN IF NOT EXISTS ssl_status TEXT,
    ADD COLUMN IF NOT EXISTS provider_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Registros anteriores pertencem à integração da Vercel. Eles são preservados
-- para que o vendedor possa removê-los pelo painel e reconectar na Cloudflare.
UPDATE public.store_custom_domains
SET provider = 'vercel'
WHERE provider IS NULL;

ALTER TABLE public.store_custom_domains
    ALTER COLUMN provider SET DEFAULT 'cloudflare',
    ALTER COLUMN provider SET NOT NULL;

ALTER TABLE public.store_custom_domains
    DROP CONSTRAINT IF EXISTS store_custom_domains_provider_check;

ALTER TABLE public.store_custom_domains
    ADD CONSTRAINT store_custom_domains_provider_check
    CHECK (provider IN ('vercel', 'cloudflare'));

CREATE UNIQUE INDEX IF NOT EXISTS store_custom_domains_provider_hostname_unique
    ON public.store_custom_domains (provider, provider_hostname_id)
    WHERE provider_hostname_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS store_custom_domains_cloudflare_status_lookup
    ON public.store_custom_domains (provider, hostname_status, ssl_status);

-- Mantém a tabela inacessível diretamente pelo frontend. Toda operação passa
-- pelas rotas autenticadas do backend com a service_role.
ALTER TABLE public.store_custom_domains ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.store_custom_domains FROM anon, authenticated;
GRANT ALL ON TABLE public.store_custom_domains TO service_role;
