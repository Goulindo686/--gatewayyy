-- Preferencias visuais avancadas da loja, mantidas separadas da estrutura.
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
    'Preferencias avancadas de cores, tipografia, componentes e exibicao da loja.';
