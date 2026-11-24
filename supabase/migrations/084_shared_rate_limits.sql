-- 084: rate-limit counters shared by every server instance.
--
-- The old limiter kept counts in each serverless instance's memory, so on Vercel (many short-lived
-- instances) the limits barely applied. Counts now live here: one row per (key, fixed window).
-- Server-only (service role); RLS on with no policies, execute revoked from client roles.

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key          text        NOT NULL,
  window_start timestamptz NOT NULL,
  hits         integer     NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS rate_limits_window_idx ON public.rate_limits (window_start);

-- Counts one hit and returns true if the caller is still within p_max for this window.
CREATE OR REPLACE FUNCTION public.hit_rate_limit(p_key text, p_window_seconds integer, p_max integer)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_window timestamptz := to_timestamp(floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
BEGIN
  INSERT INTO public.rate_limits AS r (key, window_start, hits)
  VALUES (left(p_key, 200), v_window, 1)
  ON CONFLICT (key, window_start) DO UPDATE SET hits = r.hits + 1
  RETURNING hits INTO v_hits;

  -- Housekeeping: roughly 1 call in 200 clears windows older than a day.
  IF random() < 0.005 THEN
    DELETE FROM public.rate_limits WHERE window_start < now() - interval '1 day';
  END IF;

  RETURN v_hits <= p_max;
END;
$$;

REVOKE ALL ON public.rate_limits FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.hit_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hit_rate_limit(text, integer, integer) TO service_role;
GRANT ALL ON public.rate_limits TO service_role;

NOTIFY pgrst, 'reload schema';
