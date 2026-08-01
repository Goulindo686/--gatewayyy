-- Domínio personalizado da loja: um domínio por vendedor.
-- Os dados desta tabela não são expostos diretamente aos clientes Supabase.

CREATE TABLE IF NOT EXISTS public.store_custom_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    apex_domain TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'active', 'error')),
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_records JSONB NOT NULL DEFAULT '[]'::jsonb,
    dns_records JSONB NOT NULL DEFAULT '[]'::jsonb,
    last_error TEXT,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS store_custom_domains_user_unique
    ON public.store_custom_domains (user_id);

CREATE UNIQUE INDEX IF NOT EXISTS store_custom_domains_domain_unique
    ON public.store_custom_domains (LOWER(domain));

CREATE INDEX IF NOT EXISTS store_custom_domains_public_lookup
    ON public.store_custom_domains (LOWER(domain), status, verified);

ALTER TABLE public.store_custom_domains ENABLE ROW LEVEL SECURITY;

-- Toda leitura/escrita passa pelas rotas autenticadas do backend com service_role.
REVOKE ALL ON TABLE public.store_custom_domains FROM anon, authenticated;
GRANT ALL ON TABLE public.store_custom_domains TO service_role;

