-- Migration: 002_triggers_and_policies
-- Description: Auto-create profiles on signup, fix organiser_profiles RLS

--=============================================================================--
-- 1. AUTO-CREATE PROFILE ON USER SIGNUP
--    Fires after every new row in auth.users and inserts into public.profiles.
--    Uses SECURITY DEFINER so it runs as the function owner (postgres) and
--    bypasses RLS on the profiles table.
--=============================================================================--

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop if exists (idempotent re-runs)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

--=============================================================================--
-- 2. BACKFILL: Insert profiles for any existing auth users that have no row
--    Run once — ON CONFLICT DO NOTHING makes it safe to re-run.
--=============================================================================--

INSERT INTO public.profiles (id, full_name, role)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email),
  'user'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

--=============================================================================--
-- 3. FIX organiser_profiles RLS
--    The original migration was missing the INSERT policy, causing the
--    /organiser/apply form to fail with an RLS violation.
--=============================================================================--

-- Authenticated users can INSERT their own organiser profile
CREATE POLICY "Users can insert own organiser profile"
  ON public.organiser_profiles
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admins have full access to all organiser profiles
CREATE POLICY "Admins can manage all organiser profiles"
  ON public.organiser_profiles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

--=============================================================================--
-- 4. Also allow INSERT into profiles for the service role / trigger use.
--    (The SECURITY DEFINER function above bypasses RLS, but adding a policy
--    here makes it explicit and allows server-side inserts via service role.)
--=============================================================================--

-- Service role and trigger inserts bypass RLS, but allow authenticated users
-- to insert their own profile (useful for edge cases / manual recovery).
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);
