-- Track Stripe Connect account readiness per organiser.
-- Populated by the account.updated webhook; used to gate payouts on full onboarding.
ALTER TABLE organiser_profiles
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled boolean NOT NULL DEFAULT false;
