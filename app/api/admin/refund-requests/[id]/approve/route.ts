import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditAction } from '@/lib/audit'
import { reversePromoterEarningsForBooking } from '@/lib/promoter-earnings'
import { notifyWaitlistForEvent } from '@/lib/waitlist'
import { notifyAdmins } from '@/lib/notify-admins'

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()
    const { data: adminProfile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
    if (!adminProfile || adminProfile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Load refund request
    const { data: refundReq } = await adminClient
        .from('refund_requests')
        .select('id, status, booking_id, refund_amount_pence, user_id')
        .eq('id', params.id)
        .single()

    if (!refundReq) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Don't re-process already resolved requests
    if (['admin_approved', 'rejected', 'admin_rejected'].includes(refundReq.status)) {
        return NextResponse.json({ error: 'Refund request already resolved' }, { status: 400 })
    }

    const { data: booking } = await adminClient
        .from('bookings')
        .select('id, booking_ref, ticket_subtotal_pence, discount_pence, total_pence, stripe_payment_intent_id')
        .eq('id', refundReq.booking_id)
        .single()

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    // Never refund more than was actually paid for tickets (excludes the non-refundable
    // booking fee, and never exceeds face value minus any promo-code discount).
    const maxRefundablePence = Math.max(0, (booking.ticket_subtotal_pence || 0) - (booking.discount_pence || 0))
    const requestedAmount = (refundReq.refund_amount_pence ?? booking.total_pence ?? 0) as number
    const refundAmount = Math.min(requestedAmount, maxRefundablePence)

    // Issue Stripe refund only if paid and has a real amount. A failed refund
    // must not fall through to marking the booking refunded — that voids the
    // buyer's tickets for a refund that never actually happened. Bail out and
    // leave the request in its current status so it stays actionable.
    if (booking.stripe_payment_intent_id && refundAmount > 0) {
        try {
            const stripe = (await import('stripe')).default
            const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2026-02-25.clover' })
            await stripeClient.refunds.create({
                payment_intent: booking.stripe_payment_intent_id,
                amount: refundAmount,
            })
        } catch (err) {
            console.error('Stripe refund failed:', err)
            await logAuditAction({
                actorId: user.id,
                action: 'admin_force_approve_refund_failed',
                entityType: 'booking',
                entityId: booking.id,
                metadata: { refund_request_id: params.id, amount_pence: refundAmount, booking_ref: booking.booking_ref },
            })
            await notifyAdmins({
                type: 'refund_failed',
                title: 'Refund failed — manual action required',
                body: `Stripe refund of £${(refundAmount / 100).toFixed(2)} for booking ${booking.booking_ref} failed. The booking was NOT marked refunded — check Stripe and retry.`,
                link: '/admin/refunds',
            })
            return NextResponse.json({ error: 'Stripe refund failed. The booking was not marked as refunded — check Stripe and try again.' }, { status: 502 })
        }
    }

    await adminClient
        .from('bookings')
        .update({ status: 'refunded' })
        .eq('id', booking.id)

    // Reverse any promoter commission attributed to this booking (full refund)
    await reversePromoterEarningsForBooking(booking.id)

    // Notify waitlisted users that a spot has opened up
    const { data: refundBooking } = await adminClient
        .from('bookings')
        .select('event_id, event:events(title, slug)')
        .eq('id', booking.id)
        .single()
    if (refundBooking?.event_id) {
        const ev = refundBooking.event as unknown as { title: string; slug: string } | null
        if (ev) void notifyWaitlistForEvent(refundBooking.event_id, ev.title, ev.slug)
    }

    await adminClient
        .from('refund_requests')
        .update({ status: 'admin_approved', resolved_at: new Date().toISOString() })
        .eq('id', params.id)

    await logAuditAction({
        actorId: user.id,
        action: 'admin_force_approve_refund',
        entityType: 'booking',
        entityId: booking.id,
        metadata: { refund_request_id: params.id, amount_pence: refundAmount, booking_ref: booking.booking_ref },
    })

    return NextResponse.json({ success: true })
}
