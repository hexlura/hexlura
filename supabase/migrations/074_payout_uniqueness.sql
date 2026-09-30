-- Migration: 074_payout_uniqueness
-- Description: Stop duplicate payout rows. generatePayoutsForOrganiser runs on
-- page loads, and two concurrent loads both saw "no payout yet" and each
-- inserted one (Vismayam 2.0 and ONAM PONNONAM both got two identical pending
-- rows 0.3s apart) — processing both would pay the organiser twice.
--
-- An event can legitimately have one auto-settled 'paid' row (Connect) plus one
-- manual row, so uniqueness is per kind, not per event:
--   1. at most one OPEN (pending/requested/processing) payout per organiser+event
--   2. at most one auto-settled-via-Connect row per organiser+event
--
-- Existing duplicate rows must be removed first or this will fail (by design).

CREATE UNIQUE INDEX IF NOT EXISTS payouts_one_open_per_event
  ON public.payouts (organiser_id, event_id)
  WHERE event_id IS NOT NULL AND status IN ('pending', 'requested', 'processing');

CREATE UNIQUE INDEX IF NOT EXISTS payouts_one_autosettled_per_event
  ON public.payouts (organiser_id, event_id)
  WHERE event_id IS NOT NULL AND reference = 'Auto-settled via Stripe Connect';
