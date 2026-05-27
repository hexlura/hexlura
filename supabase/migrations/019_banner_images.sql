-- Add banner_images array column to events table
-- Stores up to 4 image URLs; banner_url remains as the primary/first image for backwards compat
ALTER TABLE public.events
    ADD COLUMN IF NOT EXISTS banner_images text[] DEFAULT '{}';
