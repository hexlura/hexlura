import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateTicketsPdf, type TicketPdfData } from '@/lib/tickets/generateTicketPdf'

export async function GET(
    request: Request,
    { params }: { params: { ref: string } }
) {
    const ref = params.ref
    const { searchParams } = new URL(request.url)
    const indexParam = searchParams.get('index')
    const requestedIndex = indexParam ? parseInt(indexParam, 10) : null
    const accessToken = searchParams.get('token')

    const BOOKING_SELECT = '*, event:events(title, start_at, end_at, venue_name, venue_address, category, organiser_id), items:booking_items(*, ticket_type:ticket_types(name, is_group, group_size))'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let booking: any = null

    // Token path — the link in the confirmation email carries a long, unguessable
    // per-booking token, so it works without any login (guests included), while a bare
    // booking_ref (6 characters, sometimes visible in browser history/screenshots) alone
    // still isn't enough to get in.
    if (accessToken) {
        const tokenClient = createAdminClient()
        const { data: tokenBooking } = await tokenClient
            .from('bookings')
            .select(BOOKING_SELECT)
            .eq('booking_ref', ref)
            .eq('ticket_access_token', accessToken)
            .single()
        booking = tokenBooking
    }

    // No valid token — fall back to the existing session-based access checks.
    let user: { id: string; email?: string } | null = null
    if (!booking) {
        const supabase = createClient()
        const { data: { user: sessionUser } } = await supabase.auth.getUser()
        if (!sessionUser) {
            const nextPath = `/api/tickets/${ref}/pdf${indexParam ? `?index=${indexParam}` : ''}`
            return NextResponse.redirect(new URL(`/auth/login?next=${encodeURIComponent(nextPath)}`, request.url))
        }
        user = sessionUser

        const { data: ownBooking } = await supabase
            .from('bookings')
            .select(BOOKING_SELECT)
            .eq('booking_ref', ref)
            .eq('user_id', user.id)
            .single()
        booking = ownBooking

        // Secondary check: allow organisers to download tickets for their own events
        if (!booking) {
            const adminClient = createAdminClient()
            const { data: organiser } = await adminClient
                .from('organiser_profiles')
                .select('id')
                .eq('user_id', user.id)
                .single()

            if (organiser) {
                const { data: orgBooking } = await adminClient
                    .from('bookings')
                    .select(BOOKING_SELECT)
                    .eq('booking_ref', ref)
                    .single()

                if (orgBooking && (orgBooking.event as { organiser_id?: string } | null)?.organiser_id === organiser.id) {
                    booking = orgBooking
                }
            }
        }

        // Tertiary check: admins can access any ticket
        if (!booking) {
            const adminClient = createAdminClient()
            const { data: profile } = await adminClient
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            if (profile?.role === 'admin') {
                const { data: anyBooking } = await adminClient
                    .from('bookings')
                    .select(BOOKING_SELECT)
                    .eq('booking_ref', ref)
                    .single()

                if (anyBooking) {
                    booking = anyBooking
                }
            }
        }
    }

    if (!booking) {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Fallback holder name if a ticket has no attendee_name/attendee_email of its own —
    // uses the BOOKING OWNER's own profile (booking.user_id), never the currently
    // authenticated viewer (an organiser/admin downloading someone else's ticket).
    const profileAdminClient = createAdminClient()
    const { data: profile } = await profileAdminClient
        .from('profiles')
        .select('full_name, email')
        .eq('id', booking.user_id)
        .single()
    const bookingOwnerFallback = (profile as { full_name?: string; email?: string } | null)?.full_name
        || (profile as { full_name?: string; email?: string } | null)?.email
        || 'Ticket Holder'

    // Get organiser name (RLS blocks anon access to organiser_profiles, so use admin client)
    const organiserId = (booking.event as { organiser_id?: string } | null)?.organiser_id ?? null
    let organiserName = ''
    if (organiserId) {
        const { data: org } = await profileAdminClient
            .from('organiser_profiles')
            .select('org_name')
            .eq('id', organiserId)
            .single()
        organiserName = (org as { org_name?: string } | null)?.org_name ?? ''
    }

    const eventDate = booking.event
        ? new Intl.DateTimeFormat('en-GB', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        }).format(new Date(booking.event.start_at))
        : 'TBC'

    const eventStartTime = booking.event
        ? new Intl.DateTimeFormat('en-GB', {
            hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
        }).format(new Date(booking.event.start_at))
        : 'TBC'

    const eventEndTime = booking.event?.end_at
        ? new Intl.DateTimeFormat('en-GB', {
            hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
        }).format(new Date(booking.event.end_at))
        : null

    const timeDisplay = eventEndTime
        ? `${eventStartTime} - ${eventEndTime} (UK Time)`
        : `${eventStartTime} (UK Time)`

    type BookingItem = {
        id: string
        qr_code: string | null
        quantity: number
        unit_price_pence: number
        attendee_name: string | null
        attendee_email: string | null
        ticket_type?: { name: string; is_group?: boolean; group_size?: number } | null
    }

    const allItems: BookingItem[] = booking.items || []

    // Build one descriptor per physical ticket.
    // After the migration, each booking_item row has quantity=1 and its own unique qr_code.
    // We use the row's actual qr_code as the QR token — this is what the scanner validates.
    // Group tickets still use the existing ref-G{n} token scheme (already stored per-row).
    interface TicketDescriptor {
        token: string        // qr_code value — used as QR data and shown on ticket
        ticketName: string
        isGroup: boolean
        holderName: string
    }
    const descriptors: TicketDescriptor[] = []

    for (const item of allItems) {
        const isGroup = item.ticket_type?.is_group === true
        const ticketName = item.ticket_type?.name ?? 'Ticket'
        // Per-ticket attendee info (set at checkout) takes priority over the booking
        // owner's account profile — correct even when someone books on another
        // person's behalf, or for group tickets with multiple named attendees.
        const holderName = item.attendee_name || item.attendee_email || bookingOwnerFallback

        if (isGroup) {
            // Group tickets already had one-row-per-member inserted by webhook
            descriptors.push({
                token: item.qr_code || booking.booking_ref,
                ticketName,
                isGroup: true,
                holderName,
            })
        } else {
            // Standard tickets: each row is one physical ticket with its own qr_code
            // quantity should already be 1 after migration, but loop defensively
            const qty = item.quantity || 1
            for (let t = 0; t < qty; t++) {
                descriptors.push({
                    token: item.qr_code || booking.booking_ref,
                    ticketName,
                    isGroup: false,
                    holderName,
                })
            }
        }
    }

    const total = descriptors.length

    if (requestedIndex !== null && (requestedIndex < 1 || requestedIndex > total)) {
        return NextResponse.json({ error: 'Ticket index out of range' }, { status: 404 })
    }

    const toRender: { descriptor: TicketDescriptor; globalIndex: number }[] =
        requestedIndex !== null
            ? [{ descriptor: descriptors[requestedIndex - 1], globalIndex: requestedIndex }]
            : descriptors.map((d, i) => ({ descriptor: d, globalIndex: i + 1 }))

    const isCancelled = booking.status === 'refunded' || booking.status === 'cancelled'

    const pdfDataList: TicketPdfData[] = toRender.map(({ descriptor, globalIndex }) => ({
        eventName: booking.event?.title || 'Event',
        eventDate,
        eventTime: timeDisplay,
        venueName: booking.event?.venue_name || 'TBC',
        venueAddress: booking.event?.venue_address || '',
        organiserName: organiserName || undefined,
        bookingRef: booking.booking_ref,
        holderName: descriptor.holderName,
        ticketName: descriptor.ticketName,
        token: descriptor.token,
        isCancelled,
        ticketIndex: globalIndex,
        ticketTotal: total,
    }))

    const pdfBuffer = await generateTicketsPdf(pdfDataList)
    const filename = requestedIndex !== null
        ? `hexlura-${booking.booking_ref}-ticket-${requestedIndex}-of-${total}.pdf`
        : `hexlura-${booking.booking_ref}.pdf`

    return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
        },
    })
}
