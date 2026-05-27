CREATE TABLE IF NOT EXISTS public.cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  image_url text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active cities" ON public.cities
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admin can manage cities" ON public.cities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Pre-populate with 10 cities
INSERT INTO public.cities (name, slug, image_url, display_order, is_active) VALUES
('London', 'london', 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=400&fit=crop&q=80', 1, true),
('Manchester', 'manchester', 'https://images.unsplash.com/photo-1520763185298-1b434c919102?w=400&h=400&fit=crop&q=80', 2, true),
('Birmingham', 'birmingham', 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=400&h=400&fit=crop&q=80', 3, true),
('Edinburgh', 'edinburgh', 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=400&h=400&fit=crop&q=80', 4, true),
('Liverpool', 'liverpool', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop&q=80', 5, true),
('Bristol', 'bristol', 'https://images.unsplash.com/photo-1586348943529-beaae6c28db9?w=400&h=400&fit=crop&q=80', 6, true),
('Cardiff', 'cardiff', 'https://images.unsplash.com/photo-1568475284670-6556b20e5aa5?w=400&h=400&fit=crop&q=80', 7, true),
('Leeds', 'leeds', 'https://images.unsplash.com/photo-1600247354058-c2a7a4c8e6b1?w=400&h=400&fit=crop&q=80', 8, true),
('Glasgow', 'glasgow', 'https://images.unsplash.com/photo-1567197427278-4b0a5d2b2b2e?w=400&h=400&fit=crop&q=80', 9, true),
('Newcastle', 'newcastle', 'https://images.unsplash.com/photo-1590736969596-1d93c6be2d3c?w=400&h=400&fit=crop&q=80', 10, true)
ON CONFLICT (slug) DO NOTHING;

-- Storage bucket for city images
INSERT INTO storage.buckets (id, name, public)
VALUES ('city-images', 'city-images', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "Admin can upload city images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'city-images' AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Anyone can view city images" ON storage.objects
FOR SELECT USING (bucket_id = 'city-images');
