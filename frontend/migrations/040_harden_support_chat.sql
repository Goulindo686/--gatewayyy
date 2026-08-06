CREATE INDEX IF NOT EXISTS support_threads_product_id
    ON public.support_threads(product_id)
    WHERE product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS support_messages_sender_user_id
    ON public.support_messages(sender_user_id)
    WHERE sender_user_id IS NOT NULL;

DROP POLICY IF EXISTS "Support threads deny direct anon access"
    ON public.support_threads;
CREATE POLICY "Support threads deny direct anon access"
    ON public.support_threads
    FOR ALL
    TO anon, authenticated
    USING (false)
    WITH CHECK (false);

DROP POLICY IF EXISTS "Support messages deny direct anon access"
    ON public.support_messages;
CREATE POLICY "Support messages deny direct anon access"
    ON public.support_messages
    FOR ALL
    TO anon, authenticated
    USING (false)
    WITH CHECK (false);
