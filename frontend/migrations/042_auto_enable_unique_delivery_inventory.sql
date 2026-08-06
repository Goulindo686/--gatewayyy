-- Ativa Entrega Unica automaticamente quando o vendedor cadastra o
-- primeiro estoque exclusivo de um produto que ainda nao tem configuracao.

CREATE OR REPLACE FUNCTION public.goupay_ensure_unique_delivery_settings_on_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.unique_delivery_settings (
        product_id,
        seller_id,
        enabled,
        enabled_at
    )
    VALUES (
        NEW.product_id,
        NEW.seller_id,
        TRUE,
        COALESCE(NEW.created_at, NOW())
    )
    ON CONFLICT (product_id) DO NOTHING;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.goupay_ensure_unique_delivery_settings_on_item()
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.goupay_ensure_unique_delivery_settings_on_item()
    TO service_role;

DROP TRIGGER IF EXISTS ensure_unique_delivery_settings_on_item
    ON public.unique_delivery_items;
CREATE TRIGGER ensure_unique_delivery_settings_on_item
AFTER INSERT ON public.unique_delivery_items
FOR EACH ROW EXECUTE FUNCTION public.goupay_ensure_unique_delivery_settings_on_item();

INSERT INTO public.unique_delivery_settings (
    product_id,
    seller_id,
    enabled,
    enabled_at
)
SELECT
    item.product_id,
    item.seller_id,
    TRUE,
    MIN(item.created_at)
FROM public.unique_delivery_items AS item
LEFT JOIN public.unique_delivery_settings AS settings
  ON settings.product_id = item.product_id
WHERE settings.product_id IS NULL
GROUP BY item.product_id, item.seller_id
ON CONFLICT (product_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
