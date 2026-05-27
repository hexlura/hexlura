-- Add phone to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone text;

-- Reservations table
CREATE TABLE IF NOT EXISTS public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_type_id uuid REFERENCES public.ticket_types(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  quantity integer NOT NULL,
  session_id text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  status text DEFAULT 'active' CHECK (status IN ('active', 'confirmed', 'expired')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own reservations" ON public.reservations
  FOR ALL USING (auth.uid() = user_id);

-- Auto-expire reservations function
CREATE OR REPLACE FUNCTION expire_reservations()
RETURNS void AS $$
BEGIN
  UPDATE public.reservations
  SET status = 'expired'
  WHERE status = 'active'
  AND expires_at < now();
END;
$$ LANGUAGE plpgsql;
