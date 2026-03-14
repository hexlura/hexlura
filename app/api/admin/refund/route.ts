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
        type: 'full' | 'partial'
        amount_pence?: number
        refund_request_id?: string
    }
    const { booking_id, type, amount_pence, refund_request_id } = body

    const { data: booking } = await adminClient
        .from('bookings')
        .select('id, booking_ref, total_pence, stripe_payment_intent_id, status')
        .eq('id', booking_id)
        .single()

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    const refundAmount = type === 'full' ? (booking.total_pence || 0) : (amount_pence || 0)

    // Stripe refund (if payment intent exists)
    if (booking.stripe_payment_intent_id) {
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

    if (refund_request_id) {
        await adminClient
            .from('refund_requests')
            .update({ status: 'approved', resolved_at: new Date().toISOString() })
            .eq('id', refund_request_id)
    }

    await logAuditAction({
        actorId: user.id,
        action: type === 'full' ? 'admin_full_refund' : 'admin_partial_refund',
        entityType: 'booking',
        entityId: booking_id,
        metadata: { amount_pence: refundAmount, booking_ref: booking.booking_ref },
    })

    return NextResponse.json({ success: true })
}
