BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- Public storefront profiles are read-only and must honor the caller's RLS.
ALTER VIEW public.user_profiles SET (security_invoker = true);
REVOKE ALL PRIVILEGES ON TABLE public.user_profiles
    FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.user_profiles TO anon, authenticated;

-- Server-only RPCs run as service_role and do not need owner privileges.
ALTER FUNCTION public.get_all_tables() SECURITY INVOKER;
ALTER FUNCTION public.get_all_tables() SET search_path TO pg_catalog;

ALTER FUNCTION public.claim_outgoing_webhook_deliveries(INTEGER, UUID, TEXT)
    SECURITY INVOKER;
ALTER FUNCTION public.claim_outgoing_webhook_deliveries(INTEGER, UUID, TEXT)
    SET search_path TO pg_catalog, public;

ALTER FUNCTION public.increment_rate_limit(TEXT, TIMESTAMPTZ, INTEGER)
    SECURITY INVOKER;
ALTER FUNCTION public.increment_rate_limit(TEXT, TIMESTAMPTZ, INTEGER)
    SET search_path TO pg_catalog, public;

-- These trigger functions retain definer rights for atomic fulfillment, but
-- are no longer directly callable through the Data API by browser roles.
ALTER FUNCTION public.goupay_assign_unique_deliveries_on_paid()
    SET search_path TO pg_catalog, public;
ALTER FUNCTION public.goupay_assign_unique_delivery_on_bump_insert()
    SET search_path TO pg_catalog, public;
ALTER FUNCTION public.goupay_assign_unique_delivery_on_order_product()
    SET search_path TO pg_catalog, public;
ALTER FUNCTION public.goupay_backfill_waiting_unique_delivery()
    SET search_path TO pg_catalog, public;

ALTER FUNCTION public.affiliate_set_updated_at()
    SET search_path TO pg_catalog;
ALTER FUNCTION public.goupay_set_updated_at()
    SET search_path TO pg_catalog;
ALTER FUNCTION public.update_billings_updated_at()
    SET search_path TO pg_catalog;

REVOKE ALL PRIVILEGES ON FUNCTION public.get_all_tables()
    FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON FUNCTION public.claim_outgoing_webhook_deliveries(INTEGER, UUID, TEXT)
    FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON FUNCTION public.increment_rate_limit(TEXT, TIMESTAMPTZ, INTEGER)
    FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON FUNCTION public.goupay_assign_unique_deliveries_on_paid()
    FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON FUNCTION public.goupay_assign_unique_delivery_on_bump_insert()
    FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON FUNCTION public.goupay_assign_unique_delivery_on_order_product()
    FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON FUNCTION public.goupay_backfill_waiting_unique_delivery()
    FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON FUNCTION public.affiliate_set_updated_at()
    FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON FUNCTION public.goupay_set_updated_at()
    FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON FUNCTION public.update_billings_updated_at()
    FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_all_tables() TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_outgoing_webhook_deliveries(INTEGER, UUID, TEXT)
    TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_rate_limit(TEXT, TIMESTAMPTZ, INTEGER)
    TO service_role;
GRANT EXECUTE ON FUNCTION public.goupay_assign_unique_deliveries_on_paid()
    TO service_role;
GRANT EXECUTE ON FUNCTION public.goupay_assign_unique_delivery_on_bump_insert()
    TO service_role;
GRANT EXECUTE ON FUNCTION public.goupay_assign_unique_delivery_on_order_product()
    TO service_role;
GRANT EXECUTE ON FUNCTION public.goupay_backfill_waiting_unique_delivery()
    TO service_role;
GRANT EXECUTE ON FUNCTION public.affiliate_set_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION public.goupay_set_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_billings_updated_at() TO service_role;

-- These tables are intentionally server-only. RLS already denied browser
-- roles; revoking table grants removes the redundant Data API surface too.
REVOKE ALL PRIVILEGES ON TABLE
    public.affiliate_clicks,
    public.outgoing_webhook_deliveries,
    public.pagarme_webhook_events,
    public.payment_attempts,
    public.platform_fees,
    public.push_subscriptions,
    public.rate_limits,
    public.store_custom_domains,
    public.subscription_plans,
    public.subscriptions,
    public.unique_delivery_access_logs,
    public.unique_delivery_files,
    public.unique_delivery_fulfillments,
    public.unique_delivery_items,
    public.unique_delivery_order_products,
    public.unique_delivery_settings,
    public.utmify_events
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
    public.affiliate_clicks,
    public.outgoing_webhook_deliveries,
    public.pagarme_webhook_events,
    public.payment_attempts,
    public.platform_fees,
    public.push_subscriptions,
    public.rate_limits,
    public.store_custom_domains,
    public.subscription_plans,
    public.subscriptions,
    public.unique_delivery_access_logs,
    public.unique_delivery_files,
    public.unique_delivery_fulfillments,
    public.unique_delivery_items,
    public.unique_delivery_order_products,
    public.unique_delivery_settings,
    public.utmify_events
TO service_role;

COMMIT;
