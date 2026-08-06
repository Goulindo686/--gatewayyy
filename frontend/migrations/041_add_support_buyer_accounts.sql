ALTER TABLE public.support_threads
    ADD COLUMN IF NOT EXISTS buyer_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS support_threads_buyer_user_inbox
    ON public.support_threads(buyer_user_id, COALESCE(last_message_at, created_at) DESC)
    WHERE buyer_user_id IS NOT NULL;
