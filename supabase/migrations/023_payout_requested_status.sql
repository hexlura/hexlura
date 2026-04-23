-- Add 'requested' status to payouts lifecycle
-- Allows organisers to explicitly request withdrawal of their balance

ALTER TABLE public.payouts DROP CONSTRAINT IF EXISTS payouts_status_check;
ALTER TABLE public.payouts ADD CONSTRAINT payouts_status_check
    CHECK (status IN ('pending', 'requested', 'processing', 'paid', 'failed'));

ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS requested_at timestamptz;
