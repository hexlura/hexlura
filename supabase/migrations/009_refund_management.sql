-- Update refund_requests status constraint
UPDATE public.refund_requests 
SET status = 'pending' 
WHERE status NOT IN (
  'pending',
  'organiser_approved', 
  'organiser_rejected',
  'admin_approved',
  'admin_rejected'
);

ALTER TABLE public.refund_requests 
DROP CONSTRAINT IF EXISTS refund_requests_status_check;

ALTER TABLE public.refund_requests 
ADD CONSTRAINT refund_requests_status_check 
CHECK (status IN (
  'pending',
  'organiser_approved',
  'organiser_rejected', 
  'admin_approved',
  'admin_rejected'
));

ALTER TABLE public.refund_requests 
ADD COLUMN IF NOT EXISTS organiser_note text;

ALTER TABLE public.refund_requests
ADD COLUMN IF NOT EXISTS refund_amount_pence integer;