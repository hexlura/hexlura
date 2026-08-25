import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { promoLimiter, getIP } from '@/lib/rate-limit'

interface ValidateRequest {
    code: string
    event_id: string
    ticket_subtotal_pence: number
    items?: { ticket_type_id: string; price_pence: number; quantity: number }[]
    email?: string
}

export async function POST(request: NextRequest) {
    const ip = getIP(request)
    const { success } = promoLimiter(ip)
    if (!success) {
        return NextResponse.json(
            { error: 'Too many attempts. Please try again later.' },
            { status: 429 }
        )
    }

    const body = (await request.json()) as ValidateRequest
    const { code, event_id, ticket_subtotal_pence, items, email } = body

    if (!code) {
        return NextResponse.json({ valid: false, error: 'No code provided' }, { status: 400 })
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: promo } = await supabase
        .from('promo_codes')
        .select('*')
        .ilike('code', code)
        .single()

    if (!promo) {
        return NextResponse.json({ valid: false, error: 'Invalid code' })
    }

    const now = new Date().toISOString()

    if (promo.valid_from && now < promo.valid_from) {
        return NextResponse.json({ valid: false, error: 'Invalid code' })
    }

    if (promo.valid_to && now > promo.valid_to) {
        return NextResponse.json({ valid: false, error: 'Expired' })
    }

    if (promo.max_uses !== null && promo.uses_count >= promo.max_uses) {
        return NextResponse.json({ valid: false, error: 'Already used' })
    }

    // Must match event or be platform-wide
    if (promo.event_id && promo.event_id !== event_id) {
        return NextResponse.json({ valid: false, error: 'Invalid code' })
    }

    if (promo.min_order_pence && ticket_subtotal_pence < promo.min_order_pence) {
        return NextResponse.json({ valid: false, error: 'Minimum order not met' })
    }

    // A ticket_type_id-scoped code only counts against that ticket type's portion
    // of the cart — not the whole order — and doesn't apply if that ticket type
    // isn't in the cart at all.
    let eligiblePence = ticket_subtotal_pence
    if (promo.ticket_type_id) {
        eligiblePence = (items || [])
            .filter(i => i.ticket_type_id === promo.ticket_type_id)
            .reduce((sum, i) => sum + i.price_pence * i.quantity, 0)
        if (eligiblePence <= 0) {
            return NextResponse.json({ valid: false, error: 'This code doesn\'t apply to any ticket in your cart' })
        }
    }

    if (promo.max_uses_per_customer !== null && (user?.id || email)) {
        const filters = [user?.id ? `user_id.eq.${user.id}` : null, email ? `email.eq.${email}` : null]
            .filter(Boolean).join(',')
        const { count } = await supabase
            .from('promo_code_redemptions')
            .select('id', { count: 'exact', head: true })
            .eq('promo_code_id', promo.id)
            .or(filters)
        if ((count || 0) >= promo.max_uses_per_customer) {
            return NextResponse.json({ valid: false, error: 'You\'ve already used this code' })
        }
    }

    let discount_pence: number
    if (promo.discount_type === 'percent') {
        discount_pence = Math.round(eligiblePence * promo.discount_value / 100)
        if (promo.max_discount_pence !== null) {
            discount_pence = Math.min(discount_pence, promo.max_discount_pence)
        }
    } else {
        discount_pence = promo.discount_value
    }

    // Cap discount at the eligible (scoped) subtotal
    discount_pence = Math.min(discount_pence, eligiblePence)

    return NextResponse.json({
        valid: true,
        discount_type: promo.discount_type,
        discount_value: promo.discount_value,
        discount_pence,
        code_id: promo.id,
    })
}
