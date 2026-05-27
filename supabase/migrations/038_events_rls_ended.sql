-- Allow public reads of ended events (same as published)
DROP POLICY IF EXISTS "Anyone can select published events" ON public.events;
CREATE POLICY "Anyone can select published events" ON public.events
  FOR SELECT USING (status IN ('published', 'ended'));

-- Also allow ticket_types to be read for ended events
DROP POLICY IF EXISTS "Anyone can select visible types for published events" ON public.ticket_types;
CREATE POLICY "Anyone can select visible types for published events" ON public.ticket_types
  FOR SELECT USING (
    is_visible = true AND EXISTS (
      SELECT 1 FROM public.events
      WHERE id = ticket_types.event_id
      AND status IN ('published', 'ended')
    )
  );
