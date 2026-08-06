CREATE TABLE IF NOT EXISTS public.support_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    store_slug TEXT,
    buyer_name TEXT NOT NULL DEFAULT 'Cliente',
    buyer_email TEXT NOT NULL,
    buyer_phone TEXT,
    subject TEXT NOT NULL DEFAULT 'Suporte da compra',
    status TEXT NOT NULL DEFAULT 'open',
    priority TEXT NOT NULL DEFAULT 'normal',
    source TEXT NOT NULL DEFAULT 'store',
    buyer_access_token_hash TEXT,
    seller_last_read_at TIMESTAMPTZ,
    buyer_last_read_at TIMESTAMPTZ,
    last_message_at TIMESTAMPTZ,
    last_message_preview TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT support_threads_status_check
        CHECK (status IN ('open', 'pending_seller', 'pending_buyer', 'resolved', 'archived')),
    CONSTRAINT support_threads_priority_check
        CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

CREATE UNIQUE INDEX IF NOT EXISTS support_threads_order_unique
    ON public.support_threads(order_id)
    WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS support_threads_seller_inbox
    ON public.support_threads(seller_id, status, COALESCE(last_message_at, created_at) DESC);

CREATE INDEX IF NOT EXISTS support_threads_buyer_email
    ON public.support_threads(LOWER(buyer_email), created_at DESC);

CREATE TABLE IF NOT EXISTS public.support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES public.support_threads(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL,
    sender_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    sender_name TEXT NOT NULL DEFAULT 'Cliente',
    body TEXT NOT NULL,
    attachment_url TEXT,
    attachment_name TEXT,
    attachment_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT support_messages_sender_type_check
        CHECK (sender_type IN ('buyer', 'seller', 'admin', 'system')),
    CONSTRAINT support_messages_body_length_check
        CHECK (char_length(body) BETWEEN 1 AND 4000)
);

CREATE INDEX IF NOT EXISTS support_messages_thread_created
    ON public.support_messages(thread_id, created_at ASC);

ALTER TABLE public.support_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.support_threads FROM anon, authenticated;
REVOKE ALL ON TABLE public.support_messages FROM anon, authenticated;
GRANT ALL ON TABLE public.support_threads TO service_role;
GRANT ALL ON TABLE public.support_messages TO service_role;
