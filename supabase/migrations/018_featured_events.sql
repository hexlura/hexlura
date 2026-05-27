ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;

ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS featured_order integer DEFAULT 0;
