import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = 'GUEST-'
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)]
    }
    return code
}

export async function GET(request: Request) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('event_id')
    if (!eventId) return NextResponse.json({ error: 'event_id required' }, { status: 400 })

    const adminClient = createAdminClient()

    // Verify organiser owns this event
    const { data: organiser } = await adminClient
        .from('organiser_profiles').select('id').eq('user_id', user.id).single()
    if (!organiser) return NextResponse.json({ error: 'Not an organiser' }, { status: 403 })

    const { data: event } = await adminClient
        .from('events').select('id').eq('id', eventId).eq('organiser_id', organiser.id).single()
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

    const { data: codes } = await adminClient
        .from('promo_codes')
        .select('id, code, comp_ticket_type_id, max_uses, uses_count, ticket_types(name)')
        .eq('event_id', eventId)
        .eq('is_complimentary', true)
        .order('created_at', { ascending: false })

    return NextResponse.json({ codes: codes || [] })
}

export async function POST(request: Request) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { event_id, code, comp_ticket_type_id, max_uses } = body

    if (!event_id) return NextResponse.json({ error: 'event_id required' }, { status: 400 })

    const adminClient = createAdminClient()

    // Verify organiser owns this event
    const { data: organiser } = await adminClient
        .from('organiser_profiles').select('id').eq('user_id', user.id).single()
    if (!organiser) return NextResponse.json({ error: 'Not an organiser' }, { status: 403 })

    const { data: event } = await adminClient
        .from('events').select('id').eq('id', event_id).eq('organiser_id', organiser.id).single()
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

    const finalCode = (code || generateCode()).toUpperCase().trim()
    const finalMaxUses = parseInt(max_uses) || 1

    const { data: newCode, error } = await adminClient
        .from('promo_codes')
        .insert({
            event_id,
            organiser_id: organiser.id,
            code: finalCode,
            is_complimentary: true,
            comp_ticket_type_id: comp_ticket_type_id || null,
            max_uses: finalMaxUses,
            uses_count: 0,
            discount_type: 'percent',
            discount_value: 100,
            min_order_pence: 0,
        })
        .select('id, code')
        .single()

    if (error) {
        if (error.code === '23505') {
            return NextResponse.json({ error: 'That code already exists for this event' }, { status: 409 })
        }
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ code: newCode })
}
