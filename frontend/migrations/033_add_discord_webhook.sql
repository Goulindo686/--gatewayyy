-- Migration: Add discord_webhook_url to platform_settings
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS discord_webhook_url TEXT;
