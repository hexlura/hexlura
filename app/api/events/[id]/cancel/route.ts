import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEventCancelledEmail } from '@/lib/email'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()

    const { data: organiser } = await adminClient
        .from('organiser_profiles').select('id').eq('user_id', user.id).single()
    if (!organiser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: event } = await adminClient
        .from('events')
        .select('id, title, slug, start_at')
        .eq('id', params.id)
        .eq('organiser_id', organiser.id)
        .single()
    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await adminClient.from('events').update({ status: 'cancelled' }).eq('id', params.id)

    try {
        const { data: bookings } = await adminClient
            .from('bookings')
            .select('id, user_id, total_pence')
            .eq('event_id', params.id)
            .eq('status', 'confirmed')

        const bookingList = (bookings || []) as { id: string; user_id: string; total_pence: number | null }[]
        const bookingIds = bookingList.map(b => b.id)

        for (const b of bookingList) {
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

            const emails = Array.from(new Set((items || []).map(i => i.attendee_email).filter(Boolean))) as string[]

            const hasPaidTickets = bookingList.some(b => (b.total_pence ?? 0) > 0)
            const eventDate = new Date(event.start_at).toLocaleDateString('en-GB', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            })

            if (emails.length) {
                await sendEventCancelledEmail({ emails, eventTitle: event.title, eventDate, hasPaidTickets })
            }
        }
    } catch (err) {
        console.error('Failed to send cancellation emails:', err)
    }

    return NextResponse.json({ success: true })
}
