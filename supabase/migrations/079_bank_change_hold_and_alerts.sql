-- 079: payout fraud protection, part 2 (follows 078).
--
--  1. bank_details_changed_at on organiser_profiles and promoter_profiles, stamped by a trigger whenever a
--     bank column changes — by ANY path (server route, SQL editor, anything). The app uses it to hold
--     bank-transfer payouts for 7 days after a change and to withhold the new details from the admin
--     payouts screen during that time. A trigger cannot be skipped by a route that forgets to log.
--  2. Promoter bank columns, payout method, Stripe account and referral code can no longer be changed
--     from the public API (organisers got the same protection in 077). Promoters now save bank details
--     through /api/promoter/settings, which validates, audit-logs and emails.
--  3. Every change to profiles.role is written to audit_logs, and when someone is made an admin every
--     other admin gets an in-app alert.
--
-- ORDER OF APPLYING: deploy the app version that contains this change first, then run this file.
-- Idempotent: safe to run more than once.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. bank_details_changed_at
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.organiser_profiles ADD COLUMN IF NOT EXISTS bank_details_changed_at timestamptz;
ALTER TABLE public.promoter_profiles  ADD COLUMN IF NOT EXISTS bank_details_changed_at timestamptz;

CREATE OR REPLACE FUNCTION public.stamp_bank_details_changed()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.bank_account_name   IS DISTINCT FROM OLD.bank_account_name
  OR NEW.bank_sort_code      IS DISTINCT FROM OLD.bank_sort_code
  OR NEW.bank_account_number IS DISTINCT FROM OLD.bank_account_number THEN
    NEW.bank_details_changed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

-- Named so it sorts AFTER protect_bank_details_trigger (077): that one silently reverts an organiser's own
-- direct edits first, so a reverted attempt does not start a hold.
DROP TRIGGER IF EXISTS stamp_bank_details_changed_trigger ON public.organiser_profiles;
CREATE TRIGGER stamp_bank_details_changed_trigger
  BEFORE UPDATE ON public.organiser_profiles
  FOR EACH ROW EXECUTE FUNCTION public.stamp_bank_details_changed();

DROP TRIGGER IF EXISTS stamp_bank_details_changed_trigger ON public.promoter_profiles;
CREATE TRIGGER stamp_bank_details_changed_trigger
  BEFORE UPDATE ON public.promoter_profiles
  FOR EACH ROW EXECUTE FUNCTION public.stamp_bank_details_changed();

-- Backfill from the audit log so recent changes (including the 24 Nov 2026 incident) are covered at once.
UPDATE public.organiser_profiles o
SET bank_details_changed_at = l.last_change
FROM (
  SELECT entity_id::text AS entity_id, max(created_at) AS last_change
  FROM public.audit_logs
  WHERE action = 'update_bank_details' AND entity_type = 'organiser'
  GROUP BY entity_id
) l
WHERE l.entity_id = o.id::text AND o.bank_details_changed_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Column guards (replaces the 078 lists; same function)
-- ─────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS protect_organiser_columns ON public.organiser_profiles;
CREATE TRIGGER protect_organiser_columns
  BEFORE UPDATE ON public.organiser_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_protected_column_changes(
    'user_id', 'is_approved', 'approved_at', 'approved_by', 'is_suspended',
    'stripe_account_id', 'stripe_connect_allowed', 'payout_method',
    'identity_status', 'identity_session_id', 'identity_verified_at',
    'identity_last_attempt_at', 'identity_failure_reason',
    'bank_details_changed_at'
  );

DROP TRIGGER IF EXISTS protect_promoter_columns ON public.promoter_profiles;
CREATE TRIGGER protect_promoter_columns
  BEFORE UPDATE ON public.promoter_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_protected_column_changes(
    'user_id', 'status', 'referral_code', 'payout_method', 'stripe_account_id',
    'bank_account_name', 'bank_account_number', 'bank_sort_code',
    'bank_details_changed_at'
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Audit + alert on role changes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.audit_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
    VALUES (
      auth.uid(), 'role_changed', 'user', NEW.id,
      jsonb_build_object('from', OLD.role, 'to', NEW.role, 'db_user', session_user)
    );

    IF NEW.role = 'admin' THEN
      INSERT INTO public.notifications (user_id, type, title, body, link)
      SELECT p.id, 'security_alert', 'New administrator account',
             'An account was given the admin role (user id ' || NEW.id::text || '). If this was not you or a colleague, remove the role and rotate credentials.',
             '/admin/users'
      FROM public.profiles p
      WHERE p.role = 'admin' AND p.id <> NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_profile_role_change ON public.profiles;
CREATE TRIGGER audit_profile_role_change
  AFTER UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_profile_role_change();

NOTIFY pgrst, 'reload schema';
