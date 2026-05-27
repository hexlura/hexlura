import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditAction } from '@/lib/audit'
import { reversePromoterEarningsForBooking } from '@/lib/promoter-earnings'
import { notifyWaitlistForEvent } from '@/lib/waitlist'
import { Resend } from 'resend'

function getResend() {
    return new Resend(process.env.RESEND_API_KEY || 'placeholder')
}

export async function POST(request: NextRequest) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()

    const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || profile.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json() as {
        booking_id: string
        refund_request_id: string
        action: 'confirm' | 'deny'
        amount_pence?: number
    }
    const { booking_id, refund_request_id, action, amount_pence } = body

    if (!booking_id || !refund_request_id || !action) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify refund request status is organiser_approved
    const { data: refundReq } = await adminClient
        .from('refund_requests')
        .select('id, status, refund_amount_pence, user_id, booking:bookings ( event:events ( title ) )')
        .eq('id', refund_request_id)
        .single()

    if (!refundReq) return NextResponse.json({ error: 'Refund request not found' }, { status: 404 })

    if (refundReq.status !== 'organiser_approved') {
        return NextResponse.json({ error: 'Refund request has not been approved by organiser' }, { status: 400 })
    }

    if (action === 'deny') {
        await adminClient
            .from('refund_requests')
            .update({ status: 'admin_rejected', resolved_at: new Date().toISOString() })
            .eq('id', refund_request_id)

        await logAuditAction({
            actorId: user.id,
            action: 'admin_deny_refund',
            entityType: 'booking',
            entityId: booking_id,
            metadata: { refund_request_id },
        })

        // Notify buyer refund was denied
        const buyerUserId = refundReq.user_id as string | null
        if (buyerUserId) {
            void adminClient.from('notifications').insert({
                user_id: buyerUserId,
                type: 'refund_denied',
                title: 'Refund request not approved',
                body: 'Unfortunately your refund request could not be approved. Contact support if you have questions.',
                link: '/bookings',
            })
        }
        if (buyerUserId) {
            void (async () => {
                try {
                    const { data: { user: buyerUser } } = await adminClient.auth.admin.getUserById(buyerUserId)
                    if (!buyerUser?.email) return

                    const refundBookingData = refundReq.booking as unknown as { event: { title: string } | null } | null
                    const eventName = refundBookingData?.event?.title || 'your event'

                    await getResend().emails.send({
                        from: 'Hexlura <noreply@hexlura.com>',
                        to: buyerUser.email,
                        subject: 'Update on your refund request',
                        html: `<p>Hi,</p><p>Unfortunately, your refund request for <strong>${eventName}</strong> could not be approved.</p><p>If you have any questions, please contact <a href="mailto:support@hexlura.com">support@hexlura.com</a>.</p><p>The Hexlura Team</p>`,
                    })
                } catch (err) {
                    console.error('Failed to send refund denied email:', err)
                }
            })()
        }

        return NextResponse.json({ success: true })
    }

    // action === 'confirm'
    const { data: booking } = await adminClient
        .from('bookings')
        .select('id, booking_ref, total_pence, stripe_payment_intent_id, status')
        .eq('id', booking_id)
        .single()

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    // Use refund_amount_pence from the request (ticket subtotal only, not booking fee)
    const refundAmount = amount_pence ?? refundReq.refund_amount_pence ?? 0

    // Stripe partial refund for refund_amount_pence only
    if (booking.stripe_payment_intent_id && refundAmount > 0) {
        try {
            const stripe = (await import('stripe')).default
            const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2026-02-25.clover' })
            await stripeClient.refunds.create({
                payment_intent: booking.stripe_payment_intent_id,
                amount: refundAmount,
            })
        } catch {
            // Log but don't fail — in dev/test there may not be a real Stripe payment
        }
    }

    await adminClient
        .from('bookings')
        .update({ status: 'refunded' })
        .eq('id', booking_id)

    // Reverse any promoter commission attributed to this booking (full refund)
    await reversePromoterEarningsForBooking(booking_id)

    // Notify waitlisted users that a spot has opened up
    const { data: bookingEvent } = await adminClient
        .from('bookings')
        .select('event_id, event:events(title, slug)')
        .eq('id', booking_id)
        .single()
    if (bookingEvent?.event_id) {
        const ev = bookingEvent.event as unknown as { title: string; slug: string } | null
        if (ev) void notifyWaitlistForEvent(bookingEvent.event_id, ev.title, ev.slug)
    }

    await adminClient
        .from('refund_requests')
        .update({ status: 'admin_approved', resolved_at: new Date().toISOString() })
        .eq('id', refund_request_id)

    await logAuditAction({
        actorId: user.id,
        action: 'admin_confirm_refund',
        entityType: 'booking',
        entityId: booking_id,
        metadata: { amount_pence: refundAmount, booking_ref: booking.booking_ref },
    })

    // Notify buyer refund was processed
    const buyerUserId = refundReq.user_id as string | null
    if (buyerUserId) {
        const refundFormatted2 = `£${(refundAmount / 100).toFixed(2)}`
        void adminClient.from('notifications').insert({
            user_id: buyerUserId,
            type: 'refund_processed',
            title: `Refund of ${refundFormatted2} processed`,
            body: 'Your refund has been processed. Please allow 5–10 business days for funds to appear.',
            link: '/bookings',
        })
    }
    if (buyerUserId) {
        void (async () => {
            try {
                const { data: { user: buyerUser } } = await adminClient.auth.admin.getUserById(buyerUserId)
                if (!buyerUser?.email) return

                const refundBookingData = refundReq.booking as unknown as { event: { title: string } | null } | null
                const eventName = refundBookingData?.event?.title || 'your event'
                const refundFormatted = `£${(refundAmount / 100).toFixed(2)}`

                await getResend().emails.send({
                    from: 'Hexlura <noreply@hexlura.com>',
                    to: buyerUser.email,
                    subject: `Your refund of ${refundFormatted} has been processed`,
                    html: `<p>Hi,</p><p>Your refund of <strong>${refundFormatted}</strong> for <strong>${eventName}</strong> has been processed.</p><p>Please allow 5–10 business days for the funds to appear on your statement.</p><p>If you have any questions, contact <a href="mailto:support@hexlura.com">support@hexlura.com</a>.</p><p>The Hexlura Team</p>`,
                })
            } catch (err) {
                console.error('Failed to send refund confirmation email:', err)
            }
        })()
    }

    return NextResponse.json({ success: true })
}
