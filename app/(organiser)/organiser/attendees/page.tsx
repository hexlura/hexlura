import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { resolveOrganiserId } from '@/lib/organiser-access'
import { loadEventAttendees } from '@/lib/organiser-attendees'
import { EventAttendeesPanel } from '@/components/organiser/EventAttendeesPanel'

// Decorative event thumbnails, cycled in list order (as in the design)
const THUMB_GRADIENTS = [
    'from-accent to-warm-orange',
    'from-warm-yellow to-warm-orange',
    'from-warm-orange to-accent',
    'from-warm-green to-warm-amber',
]

const PAGE_SIZE = 1000

interface PageProps {
    searchParams: { event?: string }
}

export default async function OrganiserAttendeesPage({ searchParams }: PageProps) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const organiserId = await resolveOrganiserId(user.id)
    if (!organiserId) redirect('/organiser/pending')

    const serviceClient = createServiceClient()

    const { data: events } = await serviceClient
        .from('events')
        .select('id, title, start_at, status')
        .eq('organiser_id', organiserId)
        .in('status', ['published', 'draft'])
        .order('start_at', { ascending: false })
        .limit(20)

    const eventList = events || []
    const eventIds = eventList.map(e => e.id)

    // Attendee count per event = tickets on confirmed bookings (one per physical ticket).
    // Paged, because a single query is capped at 1000 rows.
    const attendeeCount: Record<string, number> = {}
    let countFailed = false
    if (eventIds.length > 0) {
        for (let from = 0; ; from += PAGE_SIZE) {
            const { data, error } = await serviceClient
                .from('bookings')
                .select('event_id, booking_items(quantity)')
                .in('event_id', eventIds)
                .eq('status', 'confirmed')
                .range(from, from + PAGE_SIZE - 1)
            if (error) {
                console.error('[OrganiserAttendees] attendee count failed:', error)
                countFailed = true
                break
            }
            for (const b of (data || []) as unknown as { event_id: string; booking_items: { quantity: number }[] }[]) {
                const qty = b.booking_items.reduce((s, i) => s + (i.quantity || 0), 0)
                attendeeCount[b.event_id] = (attendeeCount[b.event_id] || 0) + qty
            }
            if (!data || data.length < PAGE_SIZE) break
        }
    }

    // Selected event: must be one of this organiser's listed events; defaults to the most recent
    const requested = searchParams?.event
    const selectedId = requested && eventIds.includes(requested) ? requested : (eventList[0]?.id ?? null)
    const selectedData = selectedId ? await loadEventAttendees(selectedId, organiserId) : null

    return (
        <div className="max-w-7xl">
            <div className="mb-6">
                <h1 className="font-heading text-4xl tracking-wide">ATTENDEES</h1>
                <p className="text-muted text-sm mt-1">Select an event to view and manage its attendees</p>
            </div>

            <div className="grid gap-3 mb-10">
                {eventList.length === 0 && (
                    <div className="bg-card rounded-2xl shadow-card p-12 text-center">
                        <p className="text-muted text-sm">No events yet.</p>
                        <Link href="/organiser/events/new" className="text-accent text-sm font-semibold hover:underline mt-2 inline-block">Create your first event →</Link>
                    </div>
                )}
                {eventList.map((e, i) => (
                    <div key={e.id} className="bg-card rounded-2xl shadow-card p-5 flex items-center justify-between gap-4 hover:shadow-hover transition-shadow">
                        <div className="flex items-center gap-4 min-w-0">
                            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${THUMB_GRADIENTS[i % THUMB_GRADIENTS.length]} shrink-0`} />
                            <div className="min-w-0">
                                <p className="font-medium truncate">{e.title}</p>
                                <p className="text-muted text-xs mt-0.5">
                                    {new Date(e.start_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    {countFailed ? '' : ` · ${(attendeeCount[e.id] || 0).toLocaleString()} attendees`}
                                </p>
                            </div>
                        </div>
                        <Link
                            href={`/organiser/attendees?event=${e.id}#attendee-list`}
                            className="px-4 py-2 bg-warm-red/10 text-accent text-sm font-semibold rounded-xl hover:bg-warm-red/20 transition-colors whitespace-nowrap shrink-0"
                        >
                            View Attendees →
                        </Link>
                    </div>
                ))}
            </div>

            {/* Attendee list for the selected event */}
            {selectedData && <EventAttendeesPanel data={selectedData} showHeading />}
        </div>
    )
}
