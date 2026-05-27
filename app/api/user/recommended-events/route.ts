import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ events: [] })

    const serviceClient = createServiceClient()
    const now = new Date().toISOString()

    // Get confirmed bookings → event IDs the user has already booked
    const { data: bookings } = await serviceClient
        .from('bookings')
        .select('event_id')
        .eq('user_id', user.id)
        .eq('status', 'confirmed')

    const bookedEventIds = (bookings || []).map(b => b.event_id as string)

    // Get the categories from events the user has booked
    let topCategories: string[] = []
    if (bookedEventIds.length > 0) {
        const { data: bookedEvents } = await serviceClient
            .from('events')
            .select('category')
            .in('id', bookedEventIds)

        const catCounts: Record<string, number> = {}
        for (const e of bookedEvents || []) {
            if (e.category) catCounts[e.category] = (catCounts[e.category] || 0) + 1
        }
        topCategories = Object.entries(catCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([cat]) => cat)
    }

    if (!topCategories.length) return NextResponse.json({ events: [] })

    // Fetch upcoming events in those categories, excluding already-booked
    const { data: recommended } = await serviceClient
        .from('events')
        .select('*, ticket_types(*)')
        .eq('status', 'published')
        .in('category', topCategories)
        .or(`end_at.gte.${now},end_at.is.null`)
        .not('id', 'in', `(${bookedEventIds.join(',')})`)
        .order('start_at', { ascending: true })
        .limit(8)

    return NextResponse.json({ events: recommended || [], categories: topCategories })
}
