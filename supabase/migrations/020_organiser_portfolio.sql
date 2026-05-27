-- Portfolio table
CREATE TABLE IF NOT EXISTS public.organiser_portfolio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organiser_id uuid REFERENCES public.organiser_profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('photo', 'video')),
  url text NOT NULL,
  thumbnail_url text,
  caption text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.organiser_portfolio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organisers manage own portfolio" ON public.organiser_portfolio
  FOR ALL USING (
    organiser_id IN (
      SELECT id FROM public.organiser_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view active portfolio" ON public.organiser_portfolio
  FOR SELECT USING (is_active = true);

-- Add social_links JSON column to organiser_profiles
ALTER TABLE public.organiser_profiles
ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}';

-- Storage bucket for portfolio photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('organiser-portfolio', 'organiser-portfolio', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "Organisers can upload portfolio photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'organiser-portfolio' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Anyone can view portfolio photos" ON storage.objects
FOR SELECT USING (bucket_id = 'organiser-portfolio');

CREATE POLICY "Organisers can delete own portfolio photos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'organiser-portfolio' AND
  auth.uid() IS NOT NULL
);
