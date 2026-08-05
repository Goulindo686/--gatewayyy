BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- Migration 035 initially inferred the product origin from show_in_store. That
-- was incorrect: every pre-existing row was created by the checkout Products
-- flow, even when it had also been published in the old storefront. Restore
-- only rows that predate the production migration. Products created later by
-- the dedicated Store Products API remain isolated in the store channel.
UPDATE public.products
SET sales_channel = 'checkout'
WHERE sales_channel = 'store'
  AND created_at < TIMESTAMPTZ '2026-08-05 00:13:51+00';

COMMIT;
