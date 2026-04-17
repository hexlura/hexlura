import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkinLimiter, getIP } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
    try {
        const ip = getIP(req)
        const { success } = checkinLimiter(ip)
        if (!success) {
            return NextResponse.json(
                { error: 'Too many scan attempts. Please slow down.' },
                { status: 429 }
            )
        }

        const body = await req.json()
        const { qr_token, booking_ref, booking_item_id, event_id } = body

        if (!qr_token && !booking_ref && !booking_item_id) {
            return NextResponse.json({ success: false, message: 'Invalid ticket — not found in system', code: 'INVALID' })
        }

        // Auth check with anon client
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ success: false, message: 'Unauthorized', code: 'INVALID' }, { status: 401 })

        const adminClient = createAdminClient()

        // Role check — organiser, admin, door_staff (profile role), or organiser_team door_staff
        const { data: checkerProfile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
        const checkerRole = checkerProfile?.role as string | undefined
        let isAuthorized = !!checkerRole && ['door_staff', 'organiser', 'admin'].includes(checkerRole)

        if (!isAuthorized) {
            // Check organiser_team for door_staff privilege (new team system)
            const { data: teamMember } = await adminClient
                .from('organiser_team')
                .select('privilege')
                .eq('user_id', user.id)
                .eq('privilege', 'door_staff')
                .eq('status', 'active')
                .maybeSingle()
            isAuthorized = !!teamMember
        }

        if (!isAuthorized) {
            return NextResponse.json({ success: false, message: 'Unauthorized', code: 'INVALID' }, { status: 403 })
        }

        // Step 1 — Find the ticket
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let bookingItem: any = null

        if (booking_item_id) {
            const { data } = await adminClient
                .from('booking_items')
                .select(`
                    id, qr_code, attendee_name, status,
                    ticket_type:ticket_types(name),
                    booking:bookings(id, status, event_id,
                        event:events(id, title, start_at, end_at, status, checkin_start_at, checkin_end_at)
                    )
                `)
                .eq('id', booking_item_id)
                .maybeSingle()
            bookingItem = data
        } else if (qr_token) {
            const { data } = await adminClient
                .from('booking_items')
                .select(`
                    id, qr_code, attendee_name, status,
                    ticket_type:ticket_types(name),
                    booking:bookings(id, status, event_id,
                        event:events(id, title, start_at, end_at, status, checkin_start_at, checkin_end_at)
                    )
                `)
                .eq('qr_code', qr_token)
                .maybeSingle()
            bookingItem = data
        } else if (booking_ref) {
            const { data: booking } = await adminClient
                .from('bookings')
                .select('id, status, event_id, event:events(id, title, start_at, end_at, status, checkin_start_at, checkin_end_at)')
                .eq('booking_ref', booking_ref)
                .maybeSingle()

            if (booking) {
                const { data: items } = await adminClient
                    .from('booking_items')
                    .select('id, qr_code, attendee_name, status, ticket_type:ticket_types(name)')
                    .eq('booking_id', (booking as { id: string }).id)
                    .limit(1)
                if (items && items[0]) {
                    bookingItem = { ...items[0], booking }
                }
            }
        }

        if (!bookingItem || !bookingItem.booking) {
            return NextResponse.json({ success: false, message: 'Invalid ticket — not found in system', code: 'INVALID' })
        }

        const bk = bookingItem.booking
        const event = bk.event

        // Step 2 — Check event match
        if (event_id && bk.event_id !== event_id) {
            return NextResponse.json({
                success: false,
                message: `This ticket is for ${event?.title ?? 'another event'}, not this event`,
                code: 'WRONG_EVENT',
            })
        }

        // Step 3 — Check event status
        if (event?.status === 'cancelled') {
            return NextResponse.json({ success: false, message: 'This event has been cancelled', code: 'CANCELLED' })
        }

        // Step 4 — Check event timing
        if (event?.start_at) {
            const now = new Date()
            const eventStart = new Date(event.start_at)
            const eventEnd = event.end_at ? new Date(event.end_at) : new Date(eventStart.getTime() + 4 * 60 * 60 * 1000)

            const checkinOpens: Date = event.checkin_start_at
                ? new Date(event.checkin_start_at)
                : new Date(eventStart.getTime() - 2 * 60 * 60 * 1000)

            const checkinCloses: Date = event.checkin_end_at
                ? new Date(event.checkin_end_at)
                : new Date(eventEnd.getTime() + 1 * 60 * 60 * 1000)

            if (now < checkinOpens) {
                const formattedOpen = new Intl.DateTimeFormat('en-GB', {
                    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/London',
                }).format(checkinOpens)
                return NextResponse.json({
                    success: false,
                    message: `Check-in opens at ${formattedOpen}`,
                    code: 'TOO_EARLY',
                })
            }

            if (now > checkinCloses) {
                return NextResponse.json({ success: false, message: 'Check-in has closed for this event', code: 'EVENT_ENDED' })
            }
        }

        // Step 5 — Check booking status
        if (bk.status === 'refunded' || bookingItem.status === 'cancelled') {
            return NextResponse.json({ success: false, message: 'Ticket cancelled — refund was issued', code: 'CANCELLED_TICKET' })
        }
        if (bk.status === 'cancelled') {
            return NextResponse.json({ success: false, message: 'This ticket has been cancelled or refunded', code: 'CANCELLED_TICKET' })
        }

        // Step 6 — Check if already scanned
        const { data: existing } = await adminClient
            .from('checkins')
            .select('checked_in_at')
            .eq('booking_item_id', bookingItem.id)
            .maybeSingle()

        if (existing?.checked_in_at) {
            const checkedAt = new Date(existing.checked_in_at)
            const formattedTime = new Intl.DateTimeFormat('en-GB', {
                hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/London',
            }).format(checkedAt)
            const formattedDate = new Intl.DateTimeFormat('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Europe/London',
            }).format(checkedAt)
            return NextResponse.json({
                success: false,
                message: `Already checked in at ${formattedTime} on ${formattedDate}`,
                code: 'ALREADY_SCANNED',
            })
        }

        // Step 7 — SUCCESS — Mark as checked in
        const { error } = await adminClient
            .from('checkins')
            .insert({
                booking_item_id: bookingItem.id,
                qr_token: bookingItem.qr_code || booking_ref || 'manual',
                checked_in_by: user.id,
            })

        if (error) {
            return NextResponse.json({ success: false, message: 'Failed to record check-in', code: 'INVALID' }, { status: 500 })
        }

        const checkedInAt = new Intl.DateTimeFormat('en-GB', {
            hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/London',
        }).format(new Date())

        return NextResponse.json({
            success: true,
            message: 'Welcome! Checked in successfully',
            code: 'SUCCESS',
            data: {
                attendee_name: bookingItem.attendee_name || 'Attendee',
                ticket_type: bookingItem.ticket_type?.name || 'Ticket',
                event_name: event?.title || '',
                checked_in_at: checkedInAt,
            },
        })
    } catch (err) {
        console.error('Checkin error:', err)
        return NextResponse.json({ success: false, message: 'Server error', code: 'INVALID' }, { status: 500 })
    }
}
