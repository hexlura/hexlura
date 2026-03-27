-- Migration: 014_profile_fields
-- Description: Add extended profile fields and avatars storage bucket

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS date_of_birth date;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS gender text;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS address_line1 text;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS city text;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS postcode text;

-- Storage bucket for user avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "Users can upload own avatar" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');
