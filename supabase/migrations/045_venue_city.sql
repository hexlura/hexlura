alter table events add column if not exists venue_city text;

-- Backfill: extract the last comma-separated segment from venue_address
update events
set venue_city = trim(split_part(venue_address, ',', array_length(string_to_array(venue_address, ','), 1)))
where venue_address is not null
  and venue_address like '%,%'
  and venue_city is null;
