import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { EventForm } from '@/components/organiser/EventForm'
import { NotifyFollowersButton } from '@/components/organiser/NotifyFollowersButton'
import type { Event, TicketType } from '@/types'
import { resolveOrganiserId } from '@/lib/organiser-access'

interface EditEventPageProps {
    params: { id: string }
}

export default async function EditEventPage({ params }: EditEventPageProps) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const organiserId = await resolveOrganiserId(user.id)
    if (!organiserId) redirect('/organiser/pending')

    const serviceClient = createServiceClient()

    const { data: event } = await serviceClient
        .from('events')
        .select('*')
        .eq('id', params.id)
        .eq('organiser_id', organiserId)
        .single()

    if (!event) notFound()

    const { data: ticketTypes } = await serviceClient
        .from('ticket_types')
        .select('*')
        .eq('event_id', params.id)
        .order('sort_order')

    return (
        <div className="max-w-7xl">
            <Link href="/organiser/events" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-text transition-colors mb-4">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
                Back to Events
            </Link>
            <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="font-heading text-4xl tracking-wide">EDIT EVENT</h1>
                    <p className="text-muted text-sm mt-1">{event.title}</p>
                </div>
                {event.status === 'published' && (
                    <NotifyFollowersButton eventId={event.id} initialNotifiedAt={event.followers_notified_at ?? null} />
                )}
            </div>
            <EventForm
                organiserId={organiserId}
                event={event as Event}
                ticketTypes={(ticketTypes || []) as TicketType[]}
            />
        </div>
    )
}
