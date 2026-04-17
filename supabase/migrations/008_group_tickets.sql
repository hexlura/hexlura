ALTER TABLE public.ticket_types
ADD COLUMN IF NOT EXISTS is_group boolean DEFAULT false;

ALTER TABLE public.ticket_types
ADD COLUMN IF NOT EXISTS group_size integer DEFAULT 1;

ALTER TABLE public.checkins
ADD COLUMN IF NOT EXISTS group_index integer DEFAULT 1;

ALTER TABLE public.checkins
ADD COLUMN IF NOT EXISTS group_total integer DEFAULT 1;

