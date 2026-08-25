-- Promo codes currently only scope to a whole event (or platform-wide) and
-- have no per-customer usage cap, no ceiling on percentage discounts, and no
-- redemption history. This adds all three, purely additively — every new
-- column is nullable and defaults to today's behavior (NULL = unscoped /
-- unlimited / uncapped), so existing codes are unaffected.

ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS ticket_type_id uuid REFERENCES public.ticket_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS max_uses_per_customer integer,
  ADD COLUMN IF NOT EXISTS max_discount_pence integer;

CREATE INDEX IF NOT EXISTS idx_promo_codes_ticket_type_id ON public.promo_codes (ticket_type_id);

-- One row per successful redemption — gives organisers real usage history and
-- lets checkout enforce max_uses_per_customer by counting rows here instead
-- of trusting anything client-supplied.
CREATE TABLE IF NOT EXISTS public.promo_code_redemptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    promo_code_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
    booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    email text,
    discount_pence integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promo_code_redemptions_promo_user ON public.promo_code_redemptions (promo_code_id, user_id);
CREATE INDEX IF NOT EXISTS idx_promo_code_redemptions_promo_email ON public.promo_code_redemptions (promo_code_id, email);
CREATE INDEX IF NOT EXISTS idx_promo_code_redemptions_booking_id ON public.promo_code_redemptions (booking_id);

ALTER TABLE public.promo_code_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organisers can view own promo code redemptions"
    ON public.promo_code_redemptions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.promo_codes pc
            JOIN public.organiser_profiles op ON op.id = pc.organiser_id
            WHERE pc.id = promo_code_redemptions.promo_code_id
            AND op.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins full access promo code redemptions"
    ON public.promo_code_redemptions FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );

-- Inserts only ever happen server-side during checkout (service role), never
-- from a browser client — no INSERT policy for anon/authenticated.
