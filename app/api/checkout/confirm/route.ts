import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendBookingConfirmationEmail } from '@/lib/email'
import { randomUUID } from 'crypto'

export async function POST(request: Request) {
    const body = await request.text()
    const sig = request.headers.get('stripe-signature')

    if (!sig) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    let event
    try {
        event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error('Webhook signature verification failed:', message)
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object
        const meta = paymentIntent.metadata

        const eventId = meta.event_id
        const userId = meta.user_id
        const ticketSubtotalPence = parseInt(meta.ticket_subtotal_pence)
        const bookingFeePence = parseInt(meta.booking_fee_pence)
        const discountPence = parseInt(meta.discount_pence)
        const promoCodeId = meta.promo_code_id || null
        const organiserStripeAccountId = meta.organiser_stripe_account_id || null
        const items: { ticket_type_id: string; quantity: number }[] = JSON.parse(meta.items)
        const attendeeName = meta.attendee_name
        const attendeeEmail = meta.attendee_email

        const totalPence = ticketSubtotalPence - discountPence + bookingFeePence

        const supabase = createAdminClient()

        // Final availability check
        for (const item of items) {
            const { data: ticketType } = await supabase
                .from('ticket_types')
                .select('quantity_total, quantity_sold, name')
                .eq('id', item.ticket_type_id)
                .single()

            if (!ticketType) {
                console.error(`Ticket type ${item.ticket_type_id} not found during confirm`)
                // Refund
                await getStripe().refunds.create({ payment_intent: paymentIntent.id })
                return NextResponse.json({ received: true })
            }

            const available = ticketType.quantity_total - ticketType.quantity_sold
            if (item.quantity > available) {
                console.error(`Oversold: ${ticketType.name}. Refunding.`)
                await getStripe().refunds.create({ payment_intent: paymentIntent.id })
                return NextResponse.json({ received: true })
            }
        }

        // Create booking
        const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .insert({
                user_id: userId,
                event_id: eventId,
                status: 'confirmed',
                ticket_subtotal_pence: ticketSubtotalPence,
                booking_fee_pence: bookingFeePence,
                discount_pence: discountPence,
                total_pence: totalPence,
                promo_code_id: promoCodeId,
                stripe_payment_intent_id: paymentIntent.id,
                payment_method: paymentIntent.payment_method_types?.[0] || 'card',
                confirmed_at: new Date().toISOString(),
                needs_manual_payout: !organiserStripeAccountId,
            })
            .select('id, booking_ref')
            .single()

        if (bookingError || !booking) {
            console.error('Failed to create booking:', bookingError?.message)
            return NextResponse.json({ received: true })
        }

        // Insert booking items — one row per physical ticket so each person
        // gets their own unique QR code and can check in individually.
        for (const item of items) {
            const { data: ticketType } = await supabase
                .from('ticket_types')
                .select('price_pence, is_group, group_size')
                .eq('id', item.ticket_type_id)
                .single()

            const tt = ticketType as { price_pence: number; is_group?: boolean; group_size?: number } | null

            if (tt?.is_group && (tt.group_size || 1) > 1) {
                const totalMembers = item.quantity * (tt.group_size || 1)
                for (let g = 1; g <= totalMembers; g++) {
                    const { error: insertErr } = await supabase.from('booking_items').insert({
                        booking_id: booking.id,
                        ticket_type_id: item.ticket_type_id,
                        quantity: 1,
                        unit_price_pence: tt.price_pence || 0,
                        attendee_name: attendeeName,
                        attendee_email: attendeeEmail,
                        qr_code: randomUUID(),
                    })
                    if (insertErr) {
                        console.error('Failed to insert group booking_item:', insertErr.message)
                        throw new Error(`booking_item insert failed: ${insertErr.message}`)
                    }
                }
            } else {
                for (let t = 0; t < item.quantity; t++) {
                    const { error: insertErr } = await supabase.from('booking_items').insert({
                        booking_id: booking.id,
                        ticket_type_id: item.ticket_type_id,
                        quantity: 1,
                        unit_price_pence: tt?.price_pence || 0,
                        attendee_name: attendeeName,
                        attendee_email: attendeeEmail,
                        qr_code: randomUUID(),
                    })
                    if (insertErr) {
                        console.error('Failed to insert booking_item:', insertErr.message)
                        throw new Error(`booking_item insert failed: ${insertErr.message}`)
                    }
                }
            }

            // Update quantity_sold
            const { error: rpcError } = await supabase.rpc('increment_quantity_sold', {
                p_ticket_type_id: item.ticket_type_id,
                p_quantity: item.quantity,
            })
            // Fallback: direct update if RPC doesn't exist
            if (rpcError) {
                const { data: current } = await supabase
                    .from('ticket_types')
                    .select('quantity_sold')
                    .eq('id', item.ticket_type_id)
                    .single()
                await supabase
                    .from('ticket_types')
                    .update({ quantity_sold: (current?.quantity_sold ?? 0) + item.quantity })
                    .eq('id', item.ticket_type_id)
            }
        }

        // Increment promo code usage
        if (promoCodeId) {
            const { data: promo } = await supabase
                .from('promo_codes')
                .select('uses_count')
                .eq('id', promoCodeId)
                .single()

            if (promo) {
                await supabase
                    .from('promo_codes')
                    .update({ uses_count: promo.uses_count + 1 })
                    .eq('id', promoCodeId)
            }
        }

        // Stripe Connect transfer
        if (organiserStripeAccountId) {
            const transferAmount = ticketSubtotalPence - discountPence
            if (transferAmount > 0) {
                try {
                    await getStripe().transfers.create({
                        amount: transferAmount,
                        currency: 'gbp',
                        destination: organiserStripeAccountId,
                        transfer_group: booking.booking_ref,
                    })
                } catch (err) {
                    console.error('Stripe transfer failed:', err)
                }
            }
        }

        // Send confirmation email asynchronously
        const { data: eventData } = await supabase
            .from('events')
            .select('title, start_at, end_at, venue_name, venue_address, organiser_id')
            .eq('id', eventId)
            .single()

        // Notify buyer: booking confirmed
        if (userId) {
            void supabase.from('notifications').insert({
                user_id: userId,
                type: 'booking_confirmed',
                title: 'Booking confirmed!',
                body: `Your booking for ${eventData?.title ?? 'the event'} is confirmed. Ref: ${booking.booking_ref}`,
                link: `/bookings/${booking.booking_ref}`,
            })
        }

        // Notify organiser: new booking received
        if (eventData?.organiser_id) {
            const { data: orgProfile } = await supabase
                .from('organiser_profiles')
                .select('user_id')
                .eq('id', eventData.organiser_id)
                .single()
            if (orgProfile?.user_id) {
                void supabase.from('notifications').insert({
                    user_id: orgProfile.user_id,
                    type: 'new_booking',
                    title: 'New booking received',
                    body: `A new booking was made for ${eventData.title}. Ref: ${booking.booking_ref}`,
                    link: `/organiser/events/${eventId}/attendees`,
                })
            }
        }

        if (eventData && attendeeEmail) {
            const eventDate = new Intl.DateTimeFormat('en-GB', {
                weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
            }).format(new Date(eventData.start_at))

            const eventTime = new Intl.DateTimeFormat('en-GB', {
                hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
            }).format(new Date(eventData.start_at))

            // Fetch ticket names for email
            const ticketSummary: { name: string; quantity: number; unitPricePence: number }[] = []
            for (const item of items) {
                const { data: tt } = await supabase
                    .from('ticket_types')
                    .select('name, price_pence')
                    .eq('id', item.ticket_type_id)
                    .single()
                if (tt) {
                    ticketSummary.push({
                        name: tt.name,
                        quantity: item.quantity,
                        unitPricePence: tt.price_pence,
                    })
                }
            }

            void sendBookingConfirmationEmail({
                to: attendeeEmail,
                bookingRef: booking.booking_ref,
                eventName: eventData.title,
                eventDate,
                eventTime,
                venueName: eventData.venue_name || 'TBC',
                venueAddress: eventData.venue_address || '',
                ticketSummary,
                bookingFeePence,
                discountPence,
                totalPence,
            })
        }
    }

    if (event.type === 'payment_intent.payment_failed') {
        const paymentIntent = event.data.object
        console.error('Payment failed:', paymentIntent.id, paymentIntent.last_payment_error?.message)
    }

    return NextResponse.json({ received: true })
}
