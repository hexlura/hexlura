-- Fix cover upload RLS: use auth.uid() for folder path (was using organiser.id which differs)
DROP POLICY IF EXISTS "Organisers can upload own cover" ON storage.objects;
CREATE POLICY "Organisers can upload own cover" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'organiser-covers' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow organisers to overwrite their own cover (upsert)
CREATE POLICY "Organisers can update own cover" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'organiser-covers' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create missing organiser-logos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('organiser-logos', 'organiser-logos', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "Organisers can upload own logo" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'organiser-logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Organisers can update own logo" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'organiser-logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view logos" ON storage.objects
FOR SELECT USING (bucket_id = 'organiser-logos');
