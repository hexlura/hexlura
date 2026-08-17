-- Page section visibility controls: lets admins show/hide named sections of
-- public pages (starting with home/upcoming_events) without a code deploy.
-- Rows are (page_key, section_key) config, never executable content.

CREATE TABLE IF NOT EXISTS public.page_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text NOT NULL,
  section_key text NOT NULL,
  display_name text NOT NULL,
  is_visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id),
  CONSTRAINT page_controls_page_key_format CHECK (page_key ~ '^[a-z][a-z0-9_]*$'),
  CONSTRAINT page_controls_section_key_format CHECK (section_key ~ '^[a-z][a-z0-9_]*$'),
  CONSTRAINT page_controls_display_name_length CHECK (char_length(display_name) BETWEEN 1 AND 100),
  CONSTRAINT page_controls_unique_section UNIQUE (page_key, section_key)
);

-- Primary lookup pattern is "all sections for a page" (one query per page
-- render); the unique constraint above already covers exact-row lookups.
CREATE INDEX IF NOT EXISTS idx_page_controls_page_key ON public.page_controls(page_key);

CREATE OR REPLACE FUNCTION public.page_controls_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS page_controls_set_updated_at ON public.page_controls;
CREATE TRIGGER page_controls_set_updated_at
  BEFORE UPDATE ON public.page_controls
  FOR EACH ROW EXECUTE FUNCTION public.page_controls_touch_updated_at();

ALTER TABLE public.page_controls ENABLE ROW LEVEL SECURITY;

-- Public/application read: the homepage renders for anonymous visitors and
-- must be able to resolve section visibility server-side before rendering.
-- The table only ever holds non-sensitive display configuration (page_key,
-- section_key, display_name, is_visible, sort_order), so unauthenticated
-- SELECT is safe and matches Option A from the design review.
CREATE POLICY "Anyone can read page_controls"
  ON public.page_controls FOR SELECT
  TO anon, authenticated
  USING (true);

-- Admin mutation: independent DB-level enforcement so a direct
-- Supabase REST/PostgREST call (bypassing the Next.js admin UI and
-- app-level role check) is still rejected for non-admins. Mirrors the
-- existing platform_settings admin policies.
CREATE POLICY "Admins can insert page_controls"
  ON public.page_controls FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update page_controls"
  ON public.page_controls FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete page_controls"
  ON public.page_controls FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Seed the first controlled section. Idempotent via the unique constraint
-- so re-running this migration never duplicates or resets an admin's choice.
INSERT INTO public.page_controls (page_key, section_key, display_name, is_visible, sort_order)
VALUES ('home', 'upcoming_events', 'Upcoming Events', true, 10)
ON CONFLICT (page_key, section_key) DO NOTHING;
