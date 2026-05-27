-- Seed default design settings into platform_settings.
-- These match the values in globals.css and layout.tsx so the page shows
-- the correct current values on first load.

INSERT INTO public.platform_settings (key, value) VALUES
('design_color_background', '#FFFFFF'),
('design_color_surface',    '#F5F5F7'),
('design_color_card',       '#FFFFFF'),
('design_color_border',     '#C0C0C8'),
('design_color_accent',     '#E63950'),
('design_color_gold',       '#F5A623'),
('design_color_text',       '#0A0A0F'),
('design_color_muted',      '#8888AA'),
('design_color_success',    '#00C48A'),
('design_font_heading',     'Bebas Neue'),
('design_font_body',        'DM Sans')
ON CONFLICT (key) DO NOTHING;
