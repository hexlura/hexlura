-- Migration: 028_promoter_support
-- Description: Promoter feature — self-signup affiliates earning commission on referred bookings.
--   Adds: promoter_profiles, promoter_event_assignments, promoter_link_clicks,
--         promoter_earnings (ledger), promoter_payouts (sibling of payouts).
--   Modifies: bookings (snapshot promoter_id + commission_percent + commission_pence).

--=============================================================================--
-- 1. PROMOTER PROFILES
--=============================================================================--

CREATE TABLE IF NOT EXISTS public.promoter_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  referral_code text NOT NULL UNIQUE,
  bio text,
  avatar_url text,
  payout_method text CHECK (payout_method IN ('bank_transfer', 'stripe_connect')),
  bank_account_name text,
  bank_account_number text,
  bank_sort_code text,
  stripe_account_id text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promoter_profiles_referral_code
  ON public.promoter_profiles (referral_code);

--=============================================================================--
-- 2. PROMOTER EVENT ASSIGNMENTS (organiser invites + accepted links)
--=============================================================================--

CREATE TABLE IF NOT EXISTS public.promoter_event_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_id uuid REFERENCES public.promoter_profiles(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  organiser_id uuid NOT NULL REFERENCES public.organiser_profiles(id) ON DELETE CASCADE,
  commission_percent numeric(5, 2) NOT NULL CHECK (commission_percent >= 0 AND commission_percent <= 100),
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'removed')),
  invite_token text UNIQUE DEFAULT gen_random_uuid()::text,
  invited_email text,
  invited_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE(promoter_id, event_id)
);

-- Prevent double-inviting the same email to the same event while still pending
CREATE UNIQUE INDEX IF NOT EXISTS promoter_invite_email_event_unique
  ON public.promoter_event_assignments (invited_email, event_id)
  WHERE status = 'invited';

CREATE INDEX IF NOT EXISTS idx_pea_organiser_status
  ON public.promoter_event_assignments (organiser_id, status);

CREATE INDEX IF NOT EXISTS idx_pea_promoter_status
  ON public.promoter_event_assignments (promoter_id, status);

--=============================================================================--
-- 3. PROMOTER LINK CLICKS
--=============================================================================--

CREATE TABLE IF NOT EXISTS public.promoter_link_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_id uuid NOT NULL REFERENCES public.promoter_profiles(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  ip_hash text,
  user_agent text,
  referrer text,
  is_unique boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plc_promoter_created
  ON public.promoter_link_clicks (promoter_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_plc_event_created
  ON public.promoter_link_clicks (event_id, created_at DESC);

--=============================================================================--
-- 4. PROMOTER EARNINGS LEDGER
--=============================================================================--

CREATE TABLE IF NOT EXISTS public.promoter_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_id uuid NOT NULL REFERENCES public.promoter_profiles(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id),
  organiser_id uuid NOT NULL REFERENCES public.organiser_profiles(id),
  ticket_subtotal_pence integer NOT NULL,
  commission_percent numeric(5, 2) NOT NULL,
  commission_pence integer NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'available', 'paid', 'reversed')),
  payout_id uuid,
  created_at timestamptz DEFAULT now(),
  available_at timestamptz,
  reversed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_pe_promoter_status
  ON public.promoter_earnings (promoter_id, status);

CREATE INDEX IF NOT EXISTS idx_pe_organiser
  ON public.promoter_earnings (organiser_id);

--=============================================================================--
-- 5. PROMOTER PAYOUTS
--=============================================================================--

CREATE TABLE IF NOT EXISTS public.promoter_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_id uuid NOT NULL REFERENCES public.promoter_profiles(id) ON DELETE CASCADE,
  gross_pence integer NOT NULL,
  fee_pence integer NOT NULL DEFAULT 0,
  net_pence integer NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'requested', 'processing', 'paid', 'failed')),
  requested_at timestamptz,
  processed_at timestamptz,
  paid_at timestamptz,
  failure_reason text,
  payout_method text,
  reference text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pp_promoter_status
  ON public.promoter_payouts (promoter_id, status);

-- Wire earnings.payout_id once both tables exist
ALTER TABLE public.promoter_earnings
  DROP CONSTRAINT IF EXISTS promoter_earnings_payout_fk;

