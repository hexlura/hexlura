-- 082: promo codes are no longer readable by everyone.
--
-- "Public can validate promo codes" (068) was SELECT USING (true), so anyone with the public anon
-- key could list every code with its discount and limits. Checkout and /api/promo/validate now
-- look codes up with the service role (lib/promo-lookup.ts), so nothing needs public read.
-- Organisers keep "Organisers can view own promo codes"; admins keep their FOR ALL policy.
--
-- APPLY ONLY AFTER the app version containing lib/promo-lookup.ts is live — the old code read
-- promo_codes with the anon client, so promo codes would stop applying at checkout.

DROP POLICY IF EXISTS "Public can validate promo codes" ON public.promo_codes;

NOTIFY pgrst, 'reload schema';
