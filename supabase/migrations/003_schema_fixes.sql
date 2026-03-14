-- Migration: 003_schema_fixes
-- Description: Add email to profiles, missing columns, audit_logs policies

--=============================================================================--
-- 1. PROFILES — ADD EMAIL COLUMN AND SYNC FROM auth.users
--=============================================================================--

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text;

-- Backfill existing rows with email from auth.users
UPDATE public.profiles
SET email = u.email
FROM auth.users u
WHERE public.profiles.id = u.id
  AND public.profiles.email IS NULL;

-- Update the handle_new_user trigger to also save email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, is_verified, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    'user',
    false,
    now()
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

--=============================================================================--
-- 2. ADD MISSING COLUMNS
--=============================================================================--

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS featured_order integer DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_marketing_opt_out boolean DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS unsubscribe_token text DEFAULT gen_random_uuid()::text;

ALTER TABLE public.organiser_profiles
  ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false;

--=============================================================================--
-- 3. AUDIT_LOGS — TABLE + RLS (IF NOT EXISTS from 001, add policies safely)
--=============================================================================--

-- Table was created in 001 migration; this ensures it exists if run standalone
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid REFERENCES public.profiles(id),
  action      text NOT NULL,
  entity_type text,
  entity_id   uuid,
  metadata    jsonb,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop before re-creating to make this idempotent
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);
