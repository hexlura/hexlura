import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'
import { calculateBookingFee, getFeeConfig } from '@/lib/fees'
import { sendBookingConfirmationEmail } from '@/lib/email'
import { getPromoterByReferralCode } from '@/lib/promoter-access'
import { randomUUID } from 'crypto'
import { checkoutLimiter, getIP } from '@/lib/rate-limit'
import { autoFollowOrganiser } from '@/lib/auto-follow'

interface CheckoutItem {
    ticket_type_id: string
    quantity: number
}

interface CreateIntentRequest {
    event_id: string
    items: CheckoutItem[]
    promo_code?: string
    promoter_code?: string
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
    const { event_id, items, promo_code, attendee_details, promoter_code } = body

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
    const adminClient = createAdminClient()
    const { data: event } = await supabase
        .from('events')
        .select('*')
        .eq('id', event_id)
        .eq('status', 'published')
        .single()

    if (!event) {
        return NextResponse.json({ error: 'Event not found or not available' }, { status: 404 })
    }

    // Fetch organiser Connect fields via admin client — anon RLS blocks the join
    const { data: orgConnectData } = await adminClient
        .from('organiser_profiles')
        .select('stripe_account_id, stripe_connect_allowed, stripe_charges_enabled, booking_fee_exempt, processing_fee_exempt')
        .eq('id', event.organiser_id)
        .single()

    // Use platform destination charge only for organisers with Connect fully onboarded + allowed
    const useDestinationCharge = !!(
        orgConnectData?.stripe_account_id &&
        orgConnectData?.stripe_connect_allowed &&
        orgConnectData?.stripe_charges_enabled
    )
    const organiserStripeAccountId = orgConnectData?.stripe_account_id || null
    // Independent of Connect status — works for bank-transfer organisers too.
    const bookingFeeExempt = !!orgConnectData?.booking_fee_exempt
    const processingFeeExempt = !!orgConnectData?.processing_fee_exempt

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

    if (bookingFeeExempt) totalBookingFeePence = 0
    const orderProcessingFeePence = processingFeeExempt ? 0 : (ticketSubtotalPence > 0 ? feeConfig.processingFeePence : 0)
    const totalPence = ticketSubtotalPence - discountPence + totalBookingFeePence + orderProcessingFeePence

