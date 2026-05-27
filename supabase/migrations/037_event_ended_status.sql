-- Add 'ended' to the event status enum and mark past events accordingly

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_status_check;

ALTER TABLE public.events
  ADD CONSTRAINT events_status_check
  CHECK (status IN ('draft', 'published', 'cancelled', 'archived', 'ended'));

-- Mark published events as ended where the event is in the past:
--   • end_at is set and has passed, OR
--   • end_at is null but start_at has passed (no end time was provided)
UPDATE public.events
SET status = 'ended'
WHERE status = 'published'
  AND (
    (end_at IS NOT NULL AND end_at < now())
    OR
    (end_at IS NULL AND start_at < now())
  );
