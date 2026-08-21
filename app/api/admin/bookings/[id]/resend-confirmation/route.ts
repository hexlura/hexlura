import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditAction } from '@/lib/audit'
import { render } from '@react-email/components'
import BookingConfirmation from '@/emails/booking-confirmation'
import { Resend } from 'resend'
import { buildTicketDescriptors } from '@/lib/tickets/descriptors'
import { generateTicketPdf } from '@/lib/tickets/generateTicketPdf'

function getResend() {
    return new Resend(process.env.RESEND_API_KEY || 'placeholder')
}

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()

    const { data: adminProfile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
    if (!adminProfile || adminProfile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: bookingRaw, error: bookingErr } = await adminClient
        .from('bookings')
        .select('*, event:events(title, category, start_at, end_at, venue_name, venue_address, organiser_id), items:booking_items(*, ticket_type:ticket_types(name, price_pence, is_group, group_size))')
        .eq('id', params.id)
        .single()

    if (bookingErr || !bookingRaw) {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    type Booking = {
        id: string
        booking_ref: string
        status: string
        user_id: string | null
        ticket_access_token: string
        ticket_subtotal_pence: number | null
        booking_fee_pence: number | null
        discount_pence: number | null
        total_pence: number | null
        is_complimentary: boolean | null
        event: { title: string; category: string | null; start_at: string; end_at: string | null; venue_name: string | null; venue_address: string | null; organiser_id: string } | null
        items: { id: string; quantity: number; qr_code: string | null; unit_price_pence: number | null; attendee_name: string | null; attendee_email: string | null; ticket_type: { name: string; price_pence: number; is_group?: boolean; group_size?: number } | null }[]
    }

    const booking = bookingRaw as unknown as Booking

    if (!booking.event) {
        return NextResponse.json({ error: 'Event data missing on booking' }, { status: 500 })
    }

    // Recipient: prefer the auth user email, fall back to the first item's attendee_email
    let buyerEmail = booking.items[0]?.attendee_email || ''
    let buyerName = booking.items[0]?.attendee_name || 'Valued Customer'

    if (booking.user_id) {
        const { data: { user: authUser } } = await adminClient.auth.admin.getUserById(booking.user_id)
        if (authUser?.email) buyerEmail = authUser.email

        const { data: profile } = await adminClient
            .from('profiles')
            .select('full_name')
            .eq('id', booking.user_id)
            .single()
        if ((profile as { full_name?: string } | null)?.full_name) {
            buyerName = (profile as { full_name: string }).full_name
        }
    }

    if (!buyerEmail) {
        return NextResponse.json({ error: 'No recipient email on file for this booking' }, { status: 400 })
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

    // Group items by ticket type for the summary table
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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.hexlura.com'

    const { data: orgProfileForPdf } = await adminClient
        .from('organiser_profiles')
        .select('org_name')
        .eq('id', booking.event.organiser_id)
        .single()

    const descriptors = buildTicketDescriptors(booking.items, booking.booking_ref)
    const isCancelled = booking.status === 'refunded' || booking.status === 'cancelled'

    const attachments = await Promise.all(descriptors.map(async (descriptor, i) => {
        const pdfBuffer = await generateTicketPdf({
            eventName: booking.event!.title,
            eventCategory: booking.event!.category || undefined,
            eventDate,
            eventTime,
            venueName: booking.event!.venue_name || 'TBC',
            venueAddress: booking.event!.venue_address || '',
            organiserName: orgProfileForPdf?.org_name,
            bookingRef: booking.booking_ref,
            holderName: buyerName,
            ticketName: descriptor.ticketName,
            token: descriptor.token,
            isCancelled,
            ticketIndex: i + 1,
            ticketTotal: descriptors.length,
        })
        return {
            filename: `${booking.booking_ref}-ticket-${i + 1}-of-${descriptors.length}.pdf`,
            content: pdfBuffer,
        }
    }))

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
        downloadUrl: `${appUrl}/api/tickets/${booking.booking_ref}/pdf?token=${booking.ticket_access_token}`,
    }))

    await getResend().emails.send({
        from: 'Hexlura <noreply@hexlura.com>',
        replyTo: 'support@hexlura.com',
        to: buyerEmail,
        subject: `Your tickets for ${booking.event.title} — ${booking.booking_ref} (resent)`,
        html,
        attachments,
    })

    await logAuditAction({
        actorId: user.id,
        action: 'resend_confirmation',
        entityType: 'booking',
        entityId: params.id,
        metadata: { booking_ref: booking.booking_ref, recipient: buyerEmail },
    })

    return NextResponse.json({ success: true, sentTo: buyerEmail })
}
