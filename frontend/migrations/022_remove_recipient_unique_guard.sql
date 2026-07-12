-- Remove the one-recipient-per-user guard introduced by migration 021.
DROP INDEX IF EXISTS idx_recipients_user_id_unique;
