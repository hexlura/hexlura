import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { promoLimiter, getIP } from '@/lib/rate-limit'

interface ValidateRequest {
    code: string
    event_id: string
    ticket_subtotal_pence: number
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
    const { code, event_id, ticket_subtotal_pence } = body

    if (!code) {
        return NextResponse.json({ valid: false, error: 'No code provided' }, { status: 400 })
    }

    const supabase = createClient()

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

    let discount_pence: number
    if (promo.discount_type === 'percent') {
        discount_pence = Math.round(ticket_subtotal_pence * promo.discount_value / 100)
    } else {
        discount_pence = promo.discount_value
    }

    // Cap discount at ticket subtotal
    discount_pence = Math.min(discount_pence, ticket_subtotal_pence)

    return NextResponse.json({
        valid: true,
        discount_type: promo.discount_type,
        discount_value: promo.discount_value,
        discount_pence,
        code_id: promo.id,
    })
}
