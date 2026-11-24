-- 080: remove leftover open write policies and lock internal functions to the service role.
--
-- 002b_checkout_booking.sql created "Service can ..." policies with USING/WITH CHECK (true) and no
-- role restriction, so they applied to every API caller, not just the service role. 067 dropped the
-- promo_codes one; these four were missed. The service role bypasses RLS, and every app write to
-- these tables already uses it, so nothing depends on them.
--
-- The functions below are only ever called by server code with the service role.
--
-- Already applied to production on 25 Nov 2026. Idempotent.

DROP POLICY IF EXISTS "Service can insert bookings" ON public.bookings;
DROP POLICY IF EXISTS "Service can update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Service can insert booking items" ON public.booking_items;
DROP POLICY IF EXISTS "Service can update ticket types" ON public.ticket_types;

REVOKE EXECUTE ON FUNCTION public.get_middleware_context(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_middleware_context(uuid) TO service_role;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS f
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('increment_quantity_sold', 'reserve_tickets', 'expire_reservations')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.f);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
