-- Migration: 061_event_followers_notified
-- Description: Idempotency marker for the organiser "notify my followers about
-- this event" action — mirrors the published_email_sent_at pattern from
-- 034_event_published_email.sql, one-time per event.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS followers_notified_at timestamptz;
