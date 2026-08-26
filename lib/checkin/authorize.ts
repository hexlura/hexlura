import { createAdminClient } from '@/lib/supabase/admin'

export interface DoorStaffContext {
    role: string
    isAuthorized: boolean
    isAdmin: boolean
    organiserIds: string[]
}

/**
 * Resolves which organisers' events a user may check tickets in for, across
 * all three door-staff systems: legacy profile role, legacy door_staff table,
 * and the newer organiser_team invite system. Shared by every check-in
 * surface (POST /api/checkin, GET /api/checkin/lookup, GET /api/checkin/events,
 * GET /api/checkin/attendees) so the authorization rules only live in one place.
 */
export async function resolveDoorStaffContext(userId: string): Promise<DoorStaffContext> {
    const adminClient = createAdminClient()

    const { data: profile } = await adminClient.from('profiles').select('role').eq('id', userId).single()
    const role = (profile?.role as string | undefined) || 'user'

    if (role === 'admin') {
        return { role, isAuthorized: true, isAdmin: true, organiserIds: [] }
    }

    if (role === 'organiser') {
        const { data: orgProfile } = await adminClient
            .from('organiser_profiles')
            .select('id')
            .eq('user_id', userId)
            .single()
        return {
            role,
            isAuthorized: true,
            isAdmin: false,
            organiserIds: orgProfile ? [orgProfile.id] : [],
        }
    }

    if (role === 'door_staff') {
        const { data: assignments } = await adminClient
            .from('door_staff')
            .select('organiser_id')
            .eq('user_id', userId)
        return {
            role,
            isAuthorized: true,
            isAdmin: false,
            organiserIds: (assignments ?? []).map((a: { organiser_id: string }) => a.organiser_id),
        }
    }

    // New system: any profile role can hold a door_staff seat via organiser_team
    const { data: teamRows } = await adminClient
        .from('organiser_team')
        .select('organiser_id')
        .eq('user_id', userId)
        .eq('privilege', 'door_staff')
        .eq('status', 'active')

    const organiserIds = (teamRows ?? []).map((r: { organiser_id: string }) => r.organiser_id)
    return { role, isAuthorized: organiserIds.length > 0, isAdmin: false, organiserIds }
}

/** Is this user allowed to act on an event owned by `eventOrganiserId`? */
export function isEventAssigned(ctx: DoorStaffContext, eventOrganiserId: string): boolean {
    return ctx.isAdmin || ctx.organiserIds.includes(eventOrganiserId)
}
