-- Migration: 058_organiser_terms_acceptance
-- Description: Record WHEN an organiser accepted the terms and WHICH version,
--   stamped at application time. The accept checkbox previously existed in the
--   UI but nothing was persisted, leaving no proof of acceptance in a dispute.

ALTER TABLE public.organiser_profiles
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS terms_version text;
