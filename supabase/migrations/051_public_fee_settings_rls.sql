-- Allow anonymous and authenticated users to read fee config keys.
-- Fee rates are displayed to buyers on the checkout page; they are not sensitive.
CREATE POLICY "public_read_fee_settings"
    ON platform_settings FOR SELECT
    TO anon, authenticated
    USING (key IN (
        'booking_fee_percent',
        'booking_fee_min_pence',
        'booking_fee_max_pence',
        'order_processing_fee_pence'
    ));
