-- Marker for the one-time "your event is live" email to the organiser.
-- Stays null until the publish-notification API sets it on the first
-- successful send, making the email idempotent on retries / republishes.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS published_email_sent_at timestamptz;
