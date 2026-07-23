import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'
import { render } from '@react-email/components'
import BookingConfirmation from '@/emails/booking-confirmation'
import NewBookingOrganiser from '@/emails/new-booking-organiser'
import { Resend } from 'resend'
import { randomUUID } from 'crypto'
import { autoFollowOrganiser } from '@/lib/auto-follow'

function getResend() {
    return new Resend(process.env.RESEND_API_KEY || 'placeholder')
}

/**
 * Shared by both webhook endpoints: the platform webhook (app/api/webhooks/stripe/route.ts)
 * for destination/platform charges, and the Connect webhook
 * (app/api/webhooks/stripe/connect/route.ts) for direct charges, whose
 * payment_intent.succeeded events fire on the connected account instead of the
 * platform. `stripeAccountId` is only passed for the latter — refunds on a
 * direct-charge PaymentIntent must be scoped to the connected account it lives on.
 */
export async function processPaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent, stripeAccountId?: string) {
    const supabase = createAdminClient()
    const meta = paymentIntent.metadata
    const stripeOptions = stripeAccountId ? { stripeAccount: stripeAccountId } : undefined

    const eventId = meta.event_id
    const userId = meta.user_id
    const ticketSubtotalPence = parseInt(meta.ticket_subtotal_pence)
    const bookingFeePence = parseInt(meta.booking_fee_pence)
    const discountPence = parseInt(meta.discount_pence)
    const promoCodeId = meta.promo_code_id || null
    const organiserStripeAccountId = meta.organiser_stripe_account_id || null
    const useDestinationCharge = meta.use_destination_charge === 'true'
    const orderProcessingFeePence = meta.order_processing_fee_pence ? parseInt(meta.order_processing_fee_pence) : 0
    const items: { ticket_type_id: string; quantity: number }[] = JSON.parse(meta.items)
    const attendeeName = meta.attendee_name
    const attendeeEmail = meta.attendee_email
    const promoterId = meta.promoter_id || null
    const promoterCommissionPercent = meta.promoter_commission_percent ? parseFloat(meta.promoter_commission_percent) : null
    const promoterCommissionPence = meta.promoter_commission_pence ? parseInt(meta.promoter_commission_pence) : null

    if (!eventId || !userId) {
        console.error('Missing required metadata in payment_intent:', paymentIntent.id)
        return
    }

    // Idempotency: skip if booking already exists for this PaymentIntent
    const { data: existing } = await supabase
        .from('bookings')
        .select('id')
        .eq('stripe_payment_intent_id', paymentIntent.id)
        .maybeSingle()

    if (existing) {
        console.log('Booking already exists for payment_intent:', paymentIntent.id)
        return
    }

    const totalPence = ticketSubtotalPence - discountPence + bookingFeePence + orderProcessingFeePence

    // Final availability check — refund if oversold
    for (const item of items) {
        const { data: ticketType } = await supabase
            .from('ticket_types')
            .select('quantity_total, quantity_sold, name')
            .eq('id', item.ticket_type_id)
            .single()

        if (!ticketType) {
            console.error(`Ticket type ${item.ticket_type_id} not found — refunding`)
            await getStripe().refunds.create({ payment_intent: paymentIntent.id }, stripeOptions)
            return
        }

        const available = ticketType.quantity_total - ticketType.quantity_sold
        if (item.quantity > available) {
            console.error(`Oversold: ${ticketType.name} — refunding`)
            await getStripe().refunds.create({ payment_intent: paymentIntent.id }, stripeOptions)
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
            order_processing_fee_pence: orderProcessingFeePence,
            discount_pence: discountPence,
            total_pence: totalPence,
            promo_code_id: promoCodeId,
            stripe_payment_intent_id: paymentIntent.id,
            payment_method: paymentIntent.payment_method_types?.[0] || 'card',
            confirmed_at: new Date().toISOString(),
            needs_manual_payout: !organiserStripeAccountId,
            promoter_id: promoterId,
            promoter_commission_percent: promoterCommissionPercent,
            promoter_commission_pence: promoterCommissionPence,
        })
        .select('id, booking_ref, event_id')
        .single()

    if (bookingError || !booking) {
        console.error('Failed to create booking:', bookingError?.message)
        return
    }

    console.log('Booking created:', booking.booking_ref)

    // Promoter earnings ledger — best-effort, isolated try/catch.
    // The UNIQUE(booking_id) constraint makes this idempotent on Stripe retries.
    if (promoterId) {
        try {
            // Re-validate the assignment is still active (could have been removed mid-flight)
            const { data: assignment } = await supabase
                .from('promoter_event_assignments')
                .select('organiser_id')
                .eq('promoter_id', promoterId)
                .eq('event_id', eventId)
                .eq('status', 'active')
                .maybeSingle()

            if (assignment) {
                await supabase.from('promoter_earnings').insert({
                    promoter_id: promoterId,
                    booking_id: booking.id,
                    event_id: eventId,
                    organiser_id: assignment.organiser_id,
                    ticket_subtotal_pence: ticketSubtotalPence,
                    commission_percent: promoterCommissionPercent ?? 0,
                    commission_pence: promoterCommissionPence ?? 0,
                    status: 'pending',
                })
            } else {
                console.warn('Promoter assignment no longer active; skipping earnings row for booking', booking.id)
            }
        } catch (err) {
            console.error('Failed to insert promoter_earnings:', err)
        }
    }

    // Update profile phone if provided
    const attendeePhone = meta.attendee_phone
    if (attendeePhone && userId) {
        await supabase.from('profiles').update({ phone: attendeePhone }).eq('id', userId)
    }

    // Mark reservations as confirmed for this user
    for (const item of items) {
        await supabase
            .from('reservations')
            .update({ status: 'confirmed' })
            .eq('user_id', userId)
            .eq('ticket_type_id', item.ticket_type_id)
            .in('status', ['active', 'confirmed'])
    }

    // Insert booking_items
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
            // Insert one row per individual ticket so each has its own unique QR code
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

        // Update quantity_sold — RPC does the check-and-increment atomically so
        // concurrent sales for the same ticket type can't overwrite each other.
        const { data: incremented, error: rpcError } = await supabase.rpc('increment_quantity_sold', {
            p_ticket_type_id: item.ticket_type_id,
            p_quantity: item.quantity,
        })
        if (rpcError) {
            // RPC itself failed (e.g. missing function) — fall back so a sale is never lost,
            // at the cost of losing the atomicity guarantee for this one update.
            const { data: current } = await supabase
                .from('ticket_types')
                .select('quantity_sold')
                .eq('id', item.ticket_type_id)
                .single()
            await supabase
                .from('ticket_types')
                .update({ quantity_sold: (current?.quantity_sold ?? 0) + item.quantity })
                .eq('id', item.ticket_type_id)
        } else if (incremented === false) {
            // RPC ran fine and correctly refused — no capacity left. Refund and cancel.
            console.error(`Oversold on commit: ${item.ticket_type_id} — refunding and cancelling booking ${booking.id}`)
            await getStripe().refunds.create({ payment_intent: paymentIntent.id }, stripeOptions)
            await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', booking.id)
            return
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

    // Platform model: if use_destination_charge (or a direct charge), Stripe already
    // split/settled the funds at charge time. Only fall back to a manual transfer if
    // this was neither — i.e. a plain platform charge for an organiser who has a
    // connected account but isn't (or is no longer) allowed to use it.
    if (organiserStripeAccountId && !useDestinationCharge) {
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
                console.error('Stripe transfer failed — marking for manual payout:', err)
                await supabase
                    .from('bookings')
                    .update({ needs_manual_payout: true })
                    .eq('id', booking.id)
            }
        }
    }

    // Send confirmation email
    const { data: eventData } = await supabase
        .from('events')
        .select('title, start_at, end_at, venue_name, venue_address, organiser_id')
        .eq('id', eventId)
        .single()

    if (eventData && attendeeEmail) {
        const eventDate = new Intl.DateTimeFormat('en-GB', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        }).format(new Date(eventData.start_at))

        const startTime = new Intl.DateTimeFormat('en-GB', {
            hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Europe/London',
        }).format(new Date(eventData.start_at))

        const endTime = eventData.end_at
            ? new Intl.DateTimeFormat('en-GB', {
                hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Europe/London',
            }).format(new Date(eventData.end_at))
            : null

        const eventTime = endTime ? `${startTime} - ${endTime} UK Time` : `${startTime} UK Time`

        const ticketItems: { name: string; quantity: number; price: string }[] = []
        for (const item of items) {
            const { data: tt } = await supabase
                .from('ticket_types')
                .select('name, price_pence')
                .eq('id', item.ticket_type_id)
                .single()
            if (tt) {
                ticketItems.push({
                    name: tt.name,
                    quantity: item.quantity,
                    price: `£${((tt.price_pence * item.quantity) / 100).toFixed(2)}`,
                })
            }
        }

        // Silently follow the organiser on the buyer's behalf
        void autoFollowOrganiser(userId, eventData.organiser_id)

        // Buyer confirmation email
        try {
            const html = await render(BookingConfirmation({
                buyerName: attendeeName || 'Valued Customer',
                eventName: eventData.title,
                eventDate,
                eventTime,
                venueName: eventData.venue_name || 'TBC',
                venueAddress: eventData.venue_address || '',
                bookingRef: booking.booking_ref,
                ticketItems,
                bookingFeePence,
                processingFeePence: orderProcessingFeePence,
                discountPence,
                totalPaid: `£${(totalPence / 100).toFixed(2)}`,
                downloadUrl: `https://www.hexlura.com/api/tickets/${booking.booking_ref}/pdf`,
            }))

            await getResend().emails.send({
                from: 'Hexlura <noreply@hexlura.com>',
                to: attendeeEmail,
                subject: `Your tickets for ${eventData.title} are confirmed! 🎉`,
                html,
            })
        } catch (err) {
            console.error('Failed to send booking confirmation email:', err)
        }

        // Notify organiser — in-app + email
        try {
            const { data: orgProfile } = await supabase
                .from('organiser_profiles')
                .select('org_name, user_id')
                .eq('id', eventData.organiser_id)
                .single()

            if (orgProfile) {
                void supabase.from('notifications').insert({
                    user_id: orgProfile.user_id,
                    type: 'new_booking',
                    title: 'New booking received',
                    body: `New booking for ${eventData.title}. Ref: ${booking.booking_ref}`,
                    link: `/organiser/events/${eventId}/attendees`,
                })

                const { data: organiserUser } = await supabase
                    .from('profiles')
                    .select('email')
                    .eq('id', orgProfile.user_id)
                    .single()

                if (organiserUser?.email) {
                    const organiserRevenuePence = Math.max(0, ticketSubtotalPence - discountPence)
                    const organiserHtml = await render(NewBookingOrganiser({
                        organiserName: orgProfile.org_name,
                        eventName: eventData.title,
                        eventDate,
                        buyerName: attendeeName || 'Guest',
                        buyerEmail: attendeeEmail,
                        ticketItems,
                        totalRevenue: `£${(organiserRevenuePence / 100).toFixed(2)}`,
                        bookingRef: booking.booking_ref,
                        dashboardUrl: `https://www.hexlura.com/organiser/events/${eventId}/attendees`,
                    }))

                    await getResend().emails.send({
                        from: 'Hexlura <noreply@hexlura.com>',
                        to: organiserUser.email,
                        subject: `New booking for ${eventData.title} — ${booking.booking_ref}`,
                        html: organiserHtml,
                    })
                }
            }
        } catch (err) {
            console.error('Failed to send organiser new booking notification:', err)
        }
    }
}
