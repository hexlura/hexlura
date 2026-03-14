import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminEventsClient } from './events-client'

export default async function AdminEventsPage({
    searchParams,
}: {
    searchParams: { q?: string; tab?: string; category?: string; status?: string; page?: string }
}) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const tab = searchParams.tab ?? 'all'
    const page = Math.max(1, parseInt(searchParams.page ?? '1'))
    const pageSize = 25
    const offset = (page - 1) * pageSize

    let query = supabase
        .from('events')
        .select('id, title, slug, category, status, start_at, is_featured, featured_order, organiser_id, organiser_profiles(org_name), ticket_types(quantity_sold, price_pence)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1)

    if (tab === 'featured') {
        query = query.eq('is_featured', true).order('featured_order', { ascending: true })
    } else if (tab === 'cancelled') {
        query = query.eq('status', 'cancelled')
    }

    if (searchParams.q) {
        query = query.ilike('title', `%${searchParams.q}%`)
    }
    if (searchParams.category) {
        query = query.eq('category', searchParams.category)
    }
    if (searchParams.status && searchParams.status !== 'all') {
        query = query.eq('status', searchParams.status)
    }

    const { data: eventsData, count } = await query

    type EventRow = {
        id: string
        title: string
        slug: string
        category: string
        status: string
        start_at: string
        is_featured: boolean
        featured_order: number
        organiser_id: string
        organiser_profiles: { org_name: string } | null
        ticket_types: { quantity_sold: number; price_pence: number }[]
    }

    const events = ((eventsData || []) as unknown as EventRow[]).map(e => ({
        id: e.id,
        title: e.title,
        slug: e.slug,
        category: e.category,
        status: e.status,
        start_at: e.start_at,
        is_featured: e.is_featured,
        featured_order: e.featured_order,
        organiser_name: e.organiser_profiles?.org_name ?? '—',
        tickets_sold: e.ticket_types.reduce((s, t) => s + t.quantity_sold, 0),
        revenue_pence: 0, // Would need bookings join
    }))

    return (
        <AdminEventsClient
            events={events}
            totalRows={count ?? 0}
            page={page}
            pageSize={pageSize}
            defaultTab={tab as 'all' | 'featured' | 'cancelled'}
        />
    )
}
