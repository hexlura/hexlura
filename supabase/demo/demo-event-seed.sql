-- Demo event for App Store screenshots + App Review. NOT a migration - run by hand in the
-- Supabase SQL editor, AFTER migration 085 (events.is_unlisted) has been applied.
--
--   * Organiser:  "north axis" (demo organiser, no followers)
--   * Event:      "Demo Night" - published but UNLISTED (hidden from homepage/browse/search),
--                 dated 26 Jun 2027 so it stays visible in the scanner app long after review.
--   * Tickets:    FREE (GBP 0) so there is no revenue, no fees and nothing for the payout
--                 generator to pay out. Bookings are guest-style (user_id NULL) with fictional
--                 attendee names - no auth users are created.
--   * Door staff: scannerview@hexlura.com is assigned as active door staff for north axis.
--
-- Everything runs in ONE transaction: if anything fails, nothing is written.
-- Re-running is refused while the demo event exists. To remove everything: demo-event-cleanup.sql

DO $$
DECLARE
  v_org     uuid;
  v_door    uuid;
  v_event   uuid;
  v_ga      uuid;
  v_vip     uuid;
  v_tt      uuid;
  v_booking uuid;
  v_item    uuid;
  v_qty     int;
  v_name    text;
  v_n       int;
  v_names   text[] := ARRAY[
    'Aisha Bello','Marcus Reid','Tola Adeyemi','Chuka Nwosu','Sarah Whitfield','Femi Alade',
    'Grace Owolabi','Daniel Okoro','Priya Nair','Liam Carter','Zainab Musa','Oliver Hughes',
    'Ngozi Eze','Ethan Walker','Amara Obi','Noah Bennett','Leila Haddad','Jacob Turner',
    'Kemi Johnson','Mia Foster','Segun Ade','Hannah Price','Tunde Bakare','Chloe Murray',
    'Ibrahim Sule','Ruby Clarke','Emeka Uche','Isla Morgan'
  ];
BEGIN
  SELECT id INTO v_org FROM public.organiser_profiles WHERE org_name ILIKE 'north axis' LIMIT 1;
  IF v_org IS NULL THEN RAISE EXCEPTION 'Organiser "north axis" not found'; END IF;

  SELECT id INTO v_door FROM auth.users WHERE lower(email) = 'scannerview@hexlura.com' LIMIT 1;
  IF v_door IS NULL THEN RAISE EXCEPTION 'User scannerview@hexlura.com not found in auth.users'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_door) THEN
    RAISE EXCEPTION 'scannerview@hexlura.com has no row in public.profiles';
  END IF;

  IF EXISTS (SELECT 1 FROM public.events WHERE slug = 'demo-night-hexlura-scanner') THEN
    RAISE EXCEPTION 'Demo event already exists - run demo-event-cleanup.sql first';
  END IF;

  -- Event (published + unlisted)
  INSERT INTO public.events (
    organiser_id, title, slug, description, category, venue_name, venue_address, venue_city,
    venue_postcode, start_at, end_at, status, ticket_availability, is_unlisted,
    max_tickets_per_order, total_capacity
  ) VALUES (
    v_org, 'Demo Night', 'demo-night-hexlura-scanner',
    '<p>Demo event used for app screenshots and App Store review. Not a real event.</p>',
    'Club Nights', 'The Demo Venue', '1 Demo Street, London', 'London',
    'EC1A 1BB', '2027-06-26 21:00:00+01', '2027-06-27 03:00:00+01', 'published', 'on_sale', true,
    10, 200
  ) RETURNING id INTO v_event;

  -- Free ticket types
  INSERT INTO public.ticket_types (event_id, name, description, price_pence, quantity_total, sort_order)
  VALUES (v_event, 'General Admission', 'Demo ticket', 0, 150, 0) RETURNING id INTO v_ga;
  INSERT INTO public.ticket_types (event_id, name, description, price_pence, quantity_total, sort_order)
  VALUES (v_event, 'VIP', 'Demo ticket', 0, 50, 1) RETURNING id INTO v_vip;

  -- scannerview@hexlura.com = active door staff for this organiser
  INSERT INTO public.organiser_team (organiser_id, user_id, privilege, status, invited_email, accepted_at)
  VALUES (v_org, v_door, 'door_staff', 'active', 'scannerview@hexlura.com', now())
  ON CONFLICT (organiser_id, user_id) DO UPDATE SET privilege = 'door_staff', status = 'active';

  -- 28 confirmed, free, guest bookings (one item each; the 3rd is a 3-person group)
  FOR v_n IN 1..array_length(v_names, 1) LOOP
    v_name := v_names[v_n];
    v_tt   := CASE WHEN v_n % 4 = 0 THEN v_vip ELSE v_ga END;
    v_qty  := CASE WHEN v_n = 3 THEN 3 ELSE 1 END;

    INSERT INTO public.bookings (
      event_id, status, ticket_subtotal_pence, booking_fee_pence, order_processing_fee_pence,
      total_pence, discount_pence, payment_method, needs_manual_payout, confirmed_at,
      ticket_access_token
    ) VALUES (
      v_event, 'confirmed', 0, 0, 0, 0, 0, 'demo', false, now() - (v_n || ' hours')::interval,
      gen_random_uuid()
    ) RETURNING id INTO v_booking;

    INSERT INTO public.booking_items (booking_id, ticket_type_id, quantity, unit_price_pence, attendee_name, attendee_email, qr_code)
    VALUES (v_booking, v_tt, v_qty, 0, v_name, 'demo.attendee' || v_n || '@example.com', gen_random_uuid()::text)
    RETURNING id INTO v_item;

    -- Check in roughly two thirds (group ticket: 2 of 3 scanned -> "2/3")
    IF v_n % 3 <> 0 THEN
      INSERT INTO public.checkins (booking_item_id, qr_token, checked_in_at, checked_in_by)
      SELECT id, qr_code, now() - ((v_n * 3) || ' minutes')::interval, v_door
      FROM public.booking_items WHERE id = v_item;
    END IF;
    IF v_n = 3 THEN
      INSERT INTO public.checkins (booking_item_id, qr_token, checked_in_at, checked_in_by)
      SELECT id, qr_code, now() - interval '12 minutes', v_door FROM public.booking_items WHERE id = v_item;
      INSERT INTO public.checkins (booking_item_id, qr_token, checked_in_at, checked_in_by)
      SELECT id, qr_code, now() - interval '11 minutes', v_door FROM public.booking_items WHERE id = v_item;
    END IF;
  END LOOP;

  -- Keep the sold counters consistent with the bookings above (direct write is fine for seed data)
  UPDATE public.ticket_types t
     SET quantity_sold = COALESCE((SELECT sum(bi.quantity) FROM public.booking_items bi WHERE bi.ticket_type_id = t.id), 0)
   WHERE t.event_id = v_event;

  RAISE NOTICE 'Demo event created: %  (/events/demo-night-hexlura-scanner, unlisted)', v_event;
END $$;

-- Check: should return 1 event, 2 ticket types, 28 bookings and the unlisted flag = true.
SELECT e.title, e.status, e.is_unlisted, e.start_at,
       (SELECT count(*) FROM public.ticket_types WHERE event_id = e.id) AS ticket_types,
       (SELECT count(*) FROM public.bookings WHERE event_id = e.id)     AS bookings
FROM public.events e WHERE e.slug = 'demo-night-hexlura-scanner';