    // Validate promoter referral code (if any) — must have an active assignment for THIS event,
    // and the buyer must not be the promoter themselves.
    let promoterId: string | null = null
    let promoterCommissionPercent: number | null = null
    let promoterCommissionPence: number | null = null
    if (promoter_code) {
        const promoter = await getPromoterByReferralCode(promoter_code)
        if (promoter && promoter.user_id !== user.id) {
            const reserveClient = createAdminClient()
            const { data: assignment } = await reserveClient
                .from('promoter_event_assignments')
                .select('commission_percent')
                .eq('promoter_id', promoter.id)
                .eq('event_id', event_id)
                .eq('status', 'active')
                .maybeSingle()
            if (assignment) {
                promoterId = promoter.id
                promoterCommissionPercent = assignment.commission_percent
                // Commission is on ticket subtotal (after discount), not the booking fee
                const eligiblePence = Math.max(0, ticketSubtotalPence - discountPence)
                promoterCommissionPence = Math.floor(eligiblePence * assignment.commission_percent / 100)
            }
        }
    }

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
                order_processing_fee_pence: 0,
                confirmed_at: new Date().toISOString(),
                needs_manual_payout: false,
                promoter_id: promoterId,
                promoter_commission_percent: promoterCommissionPercent,
                promoter_commission_pence: promoterCommissionPence,
            })
            .select('id, booking_ref')
            .single()

        if (bookingError || !booking) {
            return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
        }

        // Silently follow the organiser on the buyer's behalf
        void autoFollowOrganiser(user.id, event.organiser_id)

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
                const { error: insertErr } = await adminClient.from('booking_items').insert({
                    booking_id: booking.id,
                    ticket_type_id: item.ticket_type_id,
                    quantity: 1,
                    unit_price_pence: 0,
                    attendee_name: attendee_details.full_name,
                    attendee_email: attendee_details.email,
                    qr_code: randomUUID(),
                })
                if (insertErr) {
                    console.error('Failed to insert booking_item:', insertErr.message)
                    throw new Error(`booking_item insert failed: ${insertErr.message}`)
                }
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

            const ticketSummary: { name: string; quantity: number; unitPricePence: number }[] = []
            for (const item of items) {
                const { data: tt } = await adminClient
                    .from('ticket_types')
                    .select('name')
                    .eq('id', item.ticket_type_id)
                    .single()
                if (tt) ticketSummary.push({ name: tt.name, quantity: item.quantity, unitPricePence: 0 })
            }

            void sendBookingConfirmationEmail({
                to: attendee_details.email,
                buyerName: attendee_details.full_name,
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

        // Notify buyer: booking confirmed
        void adminClient.from('notifications').insert({
            user_id: user.id,
            type: 'booking_confirmed',
            title: 'Booking confirmed!',
            body: `Your booking for ${eventInfo?.title ?? 'the event'} is confirmed. Ref: ${booking.booking_ref}`,
            link: `/bookings/${booking.booking_ref}`,
        })

        // Notify organiser: new booking received
        if (eventInfo) {
            const { data: eventFull } = await adminClient
                .from('events')
                .select('organiser_id')
                .eq('id', event_id)
                .single()
            if (eventFull?.organiser_id) {
                const { data: orgProfile } = await adminClient
                    .from('organiser_profiles')
                    .select('user_id')
                    .eq('id', eventFull.organiser_id)
                    .single()
                if (orgProfile?.user_id) {
                    void adminClient.from('notifications').insert({
                        user_id: orgProfile.user_id,
                        type: 'new_booking',
                        title: 'New booking received',
                        body: `A new booking was made for ${eventInfo.title}. Ref: ${booking.booking_ref}`,
                        link: `/organiser/events/${event_id}/attendees`,
                    })
                }
            }

            // Promoter earnings ledger row (commission_pence will be 0 on free bookings,
            // but the row still gives the promoter a "tickets sold" stat).
            if (promoterId !== null) {
                const { data: orgIdRow } = await adminClient
                    .from('events')
                    .select('organiser_id')
                    .eq('id', event_id)
                    .single()
                if (orgIdRow?.organiser_id) {
                    try {
                        await adminClient.from('promoter_earnings').insert({
                            promoter_id: promoterId,
                            booking_id: booking.id,
                            event_id,
                            organiser_id: orgIdRow.organiser_id,
                            ticket_subtotal_pence: 0,
                            commission_percent: promoterCommissionPercent ?? 0,
                            commission_pence: promoterCommissionPence ?? 0,
                            status: 'pending',
                        })
                    } catch (err) {
                        console.error('Failed to insert promoter_earnings (free booking):', err)
                    }
                }
            }
        }

        return NextResponse.json({ free: true, booking_ref: booking.booking_ref })
    }

    if (totalPence < 50) {
        return NextResponse.json({ error: 'Order total too low' }, { status: 400 })
    }

    // Create Stripe PaymentIntent.
    // Platform model: if organiser has Connect, Stripe splits the charge automatically —
    // application_fee_amount stays with Hexlura (booking fee + order processing fee),
    // the remainder (ticket subtotal minus any discount) goes to the organiser instantly.
    // When BOTH fees are waived, application_fee_amount would be 0 anyway — but a
    // destination charge is *always* billed to the platform for Stripe's own processing
    // fee regardless of on_behalf_of (confirmed in Stripe's docs), so that case instead
    // uses a genuine direct charge: the PaymentIntent is created directly on the
    // organiser's connected account (via the stripeAccount request option), which is the
    // only charge type where the connected account itself can bear Stripe's own cut.
    // A partial waiver (only one fee off) still leaves the platform collecting some fee
    // revenue, so it stays a normal destination charge and keeps absorbing Stripe's cut.
    const bothFeesExempt = bookingFeeExempt && processingFeeExempt
    const useDirectCharge = useDestinationCharge && bothFeesExempt
    const platformFeePence = totalBookingFeePence + orderProcessingFeePence
    const chargeType = useDirectCharge ? 'direct' : useDestinationCharge ? 'destination' : 'platform'

    const paymentIntent = await getStripe().paymentIntents.create(
        {
            amount: totalPence,
            currency: 'gbp',
            automatic_payment_methods: { enabled: true },
            ...(useDestinationCharge && !useDirectCharge ? {
                application_fee_amount: platformFeePence,
                transfer_data: { destination: organiserStripeAccountId! },
            } : {}),
            metadata: {
                event_id,
                user_id: user.id,
                organiser_stripe_account_id: organiserStripeAccountId || '',
                use_destination_charge: useDestinationCharge ? 'true' : 'false',
                charge_type: chargeType,
                booking_fee_exempt: bookingFeeExempt ? 'true' : 'false',
                processing_fee_exempt: processingFeeExempt ? 'true' : 'false',
                ticket_subtotal_pence: String(ticketSubtotalPence),
                booking_fee_pence: String(totalBookingFeePence),
                order_processing_fee_pence: String(orderProcessingFeePence),
                discount_pence: String(discountPence),
                promo_code_id: promoCodeId || '',
                items: JSON.stringify(items),
                attendee_name: attendee_details.full_name,
                attendee_email: attendee_details.email,
                attendee_phone: attendee_details.phone,
                promoter_id: promoterId || '',
                promoter_commission_percent: promoterCommissionPercent !== null ? String(promoterCommissionPercent) : '',
                promoter_commission_pence: promoterCommissionPence !== null ? String(promoterCommissionPence) : '',
            },
        },
        useDirectCharge ? { stripeAccount: organiserStripeAccountId! } : undefined
    )

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
        connected_account_id: useDirectCharge ? organiserStripeAccountId : null,
    })
}
