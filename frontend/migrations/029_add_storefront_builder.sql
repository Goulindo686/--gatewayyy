-- Construtor flexivel da vitrine publica.
-- Mantem todos os campos e fluxos antigos da Minha Loja.

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS store_layout_sections JSONB NOT NULL DEFAULT '[]'::JSONB,
    ADD COLUMN IF NOT EXISTS store_footer_config JSONB NOT NULL DEFAULT '{}'::JSONB,
    ADD COLUMN IF NOT EXISTS store_background_config JSONB NOT NULL DEFAULT '{}'::JSONB;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_store_layout_sections_array'
    ) THEN
        ALTER TABLE public.users
            ADD CONSTRAINT users_store_layout_sections_array
            CHECK (jsonb_typeof(store_layout_sections) = 'array');
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_store_footer_config_object'
    ) THEN
        ALTER TABLE public.users
            ADD CONSTRAINT users_store_footer_config_object
            CHECK (jsonb_typeof(store_footer_config) = 'object');
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_store_background_config_object'
    ) THEN
        ALTER TABLE public.users
            ADD CONSTRAINT users_store_background_config_object
            CHECK (jsonb_typeof(store_background_config) = 'object');
    END IF;
END $$;

COMMENT ON COLUMN public.users.store_layout_sections IS
    'Secoes ordenadas da vitrine: linhas de produtos e carroseis de banners.';
COMMENT ON COLUMN public.users.store_footer_config IS
    'Textos, contatos e links editaveis do rodape da loja.';
COMMENT ON COLUMN public.users.store_background_config IS
    'Fundo tematico, cor solida ou imagem da vitrine.';
