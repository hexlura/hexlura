-- Store geocoded coordinates for postcode radius search
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS venue_lat double precision,
  ADD COLUMN IF NOT EXISTS venue_lng double precision;
