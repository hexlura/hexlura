import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { AnalyticsClient } from './analytics-client'
import { resolveOrganiserId } from '@/lib/organiser-access'

export default async function AnalyticsPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const organiserId = await resolveOrganiserId(user.id)
    if (!organiserId) redirect('/organiser/pending')

    const serviceClient = createServiceClient()

    const { data: events } = await serviceClient
        .from('events')
        .select('id, title, category, start_at, status')
        .eq('organiser_id', organiserId)
        .order('start_at', { ascending: false })

    const eventIds = (events || []).map(e => e.id)

    const { data: bookings } = eventIds.length
        ? await serviceClient
            .from('bookings')
            .select('id, event_id, ticket_subtotal_pence, created_at')
            .in('event_id', eventIds)
            .eq('status', 'confirmed')
        : { data: [] }

    const bookingIds = (bookings || []).map(b => b.id)

    const { data: items } = bookingIds.length
        ? await serviceClient
            .from('booking_items')
            .select('booking_id, quantity, ticket_type_id, ticket_type:ticket_types(name, event_id)')
            .in('booking_id', bookingIds)
        : { data: [] }

    return (
        <div className="max-w-7xl">
            <div className="mb-8">
                <h1 className="font-heading text-4xl text-text tracking-wide">ANALYTICS</h1>
                <p className="text-muted text-sm mt-1">Performance insights for your events</p>
            </div>
            <AnalyticsClient
                events={(events || []) as { id: string; title: string; category: string; start_at: string; status: string }[]}
                bookings={(bookings || []) as { id: string; event_id: string; ticket_subtotal_pence: number | null; created_at: string }[]}
                items={(items || []) as { booking_id: string; quantity: number; ticket_type_id: string | null; ticket_type: { name?: string; event_id?: string } | null }[]}
            />
        </div>
    )
}
