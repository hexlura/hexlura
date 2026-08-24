-- Tracks previous slugs so old event URLs (shared publicly before an organiser
-- changed the slug) can be redirected to the event's current URL instead of 404ing.
CREATE TABLE IF NOT EXISTS public.event_slug_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    old_slug text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_event_slug_history_old_slug ON public.event_slug_history (old_slug);
CREATE INDEX IF NOT EXISTS idx_event_slug_history_event_id ON public.event_slug_history (event_id);

ALTER TABLE public.event_slug_history ENABLE ROW LEVEL SECURITY;

-- Same visibility as the public event-detail lookup: anyone can resolve an old
-- slug to redirect them, since the event itself is publicly readable content.
CREATE POLICY "Anyone can read event_slug_history"
    ON public.event_slug_history FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE OR REPLACE FUNCTION public.record_event_slug_change()
RETURNS trigger AS $$
BEGIN
    IF NEW.slug IS DISTINCT FROM OLD.slug THEN
        INSERT INTO public.event_slug_history (event_id, old_slug)
        VALUES (OLD.id, OLD.slug)
        ON CONFLICT (old_slug) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_record_event_slug_change ON public.events;
CREATE TRIGGER trg_record_event_slug_change
    AFTER UPDATE ON public.events
    FOR EACH ROW
    EXECUTE FUNCTION public.record_event_slug_change();
