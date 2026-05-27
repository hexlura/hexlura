-- Migration: 036_promoter_role
-- Description: Add 'promoter' as a valid value for profiles.role

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'organiser', 'promoter', 'admin'));
