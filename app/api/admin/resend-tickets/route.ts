import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { render } from '@react-email/components'
import BookingConfirmation from '@/emails/booking-confirmation'
import { Resend } from 'resend'

/**
 * One-time admin utility to resend ticket confirmation emails after the
 * booking_items migration (splitting qty>1 rows into individual rows).
 *
 * Usage:
 *   GET /api/admin/resend-tickets?ref=HXL-XXXXXX
 *   Header: Authorization: Bearer YOUR_ADMIN_SECRET
 *
 * ADMIN_SECRET must be set in .env / Vercel env vars.
 */

function getResend() {
    return new Resend(process.env.RESEND_API_KEY || 'placeholder')
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const bookingRef = searchParams.get('ref')

    const authHeader = req.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token || token !== process.env.ADMIN_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!bookingRef) {
        return NextResponse.json({ error: 'Missing ?ref= parameter' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Fetch the booking with full event + items
    const { data: bookingRaw, error: bookingErr } = await supabase
        .from('bookings')
        .select('*, event:events(title, start_at, end_at, venue_name, venue_address), items:booking_items(*, ticket_type:ticket_types(name, price_pence))')
        .eq('booking_ref', bookingRef)
        .single()

    if (bookingErr || !bookingRaw) {
        return NextResponse.json({ error: `Booking not found: ${bookingRef}` }, { status: 404 })
    }

    type Booking = {
        id: string
        booking_ref: string
        status: string
        user_id: string | null
        ticket_subtotal_pence: number | null
        booking_fee_pence: number | null
        discount_pence: number | null
        total_pence: number | null
        is_complimentary: boolean | null
        event: { title: string; start_at: string; end_at: string | null; venue_name: string | null; venue_address: string | null } | null
        items: { id: string; quantity: number; unit_price_pence: number | null; attendee_name: string | null; attendee_email: string | null; ticket_type: { name: string; price_pence: number } | null }[]
    }

    const booking = bookingRaw as unknown as Booking

    if (!booking.event) {
        return NextResponse.json({ error: 'Event data missing on booking' }, { status: 500 })
    }

    // Get buyer email from auth.admin (most reliable source)
    let buyerEmail = booking.items[0]?.attendee_email || ''
    let buyerName = booking.items[0]?.attendee_name || 'Valued Customer'

    if (booking.user_id) {
        const { data: { user: authUser } } = await supabase.auth.admin.getUserById(booking.user_id)
        if (authUser?.email) buyerEmail = authUser.email

        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', booking.user_id)
            .single()
        if ((profile as { full_name?: string } | null)?.full_name) {
            buyerName = (profile as { full_name: string }).full_name
        }
    }

    if (!buyerEmail) {
        return NextResponse.json({ error: 'No buyer email found for this booking' }, { status: 400 })
    }

    const eventDate = new Intl.DateTimeFormat('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }).format(new Date(booking.event.start_at))

    const startTime = new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Europe/London',
    }).format(new Date(booking.event.start_at))

    const endTime = booking.event.end_at
        ? new Intl.DateTimeFormat('en-GB', {
            hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Europe/London',
        }).format(new Date(booking.event.end_at))
        : null

    const eventTime = endTime ? `${startTime} - ${endTime} UK Time` : `${startTime} UK Time`

    // Build ticket summary from current booking_items (each qty=1 after migration)
    // Group by ticket type for the email summary table
    const ticketSummaryMap: Map<string, { name: string; quantity: number; price: string }> = new Map()
    for (const item of booking.items) {
        const typeName = item.ticket_type?.name || 'Ticket'
        const existing = ticketSummaryMap.get(typeName)
        if (existing) {
            existing.quantity += item.quantity
        } else {
            const unitPence = item.unit_price_pence ?? item.ticket_type?.price_pence ?? 0
            ticketSummaryMap.set(typeName, {
                name: typeName,
                quantity: item.quantity,
                price: `£${((unitPence * item.quantity) / 100).toFixed(2)}`,
            })
        }
    }
    const ticketItems = Array.from(ticketSummaryMap.values())

    const totalPence = booking.total_pence ?? 0
    const totalPaid = booking.is_complimentary ? '£0.00' : `£${(totalPence / 100).toFixed(2)}`

    const html = await render(BookingConfirmation({
        buyerName,
        eventName: booking.event.title,
        eventDate,
        eventTime,
        venueName: booking.event.venue_name || 'TBC',
        venueAddress: booking.event.venue_address || '',
        bookingRef: booking.booking_ref,
        ticketItems,
        totalPaid,
        downloadUrl: `https://www.hexlura.com/api/tickets/${booking.booking_ref}/pdf`,
    }))

    await getResend().emails.send({
        from: 'Hexlura <noreply@hexlura.com>',
        to: buyerEmail,
        subject: `Your tickets for ${booking.event.title} — ${booking.booking_ref} (resent)`,
        html,
    })

    return NextResponse.json({
        ok: true,
        message: `Ticket confirmation resent to ${buyerEmail}`,
        bookingRef: booking.booking_ref,
        ticketCount: booking.items.length,
        buyerEmail,
    })
}
