-- Migration: 015_organiser_team
-- Description: Organiser team management replacing door_staff assignment system

CREATE TABLE IF NOT EXISTS public.organiser_team (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organiser_id uuid REFERENCES public.organiser_profiles(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  privilege text NOT NULL CHECK (privilege IN ('co_organiser', 'event_manager', 'door_staff')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'removed')),
  invited_by uuid REFERENCES public.profiles(id),
  invite_token text UNIQUE DEFAULT gen_random_uuid()::text,
  invited_email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE(organiser_id, user_id)
);

ALTER TABLE public.organiser_team ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organisers manage own team" ON public.organiser_team
  FOR ALL USING (
    organiser_id IN (
      SELECT id FROM public.organiser_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members view own assignments" ON public.organiser_team
  FOR SELECT USING (user_id = auth.uid());

-- Keep door_staff role in profiles for backward compat but no longer assign it
-- New system uses organiser_team table instead
