-- Migration: 063_organiser_account_deletion_requests
-- Description: Organiser-requests / admin-approves account deletion workflow.
-- Replaces the previous hard block ("email support if you have confirmed
-- bookings") with the same request/review pattern as event deletion — any
-- confirmed bookings on the organiser's events get auto-refunded on approval
-- before the account is actually deleted.

CREATE TABLE IF NOT EXISTS public.organiser_account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Nullable + ON DELETE SET NULL so this request row survives account
  -- deletion (the whole point is to keep a record of who asked and why).
  organiser_id uuid REFERENCES public.organiser_profiles(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  org_name text NOT NULL,
  requester_email text NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  requested_at timestamptz DEFAULT now(),
  reviewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_organiser_account_deletion_requests_organiser ON public.organiser_account_deletion_requests(organiser_id);
CREATE INDEX IF NOT EXISTS idx_organiser_account_deletion_requests_status ON public.organiser_account_deletion_requests(status);

-- At most one pending request per organiser.
CREATE UNIQUE INDEX IF NOT EXISTS uq_account_deletion_requests_one_pending
  ON public.organiser_account_deletion_requests(organiser_id)
  WHERE status = 'pending';

ALTER TABLE public.organiser_account_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organisers view own account deletion requests" ON public.organiser_account_deletion_requests
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins manage account deletion requests" ON public.organiser_account_deletion_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
