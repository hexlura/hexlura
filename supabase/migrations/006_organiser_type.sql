ALTER TABLE organiser_profiles
ADD COLUMN IF NOT EXISTS organiser_type text
DEFAULT 'individual'
CHECK (organiser_type IN (
  'individual',
  'artist',
  'club_venue',
  'event_company',
  'charity',
  'education'
));
