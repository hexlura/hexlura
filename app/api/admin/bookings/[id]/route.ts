import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()

    const { data: adminProfile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
    if (!adminProfile || adminProfile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: booking, error } = await adminClient
        .from('bookings')
        .select(`
            id, booking_ref, status, ticket_subtotal_pence, booking_fee_pence, discount_pence, total_pence,
            payment_method, stripe_payment_intent_id, created_at, confirmed_at, user_id,
            buyer:profiles ( full_name, email ),
            event:events (
                id, title, start_at, venue_name, venue_address,
                organiser:organiser_profiles ( id, org_name )
            )
        `)
        .eq('id', params.id)
        .single()

    if (error || !booking) {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const { data: items } = await adminClient
        .from('booking_items')
        .select('id, quantity, unit_price_pence, attendee_name, attendee_email, ticket_type_id, ticket_type:ticket_types ( name, is_group, group_size )')
        .eq('booking_id', params.id)

    const { data: refundRequest } = await adminClient
        .from('refund_requests')
        .select('id, status, reason, message, refund_amount_pence, organiser_note, admin_note, created_at, resolved_at')
        .eq('booking_id', params.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    return NextResponse.json({
        booking,
        items: items || [],
        refundRequest: refundRequest || null,
    })
}
