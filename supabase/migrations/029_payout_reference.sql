-- Migration: 029_payout_reference
-- Description: Adds a free-text bank reference column to payouts so admins
--              can record the FPS/CHAPS ID (or statement memo) used when
--              sending the bank transfer. Surfaces in the organiser
--              "payout sent" email so they can chase the funds with their bank.
--              Optional — when null, the email falls back to a derived
--              HXL-PAY-XXXXXXXX reference based on the payout UUID.

ALTER TABLE public.payouts
  ADD COLUMN IF NOT EXISTS reference text;
