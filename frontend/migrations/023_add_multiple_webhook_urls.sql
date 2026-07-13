-- Permite configurar mais de um webhook para eventos da API Pix.
ALTER TABLE users ADD COLUMN IF NOT EXISTS webhook_urls JSONB DEFAULT '[]'::jsonb;

UPDATE users
SET webhook_urls = to_jsonb(ARRAY[webhook_url])
WHERE webhook_url IS NOT NULL
  AND webhook_url <> ''
  AND (webhook_urls IS NULL OR webhook_urls = '[]'::jsonb);

COMMENT ON COLUMN users.webhook_urls IS 'Lista de URLs de Webhook para notificar o usuario sobre vendas e mudancas de status';
