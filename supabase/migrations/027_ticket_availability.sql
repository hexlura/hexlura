-- 027_ticket_availability.sql
-- Adds a ticket_availability field to events so organisers can signal
-- that tickets haven't been released yet, instead of showing "Sold Out".

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS ticket_availability text NOT NULL DEFAULT 'on_sale'
  CONSTRAINT events_ticket_availability_check CHECK (ticket_availability IN ('on_sale', 'coming_soon'));
