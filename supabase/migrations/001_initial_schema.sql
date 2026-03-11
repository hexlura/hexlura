-- Migration: 001_initial_schema
-- Description: Initial schema for Hexlura

--=============================================================================--
-- TABLES
--=============================================================================--

-- 1. profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  avatar_url text,
  role text DEFAULT 'user' CHECK (role IN ('user', 'organiser', 'admin')),
  is_verified boolean DEFAULT false,
  referral_code text UNIQUE,
  referred_by uuid REFERENCES public.profiles(id),
  credit_balance integer DEFAULT 0, -- in pence
  created_at timestamptz DEFAULT now()
);

-- 2. organiser_profiles
CREATE TABLE IF NOT EXISTS public.organiser_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  website text,
  logo_url text,
  vat_number text,
  vat_registered boolean DEFAULT false,
  stripe_account_id text,
  is_approved boolean DEFAULT false,
  approved_at timestamptz,
  approved_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

-- 3. events
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organiser_id uuid REFERENCES public.organiser_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  category text CHECK (category IN ('Music','Sports','Comedy','Theatre','Festival','Corporate','Family','Culture','Other')),
  tags text[],
  venue_name text,
  venue_address text,
  venue_postcode text,
  lat numeric,
  lng numeric,
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  banner_url text,
  status text DEFAULT 'draft' CHECK (status IN ('draft','published','cancelled','archived')),
  is_featured boolean DEFAULT false,
  min_age integer DEFAULT 0,
  max_tickets_per_order integer DEFAULT 10,
  refund_policy text DEFAULT '7 days before event',
  total_capacity integer,
  created_at timestamptz DEFAULT now()
);

-- 4. ticket_types
CREATE TABLE IF NOT EXISTS public.ticket_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price_pence integer NOT NULL,
  quantity_total integer NOT NULL,
  quantity_sold integer DEFAULT 0,
  sale_starts_at timestamptz,
  sale_ends_at timestamptz,
  max_per_order integer DEFAULT 10,
  sort_order integer DEFAULT 0,
  is_visible boolean DEFAULT true
);

-- 5. promo_codes (Defined before bookings due to reference)
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE, -- NULL means platform-wide
  code text NOT NULL,
  organiser_id uuid REFERENCES public.organiser_profiles(id) ON DELETE CASCADE,
  discount_type text CHECK (discount_type IN ('percent','fixed')),
  discount_value integer NOT NULL,
  min_order_pence integer DEFAULT 0,
  max_uses integer,
  uses_count integer DEFAULT 0,
  valid_from timestamptz,
  valid_to timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 6. bookings
CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  booking_ref text UNIQUE NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled','refunded')),
  subtotal_pence integer,
  platform_fee_pence integer,
  total_pence integer,
  promo_code_id uuid REFERENCES public.promo_codes(id) ON DELETE SET NULL,
  discount_pence integer DEFAULT 0,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  payment_method text,
  created_at timestamptz DEFAULT now(),
  confirmed_at timestamptz
);

-- 7. booking_items
CREATE TABLE IF NOT EXISTS public.booking_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  ticket_type_id uuid REFERENCES public.ticket_types(id) ON DELETE SET NULL,
  quantity integer NOT NULL,
  unit_price_pence integer NOT NULL,
  attendee_name text,
  attendee_email text,
  qr_code text UNIQUE
);

