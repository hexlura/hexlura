import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()

    const { data: organiser } = await adminClient
        .from('organiser_profiles').select('id').eq('user_id', user.id).single()
    if (!organiser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Verify ownership
    const { data: event } = await adminClient
        .from('events')
        .select('id, title')
        .eq('id', params.id)
        .eq('organiser_id', organiser.id)
        .single()

    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Update status
    await adminClient.from('events').update({ status: 'cancelled' }).eq('id', params.id)

    // Email attendees
    try {
        const { data: bookings } = await adminClient
            .from('bookings')
            .select('id, user_id')
            .eq('event_id', params.id)
            .eq('status', 'confirmed')

        const bookingIds = (bookings || []).map(b => b.id)

        // Notify each attendee
        for (const b of (bookings || []) as { id: string; user_id: string }[]) {
            void adminClient.from('notifications').insert({
                user_id: b.user_id,
                type: 'event_cancelled',
                title: 'Event cancelled',
                body: `${event.title} has been cancelled. If you paid for tickets, you will receive a full refund.`,
                link: '/bookings',
            })
        }
        if (bookingIds.length) {
            const { data: items } = await adminClient
                .from('booking_items')
                .select('attendee_email')
                .in('booking_id', bookingIds)

            const emails = Array.from(new Set((items || []).map(i => i.attendee_email).filter(Boolean)))
            if (emails.length) {
                const resend = new Resend(process.env.RESEND_API_KEY || 'placeholder')
                await resend.emails.send({
                    from: 'Hexlura <noreply@hexlura.com>',
                    to: emails as string[],
                    subject: `Event Cancelled: ${event.title}`,
                    html: `<p>We're sorry to inform you that <strong>${event.title}</strong> has been cancelled. If you paid for tickets, you will receive a full refund within 5-10 business days.</p><p>We apologise for any inconvenience.</p>`,
                })
            }
        }
    } catch (err) {
        console.error('Failed to send cancellation emails:', err)
    }

    return NextResponse.json({ success: true })
}
