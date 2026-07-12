-- Keep only one local recipient row per seller before adding the unique guard.
-- Preference: rows with a Pagar.me recipient id, then newest rows.
WITH ranked_recipients AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY user_id
            ORDER BY
                (pagarme_recipient_id IS NOT NULL) DESC,
                updated_at DESC NULLS LAST,
                created_at DESC NULLS LAST,
                id DESC
        ) AS row_number
    FROM recipients
)
DELETE FROM recipients r
USING ranked_recipients rr
WHERE r.id = rr.id
  AND rr.row_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_recipients_user_id_unique
ON recipients(user_id);
