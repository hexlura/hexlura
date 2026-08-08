-- Public contact/enquiry form submissions (app/(public)/contact).
-- Writes happen server-side only via the service-role client in
-- app/api/contact/route.ts, so no public INSERT policy is needed —
-- RLS is enabled with zero policies, locking the table down entirely
-- for the anon/authenticated roles while the service role (which
-- bypasses RLS) handles inserts and admin reads.

CREATE TABLE IF NOT EXISTS public.contact_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  email text NOT NULL CHECK (char_length(email) BETWEEN 5 AND 254),
  organization_name text NOT NULL CHECK (char_length(organization_name) BETWEEN 1 AND 160),
  phone text CHECK (phone IS NULL OR char_length(phone) <= 30),
  topic text NOT NULL
    CHECK (topic IN (
      'event_ticketing', 'organizer', 'venue_partnership', 'existing_event',
      'corporate_private_event', 'technical_support', 'partnership', 'other'
    )),
  event_details text NOT NULL CHECK (char_length(event_details) BETWEEN 10 AND 2000),
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'in_progress', 'resolved', 'spam')),
  source text NOT NULL DEFAULT 'website',
  page_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_enquiries_status ON public.contact_enquiries(status);
CREATE INDEX IF NOT EXISTS idx_contact_enquiries_created_at ON public.contact_enquiries(created_at DESC);

ALTER TABLE public.contact_enquiries ENABLE ROW LEVEL SECURITY;

-- Admins can view/manage enquiries from the admin portal (which uses the
-- anon client for auth checks alongside createAdminClient() for reads).
CREATE POLICY "Admin can manage all contact enquiries" ON public.contact_enquiries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- No INSERT policy for anon/authenticated: submissions are written by
-- app/api/contact/route.ts using the service-role client, which bypasses
-- RLS entirely. This keeps the table unreachable from browser JS.

CREATE OR REPLACE FUNCTION public.contact_enquiries_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contact_enquiries_set_updated_at ON public.contact_enquiries;
CREATE TRIGGER contact_enquiries_set_updated_at
  BEFORE UPDATE ON public.contact_enquiries
  FOR EACH ROW EXECUTE FUNCTION public.contact_enquiries_touch_updated_at();


--- Updated final migration for contact table and updated for admin panel UI  ---

ALTER TABLE public.contact_enquiries
  ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_connected boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_converted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lead_summary text NULL,
  ADD COLUMN IF NOT EXISTS upcoming_schedule timestamptz NULL,
  ADD COLUMN IF NOT EXISTS priority text NULL;

ALTER TABLE public.contact_enquiries
  ADD CONSTRAINT contact_enquiries_priority_check
  CHECK (
    priority IS NULL
    OR priority IN ('low', 'medium', 'high')
  );