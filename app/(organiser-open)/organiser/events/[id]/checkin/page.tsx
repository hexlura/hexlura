import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { CheckinClient } from './checkin-client'

interface PageProps {
    params: { id: string }
}

export default async function CheckinPage({ params }: PageProps) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const { data: organiser } = await supabase
        .from('organiser_profiles').select('id').eq('user_id', user.id).single()
    if (!organiser) redirect('/organiser/pending')

    const { data: event } = await supabase
        .from('events')
        .select('id, title, start_at')
        .eq('id', params.id)
        .eq('organiser_id', organiser.id)
        .single()
    if (!event) notFound()

    // Get total tickets and checked in count
    const { data: bookings } = await supabase
        .from('bookings')
        .select('id')
        .eq('event_id', params.id)
        .eq('status', 'confirmed')

    const bookingIds = (bookings || []).map(b => b.id)
    const { data: items } = bookingIds.length
        ? await supabase.from('booking_items').select('id, quantity').in('booking_id', bookingIds)
        : { data: [] }

    const itemIds = (items || []).map(i => i.id)
    const { data: checkins } = itemIds.length
        ? await supabase.from('checkins').select('booking_item_id').in('booking_item_id', itemIds)
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
