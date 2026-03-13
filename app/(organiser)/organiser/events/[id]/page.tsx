import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { EventForm } from '@/components/organiser/EventForm'
import type { Event, TicketType, PromoCode } from '@/types'

interface EditEventPageProps {
    params: { id: string }
}

export default async function EditEventPage({ params }: EditEventPageProps) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const { data: organiser } = await supabase
        .from('organiser_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

    if (!organiser) redirect('/organiser/pending')

    const { data: event } = await supabase
        .from('events')
        .select('*')
        .eq('id', params.id)
        .eq('organiser_id', organiser.id)
        .single()

    if (!event) notFound()

    const { data: ticketTypes } = await supabase
        .from('ticket_types')
        .select('*')
        .eq('event_id', params.id)
        .order('sort_order')

    const { data: promoCodes } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('event_id', params.id)
        .order('created_at')

    return (
        <div className="max-w-4xl">
            <div className="mb-8">
                <h1 className="font-heading text-4xl text-text tracking-wide">EDIT EVENT</h1>
                <p className="text-muted text-sm mt-1">{event.title}</p>
            </div>
            <EventForm
                organiserId={organiser.id}
                event={event as Event}
                ticketTypes={(ticketTypes || []) as TicketType[]}
                promoCodes={(promoCodes || []) as PromoCode[]}
            />
        </div>
    )
}
