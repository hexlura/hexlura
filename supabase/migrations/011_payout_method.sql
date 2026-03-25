-- Add dual payout method support to organiser_profiles
ALTER TABLE public.organiser_profiles
  ADD COLUMN IF NOT EXISTS payout_method text NOT NULL DEFAULT 'bank_transfer'
    CHECK (payout_method IN ('stripe_connect', 'bank_transfer')),
  ADD COLUMN IF NOT EXISTS bank_account_name text,
  ADD COLUMN IF NOT EXISTS bank_sort_code text,
  ADD COLUMN IF NOT EXISTS bank_account_number text;

-- Existing organisers who already have a stripe_account_id should be set to stripe_connect
UPDATE public.organiser_profiles
  SET payout_method = 'stripe_connect'
  WHERE stripe_account_id IS NOT NULL AND stripe_account_id != '';
