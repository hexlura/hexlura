import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { EventsClient } from './events-client'
import { resolveOrganiserId } from '@/lib/organiser-access'

export default async function OrganiserEventsPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const organiserId = await resolveOrganiserId(user.id)
    if (!organiserId) redirect('/organiser/pending')

    const serviceClient = createServiceClient()

    const { data: eventsData } = await serviceClient
        .from('events')
        .select('id, title, slug, start_at, status, ticket_types(quantity_total)')
        .eq('organiser_id', organiserId)
        .neq('status', 'deleted')
        .order('start_at', { ascending: false })

    const eventIds = (eventsData || []).map((e: { id: string }) => e.id)

    // Single bookings query instead of two separate ones
    const { data: allBookings } = eventIds.length
        ? await serviceClient
            .from('bookings')
            .select('id, event_id, ticket_subtotal_pence, discount_pence')
            .in('event_id', eventIds)
            .eq('status', 'confirmed')
        : { data: [] }

    const bookingIdList = (allBookings || []).map((b: { id: string }) => b.id)
    const { data: items } = bookingIdList.length
        ? await serviceClient.from('booking_items').select('booking_id, quantity').in('booking_id', bookingIdList)
        : { data: [] }

    const bookingMap = new Map((allBookings || []).map((b: { id: string; event_id: string }) => [b.id, b.event_id]))
    const salesByEvent: Record<string, { tickets: number; revenue: number }> = {}
    for (const item of (items || []) as { booking_id: string; quantity: number }[]) {
        const eventId = bookingMap.get(item.booking_id)
        if (!eventId) continue
        if (!salesByEvent[eventId]) salesByEvent[eventId] = { tickets: 0, revenue: 0 }
        salesByEvent[eventId].tickets += item.quantity
    }
    for (const b of (allBookings || []) as { event_id: string; ticket_subtotal_pence: number | null; discount_pence: number | null }[]) {
        if (!salesByEvent[b.event_id]) salesByEvent[b.event_id] = { tickets: 0, revenue: 0 }
        salesByEvent[b.event_id].revenue += (b.ticket_subtotal_pence || 0) - (b.discount_pence || 0)
    }

    const rows = (eventsData || []).map((e: { id: string; title: string; slug: string; start_at: string; status: string; ticket_types: { quantity_total: number }[] | null }) => ({
        id: e.id,
        title: e.title,
        slug: e.slug,
        start_at: e.start_at,
        status: e.status as 'draft' | 'published' | 'cancelled' | 'archived',
        ticketsSold: salesByEvent[e.id]?.tickets || 0,
        capacity: (e.ticket_types || []).reduce((s, t) => s + (t.quantity_total || 0), 0),
        revenue: salesByEvent[e.id]?.revenue || 0,
    }))

    return (
        <div className="max-w-7xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                <div>
                    <h1 className="font-heading text-4xl tracking-wide">EVENTS</h1>
                    <p className="text-muted text-sm mt-1">Manage, publish and track every event you run.</p>
                </div>
                <Link
                    href="/organiser/events/new"
                    className="bg-text text-white px-5 py-3 rounded-xl text-sm font-semibold shadow-soft hover:shadow-hover hover:-translate-y-0.5 transition-all flex items-center gap-2"
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                    New Event
                </Link>
            </div>
            <EventsClient events={rows} />
        </div>
    )
}
