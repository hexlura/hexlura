-- Track whether the 24h reminder has been sent for each event
ALTER TABLE events ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;
