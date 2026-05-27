-- SEO metadata table for admin-managed per-page SEO overrides
CREATE TABLE IF NOT EXISTS seo_metadata (
    page_path text PRIMARY KEY,                -- e.g. '/', '/about', '/events/[slug]'
    title text,
    description text,
    og_title text,
    og_description text,
    og_image_url text,
    twitter_card text DEFAULT 'summary_large_image',
    keywords text,                             -- comma-separated
    canonical_url text,
    robots text DEFAULT 'index, follow',
    json_ld jsonb,                             -- structured data
    updated_at timestamptz DEFAULT now(),
    updated_by uuid REFERENCES profiles(id),
    created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE seo_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read seo_metadata"
    ON seo_metadata FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Admins can insert seo_metadata"
    ON seo_metadata FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );

CREATE POLICY "Admins can update seo_metadata"
    ON seo_metadata FOR UPDATE
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );

CREATE POLICY "Admins can delete seo_metadata"
    ON seo_metadata FOR DELETE
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );

-- Seed global SEO defaults into platform_settings
INSERT INTO platform_settings (key, value) VALUES
    ('seo_site_name', 'Hexlura'),
    ('seo_default_og_image', ''),
    ('seo_twitter_handle', '@hexlura'),
    ('seo_default_description', 'Find and book the hottest events near you.')
ON CONFLICT (key) DO NOTHING;
