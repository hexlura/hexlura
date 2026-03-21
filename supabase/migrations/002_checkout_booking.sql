-- Migration: 002_checkout_booking
-- Description: Update bookings for fee model + add refund_requests table

-- Rename columns to match new fee model (only if old names exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'subtotal_pence'
  ) THEN
    ALTER TABLE public.bookings RENAME COLUMN subtotal_pence TO ticket_subtotal_pence;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'platform_fee_pence'
  ) THEN
    ALTER TABLE public.bookings RENAME COLUMN platform_fee_pence TO booking_fee_pence;
  END IF;
END $$;

-- Add needs_manual_payout flag for organisers without Stripe
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS needs_manual_payout boolean DEFAULT false;

-- refund_requests table
CREATE TABLE IF NOT EXISTS public.refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  message text,
  status text DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_note text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own refund requests"
  ON public.refund_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can select own refund requests"
  ON public.refund_requests FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all refund requests"
  ON public.refund_requests FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Allow service role / webhook to insert bookings and booking_items
DROP POLICY IF EXISTS "Service can insert bookings" ON public.bookings;
CREATE POLICY "Service can insert bookings" ON public.bookings
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Service can update bookings" ON public.bookings;
CREATE POLICY "Service can update bookings" ON public.bookings
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Service can insert booking items" ON public.booking_items;
CREATE POLICY "Service can insert booking items" ON public.booking_items
  FOR INSERT WITH CHECK (true);

-- Allow service role to update ticket_types quantity_sold
DROP POLICY IF EXISTS "Service can update ticket types" ON public.ticket_types;
CREATE POLICY "Service can update ticket types" ON public.ticket_types
  FOR UPDATE USING (true);

-- Allow service role to update promo_codes uses_count
DROP POLICY IF EXISTS "Service can update promo codes" ON public.promo_codes;
CREATE POLICY "Service can update promo codes" ON public.promo_codes
  FOR UPDATE USING (true);

CREATE INDEX IF NOT EXISTS idx_refund_requests_booking_id ON public.refund_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_user_id ON public.refund_requests(user_id);
