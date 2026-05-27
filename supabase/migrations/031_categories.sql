CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  image_url text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active categories" ON public.categories
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admin can manage categories" ON public.categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Pre-populate with the 12 existing home-page categories.
-- Names match lib/config/categories.ts exactly so events.category text values
-- continue to link correctly.
INSERT INTO public.categories (name, slug, image_url, display_order, is_active) VALUES
('Club Nights',           'club-nights',           NULL, 1,  true),
('Gigs & Live Music',     'gigs-live-music',       NULL, 2,  true),
('Festivals',             'festivals',             NULL, 3,  true),
('Comedy',                'comedy',                NULL, 4,  true),
('Theatre & Arts',        'theatre-arts',          NULL, 5,  true),
('Sports & Fitness',      'sports-fitness',        NULL, 6,  true),
('Food & Drink',          'food-drink',            NULL, 7,  true),
('Family & Kids',         'family-kids',           NULL, 8,  true),
('Business & Networking', 'business-networking',   NULL, 9,  true),
('Classes & Workshops',   'classes-workshops',     NULL, 10, true),
('Dating & Social',       'dating-social',         NULL, 11, true),
('Culture & Heritage',    'culture-heritage',      NULL, 12, true)
ON CONFLICT (slug) DO NOTHING;

-- Storage bucket for category images
INSERT INTO storage.buckets (id, name, public)
VALUES ('category-images', 'category-images', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "Admin can upload category images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'category-images' AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Anyone can view category images" ON storage.objects
FOR SELECT USING (bucket_id = 'category-images');
