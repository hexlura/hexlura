-- 078: close the self-promotion hole found on 24 Nov 2026.
--
-- What happened: the profiles policy "Users can update own profile" is row-level only
-- (001_initial_schema.sql). Anyone can mint a Supabase *anonymous* session with the public anon key,
-- PATCH their own profiles row to role = 'admin', and then pass every /api/admin/* check.
--
-- This migration makes the sensitive columns un-writable from the public API (roles `anon` and
-- `authenticated`). The service role (server routes), SECURITY DEFINER functions and the SQL editor
-- run as other roles (service_role / postgres) and are unaffected.
--
-- ORDER OF APPLYING (important):
--   1. Deploy the app version that contains /api/organiser/apply and the lib/audit.ts change.
--   2. Then run this migration.
-- The old organiser apply form wrote organiser_profiles + profiles.role from the browser, and
-- lib/audit.ts wrote audit_logs with the anon client; both stop working once this is applied.
--
-- Idempotent: safe to run more than once. It replaces the hot-fix trigger `protect_profile_role`
-- that was applied directly in the dashboard on 24 Nov.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Generic guard: reject client changes to protected columns
-- ─────────────────────────────────────────────────────────────────────────────
-- Deliberately NOT security definer, so current_user is the role PostgREST switched to
-- ('anon' / 'authenticated' for API calls). Compares via jsonb so a column that does not exist
-- yet compares NULL = NULL and is ignored rather than erroring.
CREATE OR REPLACE FUNCTION public.reject_protected_column_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  col text;
  new_row jsonb := to_jsonb(NEW);
  old_row jsonb := to_jsonb(OLD);
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    FOREACH col IN ARRAY TG_ARGV LOOP
      IF new_row -> col IS DISTINCT FROM old_row -> col THEN
        RAISE EXCEPTION 'column "%" cannot be changed from the client', col
          USING ERRCODE = '42501';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. profiles — role, trust flags, balances
-- ─────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS protect_profile_role ON public.profiles;
DROP FUNCTION IF EXISTS public.protect_profile_role();

DROP TRIGGER IF EXISTS protect_profile_columns ON public.profiles;
CREATE TRIGGER protect_profile_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_protected_column_changes(
    'role', 'is_verified', 'credit_balance', 'referral_code', 'referred_by', 'is_suspended'
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. organiser_profiles — approval, suspension, payout routing, identity verification
--    (fee-exempt flags and bank columns are already guarded by migrations 056 and 077)
-- ─────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS protect_organiser_columns ON public.organiser_profiles;
CREATE TRIGGER protect_organiser_columns
  BEFORE UPDATE ON public.organiser_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_protected_column_changes(
    'user_id', 'is_approved', 'approved_at', 'approved_by', 'is_suspended',
    'stripe_account_id', 'stripe_connect_allowed', 'payout_method',
    'identity_status', 'identity_session_id', 'identity_verified_at',
    'identity_last_attempt_at', 'identity_failure_reason'
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. promoter_profiles — a suspended promoter must not be able to reinstate themselves
--    (promoter bank columns still need a server route like 077 did for organisers — not done here)
-- ─────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS protect_promoter_columns ON public.promoter_profiles;
CREATE TRIGGER protect_promoter_columns
  BEFORE UPDATE ON public.promoter_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_protected_column_changes('user_id', 'status');

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. organiser_profiles INSERT — organisers are now created by /api/organiser/apply (service role).
--    The old browser flow inserted its own row with is_approved = true. Drop every INSERT-only
--    policy so a client can no longer self-create an approved organiser. (FOR ALL admin policies
--    are untouched.)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT polname FROM pg_policy
    WHERE polrelid = 'public.organiser_profiles'::regclass AND polcmd = 'a'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.organiser_profiles', r.polname);
    RAISE NOTICE 'dropped INSERT policy "%" on organiser_profiles', r.polname;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. audit_logs — anyone could insert fake rows (WITH CHECK (true), no role limit).
--    All writers now use the service role, which bypasses RLS, so no INSERT policy is needed.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

NOTIFY pgrst, 'reload schema';
