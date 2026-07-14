-- Migration: 059_legal_documents
-- Description: Admin-editable legal pages (terms / privacy / cookies) with
--   append-only versioning. Every publish INSERTS a new row — nothing is ever
--   updated or deleted — so the platform can always prove exactly what any
--   version of the terms said on any date (this is what gives
--   organiser_profiles.terms_version its evidential value).
--
--   Reads: public pages render the latest row per doc_type. A permissive
--   SELECT policy (plus service-client reads in the server pages) guarantees
--   RLS can never blank these public documents.
--   Writes: only via /api/admin/legal using the service-role client; no
--   INSERT/UPDATE/DELETE policies exist on purpose.

CREATE TABLE IF NOT EXISTS public.legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type text NOT NULL CHECK (doc_type IN ('terms', 'privacy', 'cookies')),
  content_html text NOT NULL,
  version text NOT NULL,
  published_by uuid REFERENCES public.profiles(id),
  published_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (doc_type, version)
);

CREATE INDEX IF NOT EXISTS idx_legal_documents_type_published
  ON public.legal_documents (doc_type, published_at DESC);

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

-- Legal documents are public by definition — anyone may read any version.
CREATE POLICY "Anyone can read legal documents" ON public.legal_documents
  FOR SELECT USING (true);
