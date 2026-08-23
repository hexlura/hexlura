-- Lets guests (and anyone whose login session has expired) download their ticket via a
-- link in the confirmation email without needing to be logged in. The token is long and
-- random (unguessable, unlike the 6-character booking_ref), so it grants read-only access
-- to that one booking only when known — not a general weakening of the endpoint's auth.
--
-- Split into separate steps to avoid a full-table rewrite under an ACCESS EXCLUSIVE lock:
-- a NOT NULL column with a volatile DEFAULT in one ALTER forces Postgres to rewrite every
-- row and hold that lock for the duration, which stalls the connection pool for the whole
-- app (this caused prod 504s on unrelated routes on 2026-08-23). Adding the column nullable
-- first, backfilling via UPDATE (normal row locks, doesn't block reads), then enforcing
-- NOT NULL afterwards keeps the table usable throughout.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS ticket_access_token uuid;

UPDATE public.bookings
  SET ticket_access_token = gen_random_uuid()
  WHERE ticket_access_token IS NULL;

ALTER TABLE public.bookings
  ALTER COLUMN ticket_access_token SET NOT NULL,
  ALTER COLUMN ticket_access_token SET DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_ticket_access_token
  ON public.bookings (ticket_access_token);
