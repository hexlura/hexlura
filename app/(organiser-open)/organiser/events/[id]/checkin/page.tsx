import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect, notFound } from 'next/navigation'
import { CheckinClient } from './checkin-client'

interface PageProps {
    params: { id: string }
}

export default async function CheckinPage({ params }: PageProps) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const serviceClient = createServiceClient()

    // Check if organiser owns this event
    const { data: organiser } = await serviceClient
        .from('organiser_profiles').select('id').eq('user_id', user.id).single()

    if (!organiser) {
        // Not an organiser — check if team door_staff with access to this event's organiser
        const { data: event } = await serviceClient
            .from('events')
            .select('organiser_id')
            .eq('id', params.id)
            .single()
        if (!event) notFound()

        const { data: teamAccess } = await serviceClient
            .from('organiser_team')
            .select('id')
            .eq('user_id', user.id)
            .eq('organiser_id', event.organiser_id)
            .eq('privilege', 'door_staff')
            .eq('status', 'active')
            .maybeSingle()

        if (!teamAccess) redirect('/checkin')
    }

    const eventQuery = serviceClient
        .from('events')
        .select('id, title, start_at')
        .eq('id', params.id)
    if (organiser) eventQuery.eq('organiser_id', organiser.id)
    const { data: event } = await eventQuery.single()
    if (!event) notFound()

    // Get total tickets and checked in count
    const { data: bookings } = await serviceClient
        .from('bookings')
        .select('id')
        .eq('event_id', params.id)
        .eq('status', 'confirmed')

    const bookingIds = (bookings || []).map(b => b.id)
    const { data: items } = bookingIds.length
        ? await serviceClient.from('booking_items').select('id, quantity').in('booking_id', bookingIds)
        : { data: [] }

    const itemIds = (items || []).map(i => i.id)
    const { data: checkins } = itemIds.length
        ? await serviceClient.from('checkins').select('booking_item_id').in('booking_item_id', itemIds)
        : { data: [] }

    const totalTickets = (items || []).reduce((s, i) => s + i.quantity, 0)
    const checkedInCount = (checkins || []).length

    return (
        <CheckinClient
            eventId={params.id}
            eventTitle={event.title}
            eventDate={new Date(event.start_at).toLocaleDateString('en-GB', {
                weekday: 'short', day: 'numeric', month: 'short'
            })}
            totalTickets={totalTickets}
            initialCheckedIn={checkedInCount}
        />
    )
}
