-- The fixed-fee component of the booking fee was removed in favour of a
-- pure percent-of-ticket fee (clamped between min/max). Drop the orphan
-- setting row so the admin settings UI and lib/fees.ts stay in sync.

DELETE FROM platform_settings WHERE key = 'booking_fee_fixed_pence';
