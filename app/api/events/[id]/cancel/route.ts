import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: organiser } = await supabase
        .from('organiser_profiles').select('id').eq('user_id', user.id).single()
    if (!organiser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Verify ownership
    const { data: event } = await supabase
        .from('events')
        .select('id, title')
        .eq('id', params.id)
        .eq('organiser_id', organiser.id)
        .single()

    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Update status
    await supabase.from('events').update({ status: 'cancelled' }).eq('id', params.id)

    // Email attendees
    try {
        const { data: bookings } = await supabase
            .from('bookings')
            .select('id')
            .eq('event_id', params.id)
            .eq('status', 'confirmed')

        const bookingIds = (bookings || []).map(b => b.id)
        if (bookingIds.length) {
            const { data: items } = await supabase
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
