-- Ordem manual de categorias e produtos na vitrine
ALTER TABLE public.store_categories
    ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS store_sort_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_store_categories_user_sort
    ON public.store_categories(user_id, sort_order, created_at);

CREATE INDEX IF NOT EXISTS idx_products_store_user_sort
    ON public.products(user_id, sales_channel, store_sort_order, created_at);

UPDATE public.store_categories
SET sort_order = ordered.position
FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC, id) - 1 AS position
    FROM public.store_categories
) AS ordered
WHERE public.store_categories.id = ordered.id
  AND public.store_categories.sort_order = 0;

UPDATE public.products
SET store_sort_order = ordered.position
FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC, id) - 1 AS position
    FROM public.products
    WHERE sales_channel = 'store'
) AS ordered
WHERE public.products.id = ordered.id
  AND public.products.store_sort_order = 0;
