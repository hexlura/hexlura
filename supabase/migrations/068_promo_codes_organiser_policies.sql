-- Reconciles migration history with RLS policies that were already applied directly to the
-- live promo_codes table (via the Supabase dashboard, never captured in a migration file) —
-- so a fresh environment rebuilt from these migrations ends up with the same access rules as
-- production. Also adds an UPDATE policy for organisers editing their own codes, which was
-- missing even from the live DB (only create/view/delete existed there).

DROP POLICY IF EXISTS "Organisers can insert promo codes" ON public.promo_codes;
CREATE POLICY "Organisers can insert promo codes" ON public.promo_codes
  FOR INSERT
  WITH CHECK (
    (auth.uid() = organiser_id)
    OR EXISTS (
      SELECT 1 FROM public.organiser_profiles
      WHERE organiser_profiles.user_id = auth.uid()
        AND organiser_profiles.id = promo_codes.organiser_id
    )
  );

DROP POLICY IF EXISTS "Organisers can view own promo codes" ON public.promo_codes;
CREATE POLICY "Organisers can view own promo codes" ON public.promo_codes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organiser_profiles
      WHERE organiser_profiles.user_id = auth.uid()
        AND organiser_profiles.id = promo_codes.organiser_id
    )
  );

DROP POLICY IF EXISTS "Organisers can update own promo codes" ON public.promo_codes;
CREATE POLICY "Organisers can update own promo codes" ON public.promo_codes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organiser_profiles
      WHERE organiser_profiles.user_id = auth.uid()
        AND organiser_profiles.id = promo_codes.organiser_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organiser_profiles
      WHERE organiser_profiles.user_id = auth.uid()
        AND organiser_profiles.id = promo_codes.organiser_id
    )
  );

DROP POLICY IF EXISTS "Organisers can delete own promo codes" ON public.promo_codes;
CREATE POLICY "Organisers can delete own promo codes" ON public.promo_codes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organiser_profiles
      WHERE organiser_profiles.user_id = auth.uid()
        AND organiser_profiles.id = promo_codes.organiser_id
    )
  );

DROP POLICY IF EXISTS "Admins full access promo codes" ON public.promo_codes;
CREATE POLICY "Admins full access promo codes" ON public.promo_codes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Unrestricted SELECT is intentional: checkout looks up a code by text with no session
-- requirement (guests included), so any visitor can validate a code they were given.
DROP POLICY IF EXISTS "Public can validate promo codes" ON public.promo_codes;
CREATE POLICY "Public can validate promo codes" ON public.promo_codes
  FOR SELECT
  USING (true);
