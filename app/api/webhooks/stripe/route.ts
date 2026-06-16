import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'
import { render } from '@react-email/components'
import BookingConfirmation from '@/emails/booking-confirmation'
import PayoutFailedAdmin from '@/emails/payout-failed-admin'
import { sendOrganiserIdentityVerifiedEmail } from '@/lib/email'
import { Resend } from 'resend'
import { randomUUID } from 'crypto'

function getResend() {
    return new Resend(process.env.RESEND_API_KEY || 'placeholder')
}

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

    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object as Stripe.PaymentIntent

        try {
            await handlePaymentIntentSucceeded(paymentIntent)
        } catch (err) {
            console.error('Error handling payment_intent.succeeded:', err)
            // Still return 200 so Stripe does not retry
        }
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
        const bookingRef = paymentIntent.metadata?.booking_ref

        if (bookingRef) {
            try {
                const supabase = createAdminClient()

                const { data: booking } = await supabase
                    .from('bookings')
                    .select('id, status')
                    .eq('booking_ref', bookingRef)
                    .maybeSingle()

                if (booking && booking.status === 'pending') {
                    await supabase
                        .from('bookings')
                        .update({ status: 'cancelled' })
                        .eq('id', booking.id)

                    const { data: bookingItems } = await supabase
                        .from('booking_items')
                        .select('ticket_type_id, quantity')
                        .eq('booking_id', booking.id)

                    if (bookingItems) {
                        for (const item of bookingItems) {
                            const { data: tt } = await supabase
                                .from('ticket_types')
                                .select('quantity_sold')
                                .eq('id', item.ticket_type_id)
                                .single()

                            if (tt) {
                                await supabase
                                    .from('ticket_types')
                                    .update({ quantity_sold: Math.max(0, tt.quantity_sold - item.quantity) })
                                    .eq('id', item.ticket_type_id)
                            }
                        }
                    }

                    console.log('Payment failed — booking cancelled and tickets released:', bookingRef)
                }
            } catch (err) {
                console.error('Error handling payment_intent.payment_failed:', err)
            }
        } else {
            console.error('Payment failed:', paymentIntent.id, paymentIntent.last_payment_error?.message)
        }
    }

    if ((event.type as string) === 'transfer.failed') {
        const transfer = event.data.object as Stripe.Transfer

        try {
            const supabase = createAdminClient()

            const { data: payout } = await supabase
                .from('payouts')
                .select('id, amount_pence, organiser_id, event_id')
                .eq('stripe_transfer_id', transfer.id)
                .maybeSingle()

            if (payout) {
                await supabase
                    .from('payouts')
                    .update({ status: 'failed' })
                    .eq('id', payout.id)

                const { data: adminUser } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('role', 'admin')
                    .limit(1)
                    .maybeSingle()

                if (adminUser) {
                    const amountPounds = ((payout.amount_pence ?? 0) / 100).toFixed(2)
                    await supabase.from('notifications').insert({
                        user_id: adminUser.id,
                        type: 'payout_failed',
                        title: 'Payout transfer failed',
                        body: `Payout transfer failed for £${amountPounds} — manual action required`,
                    })
                }

                // Send payout failed email to admin
                void (async () => {
                    try {
                        let organiserName = 'Unknown Organiser'
                        let eventName = 'Unknown Event'

                        if (payout.organiser_id) {
                            const { data: orgProfile } = await supabase
                                .from('organiser_profiles')
                                .select('org_name')
                                .eq('id', payout.organiser_id)
                                .single()
                            if (orgProfile?.org_name) organiserName = orgProfile.org_name
                        }

                        if (payout.event_id) {
                            const { data: eventRow } = await supabase
                                .from('events')
                                .select('title')
                                .eq('id', payout.event_id)
                                .single()
                            if (eventRow?.title) eventName = eventRow.title
                        }

                        const html = await render(PayoutFailedAdmin({
                            organiserName,
                            eventName,
                            amount: `£${((payout.amount_pence ?? 0) / 100).toFixed(2)}`,
                            failureReason: 'Stripe transfer failed — check Stripe dashboard for details',
                            dashboardUrl: 'https://www.hexlura.com/admin/payouts',
                        }))

                        await getResend().emails.send({
                            from: 'Hexlura <noreply@hexlura.com>',
                            to: 'support@hexlura.com',
                            subject: '⚠️ Payout failed — manual action required',
                            html,
                        })
                    } catch (err) {
                        console.error('Failed to send payout failed email:', err)
                    }
                })()
            }

            console.log('Transfer failed — payout marked as failed:', transfer.id)
        } catch (err) {
            console.error('Error handling transfer.failed:', err)
        }
    }

    if (event.type === 'account.updated') {
        const account = event.data.object as Stripe.Account
        console.log('account.updated received:', account.id, {
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
        })

        try {
            const supabase = createAdminClient()
            await supabase
                .from('organiser_profiles')
                .update({
                    stripe_charges_enabled: account.charges_enabled ?? false,
                    stripe_payouts_enabled: account.payouts_enabled ?? false,
                })
                .eq('stripe_account_id', account.id)
        } catch (err) {
            console.error('Failed to update organiser Connect status from account.updated:', err)
        }
    }

    if (
        event.type === 'identity.verification_session.verified' ||
        event.type === 'identity.verification_session.requires_input' ||
        event.type === 'identity.verification_session.canceled'
    ) {
        try {
            await handleIdentityVerificationEvent(event)
        } catch (err) {
            console.error(`Error handling ${event.type}:`, err)
        }
    }

    return NextResponse.json({ received: true }, { status: 200 })
}

