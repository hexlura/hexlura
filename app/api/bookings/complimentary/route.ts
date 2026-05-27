import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendBookingConfirmationEmail } from '@/lib/email'
import { randomUUID } from 'crypto'

export async function POST(request: Request) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { event_id, comp_code_id, items, attendee_details } = body as {
        event_id: string
        comp_code_id: string
        items: { ticket_type_id: string; quantity: number }[]
        attendee_details: { full_name: string; email: string; phone: string }
    }

    if (!event_id || !comp_code_id || !items?.length) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Re-verify the comp code is still valid
    const { data: compCode } = await adminClient
        .from('promo_codes')
        .select('id, max_uses, uses_count, is_complimentary')
        .eq('id', comp_code_id)
        .eq('event_id', event_id)
        .eq('is_complimentary', true)
        .single()

    if (!compCode) {
        return NextResponse.json({ error: 'Comp code not found' }, { status: 400 })
    }

    if (compCode.max_uses !== null && compCode.uses_count >= compCode.max_uses) {
        return NextResponse.json({ error: 'This comp code has reached its usage limit' }, { status: 400 })
    }

    // Stop comp bookings after event ends
    const { data: eventCheck } = await adminClient
        .from('events')
        .select('end_at')
        .eq('id', event_id)
        .single()

    if (eventCheck?.end_at && new Date() > new Date(eventCheck.end_at)) {
        return NextResponse.json({ error: 'This event has ended. Tickets are no longer available.' }, { status: 400 })
    }

    // Availability check
    for (const item of items) {
        const { data: tt } = await adminClient
            .from('ticket_types')
            .select('quantity_total, quantity_sold, name')
            .eq('id', item.ticket_type_id)
            .single()

        if (!tt) {
            return NextResponse.json({ error: 'Ticket type not found' }, { status: 400 })
        }
        const available = tt.quantity_total - tt.quantity_sold
        if (item.quantity > available) {
            return NextResponse.json({ error: `${tt.name} is sold out` }, { status: 400 })
        }
    }

    // Create booking
    const { data: booking, error: bookingError } = await adminClient
        .from('bookings')
        .insert({
            user_id: user.id,
            event_id,
            status: 'confirmed',
            ticket_subtotal_pence: 0,
            booking_fee_pence: 0,
            discount_pence: 0,
            total_pence: 0,
            promo_code_id: comp_code_id,
            is_complimentary: true,
            payment_method: 'comp',
            confirmed_at: new Date().toISOString(),
            needs_manual_payout: false,
        })
        .select('id, booking_ref')
        .single()

    if (bookingError || !booking) {
        console.error('Failed to create comp booking:', bookingError?.message)
        return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
    }

    // Insert booking items and increment quantity_sold
    for (const item of items) {
        const { data: ticketType } = await adminClient
            .from('ticket_types')
            .select('is_group, group_size')
            .eq('id', item.ticket_type_id)
            .single()

        const tt = ticketType as { is_group?: boolean; group_size?: number } | null
        const totalRows = (tt?.is_group && (tt.group_size || 1) > 1)
            ? item.quantity * (tt.group_size || 1)
            : item.quantity

        for (let t = 0; t < totalRows; t++) {
            const { error: itemError } = await adminClient.from('booking_items').insert({
                booking_id: booking.id,
                ticket_type_id: item.ticket_type_id,
                quantity: 1,
                unit_price_pence: 0,
                attendee_name: attendee_details?.full_name || '',
                attendee_email: attendee_details?.email || '',
                qr_code: randomUUID(),
            })

            if (itemError) {
                console.error('Failed to insert booking_item for comp booking:', itemError.message)
                await adminClient.from('bookings').delete().eq('id', booking.id)
                return NextResponse.json({ error: 'Failed to create booking items' }, { status: 500 })
            }
        }

        const { error: rpcError } = await adminClient.rpc('increment_quantity_sold', {
            p_ticket_type_id: item.ticket_type_id,
            p_quantity: item.quantity,
        })
        if (rpcError) {
            const { data: current } = await adminClient
                .from('ticket_types').select('quantity_sold').eq('id', item.ticket_type_id).single()
            await adminClient
                .from('ticket_types')
                .update({ quantity_sold: (current?.quantity_sold ?? 0) + item.quantity })
                .eq('id', item.ticket_type_id)
        }
    }

    // Increment comp code usage
    await adminClient
        .from('promo_codes')
        .update({ uses_count: compCode.uses_count + 1 })
        .eq('id', comp_code_id)

    // Send confirmation email
    const { data: eventData } = await adminClient
        .from('events')
        .select('title, start_at, venue_name, venue_address')
        .eq('id', event_id)
        .single()

    if (eventData && attendee_details?.email) {
        const eventDate = new Intl.DateTimeFormat('en-GB', {
            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
        }).format(new Date(eventData.start_at))

        const eventTime = new Intl.DateTimeFormat('en-GB', {
            hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
        }).format(new Date(eventData.start_at))

        const ticketSummary: { name: string; quantity: number; unitPricePence: number }[] = []
        for (const item of items) {
            const { data: tt } = await adminClient
                .from('ticket_types').select('name').eq('id', item.ticket_type_id).single()
            if (tt) {
                ticketSummary.push({ name: tt.name, quantity: item.quantity, unitPricePence: 0 })
            }
        }

        void sendBookingConfirmationEmail({
            to: attendee_details.email,
            buyerName: attendee_details.full_name,
            bookingRef: booking.booking_ref,
            eventName: eventData.title,
            eventDate,
            eventTime,
            venueName: eventData.venue_name || 'TBC',
            venueAddress: eventData.venue_address || '',
            ticketSummary,
            bookingFeePence: 0,
            discountPence: 0,
            totalPence: 0,
        })
    }

    return NextResponse.json({ booking_ref: booking.booking_ref })
}
