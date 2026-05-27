-- Migration 022: Split booking_items with quantity > 1 into individual rows
-- Each person gets their own row with quantity=1 and a unique qr_code (UUID).
-- This enables per-person QR check-in on the door.
--
-- SAFETY NOTES:
--   • Wrapped in a transaction — rolls back entirely if anything fails.
--   • The original row KEEPS its id and qr_code, so any existing checkin rows
--     still point correctly to the first person.
--   • New rows get fresh gen_random_uuid() values — no conflict with the
--     UNIQUE constraint on booking_items.qr_code.
--   • Only affects rows where quantity > 1 AND ticket_type is NOT a group ticket
--     (is_group = true rows are handled differently and must NOT be split).
--   • Safe to run more than once — the WHERE quantity > 1 guard means already-
--     split rows are skipped automatically.

BEGIN;

DO $$
DECLARE
    item RECORD;
    i    INTEGER;
BEGIN
    FOR item IN
        SELECT
            bi.id,
            bi.booking_id,
            bi.ticket_type_id,
            bi.unit_price_pence,
            bi.attendee_name,
            bi.attendee_email,
            bi.quantity
        FROM public.booking_items bi
        LEFT JOIN public.ticket_types tt ON tt.id = bi.ticket_type_id
        WHERE bi.quantity > 1
          AND (tt.is_group IS NULL OR tt.is_group = false)
        FOR UPDATE OF bi
    LOOP
        -- Insert (quantity - 1) new rows — each represents the 2nd, 3rd… person
        FOR i IN 2..item.quantity LOOP
            INSERT INTO public.booking_items (
                booking_id,
                ticket_type_id,
                quantity,
                unit_price_pence,
                attendee_name,
                attendee_email,
                qr_code
            ) VALUES (
                item.booking_id,
                item.ticket_type_id,
                1,
                item.unit_price_pence,
                item.attendee_name,
                item.attendee_email,
                gen_random_uuid()::text
            );
        END LOOP;

        -- Reduce the original row to quantity = 1
        -- Its qr_code and id are preserved — existing checkin rows still valid
        UPDATE public.booking_items
        SET quantity = 1
        WHERE id = item.id;

    END LOOP;
END $$;

COMMIT;
