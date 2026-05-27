import { createServiceClient } from '@/lib/supabase/service'

/**
 * Resolves the organiser_id for a given user.
 * Works for both organiser account owners and team members (co_organiser, event_manager, door_staff).
 * Returns null if the user has no organiser access.
 */
export async function resolveOrganiserId(userId: string): Promise<string | null> {
    const serviceClient = createServiceClient()

    // Check if user owns an organiser profile
    const { data: organiser } = await serviceClient
        .from('organiser_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

    if (organiser) return organiser.id

    // Fall back to organiser_team membership
    const { data: teams } = await serviceClient
        .from('organiser_team')
        .select('organiser_id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(1)

    return teams?.[0]?.organiser_id || null
}
