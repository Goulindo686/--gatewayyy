ALTER TABLE public.support_messages
    ADD COLUMN IF NOT EXISTS body_ciphertext TEXT,
    ADD COLUMN IF NOT EXISTS body_iv TEXT,
    ADD COLUMN IF NOT EXISTS body_auth_tag TEXT,
    ADD COLUMN IF NOT EXISTS encryption_version SMALLINT;

ALTER TABLE public.support_messages
    DROP CONSTRAINT IF EXISTS support_messages_encryption_state_check;

ALTER TABLE public.support_messages
    ADD CONSTRAINT support_messages_encryption_state_check CHECK (
        (
            body_ciphertext IS NULL
            AND body_iv IS NULL
            AND body_auth_tag IS NULL
            AND encryption_version IS NULL
        )
        OR
        (
            body_ciphertext IS NOT NULL
            AND body_iv IS NOT NULL
            AND body_auth_tag IS NOT NULL
            AND encryption_version >= 1
        )
    );

-- Previews no longer expose conversation contents in inbox queries.
UPDATE public.support_threads
SET last_message_preview = CASE
    WHEN last_message_at IS NULL THEN NULL
    ELSE 'Nova mensagem protegida'
END
WHERE last_message_preview IS DISTINCT FROM CASE
    WHEN last_message_at IS NULL THEN NULL
    ELSE 'Nova mensagem protegida'
END;

-- Account-bound support replaced the old bearer-token access flow.
UPDATE public.support_threads
SET buyer_access_token_hash = NULL
WHERE buyer_access_token_hash IS NOT NULL;

ALTER TABLE public.support_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_threads FORCE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.support_threads FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.support_messages FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.support_threads TO service_role;
GRANT ALL ON TABLE public.support_messages TO service_role;
