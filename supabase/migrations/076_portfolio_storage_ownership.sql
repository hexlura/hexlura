-- Portfolio photos live at  organiser-portfolio/<organiser_profiles.id>/<timestamp>.<ext>
-- The old policies only checked "logged in", so any user could upload into, overwrite or delete
-- any organiser's photos. Tie every write to the folder's owner (admins keep full access).

DROP POLICY IF EXISTS "Organisers can upload portfolio photos" ON storage.objects;
DROP POLICY IF EXISTS "Organisers can delete own portfolio photos" ON storage.objects;
DROP POLICY IF EXISTS "Organisers can update own portfolio photos" ON storage.objects;

CREATE POLICY "Organisers can upload portfolio photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'organiser-portfolio' AND (
    (storage.foldername(name))[1] IN (SELECT id::text FROM public.organiser_profiles WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
);

CREATE POLICY "Organisers can update own portfolio photos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'organiser-portfolio' AND (
    (storage.foldername(name))[1] IN (SELECT id::text FROM public.organiser_profiles WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
);

CREATE POLICY "Organisers can delete own portfolio photos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'organiser-portfolio' AND (
    (storage.foldername(name))[1] IN (SELECT id::text FROM public.organiser_profiles WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
);

-- Public SELECT policy ("Anyone can view portfolio photos") is unchanged.
