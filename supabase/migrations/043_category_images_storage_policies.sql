-- Add missing UPDATE and DELETE storage policies for category-images bucket.
-- INSERT and SELECT were added in 031_categories.sql but upsert (UPDATE)
-- and file cleanup (DELETE) were omitted.

CREATE POLICY "Admin can update category images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'category-images' AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin can delete category images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'category-images' AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
