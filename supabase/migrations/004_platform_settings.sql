-- Platform settings table for admin-configurable values
CREATE TABLE IF NOT EXISTS platform_settings (
    key text PRIMARY KEY,
    value text NOT NULL,
    updated_at timestamptz DEFAULT now(),
    updated_by uuid REFERENCES profiles(id)
);

INSERT INTO platform_settings (key, value) VALUES
    ('booking_fee_percent', '5'),
    ('booking_fee_fixed_pence', '49'),
    ('booking_fee_min_pence', '99'),
    ('booking_fee_max_pence', '500'),
    ('max_featured_slots', '6'),
    ('maintenance_mode', 'false'),
    ('auto_approve_organisers', 'false'),
    ('from_name', 'Hexlura'),
    ('from_email', 'tickets@hexlura.com'),
    ('support_email', 'support@hexlura.com'),
    ('featured_cities', 'London,Manchester,Birmingham,Bristol,Edinburgh,Leeds,Liverpool,Glasgow,Newcastle,Cardiff,Sheffield,Nottingham'),
    ('payout_cooldown_days', '2')
ON CONFLICT (key) DO NOTHING;

-- RLS for platform_settings
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read platform_settings"
    ON platform_settings FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can update platform_settings"
    ON platform_settings FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );
