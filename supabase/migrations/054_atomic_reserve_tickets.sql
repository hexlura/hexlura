-- app/api/reservations/route.ts previously did a check-then-insert per ticket
-- type (SELECT held quantity, compare to capacity, then INSERT) with no lock
-- between the check and the insert, so concurrent requests for the same
-- ticket type could all pass the check before any of them inserted, holding
-- more tickets than actually exist. It also inserted reservations one item at
-- a time, so if a later item in a multi-item request failed, earlier items in
-- the same request were left as orphaned reservations instead of being rolled
-- back.
--
-- This function takes all items for one request and does the whole thing as
-- a single transaction: for each ticket type it takes a row lock with
-- `FOR UPDATE` (serializing concurrent callers on that ticket type), re-reads
-- the currently-held quantity under that lock, and only inserts if there's
-- still room. Any failure raises an exception, which rolls back every
-- reservation already inserted earlier in the same call — all-or-nothing.
-- Items are locked in ticket_type_id order so two requests reserving the same
-- two ticket types in opposite order can't deadlock each other.
CREATE OR REPLACE FUNCTION public.reserve_tickets(
  p_user_id uuid,
  p_session_id text,
  p_expires_at timestamptz,
  p_items jsonb -- [{"ticket_type_id": "...", "quantity": n}, ...]
)
RETURNS TABLE(ticket_type_id uuid, reservation_id uuid) AS $$
DECLARE
  item jsonb;
  v_ticket_type_id uuid;
  v_quantity integer;
  v_total integer;
  v_sold integer;
  v_held integer;
  v_reservation_id uuid;
BEGIN
  FOR item IN
    SELECT value FROM jsonb_array_elements(p_items) AS value
    ORDER BY (value->>'ticket_type_id')
  LOOP
    v_ticket_type_id := (item->>'ticket_type_id')::uuid;
    v_quantity := (item->>'quantity')::integer;

    SELECT quantity_total, quantity_sold INTO v_total, v_sold
    FROM public.ticket_types
    WHERE id = v_ticket_type_id
    FOR UPDATE;

    IF v_total IS NULL THEN
      RAISE EXCEPTION 'TICKET_NOT_FOUND:%', v_ticket_type_id;
    END IF;

    SELECT COALESCE(SUM(quantity), 0) INTO v_held
    FROM public.reservations
    WHERE reservations.ticket_type_id = v_ticket_type_id
      AND status = 'active'
      AND expires_at > now();

    IF v_sold + v_held + v_quantity > v_total THEN
      RAISE EXCEPTION 'SOLD_OUT:%', v_ticket_type_id;
    END IF;

    INSERT INTO public.reservations (ticket_type_id, user_id, quantity, session_id, expires_at, status)
    VALUES (v_ticket_type_id, p_user_id, v_quantity, p_session_id, p_expires_at, 'active')
    RETURNING id INTO v_reservation_id;

    ticket_type_id := v_ticket_type_id;
    reservation_id := v_reservation_id;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Supports the hot-path availability lookups (this function's own SUM query,
-- and the equivalent checks in create-intent/route.ts) which filter on
-- exactly this combination and previously had no covering index.
CREATE INDEX IF NOT EXISTS idx_reservations_ticket_type_active
  ON public.reservations (ticket_type_id, status, expires_at);
