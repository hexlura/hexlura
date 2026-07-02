create table public.trusted_parterns (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  name text not null,
  slug text not null,
  image_url text null,
  display_order integer null default 0,
  is_active boolean null default true,
  constraint trusted_parterns_pkey primary key (id),
  constraint trusted_parterns_slug_key unique (slug)
) TABLESPACE pg_default;

ALTER TABLE public.trusted_parterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active trusted parterns" ON public.trusted_parterns
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admin can manage trusted parterns" ON public.trusted_parterns
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );


INSERT INTO public.trusted_parterns (
    id,
    created_at,
    name,
    slug,
    image_url,
    display_order,
    is_active
)
VALUES
(
    '2d99e05b-917b-4b48-b209-c25ebd75c3e9',
    '2026-07-01 21:26:38.17887+00',
    'Google Pay',
    'google-pay',
    'https://entxavzzjpjrmnuyvrgj.supabase.co/storage/v1/object/public/trust-partners/google-pay/google-pay-india-gpay-india-seeklogo.png',
    2,
    true
),
(
    '4a1cf9fd-3c49-4020-9855-ca7635a72a5a',
    '2026-07-01 21:26:38.17887+00',
    'Meta',
    'meta',
    'https://entxavzzjpjrmnuyvrgj.supabase.co/storage/v1/object/public/trust-partners/meta/meta-new-facebook-2021-seeklogo.png',
    1,
    true
),
(
    '71df085d-a212-4405-8d9e-81a2dbd6b32a',
    '2026-07-01 21:26:38.17887+00',
    'Apple Pay',
    'apple-pay',
    'https://entxavzzjpjrmnuyvrgj.supabase.co/storage/v1/object/public/trust-partners/apple-pay/apple-pay-seeklogo.png',
    4,
    true
),
(
    '9f76f656-4f60-4796-8d9c-8f5f751bcf3c',
    '2026-07-01 21:26:38.17887+00',
    'Mastercard',
    'mastercard',
    'https://entxavzzjpjrmnuyvrgj.supabase.co/storage/v1/object/public/trust-partners/master-card/mastercard-26149.png',
    6,
    true
),
(
    'b4ba24c2-3afa-4925-b87f-5de0f6fbaa8b',
    '2026-07-01 21:26:38.17887+00',
    'Visa',
    'visa',
    'https://entxavzzjpjrmnuyvrgj.supabase.co/storage/v1/object/public/trust-partners/visa-card/visa-seeklogo.png',
    5,
    true
),
(
    'e9c102fe-26ab-496a-8257-cdc403e24022',
    '2026-07-01 21:26:38.17887+00',
    'Stripe',
    'stripe',
    'https://entxavzzjpjrmnuyvrgj.supabase.co/storage/v1/object/public/trust-partners/stripe/stripe-seeklogo.png',
    3,
    true
);