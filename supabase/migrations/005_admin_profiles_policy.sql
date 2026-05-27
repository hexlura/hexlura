-- Migration: 005_admin_profiles_policy
-- Description: Allow admins to SELECT all profiles (was missing, causing /admin/users
--              to return no rows for non-self profiles due to RLS).

CREATE POLICY "Admins can select all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
