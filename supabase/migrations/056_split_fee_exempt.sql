-- Splits the single fee_exempt flag (055_organiser_fee_exempt.sql) into two
-- independent flags, and lifts the Stripe Connect requirement so bank-transfer
-- organisers can be waived too. See app/api/checkout/create-intent/route.ts —
-- the Connect on_behalf_of shift only applies when both are waived there.
ALTER TABLE public.organiser_profiles
  ADD COLUMN booking_fee_exempt boolean NOT NULL DEFAULT false,
  ADD COLUMN processing_fee_exempt boolean NOT NULL DEFAULT false;

UPDATE public.organiser_profiles
SET booking_fee_exempt = fee_exempt,
    processing_fee_exempt = fee_exempt
WHERE fee_exempt = true;

ALTER TABLE public.organiser_profiles DROP COLUMN fee_exempt;

DROP TRIGGER IF EXISTS protect_fee_exempt_trigger ON public.organiser_profiles;
DROP FUNCTION IF EXISTS public.protect_fee_exempt();

-- Same self-toggle protection as before, now guarding both columns: revenue-
-- controlling flags must never be settable by the organiser's own session,
-- even though the existing self-update RLS policy is row-level (not
-- column-level). Admin writes go through the service-role client, where
-- auth.uid() is null, so they pass through untouched.
CREATE OR REPLACE FUNCTION public.protect_fee_exemptions()
RETURNS trigger AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() = OLD.user_id THEN
    IF NEW.booking_fee_exempt IS DISTINCT FROM OLD.booking_fee_exempt THEN
      NEW.booking_fee_exempt := OLD.booking_fee_exempt;
    END IF;
    IF NEW.processing_fee_exempt IS DISTINCT FROM OLD.processing_fee_exempt THEN
      NEW.processing_fee_exempt := OLD.processing_fee_exempt;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER protect_fee_exemptions_trigger
  BEFORE UPDATE ON public.organiser_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_fee_exemptions();
