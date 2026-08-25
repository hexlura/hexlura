-- Middleware runs on nearly every request and, for a logged-in user, made up
-- to 3 separate sequential PostgREST round-trips (profiles role, organiser_team
-- privilege, promoter_profiles existence) — each carrying its own session-setup
-- overhead. This collapses them into one round-trip. The redirect/routing logic
-- in lib/supabase/middleware.ts is unchanged: this only changes how the data
-- backing those decisions is fetched, not any decision itself.
CREATE OR REPLACE FUNCTION public.get_middleware_context(p_user_id uuid)
RETURNS TABLE (role text, team_privilege text, has_promoter_row boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE((SELECT p.role FROM public.profiles p WHERE p.id = p_user_id), 'user') AS role,
    (SELECT ot.privilege FROM public.organiser_team ot WHERE ot.user_id = p_user_id AND ot.status = 'active' LIMIT 1) AS team_privilege,
    EXISTS (SELECT 1 FROM public.promoter_profiles pp WHERE pp.user_id = p_user_id) AS has_promoter_row;
$$;

GRANT EXECUTE ON FUNCTION public.get_middleware_context(uuid) TO service_role, authenticated;
