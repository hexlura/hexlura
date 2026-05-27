-- Migration: 030_organiser_identity
-- Description: Adds Stripe Identity verification fields to organiser_profiles.
--              Every organiser must complete Stripe Identity (selfie + ID) before
--              any payout to them can be processed. Status round-trips via the
--              identity.verification_session.* webhook events.
--
-- Lifecycle:
--   null         → never started
--   processing   → session created, awaiting Stripe webhook
--   verified     → passed (identity_verified_at set)
--   requires_input → failed; user can retry to create a new session
--   canceled     → session canceled

ALTER TABLE public.organiser_profiles
  ADD COLUMN IF NOT EXISTS identity_status text
    CHECK (identity_status IS NULL OR identity_status IN ('processing','verified','requires_input','canceled'));

ALTER TABLE public.organiser_profiles
  ADD COLUMN IF NOT EXISTS identity_session_id text;

ALTER TABLE public.organiser_profiles
  ADD COLUMN IF NOT EXISTS identity_verified_at timestamptz;

ALTER TABLE public.organiser_profiles
  ADD COLUMN IF NOT EXISTS identity_last_attempt_at timestamptz;

ALTER TABLE public.organiser_profiles
  ADD COLUMN IF NOT EXISTS identity_failure_reason text;

-- Speed up webhook lookups by session id
CREATE INDEX IF NOT EXISTS idx_organiser_profiles_identity_session
  ON public.organiser_profiles (identity_session_id)
  WHERE identity_session_id IS NOT NULL;
