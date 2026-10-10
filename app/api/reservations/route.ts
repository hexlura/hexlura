import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// How long tickets stay held while the buyer completes checkout. Keep in sync with the
// "Checkout session" duration on the Cookies page.
const HOLD_MINUTES = 5

export async function POST(request: Request) {
    const body = await request.json()
    const { tickets, session_id } = body as {
        tickets: { ticket_type_id: string; quantity: number }[]
        session_id: string
    }

    if (!tickets?.length || !session_id) {
        return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60 * 1000).toISOString()

    // A new selection replaces this buyer's own earlier hold on the same ticket types. Otherwise
    // going back and clicking "Proceed to Checkout" again stacks a second hold on top of the
    // first, and reserve_tickets counts the buyer's own old hold against them ("sold out").
    const { error: releaseError } = await adminClient
        .from('reservations')
        .update({ status: 'expired' })
        .eq('user_id', user.id)
        .eq('status', 'active')
        .in('ticket_type_id', tickets.map((t) => t.ticket_type_id))
    if (releaseError) console.error('Failed to release earlier holds before reserving:', releaseError.message)

    // Atomic, all-or-nothing: locks each ticket type row, re-checks capacity
    // under that lock, and inserts — so concurrent requests for the same
    // ticket type can't all pass the check before any of them inserts, and a
    // failure partway through a multi-item request rolls back the whole call
    // instead of leaving earlier items reserved. See migrations/054.
    const { data: reservations, error } = await adminClient.rpc('reserve_tickets', {
        p_user_id: user.id,
        p_session_id: session_id,
        p_expires_at: expiresAt,
        p_items: tickets.map((t) => ({ ticket_type_id: t.ticket_type_id, quantity: t.quantity })),
    })

    if (error) {
        if (error.message?.startsWith('SOLD_OUT:')) {
            return NextResponse.json({ success: false, message: 'Tickets sold out' }, { status: 409 })
        }
        if (error.message?.startsWith('TICKET_NOT_FOUND:')) {
            return NextResponse.json({ success: false, message: 'Ticket not found' }, { status: 404 })
        }
        console.error('reserve_tickets RPC failed:', error.message)
        return NextResponse.json({ success: false, message: 'Failed to create reservation' }, { status: 500 })
    }

    const reservationIds = (reservations ?? []).map((r: { reservation_id: string }) => r.reservation_id)

    return NextResponse.json({ success: true, reservation_ids: reservationIds, expires_at: expiresAt })
}

export async function DELETE(request: Request) {
    const body = await request.json()
    const { session_id } = body as { session_id: string }

    if (!session_id) {
        return NextResponse.json({ success: false }, { status: 400 })
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ success: false }, { status: 401 })
    }

    const adminClient = createAdminClient()
    await adminClient
        .from('reservations')
        .update({ status: 'expired' })
        .eq('session_id', session_id)
        .eq('user_id', user.id)

    return NextResponse.json({ success: true })
}
