-- Add admin toggle for Stripe Connect (disabled by default)
INSERT INTO public.platform_settings (key, value)
VALUES ('stripe_connect_enabled', 'false')
ON CONFLICT (key) DO NOTHING;
