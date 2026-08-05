BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS sales_channel TEXT NOT NULL DEFAULT 'checkout',
    ADD COLUMN IF NOT EXISTS store_product_slug TEXT,
    ADD COLUMN IF NOT EXISTS store_description_format TEXT NOT NULL DEFAULT 'plain';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'products_sales_channel_valid'
          AND conrelid = 'public.products'::regclass
    ) THEN
        ALTER TABLE public.products
            ADD CONSTRAINT products_sales_channel_valid
            CHECK (sales_channel IN ('checkout', 'store'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'products_store_description_format_valid'
          AND conrelid = 'public.products'::regclass
    ) THEN
        ALTER TABLE public.products
            ADD CONSTRAINT products_store_description_format_valid
            CHECK (store_description_format IN ('plain', 'html'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'products_store_product_slug_valid'
          AND conrelid = 'public.products'::regclass
    ) THEN
        ALTER TABLE public.products
            ADD CONSTRAINT products_store_product_slug_valid
            CHECK (
                store_product_slug IS NULL
                OR (
                    char_length(store_product_slug) BETWEEN 2 AND 140
                    AND store_product_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
                )
            );
    END IF;
END $$;

UPDATE public.products
SET store_product_slug = concat(
    COALESCE(
        NULLIF(trim(BOTH '-' FROM regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')), ''),
        'produto'
    ),
    '-',
    substr(id::text, 1, 8)
)
WHERE sales_channel = 'store'
  AND store_product_slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS products_store_slug_owner_unique_idx
    ON public.products (user_id, store_product_slug)
    WHERE sales_channel = 'store' AND store_product_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS products_user_channel_created_idx
    ON public.products (user_id, sales_channel, created_at DESC);

CREATE INDEX IF NOT EXISTS products_public_storefront_idx
    ON public.products (user_id, store_category_id, created_at DESC)
    WHERE sales_channel = 'store'
      AND show_in_store IS TRUE
      AND status = 'active'
      AND type = 'digital';

COMMENT ON COLUMN public.products.sales_channel IS
    'Origem funcional do produto: checkout independente ou catálogo da loja.';
COMMENT ON COLUMN public.products.store_product_slug IS
    'Identificador público estável do produto dentro da loja do vendedor.';
COMMENT ON COLUMN public.products.store_description_format IS
    'Formato da descrição pública da loja: texto simples ou HTML sanitizado.';

COMMIT;
