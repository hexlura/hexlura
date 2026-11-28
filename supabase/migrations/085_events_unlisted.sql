-- 085: unlisted events. APPLY THIS BEFORE the app deploy that reads `events.is_unlisted`.
--
-- An unlisted event is published and fully usable (direct link, checkout, door-scanner app) but is
-- left out of every public listing (homepage, browse/search, organiser page, city counts,
-- recommendations) and gets a noindex robots tag on its own page. Used for demo / App Store review
-- events. Admin-only: clients (anon/authenticated) can neither set nor change it.
--
-- Server routes use the service role and are unaffected. Idempotent.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_unlisted boolean NOT NULL DEFAULT false;

-- ── Clients must never change it (same guard pattern as is_featured, migration 081) ──────────
DROP TRIGGER IF EXISTS protect_event_columns ON public.events;
CREATE TRIGGER protect_event_columns
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_protected_column_changes(
    'organiser_id', 'is_featured', 'featured_order', 'created_at',
    'published_email_sent_at', 'reminder_sent_at', 'followers_notified_at',
    'is_unlisted'
  );

-- ── ...and new client-created events always start listed ─────────────────────────────────────
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
    -- New events never start featured, unlisted or with send stamps.
    NEW.is_featured := false;
    NEW.featured_order := 0;
    NEW.is_unlisted := false;
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

-- Make the new column visible to the API straight away (PostgREST schema cache).
NOTIFY pgrst, 'reload schema';
