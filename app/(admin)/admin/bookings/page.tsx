import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { AdminBookingsClient } from './bookings-client'

export default async function AdminBookingsPage({
    searchParams,
}: {
    searchParams: { q?: string; status?: string; event_id?: string; organiser_id?: string; page?: string }
}) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const adminClient = createAdminClient()

    const page = Math.max(1, parseInt(searchParams.page ?? '1'))
    const pageSize = 25
    const offset = (page - 1) * pageSize

    // Pre-fetch dropdown options (events + organisers).
    const [{ data: eventsList }, { data: organisersList }] = await Promise.all([
        adminClient
            .from('events')
            .select('id, title, organiser_id')
            .order('title', { ascending: true }),
        adminClient
            .from('organiser_profiles')
            .select('id, org_name')
            .eq('is_approved', true)
            .order('org_name', { ascending: true }),
    ])

    type EventOption = { id: string; title: string; organiser_id: string }
    type OrganiserOption = { id: string; org_name: string }
    const events = (eventsList || []) as EventOption[]
    const organisers = (organisersList || []) as OrganiserOption[]

    // Build the event_id filter: organiser_id expands to its event IDs and
    // narrows further if event_id is also set.
    let eventIdFilter: string[] | null = null
    if (searchParams.organiser_id) {
        eventIdFilter = events.filter(e => e.organiser_id === searchParams.organiser_id).map(e => e.id)
    }
    if (searchParams.event_id) {
        eventIdFilter = eventIdFilter
            ? eventIdFilter.filter(id => id === searchParams.event_id)
            : [searchParams.event_id]
    }

    let bookings: unknown[] = []
    let count = 0

    // If filtering produced an empty event-id set, short-circuit to no rows.
    const filterMatchesNothing = eventIdFilter !== null && eventIdFilter.length === 0

    if (!filterMatchesNothing) {
        let query = adminClient
            .from('bookings')
            .select('id, booking_ref, status, total_pence, ticket_subtotal_pence, booking_fee_pence, payment_method, created_at, confirmed_at, user_id, profiles(full_name, email), event:events(id, title, organiser_id)', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + pageSize - 1)

        if (searchParams.q) {
            query = query.or(`booking_ref.ilike.%${searchParams.q}%`)
        }
        if (searchParams.status && searchParams.status !== 'all') {
            query = query.eq('status', searchParams.status)
        }
        if (eventIdFilter !== null) {
            query = query.in('event_id', eventIdFilter)
        }

        const res = await query
        bookings = res.data || []
        count = res.count ?? 0
    }

    type BookingRow = {
        id: string; booking_ref: string; status: string; total_pence: number | null
        ticket_subtotal_pence: number | null; booking_fee_pence: number | null
        payment_method: string | null; created_at: string; confirmed_at: string | null
        user_id: string | null
        profiles: { full_name: string | null; email: string | null } | null
        event: { id: string; title: string; organiser_id: string } | null
    }

    return (
        <AdminBookingsClient
            bookings={bookings as BookingRow[]}
            totalRows={count}
            page={page}
            pageSize={pageSize}
            events={events}
            organisers={organisers}
        />
    )
}
