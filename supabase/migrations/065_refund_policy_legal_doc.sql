-- Migration: 065_refund_policy_legal_doc
-- Description: Adds 'refund' as a valid legal_documents doc_type, so the
-- platform-wide Refund Policy page (linked from checkout, previously 404ing
-- since no such page/type existed) can be managed the same way as
-- terms/privacy/cookies.

ALTER TABLE public.legal_documents
  DROP CONSTRAINT IF EXISTS legal_documents_doc_type_check;
ALTER TABLE public.legal_documents
  ADD CONSTRAINT legal_documents_doc_type_check
  CHECK (doc_type IN ('terms', 'privacy', 'cookies', 'refund'));
