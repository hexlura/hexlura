-- Stripe Connect is opt-in per organiser, granted by admin only — bank_transfer
-- stays the default payout method for everyone. This is the allowlist flag,
-- separate from the global stripe_connect_enabled kill-switch in platform_settings.
ALTER TABLE organiser_profiles
  ADD COLUMN IF NOT EXISTS stripe_connect_allowed boolean NOT NULL DEFAULT false;
