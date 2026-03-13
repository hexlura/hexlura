import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: organiser } = await supabase
        .from('organiser_profiles').select('id').eq('user_id', user.id).single()
    if (!organiser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: source } = await supabase
        .from('events')
        .select('*')
        .eq('id', params.id)
        .eq('organiser_id', organiser.id)
        .single()

    if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const baseSlug = `${source.slug}-copy`
    const newSlug = `${baseSlug}-${Date.now()}`

    const { data: newEvent, error } = await supabase
        .from('events')
        .insert({
            organiser_id: organiser.id,
            title: `${source.title} (Copy)`,
            slug: newSlug,
            description: source.description,
            category: source.category,
            tags: source.tags,
            venue_name: source.venue_name,
            venue_address: source.venue_address,
            venue_postcode: source.venue_postcode,
            start_at: source.start_at,
            end_at: source.end_at,
            banner_url: source.banner_url,
            status: 'draft',
            min_age: source.min_age,
            max_tickets_per_order: source.max_tickets_per_order,
            refund_policy: source.refund_policy,
            total_capacity: source.total_capacity,
        })
        .select('id')
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Copy ticket types
    const { data: ticketTypes } = await supabase
        .from('ticket_types')
        .select('*')
        .eq('event_id', params.id)

    if (ticketTypes?.length) {
        await supabase.from('ticket_types').insert(
            ticketTypes.map(tt => ({
                event_id: newEvent.id,
                name: tt.name,
                description: tt.description,
                price_pence: tt.price_pence,
                quantity_total: tt.quantity_total,
                quantity_sold: 0,
                max_per_order: tt.max_per_order,
                sort_order: tt.sort_order,
                is_visible: tt.is_visible,
            }))
        )
    }

    return NextResponse.json({ id: newEvent.id })
}
