-- Bank details decide where payouts are sent, so they must only change through the server routes
-- (/api/organiser/bank-details and /api/admin/organisers/[id]/bank-details), which validate the
-- input, write an audit log entry, email the organiser and warn admins.
--
-- Until now an organiser's browser could write these columns straight to the database (the RLS
-- policy lets an organiser update their own row), bypassing all of that. Same pattern as
-- protect_fee_exemptions(): when the writer is the logged-in organiser themselves, any change to
-- a bank column is silently reverted. Server routes use the service role, where auth.uid() is
-- NULL, so they are unaffected.
--
-- Apply AFTER the app version that uses the new routes is deployed — the old Settings form writes
-- these columns directly, and would stop saving them once this is in place.

CREATE OR REPLACE FUNCTION public.protect_bank_details()
RETURNS trigger AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() = OLD.user_id THEN
    IF NEW.bank_account_name IS DISTINCT FROM OLD.bank_account_name THEN
      NEW.bank_account_name := OLD.bank_account_name;
    END IF;
    IF NEW.bank_sort_code IS DISTINCT FROM OLD.bank_sort_code THEN
      NEW.bank_sort_code := OLD.bank_sort_code;
    END IF;
    IF NEW.bank_account_number IS DISTINCT FROM OLD.bank_account_number THEN
      NEW.bank_account_number := OLD.bank_account_number;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS protect_bank_details_trigger ON public.organiser_profiles;
CREATE TRIGGER protect_bank_details_trigger
  BEFORE UPDATE ON public.organiser_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_bank_details();

NOTIFY pgrst, 'reload schema';
