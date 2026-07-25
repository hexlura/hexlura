-- Migration: 060_organiser_email_lists
-- Description: Organiser-managed contact lists + promotional email campaigns

CREATE TABLE IF NOT EXISTS public.organiser_email_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organiser_id uuid NOT NULL REFERENCES public.organiser_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organiser_email_list_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.organiser_email_lists(id) ON DELETE CASCADE,
  email text NOT NULL,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'csv')),
  unsubscribed_at timestamptz,
  added_at timestamptz DEFAULT now(),
  UNIQUE(list_id, email)
);

CREATE INDEX IF NOT EXISTS idx_organiser_email_list_entries_list ON public.organiser_email_list_entries(list_id);

CREATE TABLE IF NOT EXISTS public.organiser_email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organiser_id uuid NOT NULL REFERENCES public.organiser_profiles(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  list_id uuid NOT NULL REFERENCES public.organiser_email_lists(id) ON DELETE CASCADE,
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'sent', 'failed')),
  recipient_count integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  consent_confirmed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  sent_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_organiser_email_campaigns_organiser ON public.organiser_email_campaigns(organiser_id);
CREATE INDEX IF NOT EXISTS idx_organiser_email_campaigns_event ON public.organiser_email_campaigns(event_id);

CREATE TABLE IF NOT EXISTS public.organiser_email_campaign_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.organiser_email_campaigns(id) ON DELETE CASCADE,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  resend_message_id text,
  sent_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organiser_email_campaign_sends_campaign ON public.organiser_email_campaign_sends(campaign_id);

ALTER TABLE public.organiser_email_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organiser_email_list_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organiser_email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organiser_email_campaign_sends ENABLE ROW LEVEL SECURITY;

-- All read/write done server-side via the service-role client (mirrors organiser_team,
-- promoter_profiles etc.) — these policies are a defence-in-depth backstop, not the
-- primary access path, since the anon client is only used for the auth.getUser() check.

CREATE POLICY "Organisers manage own email lists" ON public.organiser_email_lists
  FOR ALL USING (
    organiser_id IN (SELECT id FROM public.organiser_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Organisers manage own email list entries" ON public.organiser_email_list_entries
  FOR ALL USING (
    list_id IN (
      SELECT id FROM public.organiser_email_lists
      WHERE organiser_id IN (SELECT id FROM public.organiser_profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Organisers manage own campaigns" ON public.organiser_email_campaigns
  FOR ALL USING (
    organiser_id IN (SELECT id FROM public.organiser_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Organisers view own campaign sends" ON public.organiser_email_campaign_sends
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM public.organiser_email_campaigns
      WHERE organiser_id IN (SELECT id FROM public.organiser_profiles WHERE user_id = auth.uid())
    )
  );
