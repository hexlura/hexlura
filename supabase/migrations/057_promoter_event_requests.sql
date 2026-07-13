-- Migration: 057_promoter_event_requests
-- Description: Self-service "Promote this event" flow. Users can request to
--   promote an event from its public page; the organiser approves or declines
--   from their dashboard. Reuses promoter_event_assignments — approval simply
--   flips the row to 'active', which the existing checkout/webhook commission
--   logic already honours. Only the status CHECK needs widening:
--     'requested' — user asked, awaiting organiser decision
--     'declined'  — organiser said no (final for that event; organiser can
--                   still invite manually later)

ALTER TABLE public.promoter_event_assignments
  DROP CONSTRAINT IF EXISTS promoter_event_assignments_status_check;

ALTER TABLE public.promoter_event_assignments
  ADD CONSTRAINT promoter_event_assignments_status_check
  CHECK (status IN ('invited', 'active', 'removed', 'requested', 'declined'));

-- Organiser dashboards list pending requests by organiser + status; the
-- existing idx_pea_organiser_status index already covers that lookup.
