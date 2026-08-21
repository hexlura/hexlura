import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_FIXED_DISCOUNT_PENCE = 1_000_000 // £10,000 sanity cap against typos

interface RouteParams {
    params: { id: string }
}

async function resolveOwnedCode(adminClient: ReturnType<typeof createAdminClient>, userId: string, codeId: string) {
    const { data: organiser } = await adminClient
        .from('organiser_profiles').select('id').eq('user_id', userId).single()
    if (!organiser) return { error: 'Not an organiser', status: 403 } as const

    const { data: existing } = await adminClient
        .from('promo_codes')
        .select('id, organiser_id, is_complimentary')
        .eq('id', codeId)
        .eq('organiser_id', organiser.id)
        .eq('is_complimentary', false)
        .single()
    if (!existing) return { error: 'Promo code not found', status: 404 } as const

    return { organiserId: organiser.id } as const
}

export async function PATCH(request: Request, { params }: RouteParams) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()
    const owned = await resolveOwnedCode(adminClient, user.id, params.id)
    if ('error' in owned) return NextResponse.json({ error: owned.error }, { status: owned.status })

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    if (body.discount_type !== undefined) {
        if (body.discount_type !== 'percent' && body.discount_type !== 'fixed') {
            return NextResponse.json({ error: 'discount_type must be "percent" or "fixed"' }, { status: 400 })
        }
        updates.discount_type = body.discount_type
    }

    if (body.discount_value !== undefined) {
        const discount_value = Number(body.discount_value)
        const type = (updates.discount_type as string) || undefined
        if (!Number.isInteger(discount_value)) {
            return NextResponse.json({ error: 'discount_value must be a whole number' }, { status: 400 })
        }
        if (type === 'percent' && (discount_value < 1 || discount_value > 100)) {
            return NextResponse.json({ error: 'Percent discount must be between 1 and 100' }, { status: 400 })
        }
        if (type === 'fixed' && (discount_value < 1 || discount_value > MAX_FIXED_DISCOUNT_PENCE)) {
            return NextResponse.json({ error: 'Fixed discount must be between 1p and £10,000' }, { status: 400 })
        }
        updates.discount_value = discount_value
    }

    if (body.min_order_pence !== undefined) {
        const min_order_pence = Number(body.min_order_pence)
        if (!Number.isInteger(min_order_pence) || min_order_pence < 0) {
            return NextResponse.json({ error: 'min_order_pence must be a non-negative whole number' }, { status: 400 })
        }
        updates.min_order_pence = min_order_pence
    }

    if (body.max_uses !== undefined) {
        if (body.max_uses === null || body.max_uses === '') {
            updates.max_uses = null
        } else {
            const max_uses = Number(body.max_uses)
            if (!Number.isInteger(max_uses) || max_uses < 1) {
                return NextResponse.json({ error: 'max_uses must be a positive whole number' }, { status: 400 })
            }
            updates.max_uses = max_uses
        }
    }

    if (body.valid_from !== undefined) {
        if (!body.valid_from) {
            updates.valid_from = null
        } else {
            const d = new Date(body.valid_from)
            if (isNaN(d.getTime())) return NextResponse.json({ error: 'valid_from is not a valid date' }, { status: 400 })
            updates.valid_from = d.toISOString()
        }
    }

    if (body.valid_to !== undefined) {
        if (!body.valid_to) {
            updates.valid_to = null
        } else {
            const d = new Date(body.valid_to)
            if (isNaN(d.getTime())) return NextResponse.json({ error: 'valid_to is not a valid date' }, { status: 400 })
            updates.valid_to = d.toISOString()
        }
    }

    if (
        typeof updates.valid_from === 'string' &&
        typeof updates.valid_to === 'string' &&
        updates.valid_to <= updates.valid_from
    ) {
        return NextResponse.json({ error: 'valid_to must be after valid_from' }, { status: 400 })
    }

    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data: updated, error } = await adminClient
        .from('promo_codes')
        .update(updates)
        .eq('id', params.id)
        .select('id, code, discount_type, discount_value, min_order_pence, max_uses, uses_count, valid_from, valid_to, created_at')
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ code: updated })
}

export async function DELETE(request: Request, { params }: RouteParams) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()
    const owned = await resolveOwnedCode(adminClient, user.id, params.id)
    if ('error' in owned) return NextResponse.json({ error: owned.error }, { status: owned.status })

    const { error } = await adminClient
        .from('promo_codes')
        .delete()
        .eq('id', params.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
}
