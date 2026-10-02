-- Migration: 075_email_list_description
-- Optional description for organiser email lists (shown in the "New List" form).
-- Additive and nullable: existing rows and code that does not write it are unaffected.

ALTER TABLE public.organiser_email_lists
  ADD COLUMN IF NOT EXISTS description text;

-- Refresh PostgREST's schema cache so the API sees the new column immediately
NOTIFY pgrst, 'reload schema';
