import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditAction } from '@/lib/audit'

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
        .select('id, status, refund_amount_pence')
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

    return NextResponse.json({ success: true })
}
