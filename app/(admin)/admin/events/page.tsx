import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

    const adminClient = createAdminClient()

    const tab = searchParams.tab ?? 'all'
    const page = Math.max(1, parseInt(searchParams.page ?? '1'))
    const pageSize = 25
    const offset = (page - 1) * pageSize

    let query = adminClient
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

    // Fetch confirmed booking totals per event
    const { data: salesData } = await adminClient
        .from('bookings')
        .select('event_id, total_pence, booking_fee_pence')
        .eq('status', 'confirmed')

    const salesMap = new Map<string, { gross: number; fee: number }>()
    for (const b of salesData || []) {
        const prev = salesMap.get(b.event_id) || { gross: 0, fee: 0 }
        prev.gross += b.total_pence || 0
        prev.fee += b.booking_fee_pence || 0
        salesMap.set(b.event_id, prev)
    }

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
        gross_pence: salesMap.get(e.id)?.gross ?? 0,
        fee_pence: salesMap.get(e.id)?.fee ?? 0,
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
