-- The "Service can update promo codes" policy (002b_checkout_booking.sql) was created with
-- USING (true) and no TO/role restriction and no WITH CHECK, meaning any client holding the
-- public anon key — not just the service role — could update any promo_codes row (discount
-- type/value, max_uses, event scoping, etc) with no ownership check.
--
-- The service-role client (lib/supabase/admin.ts createAdminClient()) is the only legitimate
-- writer to promo_codes.uses_count (lib/process-payment-success.ts, app/api/checkout/confirm/
-- route.ts) and the service role bypasses RLS entirely, so it never needed this policy in the
-- first place. Dropping it removes the open write path with no functional impact.
DROP POLICY IF EXISTS "Service can update promo codes" ON public.promo_codes;
