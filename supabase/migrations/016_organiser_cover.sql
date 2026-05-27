ALTER TABLE public.organiser_profiles
ADD COLUMN IF NOT EXISTS cover_url text;

ALTER TABLE public.organiser_profiles
ADD COLUMN IF NOT EXISTS social_instagram text;

ALTER TABLE public.organiser_profiles
ADD COLUMN IF NOT EXISTS social_facebook text;

ALTER TABLE public.organiser_profiles
ADD COLUMN IF NOT EXISTS social_website text;

ALTER TABLE public.organiser_profiles
ADD COLUMN IF NOT EXISTS location text;

-- Add cover bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('organiser-covers', 'organiser-covers', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "Organisers can upload own cover" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'organiser-covers' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view covers" ON storage.objects
FOR SELECT USING (bucket_id = 'organiser-covers');
