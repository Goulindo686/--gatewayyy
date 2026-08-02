-- Opcoes avancadas de identidade visual da vitrine.
-- Um unico JSONB permite evoluir o editor sem espalhar dezenas de colunas.

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS store_style_config JSONB NOT NULL DEFAULT '{}'::JSONB;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_store_style_config_object'
    ) THEN
        ALTER TABLE public.users
            ADD CONSTRAINT users_store_style_config_object
            CHECK (jsonb_typeof(store_style_config) = 'object');
    END IF;
END $$;

COMMENT ON COLUMN public.users.store_style_config IS
    'Tipografia, layout, componentes, densidade, movimento e visibilidade de blocos da vitrine.';
