ALTER TABLE public.organiser_profiles
  ADD COLUMN fee_exempt boolean NOT NULL DEFAULT false;

-- fee_exempt controls platform revenue directly, so unlike other self-editable
-- organiser_profiles columns it must never be settable by the organiser's own
-- session, even though the existing self-update RLS policy is row-level (not
-- column-level). Admin writes go through the service-role client, where
-- auth.uid() is null, so they pass through untouched.
CREATE OR REPLACE FUNCTION public.protect_fee_exempt()
RETURNS trigger AS $$
BEGIN
  IF NEW.fee_exempt IS DISTINCT FROM OLD.fee_exempt
     AND auth.uid() IS NOT NULL
     AND auth.uid() = OLD.user_id THEN
    NEW.fee_exempt := OLD.fee_exempt;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER protect_fee_exempt_trigger
  BEFORE UPDATE ON public.organiser_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_fee_exempt();
