-- Migration: 012_door_staff
-- Description: Add door_staff role and assignments table

-- Add door_staff role to profiles check constraint
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('user', 'organiser', 'admin', 'door_staff'));

-- Door staff assignments table
CREATE TABLE IF NOT EXISTS public.door_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organiser_id uuid REFERENCES public.organiser_profiles(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(organiser_id, user_id)
);
ALTER TABLE public.door_staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organisers manage own door staff" ON public.door_staff
  FOR ALL USING (
    organiser_id IN (
      SELECT id FROM public.organiser_profiles WHERE user_id = auth.uid()
    )
  );
