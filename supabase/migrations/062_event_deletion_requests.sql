-- Migration: 062_event_deletion_requests
-- Description: Organiser-requests / admin-approves event deletion workflow.
-- Replaces the direct client-side events.delete() call, which had no
-- server-side check on booking count and would silently cascade-delete
-- confirmed bookings with no refund, notification, or audit trail.

-- 'deleted' is a new terminal status for events that had real payment history
-- at deletion time — those events are NOT physically removed (their bookings
-- must survive for chargeback/dispute evidence), just permanently hidden and
-- unrecoverable by the organiser. Events with zero bookings are still
-- physically removed as before.
ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_status_check;
ALTER TABLE public.events
  ADD CONSTRAINT events_status_check
  CHECK (status IN ('draft', 'published', 'cancelled', 'archived', 'ended', 'deleted'));

CREATE TABLE IF NOT EXISTS public.event_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Nullable + ON DELETE SET NULL so this request row (the audit trail of
  -- who asked for what, and why) survives even after the event itself is
  -- physically removed (the zero-booking hard-delete path).
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  event_title text NOT NULL,
  organiser_id uuid NOT NULL REFERENCES public.organiser_profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  previous_status text NOT NULL,
  admin_notes text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  requested_at timestamptz DEFAULT now(),
  reviewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_event_deletion_requests_event ON public.event_deletion_requests(event_id);
CREATE INDEX IF NOT EXISTS idx_event_deletion_requests_organiser ON public.event_deletion_requests(organiser_id);
CREATE INDEX IF NOT EXISTS idx_event_deletion_requests_status ON public.event_deletion_requests(status);

-- At most one pending request per event — closes the race where a
-- double-click could otherwise queue duplicate requests for the same event.
CREATE UNIQUE INDEX IF NOT EXISTS uq_event_deletion_requests_one_pending
  ON public.event_deletion_requests(event_id)
  WHERE status = 'pending';

ALTER TABLE public.event_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Reads/writes happen server-side via the service-role client (mirrors every
-- other request-queue table in this app) — this is a defence-in-depth backstop.
CREATE POLICY "Organisers view own deletion requests" ON public.event_deletion_requests
  FOR SELECT USING (
    organiser_id IN (SELECT id FROM public.organiser_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins manage deletion requests" ON public.event_deletion_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
