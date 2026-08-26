import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_FIXED_DISCOUNT_PENCE = 1_000_000 // £10,000 sanity cap against typos

function generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
        code += chars[Math.floor(Math.random() * chars.length)]
    }
    return code
}

function validateFields(body: Record<string, unknown>) {
    const discount_type = body.discount_type
    if (discount_type !== 'percent' && discount_type !== 'fixed') {
        return { error: 'discount_type must be "percent" or "fixed"' }
    }

    const discount_value = Number(body.discount_value)
    if (!Number.isInteger(discount_value)) {
        return { error: 'discount_value must be a whole number' }
    }
    if (discount_type === 'percent' && (discount_value < 1 || discount_value > 100)) {
        return { error: 'Percent discount must be between 1 and 100' }
    }
    if (discount_type === 'fixed' && (discount_value < 1 || discount_value > MAX_FIXED_DISCOUNT_PENCE)) {
        return { error: 'Fixed discount must be between 1p and £10,000' }
    }

    let min_order_pence = 0
    if (body.min_order_pence !== undefined && body.min_order_pence !== null && body.min_order_pence !== '') {
        min_order_pence = Number(body.min_order_pence)
        if (!Number.isInteger(min_order_pence) || min_order_pence < 0) {
            return { error: 'min_order_pence must be a non-negative whole number' }
        }
    }

    let max_uses: number | null = null
    if (body.max_uses !== undefined && body.max_uses !== null && body.max_uses !== '') {
        max_uses = Number(body.max_uses)
        if (!Number.isInteger(max_uses) || max_uses < 1) {
            return { error: 'max_uses must be a positive whole number' }
        }
    }

    let max_uses_per_customer: number | null = null
    if (body.max_uses_per_customer !== undefined && body.max_uses_per_customer !== null && body.max_uses_per_customer !== '') {
        max_uses_per_customer = Number(body.max_uses_per_customer)
        if (!Number.isInteger(max_uses_per_customer) || max_uses_per_customer < 1) {
            return { error: 'max_uses_per_customer must be a positive whole number' }
        }
    }

    let max_discount_pence: number | null = null
    if (body.max_discount_pence !== undefined && body.max_discount_pence !== null && body.max_discount_pence !== '') {
        max_discount_pence = Number(body.max_discount_pence)
        if (!Number.isInteger(max_discount_pence) || max_discount_pence < 1) {
            return { error: 'max_discount_pence must be a positive whole number' }
        }
        if (discount_type === 'fixed') {
            return { error: 'max_discount_pence only applies to percent-off codes' }
        }
    }

    let max_tickets: number | null = null
    if (body.max_tickets !== undefined && body.max_tickets !== null && body.max_tickets !== '') {
        max_tickets = Number(body.max_tickets)
        if (!Number.isInteger(max_tickets) || max_tickets < 1) {
            return { error: 'max_tickets must be a positive whole number' }
        }
    }

    let valid_from: string | null = null
    if (body.valid_from) {
        const d = new Date(body.valid_from as string)
        if (isNaN(d.getTime())) return { error: 'valid_from is not a valid date' }
        valid_from = d.toISOString()
    }

    let valid_to: string | null = null
    if (body.valid_to) {
        const d = new Date(body.valid_to as string)
        if (isNaN(d.getTime())) return { error: 'valid_to is not a valid date' }
        valid_to = d.toISOString()
    }

    if (valid_from && valid_to && valid_to <= valid_from) {
        return { error: 'valid_to must be after valid_from' }
    }

    return { discount_type, discount_value, min_order_pence, max_uses, max_uses_per_customer, max_discount_pence, max_tickets, valid_from, valid_to }
}

export async function GET(request: Request) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('event_id')
    if (!eventId) return NextResponse.json({ error: 'event_id required' }, { status: 400 })

    const adminClient = createAdminClient()

    const { data: organiser } = await adminClient
        .from('organiser_profiles').select('id').eq('user_id', user.id).single()
    if (!organiser) return NextResponse.json({ error: 'Not an organiser' }, { status: 403 })

    const { data: event } = await adminClient
        .from('events').select('id').eq('id', eventId).eq('organiser_id', organiser.id).single()
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

    const { data: codes, error: codesError } = await adminClient
        .from('promo_codes')
        .select('id, code, discount_type, discount_value, min_order_pence, max_uses, uses_count, valid_from, valid_to, created_at, ticket_type_id, max_uses_per_customer, max_discount_pence, max_tickets, ticket_type:ticket_types!ticket_type_id(name)')
        .eq('event_id', eventId)
        .eq('is_complimentary', false)
        .order('created_at', { ascending: false })

    if (codesError) {
        console.error('promo-codes GET query failed:', codesError.message)
        return NextResponse.json({ error: codesError.message }, { status: 500 })
    }

    return NextResponse.json({ codes: codes || [] })
}

export async function POST(request: Request) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { event_id, code, ticket_type_id } = body

    if (!event_id) return NextResponse.json({ error: 'event_id required' }, { status: 400 })

    const validated = validateFields(body)
    if ('error' in validated) return NextResponse.json({ error: validated.error }, { status: 400 })

    const adminClient = createAdminClient()

    const { data: organiser } = await adminClient
        .from('organiser_profiles').select('id').eq('user_id', user.id).single()
    if (!organiser) return NextResponse.json({ error: 'Not an organiser' }, { status: 403 })

    const { data: event } = await adminClient
        .from('events').select('id').eq('id', event_id).eq('organiser_id', organiser.id).single()
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

    let ticketTypeId: string | null = null
    if (ticket_type_id) {
        const { data: ticketType } = await adminClient
            .from('ticket_types').select('id').eq('id', ticket_type_id).eq('event_id', event_id).single()
        if (!ticketType) return NextResponse.json({ error: 'Ticket type not found for this event' }, { status: 400 })
        ticketTypeId = ticketType.id
    }

    const rawCode = typeof code === 'string' ? code.trim() : ''
    if (rawCode && !/^[A-Z0-9-]{3,30}$/i.test(rawCode)) {
        return NextResponse.json({ error: 'Code must be 3-30 letters, numbers, or hyphens' }, { status: 400 })
    }
    const finalCode = (rawCode || generateCode()).toUpperCase()

    const { data: newCode, error } = await adminClient
        .from('promo_codes')
        .insert({
            event_id,
            organiser_id: organiser.id,
            code: finalCode,
            is_complimentary: false,
            ticket_type_id: ticketTypeId,
            discount_type: validated.discount_type,
            discount_value: validated.discount_value,
            min_order_pence: validated.min_order_pence,
            max_uses: validated.max_uses,
            max_uses_per_customer: validated.max_uses_per_customer,
            max_discount_pence: validated.max_discount_pence,
            max_tickets: validated.max_tickets,
            uses_count: 0,
            valid_from: validated.valid_from,
            valid_to: validated.valid_to,
        })
        .select('id, code, discount_type, discount_value, min_order_pence, max_uses, uses_count, valid_from, valid_to, created_at, ticket_type_id, max_uses_per_customer, max_discount_pence, max_tickets')
        .single()

    if (error) {
        if (error.code === '23505') {
            return NextResponse.json({ error: 'That code already exists for this event' }, { status: 409 })
        }
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ code: newCode })
}
