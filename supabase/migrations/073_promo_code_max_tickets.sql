-- Cap how many individual tickets a promo code discounts within a single order.
--
-- max_uses and max_uses_per_customer both count ORDERS, not tickets: one booking
-- increments uses_count by 1 no matter how many tickets it contains. An organiser
-- who set "max uses 8" on a 100%-off code expecting 8 free tickets instead allowed
-- 8 unlimited-size free orders. max_discount_pence could bound that in money, but
-- only if the organiser worked out the arithmetic against the ticket price by hand.
--
-- NULL (the default, and the value every existing row gets) keeps today's
-- behaviour: the code applies to every eligible ticket in the order.
ALTER TABLE promo_codes
    ADD COLUMN IF NOT EXISTS max_tickets integer;

ALTER TABLE promo_codes
    ADD CONSTRAINT promo_codes_max_tickets_positive
    CHECK (max_tickets IS NULL OR max_tickets > 0);

COMMENT ON COLUMN promo_codes.max_tickets IS
    'Max individual tickets this code discounts in one order. NULL = no limit. '
    'Distinct from max_uses, which counts orders.';

-- DDL applied outside the CLI migration flow leaves PostgREST''s schema cache
-- stale, so the new column is invisible to the API layer until it reloads.
NOTIFY pgrst, 'reload schema';
