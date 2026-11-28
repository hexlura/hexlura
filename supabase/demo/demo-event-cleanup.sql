-- Removes everything created by demo-event-seed.sql. Run by hand in the Supabase SQL editor.
-- bookings / booking_items / checkins / ticket_types are removed by ON DELETE CASCADE from the event.

DO $$
DECLARE
  v_event uuid;
  v_org   uuid;
  v_door  uuid;
BEGIN
  SELECT id, organiser_id INTO v_event, v_org FROM public.events WHERE slug = 'demo-night-hexlura-scanner';
  IF v_event IS NULL THEN RAISE NOTICE 'No demo event found - nothing to remove'; RETURN; END IF;

  SELECT id INTO v_door FROM auth.users WHERE lower(email) = 'scannerview@hexlura.com' LIMIT 1;

  DELETE FROM public.events WHERE id = v_event;
  DELETE FROM public.organiser_team WHERE organiser_id = v_org AND user_id = v_door;

  RAISE NOTICE 'Demo event and door-staff assignment removed';
END $$;
