-- Autenticacao de dois fatores TOTP (Google Authenticator, Authy, Microsoft Authenticator etc.)
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS two_factor_secret TEXT,
    ADD COLUMN IF NOT EXISTS two_factor_recovery_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS two_factor_confirmed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.users.two_factor_secret IS 'Segredo TOTP criptografado com AES-256-GCM pela aplicacao';
COMMENT ON COLUMN public.users.two_factor_recovery_codes IS 'Hashes HMAC dos codigos de recuperacao de uso unico';
