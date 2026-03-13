import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { EventsClient } from './events-client'

export default async function OrganiserEventsPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const { data: organiser } = await supabase
        .from('organiser_profiles').select('id').eq('user_id', user.id).single()
    if (!organiser) redirect('/organiser/pending')

    const { data: eventsData } = await supabase
        .from('events')
        .select('id, title, slug, start_at, status')
        .eq('organiser_id', organiser.id)
        .order('start_at', { ascending: false })

    const eventIds = (eventsData || []).map((e: { id: string }) => e.id)

    // Get ticket sales per event
    const { data: bookings } = eventIds.length
        ? await supabase
            .from('bookings')
            .select('event_id, ticket_subtotal_pence')
            .in('event_id', eventIds)
            .eq('status', 'confirmed')
        : { data: [] }

    const { data: allBookingsWithId } = eventIds.length
        ? await supabase.from('bookings').select('id, event_id').in('event_id', eventIds).eq('status', 'confirmed')
        : { data: [] }

    const bookingIdList = (allBookingsWithId || []).map((b: { id: string }) => b.id)
    const { data: items } = bookingIdList.length
        ? await supabase.from('booking_items').select('booking_id, quantity').in('booking_id', bookingIdList)
        : { data: [] }

    const bookingMap = new Map((allBookingsWithId || []).map((b: { id: string; event_id: string }) => [b.id, b.event_id]))
    const salesByEvent: Record<string, { tickets: number; revenue: number }> = {}
    for (const item of (items || []) as { booking_id: string; quantity: number }[]) {
        const eventId = bookingMap.get(item.booking_id)
        if (!eventId) continue
        if (!salesByEvent[eventId]) salesByEvent[eventId] = { tickets: 0, revenue: 0 }
        salesByEvent[eventId].tickets += item.quantity
    }
    for (const b of (bookings || []) as { event_id: string; ticket_subtotal_pence: number | null }[]) {
        if (!salesByEvent[b.event_id]) salesByEvent[b.event_id] = { tickets: 0, revenue: 0 }
        salesByEvent[b.event_id].revenue += b.ticket_subtotal_pence || 0
    }

    const rows = (eventsData || []).map((e: { id: string; title: string; slug: string; start_at: string; status: string }) => ({
        id: e.id,
        title: e.title,
        slug: e.slug,
        start_at: e.start_at,
        status: e.status as 'draft' | 'published' | 'cancelled' | 'archived',
        ticketsSold: salesByEvent[e.id]?.tickets || 0,
        revenue: salesByEvent[e.id]?.revenue || 0,
    }))

    return (
        <div className="max-w-7xl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="font-heading text-4xl text-text tracking-wide">MY EVENTS</h1>
                    <p className="text-muted text-sm mt-1">{rows.length} events total</p>
                </div>
                <Link href="/organiser/events/new">
                    <Button variant="primary" size="md">+ Create Event</Button>
                </Link>
            </div>
            <EventsClient events={rows} />
        </div>
    )
}
