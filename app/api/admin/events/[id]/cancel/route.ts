import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAuditAction } from '@/lib/audit'

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!adminProfile || adminProfile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await supabase.from('events').update({ status: 'cancelled' }).eq('id', params.id)

    // Get all confirmed bookings for this event and mark as refunded
    const { data: bookings } = await supabase
        .from('bookings')
        .select('id, total_pence, stripe_payment_intent_id')
        .eq('event_id', params.id)
        .eq('status', 'confirmed')

    let refundedCount = 0
    let totalRefundedPence = 0

    for (const booking of (bookings || []) as { id: string; total_pence: number | null; stripe_payment_intent_id: string | null }[]) {
        if (booking.stripe_payment_intent_id) {
            try {
                const stripe = (await import('stripe')).default
                const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2026-02-25.clover' })
                await stripeClient.refunds.create({ payment_intent: booking.stripe_payment_intent_id })
            } catch {
                // Continue even if Stripe refund fails
            }
        }
        await supabase.from('bookings').update({ status: 'refunded' }).eq('id', booking.id)
        refundedCount++
        totalRefundedPence += booking.total_pence || 0
    }

    await logAuditAction({
        actorId: user.id,
        action: 'cancel_event',
        entityType: 'event',
        entityId: params.id,
        metadata: { bookings_refunded: refundedCount, total_refunded_pence: totalRefundedPence },
    })

    return NextResponse.json({ success: true, refunded: refundedCount })
}
