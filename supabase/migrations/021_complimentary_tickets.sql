-- Migration: 021_complimentary_tickets
-- Description: Add complimentary (guest list) ticket support

-- Add complimentary fields to promo_codes
ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS is_complimentary boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS comp_ticket_type_id uuid REFERENCES public.ticket_types(id) ON DELETE SET NULL;

-- Add is_complimentary flag to bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS is_complimentary boolean DEFAULT false;