async function handleIdentityVerificationEvent(event: Stripe.Event) {
    const session = event.data.object as Stripe.Identity.VerificationSession
    const supabase = createAdminClient()

    // Match by metadata.organiser_id (set when we create the session) with a
    // fallback to identity_session_id in case metadata is missing.
    const organiserId = session.metadata?.organiser_id
    let organiserRow: { id: string; user_id: string; org_name: string } | null = null

    if (organiserId) {
        const { data } = await supabase
            .from('organiser_profiles')
            .select('id, user_id, org_name')
            .eq('id', organiserId)
            .maybeSingle()
        organiserRow = data
    }

    if (!organiserRow) {
        const { data } = await supabase
            .from('organiser_profiles')
            .select('id, user_id, org_name')
            .eq('identity_session_id', session.id)
            .maybeSingle()
        organiserRow = data
    }

    if (!organiserRow) {
        console.warn(`Identity webhook ${event.type} received but no matching organiser for session ${session.id}`)
        return
    }

    if (event.type === 'identity.verification_session.verified') {
        const verifiedAt = new Date()
        await supabase
            .from('organiser_profiles')
            .update({
                identity_status: 'verified',
                identity_verified_at: verifiedAt.toISOString(),
                identity_failure_reason: null,
            })
            .eq('id', organiserRow.id)

        // Notify the organiser: in-app + email
        await supabase.from('notifications').insert({
            user_id: organiserRow.user_id,
            type: 'identity_verified',
            title: 'Identity verified',
            body: 'Your identity has been verified — payouts are now enabled.',
            link: '/organiser/payouts',
        })

        const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', organiserRow.user_id)
            .single()

        if (profile?.email) {
            await sendOrganiserIdentityVerifiedEmail({
                to: profile.email,
                fullName: profile.full_name || organiserRow.org_name,
                orgName: organiserRow.org_name,
                verifiedAt,
            })
        }
        return
    }

    if (event.type === 'identity.verification_session.requires_input') {
        const reason = session.last_error?.reason ?? session.last_error?.code ?? 'unknown'
        await supabase
            .from('organiser_profiles')
            .update({
                identity_status: 'requires_input',
                identity_failure_reason: reason,
            })
            .eq('id', organiserRow.id)

        await supabase.from('notifications').insert({
            user_id: organiserRow.user_id,
            type: 'identity_requires_input',
            title: 'Identity verification needs another try',
            body: 'We couldn’t verify your ID. Open settings to try again.',
            link: '/organiser/settings',
        })
        return
    }

    if (event.type === 'identity.verification_session.canceled') {
        await supabase
            .from('organiser_profiles')
            .update({ identity_status: 'canceled' })
            .eq('id', organiserRow.id)
        return
    }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    const supabase = createAdminClient()
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
            await getStripe().refunds.create({ payment_intent: paymentIntent.id })
            return
        }

        const available = ticketType.quantity_total - ticketType.quantity_sold
        if (item.quantity > available) {
            console.error(`Oversold: ${ticketType.name} — refunding`)
            await getStripe().refunds.create({ payment_intent: paymentIntent.id })
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

        // Update quantity_sold
        const { error: rpcError } = await supabase.rpc('increment_quantity_sold', {
            p_ticket_type_id: item.ticket_type_id,
            p_quantity: item.quantity,
        })
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
    }
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
    const promoterId = meta.promoter_id || null
    const promoterCommissionPercent = meta.promoter_commission_percent ? parseFloat(meta.promoter_commission_percent) : null
    const promoterCommissionPence = meta.promoter_commission_pence ? parseInt(meta.promoter_commission_pence) : null

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
            promoter_id: promoterId,
            promoter_commission_percent: promoterCommissionPercent,
            promoter_commission_pence: promoterCommissionPence,
        })
        .select('id, booking_ref')
        .single()

    if (bookingError || !booking) {
        console.error('Failed to create booking:', bookingError?.message)
        return
    }

    console.log('Booking created:', booking.booking_ref)

    // Promoter earnings ledger — best-effort, isolated try/catch.
    if (promoterId) {
        try {
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
    const attendeePhoneCS = meta.attendee_phone
    if (attendeePhoneCS && userId) {
        await supabase.from('profiles').update({ phone: attendeePhoneCS }).eq('id', userId)
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
    }
}

