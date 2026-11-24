-- 083: one-statement (race-free) counters for promo usage and ticket release.
--
-- Promo uses_count was updated with read-then-write from the app, so two checkouts at the same
-- moment could both read N and both write N+1 (under-counting, and over-use of capped codes).
-- Releasing tickets after a failed payment had the same pattern on quantity_sold.
--
-- Server-only: execute is revoked from client roles. Idempotent.

-- Increment a promo's usage. With p_enforce_cap, refuses (returns false) once max_uses is reached —
-- used where no money has been taken yet (free bookings). Paid bookings pass false: the payment has
-- already succeeded, so the use is always recorded.
CREATE OR REPLACE FUNCTION public.redeem_promo_code(p_promo_id uuid, p_enforce_cap boolean DEFAULT true)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_ok boolean;
BEGIN
  UPDATE public.promo_codes
  SET uses_count = uses_count + 1
  WHERE id = p_promo_id
    AND (NOT p_enforce_cap OR max_uses IS NULL OR uses_count < max_uses)
  RETURNING true INTO v_ok;
  RETURN COALESCE(v_ok, false);
END;
$$;

-- Undo one use (a free booking that failed after the promo was redeemed).
CREATE OR REPLACE FUNCTION public.unredeem_promo_code(p_promo_id uuid)
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
  UPDATE public.promo_codes SET uses_count = GREATEST(uses_count - 1, 0) WHERE id = p_promo_id;
$$;

-- Give tickets back to stock (failed payment, failed free booking).
CREATE OR REPLACE FUNCTION public.release_quantity_sold(p_ticket_type_id uuid, p_quantity integer)
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
  UPDATE public.ticket_types
  SET quantity_sold = GREATEST(quantity_sold - p_quantity, 0)
  WHERE id = p_ticket_type_id;
$$;

-- The existing stock increment had no fixed search_path (Supabase advisor warning).
ALTER FUNCTION public.increment_quantity_sold(uuid, integer) SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.redeem_promo_code(uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.unredeem_promo_code(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_quantity_sold(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_promo_code(uuid, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.unredeem_promo_code(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_quantity_sold(uuid, integer) TO service_role;

NOTIFY pgrst, 'reload schema';
