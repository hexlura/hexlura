import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect, notFound } from 'next/navigation'
import { EventForm } from '@/components/organiser/EventForm'
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
        <div className="max-w-4xl">
            <div className="mb-8">
                <h1 className="font-heading text-4xl text-text tracking-wide">EDIT EVENT</h1>
                <p className="text-muted text-sm mt-1">{event.title}</p>
            </div>
            <EventForm
                organiserId={organiserId}
                event={event as Event}
                ticketTypes={(ticketTypes || []) as TicketType[]}
            />
        </div>
    )
}
