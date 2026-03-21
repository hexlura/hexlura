import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'
import { sendBookingConfirmationEmail } from '@/lib/email'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    let event: Stripe.Event

    try {
        event = getStripe().webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        )
    } catch (err) {
        console.error('Webhook signature verification failed:', err)
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session

        try {
            await handleCheckoutComplete(session)
        } catch (err) {
            console.error('Error handling checkout.session.completed:', err)
            // Still return 200 so Stripe does not retry
        }
    }

    if (event.type === 'payment_intent.payment_failed') {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.error('Payment failed:', paymentIntent.id, paymentIntent.last_payment_error?.message)
    }

    return NextResponse.json({ received: true }, { status: 200 })
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
    const supabase = createAdminClient()

    // The PaymentIntent holds all metadata set by create-intent/route.ts
    const paymentIntentId = session.payment_intent as string
    if (!paymentIntentId) {
        console.error('No payment_intent on session:', session.id)
        return
    }

    // Idempotency: if a booking already exists for this PaymentIntent, skip
    const { data: existing } = await supabase
        .from('bookings')
        .select('id')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .maybeSingle()

    if (existing) {
        console.log('Booking already exists for payment_intent:', paymentIntentId)
        return
    }

    // Retrieve PaymentIntent to access metadata set at checkout creation
    const paymentIntent = await getStripe().paymentIntents.retrieve(paymentIntentId)
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

    if (!eventId || !userId) {
        console.error('Missing required metadata in payment_intent:', paymentIntentId)
        return
    }

    const totalPence = ticketSubtotalPence - discountPence + bookingFeePence

    // Final availability check — refund if oversold
    for (const item of items) {
        const { data: ticketType } = await supabase
            .from('ticket_types')
            .select('quantity_total, quantity_sold, name')
            .eq('id', item.ticket_type_id)
            .single()

        if (!ticketType) {
            console.error(`Ticket type ${item.ticket_type_id} not found — refunding`)
            await getStripe().refunds.create({ payment_intent: paymentIntentId })
            return
        }

        const available = ticketType.quantity_total - ticketType.quantity_sold
        if (item.quantity > available) {
            console.error(`Oversold: ${ticketType.name} — refunding`)
            await getStripe().refunds.create({ payment_intent: paymentIntentId })
            return
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
            stripe_payment_intent_id: paymentIntentId,
            payment_method: 'card',
            confirmed_at: new Date().toISOString(),
            needs_manual_payout: !organiserStripeAccountId,
        })
        .select('id, booking_ref')
        .single()

    if (bookingError || !booking) {
        console.error('Failed to create booking:', bookingError?.message)
        return
    }

    console.log('Booking created:', booking.booking_ref)

    // Insert booking_items
    for (const item of items) {
        const { data: ticketType } = await supabase
            .from('ticket_types')
            .select('price_pence')
            .eq('id', item.ticket_type_id)
            .single()

        await supabase.from('booking_items').insert({
            booking_id: booking.id,
            ticket_type_id: item.ticket_type_id,
            quantity: item.quantity,
            unit_price_pence: ticketType?.price_pence || 0,
            attendee_name: attendeeName,
            attendee_email: attendeeEmail,
            qr_code: randomUUID(),
        })

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

    // Send confirmation email
    const { data: eventData } = await supabase
        .from('events')
        .select('title, start_at, end_at, venue_name, venue_address')
        .eq('id', eventId)
        .single()

    if (eventData && attendeeEmail) {
        const eventDate = new Intl.DateTimeFormat('en-GB', {
            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
        }).format(new Date(eventData.start_at))

        const eventTime = new Intl.DateTimeFormat('en-GB', {
            hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
        }).format(new Date(eventData.start_at))

        const ticketSummary: { name: string; quantity: number; subtotalPence: number }[] = []
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
                    subtotalPence: tt.price_pence * item.quantity,
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
