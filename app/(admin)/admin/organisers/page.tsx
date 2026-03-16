import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { OrganisersClient } from './organisers-client'

export default async function AdminOrganisersPage({
    searchParams,
}: {
    searchParams: { tab?: string }
}) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const adminClient = createAdminClient()

    // Pending organisers
    const { data: pendingData, error: pendingError } = await adminClient
        .from('organiser_profiles')
        .select(`
            id, org_name, slug, description, website, vat_registered, created_at, user_id,
            profiles!organiser_profiles_user_id_fkey (full_name, email, phone)
        `)
        .eq('is_approved', false)
        .order('created_at', { ascending: true })
    if (pendingError) console.error('Pending organisers query error:', pendingError)

    // Active organisers - with event count and revenue
    const { data: activeData, error: activeError } = await adminClient
        .from('organiser_profiles')
        .select(`
            id, org_name, slug, stripe_account_id, is_suspended, created_at, approved_at, user_id,
            profiles!organiser_profiles_user_id_fkey (full_name, email)
        `)
        .eq('is_approved', true)
        .eq('is_suspended', false)
        .order('created_at', { ascending: false })
    if (activeError) console.error('Active organisers query error:', activeError)

    // Suspended organisers
    const { data: suspendedData, error: suspendedError } = await adminClient
        .from('organiser_profiles')
        .select(`
            id, org_name, is_suspended, created_at, user_id,
            profiles!organiser_profiles_user_id_fkey (full_name, email)
        `)
        .eq('is_approved', true)
        .eq('is_suspended', true)
        .order('created_at', { ascending: false })
    if (suspendedError) console.error('Suspended organisers query error:', suspendedError)

    // Get event counts and revenue for active organisers
    const activeIds = (activeData || []).map((o: { id: string }) => o.id)
    const orgStats: Record<string, { events: number; revenue: number }> = {}

    if (activeIds.length > 0) {
        const { data: eventsData } = await adminClient
            .from('events')
            .select('id, organiser_id')
            .in('organiser_id', activeIds)

        const { data: bookingsData } = await adminClient
            .from('bookings')
            .select('ticket_subtotal_pence, event:events(organiser_id)')
            .eq('status', 'confirmed')

        for (const e of (eventsData || []) as { id: string; organiser_id: string }[]) {
            if (!orgStats[e.organiser_id]) orgStats[e.organiser_id] = { events: 0, revenue: 0 }
            orgStats[e.organiser_id].events++
        }
        type BkgWithOrg = { ticket_subtotal_pence: number | null; event: { organiser_id: string } | null }
        for (const b of (bookingsData || []) as unknown as BkgWithOrg[]) {
            const oid = b.event?.organiser_id
            if (oid && orgStats[oid]) {
                orgStats[oid].revenue += b.ticket_subtotal_pence || 0
            }
        }
    }

    type PendingOrg = {
        id: string; org_name: string; slug: string; description: string | null
        website: string | null; vat_registered: boolean; created_at: string; user_id: string
        profiles: { full_name: string | null; email: string | null; phone: string | null } | null
    }
    type ActiveOrg = {
        id: string; org_name: string; slug: string; stripe_account_id: string | null
        is_suspended: boolean; created_at: string; approved_at: string | null; user_id: string
        profiles: { full_name: string | null; email: string | null } | null
        events_count: number; revenue_pence: number
    }
    type SuspendedOrg = {
        id: string; org_name: string; is_suspended: boolean; created_at: string; user_id: string
        profiles: { full_name: string | null; email: string | null } | null
    }

    const pending = (pendingData || []) as unknown as PendingOrg[]
    const active: ActiveOrg[] = ((activeData || []) as unknown as Omit<ActiveOrg, 'events_count' | 'revenue_pence'>[]).map((o) => ({
        ...o,
        events_count: orgStats[o.id]?.events ?? 0,
        revenue_pence: orgStats[o.id]?.revenue ?? 0,
    }))
    const suspended = (suspendedData || []) as unknown as SuspendedOrg[]

    return (
        <OrganisersClient
            pending={pending}
            active={active}
            suspended={suspended}
            defaultTab={(searchParams.tab as 'pending' | 'active' | 'suspended') ?? 'pending'}
        />
    )
}
