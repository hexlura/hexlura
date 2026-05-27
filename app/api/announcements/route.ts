import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendAnnouncementEmail } from '@/lib/email'

export async function POST(req: Request) {
    try {
        const { eventId, subject, message } = await req.json()

        if (!eventId || !subject || !message) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
        }

        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: organiser } = await supabase
            .from('organiser_profiles').select('id').eq('user_id', user.id).single()
        if (!organiser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

        const { data: event } = await supabase
            .from('events').select('id, title, slug').eq('id', eventId).eq('organiser_id', organiser.id).single()
        if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        const { data: bookings } = await supabase
            .from('bookings').select('id').eq('event_id', eventId).eq('status', 'confirmed')

        const bookingIds = (bookings || []).map(b => b.id)
        if (!bookingIds.length) return NextResponse.json({ sent: 0 })

        const { data: items } = await supabase
            .from('booking_items').select('attendee_email').in('booking_id', bookingIds)

        const emails = Array.from(new Set((items || []).map(i => i.attendee_email).filter(Boolean))) as string[]
        if (!emails.length) return NextResponse.json({ sent: 0 })

        const sent = await sendAnnouncementEmail({
            emails,
            eventTitle: event.title,
            eventSlug: event.slug,
            subject,
            message,
            replyTo: user.email || 'support@hexlura.com',
        })

        return NextResponse.json({ sent })
    } catch (err) {
        console.error('Announcement error:', err)
        return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
    }
}
