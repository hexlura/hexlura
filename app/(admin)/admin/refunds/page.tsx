import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { AdminRefundsClient } from './refunds-client'

export const dynamic = 'force-dynamic'

export default async function AdminRefundsPage({
    searchParams,
}: {
    searchParams: { tab?: string }
}) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const adminClient = createAdminClient()

    const { data: profile } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
    if (!profile || profile.role !== 'admin') redirect('/')

    const initialTab = searchParams.tab || 'awaiting'

    // Fetch ALL refund requests with full joins
    const { data: allRequests } = await adminClient
        .from('refund_requests')
        .select(`
            id, status, reason, message, refund_amount_pence, organiser_note, created_at, resolved_at,
            booking:bookings (
                id, booking_ref, ticket_subtotal_pence, booking_fee_pence,
                stripe_payment_intent_id, user_id,
                event:events (
                    id, title,
                    organiser:organiser_profiles ( org_name )
                )
            )
        `)
        .order('created_at', { ascending: false })

    const requests = allRequests || []

    // Collect buyer user IDs and fetch profiles
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

    const enriched = (requests as unknown as {
        id: string
        status: string
        reason: string
        message: string | null
        refund_amount_pence: number | null
        organiser_note: string | null
        created_at: string
        resolved_at: string | null
        booking: {
            id: string
            booking_ref: string
            ticket_subtotal_pence: number | null
            booking_fee_pence: number | null
            stripe_payment_intent_id: string | null
            user_id: string | null
            event: {
                id: string
                title: string
                organiser: { org_name: string } | null
            } | null
        } | null
    }[]).map((r) => ({
        ...r,
        status: r.status as 'pending' | 'organiser_approved' | 'organiser_rejected' | 'admin_approved' | 'admin_rejected',
        buyer: r.booking?.user_id ? (profileMap[r.booking.user_id] ?? null) : null,
    }))

    return (
        <div className="max-w-7xl">
            <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '36px', color: '#F0F0F8', marginBottom: '32px' }}>
                REFUND REQUESTS
            </h1>
            <AdminRefundsClient requests={enriched} initialTab={initialTab} />
        </div>
    )
}
