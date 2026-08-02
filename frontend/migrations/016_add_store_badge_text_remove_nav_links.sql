ALTER TABLE users
ADD COLUMN IF NOT EXISTS store_badge_text TEXT DEFAULT 'Uma seleção feita para você';

ALTER TABLE users
DROP COLUMN IF EXISTS store_nav_links;
