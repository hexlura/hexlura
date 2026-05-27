import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendEventReminderEmails } from '@/lib/email'

// Runs once daily at 09:00 UTC via Vercel Cron (Hobby plan limit: once per day).
// Looks 23–47h ahead so it catches every event starting tomorrow regardless of time.
// reminder_sent_at guards against duplicates if the cron ever fires twice.
export async function GET(req: NextRequest) {
    const secret = req.headers.get('authorization')
    if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()
    const now = new Date()

    // 23–47h window: catches all events happening "tomorrow" (9 AM today → 9 AM day after tomorrow)
    const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000).toISOString()
    const windowEnd   = new Date(now.getTime() + 47 * 60 * 60 * 1000).toISOString()

    const { data: events, error } = await supabase
        .from('events')
        .select('id, title, slug, start_at, venue_name, venue_address')
        .eq('status', 'published')
        .is('reminder_sent_at', null)
        .gte('start_at', windowStart)
        .lte('start_at', windowEnd)

    if (error) {
        console.error('[cron/event-reminders] query error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!events?.length) {
        return NextResponse.json({ reminders: 0, events: 0 })
    }

    let totalSent = 0

    for (const event of events) {
        // Always mark sent first to prevent duplicate sends on retry
        await supabase
            .from('events')
            .update({ reminder_sent_at: now.toISOString() })
            .eq('id', event.id)

        const { data: bookings } = await supabase
            .from('bookings')
            .select('id')
            .eq('event_id', event.id)
            .eq('status', 'confirmed')

        if (!bookings?.length) continue

        const bookingIds = bookings.map(b => b.id)
        const { data: items } = await supabase
            .from('booking_items')
            .select('attendee_email')
            .in('booking_id', bookingIds)

        const emails = Array.from(
            new Set((items || []).map(i => i.attendee_email).filter(Boolean))
        ) as string[]

        if (!emails.length) continue

        const eventDate = new Intl.DateTimeFormat('en-GB', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            timeZone: 'Europe/London',
        }).format(new Date(event.start_at))

        const eventTime = new Intl.DateTimeFormat('en-US', {
            hour: 'numeric', minute: '2-digit', hour12: true,
            timeZone: 'Europe/London',
        }).format(new Date(event.start_at))

        const sent = await sendEventReminderEmails({
            emails,
            eventTitle: event.title,
            eventSlug: event.slug,
            eventDate,
            eventTime,
            venueName: event.venue_name || 'TBC',
            venueAddress: event.venue_address || '',
        })

        totalSent += sent
        console.log(`[cron/event-reminders] sent ${sent} reminders for "${event.title}"`)
    }

    return NextResponse.json({ reminders: totalSent, events: events.length })
}
