-- Imagens para os cards verticais de categorias da loja
ALTER TABLE public.store_categories
    ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN public.store_categories.image_url IS 'Imagem publica usada no card de categoria da vitrine da loja';
