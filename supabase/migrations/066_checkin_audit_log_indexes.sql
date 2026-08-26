-- Migration: 066_checkin_audit_log_indexes
-- Description: checkins and audit_logs had no indexes beyond their primary
-- key. checkins.booking_item_id is looked up on every door-staff ticket scan
-- (app/api/checkin/route.ts, checkin/lookup, checkin/attendees) and
-- audit_logs is filtered/sorted by created_at, actor_id and action on every
-- admin audit-log page view and CSV export. Both were forcing sequential
-- scans that grow with table size, contributing to sustained disk I/O.
-- Purely additive — safe to run on the live database.

CREATE INDEX IF NOT EXISTS idx_checkins_booking_item_id
  ON public.checkins(booking_item_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON public.audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id
  ON public.audit_logs(actor_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON public.audit_logs(action);
