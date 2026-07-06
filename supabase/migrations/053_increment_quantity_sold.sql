-- The webhook (app/api/webhooks/stripe/route.ts) calls this via supabase.rpc()
-- to atomically record a sale. A version of this function already existed in
-- the live database (untracked in migrations) with a different return type,
-- so it must be dropped before being redefined to return boolean. This does
-- the read-check-write as a single atomic UPDATE: the row lock Postgres takes
-- during the UPDATE serializes concurrent callers, and the WHERE clause
-- rejects the update (0 rows affected) if it would push quantity_sold past
-- quantity_total.
DROP FUNCTION IF EXISTS public.increment_quantity_sold(uuid, integer);

CREATE FUNCTION public.increment_quantity_sold(
  p_ticket_type_id uuid,
  p_quantity integer
)
RETURNS boolean AS $$
DECLARE
  v_updated boolean;
BEGIN
  UPDATE public.ticket_types
  SET quantity_sold = quantity_sold + p_quantity
  WHERE id = p_ticket_type_id
    AND quantity_sold + p_quantity <= quantity_total
  RETURNING true INTO v_updated;

  RETURN COALESCE(v_updated, false);
END;
$$ LANGUAGE plpgsql;