-- 8. payouts
CREATE TABLE IF NOT EXISTS public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organiser_id uuid REFERENCES public.organiser_profiles(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  gross_pence integer,
  fee_pence integer,
  net_pence integer,
  status text DEFAULT 'pending' CHECK (status IN ('pending','processing','paid','failed')),
  stripe_transfer_id text,
  scheduled_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 9. checkins
CREATE TABLE IF NOT EXISTS public.checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_item_id uuid REFERENCES public.booking_items(id) ON DELETE CASCADE,
  qr_token text NOT NULL,
  checked_in_at timestamptz DEFAULT now(),
  checked_in_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 10. waitlist
CREATE TABLE IF NOT EXISTS public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  ticket_type_id uuid REFERENCES public.ticket_types(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  email text NOT NULL,
  notified_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 11. reviews
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating integer CHECK (rating BETWEEN 1 AND 5),
  comment text,
  is_visible boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 12. notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text,
  title text,
  body text,
  is_read boolean DEFAULT false,
  link text,
  created_at timestamptz DEFAULT now()
);

-- 13. audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

--=============================================================================--
-- INDEXES
--=============================================================================--

CREATE INDEX IF NOT EXISTS idx_events_slug ON public.events(slug);
CREATE INDEX IF NOT EXISTS idx_events_status_start_at ON public.events(status, start_at);
CREATE INDEX IF NOT EXISTS idx_events_category ON public.events(category);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_ref ON public.bookings(booking_ref);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_event_id ON public.bookings(event_id);
CREATE INDEX IF NOT EXISTS idx_booking_items_qr_code ON public.booking_items(qr_code);
CREATE INDEX IF NOT EXISTS idx_organiser_profiles_slug ON public.organiser_profiles(slug);

--=============================================================================--
-- TRIGGERS & FUNCTIONS
--=============================================================================--

-- 1. Generate booking reference (e.g., HXL-A1B2C3)
CREATE OR REPLACE FUNCTION public.generate_booking_ref()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.booking_ref IS NULL THEN
    NEW.booking_ref := 'HXL-' || upper(substring(gen_random_uuid()::text, 1, 6));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_booking_insert
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_booking_ref();

-- 2. Generate referral code automatically (using random 8 chars)
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := upper(substring(gen_random_uuid()::text, 1, 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_profile_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_referral_code();

--=============================================================================--
-- ROW LEVEL SECURITY (RLS)
--=============================================================================--

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organiser_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can select own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- organiser_profiles
-- -----------------------------------------------------------------------------
CREATE POLICY "Organisers can select own profile" ON public.organiser_profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Organisers can update own profile" ON public.organiser_profiles FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admins can select all organiser profiles" ON public.organiser_profiles FOR SELECT
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- -----------------------------------------------------------------------------
-- events
-- -----------------------------------------------------------------------------
CREATE POLICY "Anyone can select published events" ON public.events FOR SELECT USING (status = 'published');
CREATE POLICY "Organisers can select own events" ON public.events FOR SELECT
USING (EXISTS (SELECT 1 FROM public.organiser_profiles WHERE id = events.organiser_id AND user_id = auth.uid()));
CREATE POLICY "Organisers can insert own events" ON public.events FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.organiser_profiles WHERE id = events.organiser_id AND user_id = auth.uid()));
CREATE POLICY "Organisers can update own events" ON public.events FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.organiser_profiles WHERE id = events.organiser_id AND user_id = auth.uid()));
CREATE POLICY "Organisers can delete own events" ON public.events FOR DELETE
USING (EXISTS (SELECT 1 FROM public.organiser_profiles WHERE id = events.organiser_id AND user_id = auth.uid()));
CREATE POLICY "Admins can CRUD all events" ON public.events FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- -----------------------------------------------------------------------------
-- ticket_types
-- -----------------------------------------------------------------------------
CREATE POLICY "Anyone can select visible types for published events" ON public.ticket_types FOR SELECT
USING (is_visible = true AND EXISTS (SELECT 1 FROM public.events WHERE id = ticket_types.event_id AND status = 'published'));
CREATE POLICY "Organisers can manage own event ticket types" ON public.ticket_types FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.events e
  JOIN public.organiser_profiles op ON e.organiser_id = op.id
  WHERE e.id = ticket_types.event_id AND op.user_id = auth.uid()
));

-- -----------------------------------------------------------------------------
-- bookings
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can select own bookings" ON public.bookings FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Organisers can select bookings for their events" ON public.bookings FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.events e
  JOIN public.organiser_profiles op ON e.organiser_id = op.id
  WHERE e.id = bookings.event_id AND op.user_id = auth.uid()
));
CREATE POLICY "Admins can select all bookings" ON public.bookings FOR SELECT
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- -----------------------------------------------------------------------------
-- booking_items
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can select own booking items" ON public.booking_items FOR SELECT
USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_items.booking_id AND b.user_id = auth.uid()));
CREATE POLICY "Organisers can select booking items for their events" ON public.booking_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.bookings b
  JOIN public.events e ON b.event_id = e.id
  JOIN public.organiser_profiles op ON e.organiser_id = op.id
  WHERE b.id = booking_items.booking_id AND op.user_id = auth.uid()
));
CREATE POLICY "Admins can select all booking items" ON public.booking_items FOR SELECT
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- -----------------------------------------------------------------------------
-- checkins
-- -----------------------------------------------------------------------------
CREATE POLICY "Organisers can insert checkins for their events" ON public.checkins FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.booking_items bi
  JOIN public.bookings b ON bi.booking_id = b.id
  JOIN public.events e ON b.event_id = e.id
  JOIN public.organiser_profiles op ON e.organiser_id = op.id
  WHERE bi.id = checkins.booking_item_id AND op.user_id = auth.uid()
));
CREATE POLICY "Organisers can select checkins for their events" ON public.checkins FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.booking_items bi
  JOIN public.bookings b ON bi.booking_id = b.id
  JOIN public.events e ON b.event_id = e.id
  JOIN public.organiser_profiles op ON e.organiser_id = op.id
  WHERE bi.id = checkins.booking_item_id AND op.user_id = auth.uid()
));

-- -----------------------------------------------------------------------------
-- waitlist
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can insert own waitlist entries" ON public.waitlist FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can select own waitlist entries" ON public.waitlist FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Organisers can select waitlist for their events" ON public.waitlist FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.events e
  JOIN public.organiser_profiles op ON e.organiser_id = op.id
  WHERE e.id = waitlist.event_id AND op.user_id = auth.uid()
));