ALTER TABLE public.promoter_earnings
  ADD CONSTRAINT promoter_earnings_payout_fk
  FOREIGN KEY (payout_id) REFERENCES public.promoter_payouts(id) ON DELETE SET NULL;

--=============================================================================--
-- 6. BOOKINGS COLUMNS (snapshot of attribution at intent time)
--=============================================================================--

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS promoter_id uuid REFERENCES public.promoter_profiles(id) ON DELETE SET NULL;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS promoter_commission_percent numeric(5, 2);

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS promoter_commission_pence integer;

CREATE INDEX IF NOT EXISTS idx_bookings_promoter_id
  ON public.bookings (promoter_id) WHERE promoter_id IS NOT NULL;

--=============================================================================--
-- 7. RLS
--=============================================================================--

ALTER TABLE public.promoter_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promoter_event_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promoter_link_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promoter_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promoter_payouts ENABLE ROW LEVEL SECURITY;

-- promoter_profiles: promoters read/update own; admins read all
DROP POLICY IF EXISTS "Promoters read own profile" ON public.promoter_profiles;
CREATE POLICY "Promoters read own profile" ON public.promoter_profiles
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Promoters update own profile" ON public.promoter_profiles;
CREATE POLICY "Promoters update own profile" ON public.promoter_profiles
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage promoter profiles" ON public.promoter_profiles;
CREATE POLICY "Admins manage promoter profiles" ON public.promoter_profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- promoter_event_assignments: organisers manage own; promoters read own
DROP POLICY IF EXISTS "Organisers manage assignments" ON public.promoter_event_assignments;
CREATE POLICY "Organisers manage assignments" ON public.promoter_event_assignments
  FOR ALL USING (
    organiser_id IN (SELECT id FROM public.organiser_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Promoters read own assignments" ON public.promoter_event_assignments;
CREATE POLICY "Promoters read own assignments" ON public.promoter_event_assignments
  FOR SELECT USING (
    promoter_id IN (SELECT id FROM public.promoter_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins manage assignments" ON public.promoter_event_assignments;
CREATE POLICY "Admins manage assignments" ON public.promoter_event_assignments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- promoter_link_clicks: insert open (server-side route inserts via service-role anyway);
-- read scoped to owner promoter or owner organiser
DROP POLICY IF EXISTS "Promoters read own clicks" ON public.promoter_link_clicks;
CREATE POLICY "Promoters read own clicks" ON public.promoter_link_clicks
  FOR SELECT USING (
    promoter_id IN (SELECT id FROM public.promoter_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Organisers read clicks for their events" ON public.promoter_link_clicks;
CREATE POLICY "Organisers read clicks for their events" ON public.promoter_link_clicks
  FOR SELECT USING (
    event_id IN (
      SELECT e.id FROM public.events e
      JOIN public.organiser_profiles op ON e.organiser_id = op.id
      WHERE op.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins read all clicks" ON public.promoter_link_clicks;
CREATE POLICY "Admins read all clicks" ON public.promoter_link_clicks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- promoter_earnings: promoters read own; organisers read own; admins all
DROP POLICY IF EXISTS "Promoters read own earnings" ON public.promoter_earnings;
CREATE POLICY "Promoters read own earnings" ON public.promoter_earnings
  FOR SELECT USING (
    promoter_id IN (SELECT id FROM public.promoter_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Organisers read own earnings" ON public.promoter_earnings;
CREATE POLICY "Organisers read own earnings" ON public.promoter_earnings
  FOR SELECT USING (
    organiser_id IN (SELECT id FROM public.organiser_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins manage earnings" ON public.promoter_earnings;
CREATE POLICY "Admins manage earnings" ON public.promoter_earnings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- promoter_payouts: promoters read own; admins manage
DROP POLICY IF EXISTS "Promoters read own payouts" ON public.promoter_payouts;
CREATE POLICY "Promoters read own payouts" ON public.promoter_payouts
  FOR SELECT USING (
    promoter_id IN (SELECT id FROM public.promoter_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins manage payouts" ON public.promoter_payouts;
CREATE POLICY "Admins manage payouts" ON public.promoter_payouts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
