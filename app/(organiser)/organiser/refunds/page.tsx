import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { RefundsClient } from './refunds-client'

export const dynamic = 'force-dynamic'

export default async function OrganiserRefundsPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const serviceClient = createServiceClient()
    const { data: organiser } = await serviceClient
        .from('organiser_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()
    if (!organiser) redirect('/organiser/pending')

    const adminClient = createAdminClient()

    // Get this organiser's event IDs
    const { data: events } = await adminClient
        .from('events')
        .select('id')
        .eq('organiser_id', organiser.id)

    const eventIds = (events || []).map((e: { id: string }) => e.id)

    if (eventIds.length === 0) {
        return (
            <div className="max-w-4xl">
                <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '36px', color: '#F0F0F8', marginBottom: '32px' }}>
                    REFUND REQUESTS
                </h1>
                <p style={{ textAlign: 'center', color: '#8888AA' }}>No pending refund requests</p>
            </div>
        )
    }

    // Get bookings for those events
    const { data: bookings } = await adminClient
        .from('bookings')
        .select('id')
        .in('event_id', eventIds)

    const bookingIds = (bookings || []).map((b: { id: string }) => b.id)

    if (bookingIds.length === 0) {
        return (
            <div className="max-w-4xl">
                <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '36px', color: '#F0F0F8', marginBottom: '32px' }}>
                    REFUND REQUESTS
                </h1>
                <p style={{ textAlign: 'center', color: '#8888AA' }}>No pending refund requests</p>
            </div>
        )
    }

    // Fetch pending refund requests for those bookings
    const { data: refundData } = await adminClient
        .from('refund_requests')
        .select(`
            id, status, reason, message, refund_amount_pence, created_at,
            booking:bookings (
                id, booking_ref, total_pence, ticket_subtotal_pence, booking_fee_pence,
                user_id,
                event:events ( id, title ),
                items:booking_items ( quantity, ticket_type:ticket_types ( name ) )
            )
        `)
        .in('booking_id', bookingIds)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })

    const requests = refundData || []

    // Fetch user profiles for each request
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

    // Attach profile to each request
    type ReqRow = {
        id: string; status: string; reason: string; message: string | null
        refund_amount_pence: number | null; created_at: string
        booking: {
            id: string; booking_ref: string; total_pence: number | null
            ticket_subtotal_pence: number | null; booking_fee_pence: number | null
            user_id: string | null
            event: { id: string; title: string } | null
            items: { quantity: number; ticket_type: { name: string } | null }[] | null
        } | null
    }
    const enrichedRequests = (requests as unknown as ReqRow[]).map((r) => ({
        ...r,
        buyer: r.booking?.user_id ? (profileMap[r.booking.user_id] ?? null) : null,
    }))

    return (
        <div className="max-w-4xl">
            <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '36px', color: '#F0F0F8', marginBottom: '32px' }}>
                REFUND REQUESTS
            </h1>
            <RefundsClient requests={enrichedRequests} />
        </div>
    )
}
