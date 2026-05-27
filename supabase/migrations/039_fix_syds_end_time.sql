-- Set SYDS end time to 3AM on 16 May 2026 (4 hours after 11PM start)
-- BST = UTC+1, so 3AM BST = 2AM UTC
UPDATE public.events
SET end_at = '2026-05-16T02:00:00+00:00'
WHERE slug = 'syds'
  AND end_at IS NULL;
