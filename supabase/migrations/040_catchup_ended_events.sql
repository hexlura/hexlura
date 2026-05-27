-- Catch up any published events whose end_at has already passed.
-- Migration 037 did this once; this re-runs it to pick up events created since then.
UPDATE public.events
SET status = 'ended'
WHERE status = 'published'
  AND (
    (end_at IS NOT NULL AND end_at < now())
    OR
    (end_at IS NULL AND start_at < now())
  );
