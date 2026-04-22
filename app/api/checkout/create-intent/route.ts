import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'
import { calculateBookingFee, getFeeConfig } from '@/lib/fees'
import { sendBookingConfirmationEmail } from '@/lib/email'
import { randomUUID } from 'crypto'
import { checkoutLimiter, getIP } from '@/lib/rate-limit'

interface CheckoutItem {
    ticket_type_id: string
    quantity: number
}

interface CreateIntentRequest {
    event_id: string
    items: CheckoutItem[]
    promo_code?: string
    attendee_details: {
        full_name: string
        email: string
        phone: string
    }
}

export async function POST(request: NextRequest) {
    const ip = getIP(request)
    const { success } = checkoutLimiter(ip)
    if (!success) {
        return NextResponse.json(
            { error: 'Too many requests. Please try again in a moment.' },
            { status: 429 }
        )
    }

    const body = (await request.json()) as CreateIntentRequest
    const { event_id, items, promo_code, attendee_details } = body

    if (!event_id || !items?.length || !attendee_details?.full_name || !attendee_details?.email) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createClient()

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Verify event exists and is published
    const { data: event } = await supabase
        .from('events')
        .select('*, organiser:organiser_profiles(stripe_account_id)')
        .eq('id', event_id)
        .eq('status', 'published')
        .single()

    if (!event) {
        return NextResponse.json({ error: 'Event not found or not available' }, { status: 404 })
    }

    // Stop sales after event ends
    if (event.end_at && new Date() > new Date(event.end_at)) {
        return NextResponse.json({ error: 'This event has ended. Tickets are no longer available.' }, { status: 400 })
    }

    // Load fee config from platform_settings
    const feeConfig = await getFeeConfig()

    // Verify ticket types and calculate prices server-side
    let ticketSubtotalPence = 0
    let totalBookingFeePence = 0

    for (const item of items) {
        const { data: ticketType } = await supabase
            .from('ticket_types')
            .select('*')
            .eq('id', item.ticket_type_id)
            .eq('event_id', event_id)
            .single()

        if (!ticketType) {
            return NextResponse.json({ error: `Ticket type not found: ${item.ticket_type_id}` }, { status: 400 })
        }

        if (!ticketType.is_visible) {
            return NextResponse.json({ error: `Ticket not available: ${ticketType.name}` }, { status: 400 })
        }

        // Check sale period
        const now = new Date().toISOString()
        if (ticketType.sale_starts_at && now < ticketType.sale_starts_at) {
            return NextResponse.json({ error: `Sales haven't started for: ${ticketType.name}` }, { status: 400 })
        }
        if (ticketType.sale_ends_at && now > ticketType.sale_ends_at) {
            return NextResponse.json({ error: `Sales ended for: ${ticketType.name}` }, { status: 400 })
        }

        // Availability check — include active reservations from other sessions
        const reserveClient = createAdminClient()
        const { data: activeReservations } = await reserveClient
            .from('reservations')
            .select('quantity')
            .eq('ticket_type_id', item.ticket_type_id)
            .eq('status', 'active')
            .gt('expires_at', new Date().toISOString())

        const reservedQty = activeReservations?.reduce((sum, r) => sum + r.quantity, 0) ?? 0
        const available = ticketType.quantity_total - ticketType.quantity_sold - reservedQty
        if (item.quantity > available) {
            return NextResponse.json(
                { error: `Tickets no longer available for: ${ticketType.name}` },
                { status: 409 }
            )
        }

        ticketSubtotalPence += ticketType.price_pence * item.quantity
        totalBookingFeePence += calculateBookingFee(ticketType.price_pence, item.quantity, feeConfig)
    }

    // Apply promo code if provided
    let discountPence = 0
    let promoCodeId: string | null = null

    if (promo_code) {
        const { data: promo } = await supabase
            .from('promo_codes')
            .select('*')
            .ilike('code', promo_code)
            .single()

        if (promo) {
            const now = new Date().toISOString()
            const isValid =
                (!promo.valid_from || now >= promo.valid_from) &&
                (!promo.valid_to || now <= promo.valid_to) &&
                (promo.max_uses === null || promo.uses_count < promo.max_uses) &&
                (!promo.event_id || promo.event_id === event_id) &&
                ticketSubtotalPence >= (promo.min_order_pence || 0)

            if (isValid) {
                if (promo.discount_type === 'percent') {
                    discountPence = Math.round(ticketSubtotalPence * promo.discount_value / 100)
                } else {
                    discountPence = promo.discount_value
                }
                discountPence = Math.min(discountPence, ticketSubtotalPence)
                promoCodeId = promo.id
            }
        }
    }

    const totalPence = ticketSubtotalPence - discountPence + totalBookingFeePence

    // Free booking — bypass Stripe entirely
    if (ticketSubtotalPence === 0) {
        const adminClient = createAdminClient()

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
                promo_code_id: promoCodeId,
                stripe_payment_intent_id: `free-${randomUUID()}`,
                payment_method: 'free',
                confirmed_at: new Date().toISOString(),
                needs_manual_payout: false,
            })
            .select('id, booking_ref')
            .single()

        if (bookingError || !booking) {
            return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
        }

        for (const item of items) {
            // One row per physical ticket — each person gets their own QR code
            for (let t = 0; t < item.quantity; t++) {
                await adminClient.from('booking_items').insert({
                    booking_id: booking.id,
                    ticket_type_id: item.ticket_type_id,
                    quantity: 1,
                    unit_price_pence: 0,
                    attendee_name: attendee_details.full_name,
                    attendee_email: attendee_details.email,
                    qr_code: randomUUID(),
                })
            }

            const { error: rpcError } = await adminClient.rpc('increment_quantity_sold', {
                p_ticket_type_id: item.ticket_type_id,
                p_quantity: item.quantity,
            })
            if (rpcError) {
                const { data: current } = await adminClient
                    .from('ticket_types')
                    .select('quantity_sold')
                    .eq('id', item.ticket_type_id)
                    .single()
                await adminClient
                    .from('ticket_types')
                    .update({ quantity_sold: (current?.quantity_sold ?? 0) + item.quantity })
                    .eq('id', item.ticket_type_id)
            }
        }

        // Send confirmation email
        const { data: eventInfo } = await adminClient
            .from('events')
            .select('title, start_at, venue_name, venue_address')
            .eq('id', event_id)
            .single()

        if (eventInfo && attendee_details.email) {
            const eventDate = new Intl.DateTimeFormat('en-GB', {
                weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
            }).format(new Date(eventInfo.start_at))
            const eventTime = new Intl.DateTimeFormat('en-GB', {
                hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
            }).format(new Date(eventInfo.start_at))

            const ticketSummary: { name: string; quantity: number; subtotalPence: number }[] = []
            for (const item of items) {
                const { data: tt } = await adminClient
                    .from('ticket_types')
                    .select('name')
                    .eq('id', item.ticket_type_id)
                    .single()
                if (tt) ticketSummary.push({ name: tt.name, quantity: item.quantity, subtotalPence: 0 })
            }

            void sendBookingConfirmationEmail({
                to: attendee_details.email,
                bookingRef: booking.booking_ref,
                eventName: eventInfo.title,
                eventDate,
                eventTime,
                venueName: eventInfo.venue_name || 'TBC',
                venueAddress: eventInfo.venue_address || '',
                ticketSummary,
                bookingFeePence: 0,
                discountPence: 0,
                totalPence: 0,
            })
        }

        return NextResponse.json({ free: true, booking_ref: booking.booking_ref })
    }

    if (totalPence < 50) {
        return NextResponse.json({ error: 'Order total too low' }, { status: 400 })
    }

    const organiserStripeAccountId = event.organiser?.stripe_account_id || null

    // Create Stripe PaymentIntent
    const paymentIntent = await getStripe().paymentIntents.create({
        amount: totalPence,
        currency: 'gbp',
        automatic_payment_methods: { enabled: true },
        metadata: {
            event_id,
            user_id: user.id,
            organiser_stripe_account_id: organiserStripeAccountId || '',
            ticket_subtotal_pence: String(ticketSubtotalPence),
            booking_fee_pence: String(totalBookingFeePence),
            discount_pence: String(discountPence),
            promo_code_id: promoCodeId || '',
            items: JSON.stringify(items),
            attendee_name: attendee_details.full_name,
            attendee_email: attendee_details.email,
            attendee_phone: attendee_details.phone,
        },
    })

    // Confirm active reservations for this user so they aren't double-counted
    const confirmClient = createAdminClient()
    for (const item of items) {
        await confirmClient
            .from('reservations')
            .update({ status: 'confirmed' })
            .eq('user_id', user.id)
            .eq('ticket_type_id', item.ticket_type_id)
            .eq('status', 'active')
    }

    return NextResponse.json({
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
    })
}
