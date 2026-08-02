ALTER TABLE users
ADD COLUMN IF NOT EXISTS store_badge_text TEXT DEFAULT 'Produtos digitais com acesso online';

ALTER TABLE users
DROP COLUMN IF EXISTS store_nav_links;
