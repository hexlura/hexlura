-- 081: events column guard + storage upload limits. Safe to apply before or after the app deploy.
--
-- 1. events: organisers write their events straight from the browser and the UPDATE policy is
--    row-level, so they could also set admin-only fields (homepage featuring, send-tracking stamps)
--    and re-publish an event an admin archived/cancelled/deleted.
-- 2. storage: most public buckets accepted any file type and size, and any session — including a
--    guest session — could upload to event-banners / organiser-logos. Probe uploads of HTML/SVG
--    from guest sessions were seen on 23 Nov 2026.
--
-- Server routes use the service role and are unaffected. Idempotent.

-- ── 1a. Columns a client must never change ───────────────────────────────────
DROP TRIGGER IF EXISTS protect_event_columns ON public.events;
CREATE TRIGGER protect_event_columns
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_protected_column_changes(
    'organiser_id', 'is_featured', 'featured_order', 'created_at',
    'published_email_sent_at', 'reminder_sent_at', 'followers_notified_at'
  );

-- ── 1b. Status: clients may only draft/publish, never undo an admin decision ─
CREATE OR REPLACE FUNCTION public.guard_event_client_writes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'draft' AND NEW.status IS DISTINCT FROM 'published' THEN
      RAISE EXCEPTION 'events.status "%" cannot be set from the client', NEW.status USING ERRCODE = '42501';
    END IF;
    -- New events never start featured or with send stamps.
    NEW.is_featured := false;
    NEW.featured_order := 0;
    NEW.published_email_sent_at := NULL;
    NEW.reminder_sent_at := NULL;
    NEW.followers_notified_at := NULL;
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status IN ('archived', 'cancelled', 'deleted') THEN
      RAISE EXCEPTION 'this event was % by Hexlura and cannot be changed', OLD.status USING ERRCODE = '42501';
    END IF;
    IF NEW.status NOT IN ('draft', 'published') THEN
      RAISE EXCEPTION 'events.status "%" cannot be set from the client', NEW.status USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_event_client_writes ON public.events;
CREATE TRIGGER guard_event_client_writes
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_event_client_writes();

-- ── 2a. Bucket file-type and size limits (the app only uploads jpeg/png/webp) ─
UPDATE storage.buckets SET allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp'], file_size_limit = 5242880
  WHERE id IN ('avatars', 'organiser-logos');            -- 5 MB; logos no longer accept SVG
UPDATE storage.buckets SET allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp'], file_size_limit = 10485760
  WHERE id IN ('event-banners', 'organiser-covers', 'organiser-portfolio', 'city-images', 'category-images', 'trust-partners'); -- 10 MB
UPDATE storage.buckets SET allowed_mime_types = ARRAY['application/pdf'], file_size_limit = 20971520
  WHERE id = 'terms-and-guidelines';                     -- 20 MB

-- ── 2b. Only organisers (or admins) may upload banners and logos ─────────────
DROP POLICY IF EXISTS "Auth users upload event banners" ON storage.objects;
CREATE POLICY "Organisers upload event banners" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'event-banners'
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('organiser', 'admin'))
  );

DROP POLICY IF EXISTS "Auth users upload organiser logos" ON storage.objects;
-- "Organisers can upload own logo" (024) already allows uploads into the uploader's own folder;
-- add the role requirement there too.
DROP POLICY IF EXISTS "Organisers can upload own logo" ON storage.objects;
CREATE POLICY "Organisers can upload own logo" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'organiser-logos'
    AND (auth.uid())::text = (storage.foldername(name))[1]
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('organiser', 'admin'))
  );

DROP POLICY IF EXISTS "Organisers can upload own cover" ON storage.objects;
CREATE POLICY "Organisers can upload own cover" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'organiser-covers'
    AND (auth.uid())::text = (storage.foldername(name))[1]
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('organiser', 'admin'))
  );

NOTIFY pgrst, 'reload schema';
