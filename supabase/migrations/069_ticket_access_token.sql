-- Lets guests (and anyone whose login session has expired) download their ticket via a
-- link in the confirmation email without needing to be logged in. The token is long and
-- random (unguessable, unlike the 6-character booking_ref), so it grants read-only access
-- to that one booking only when known — not a general weakening of the endpoint's auth.
-- NOT NULL + a volatile DEFAULT forces Postgres to backfill a distinct random value for
-- every existing row as part of this ALTER, not just future inserts — so already-sold
-- bookings get a working token immediately too.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS ticket_access_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_ticket_access_token
  ON public.bookings (ticket_access_token);
