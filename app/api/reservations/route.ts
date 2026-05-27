import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
    const reservationIds: string[] = []
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    for (const ticket of tickets) {
        const { ticket_type_id, quantity } = ticket

        // Get ticket type availability
        const { data: ticketType } = await adminClient
            .from('ticket_types')
            .select('quantity_total, quantity_sold')
            .eq('id', ticket_type_id)
            .single()

        if (!ticketType) {
            return NextResponse.json({ success: false, message: 'Ticket not found' }, { status: 404 })
        }

        // Count all active reservations for this ticket type
        const { data: activeReservations } = await adminClient
            .from('reservations')
            .select('quantity')
            .eq('ticket_type_id', ticket_type_id)
            .eq('status', 'active')
            .gt('expires_at', new Date().toISOString())

        const reservedQty = activeReservations?.reduce((sum, r) => sum + r.quantity, 0) ?? 0
        const available = ticketType.quantity_total - ticketType.quantity_sold - reservedQty

        if (quantity > available) {
            return NextResponse.json({ success: false, message: 'Tickets sold out' }, { status: 409 })
        }

        // Create reservation
        const { data: reservation, error } = await adminClient
            .from('reservations')
            .insert({
                ticket_type_id,
                user_id: user.id,
                quantity,
                session_id,
                expires_at: expiresAt,
                status: 'active',
            })
            .select('id')
            .single()

        if (error || !reservation) {
            return NextResponse.json({ success: false, message: 'Failed to create reservation' }, { status: 500 })
        }

        reservationIds.push(reservation.id)
    }

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
