import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { OrganiserRefundsClient } from './refunds-client'
import { resolveOrganiserId } from '@/lib/organiser-access'

export const dynamic = 'force-dynamic'

type ClientRequests = React.ComponentProps<typeof OrganiserRefundsClient>['requests']

function RefundsLayout({ requests }: { requests: ClientRequests }) {
    return (
        <div className="max-w-7xl">
            <div className="mb-6">
                <h1 className="font-heading text-4xl tracking-wide">REFUND REQUESTS</h1>
                <p className="text-muted text-sm mt-1">Review and action refund requests from attendees</p>
            </div>
            <OrganiserRefundsClient requests={requests} />
        </div>
    )
}

export default async function OrganiserRefundsPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const organiserId = await resolveOrganiserId(user.id)
    if (!organiserId) redirect('/organiser/pending')

    const adminClient = createAdminClient()

    // Get this organiser's event IDs
    const { data: events, error: eventsErr } = await adminClient
        .from('events')
        .select('id')
        .eq('organiser_id', organiserId)
    if (eventsErr) throw eventsErr

    const eventIds = (events || []).map((e: { id: string }) => e.id)

    if (eventIds.length === 0) {
        return <RefundsLayout requests={[]} />
    }

    // Get bookings for those events
    const { data: bookings, error: bookingsErr } = await adminClient
        .from('bookings')
        .select('id, user_id')
        .in('event_id', eventIds)
    if (bookingsErr) throw bookingsErr

    const bookingIds = (bookings || []).map((b: { id: string }) => b.id)

    if (bookingIds.length === 0) {
        return <RefundsLayout requests={[]} />
    }

    // Fetch ALL refund requests for this organiser's bookings (all statuses)
    const { data: refundData, error: refundsErr } = await adminClient
        .from('refund_requests')
        .select(`
            id, status, reason, message, organiser_note, refund_amount_pence, created_at,
            booking:bookings (
                id, booking_ref, ticket_subtotal_pence, discount_pence, user_id,
                event:events ( title )
            )
        `)
        .in('booking_id', bookingIds)
        .order('created_at', { ascending: false })
    if (refundsErr) throw refundsErr

    const requests = refundData || []

    // Fetch buyer profiles
    type ReqWithUserId = { booking: { user_id?: string | null } | null }
    const userIds = Array.from(new Set(
        (requests as unknown as ReqWithUserId[])
            .map((r) => r.booking?.user_id ?? undefined)
            .filter((id): id is string => typeof id === 'string')
    ))

    const profileMap: Record<string, { full_name: string | null; email: string | null }> = {}
    if (userIds.length > 0) {
        const { data: profiles } = await adminClient
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds)
        for (const p of profiles || []) {
            profileMap[p.id] = { full_name: p.full_name, email: p.email }
        }
    }

    type ReqRow = {
        id: string
        status: string
        reason: string
        message: string | null
        organiser_note: string | null
        refund_amount_pence: number | null
        created_at: string
        booking: {
            id: string
            booking_ref: string
            ticket_subtotal_pence: number | null
            discount_pence: number | null
            user_id: string | null
            event: { title: string } | null
        } | null
    }

    type RefundStatus = 'pending' | 'organiser_approved' | 'organiser_rejected' | 'admin_approved' | 'admin_rejected'
    const enriched = (requests as unknown as ReqRow[]).map((r) => ({
        ...r,
        status: r.status as RefundStatus,
        buyer: r.booking?.user_id ? (profileMap[r.booking.user_id] ?? null) : null,
    }))

    return <RefundsLayout requests={enriched} />
}
