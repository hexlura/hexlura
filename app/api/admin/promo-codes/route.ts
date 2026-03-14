import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAuditAction } from '@/lib/audit'

export async function POST(request: NextRequest) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!adminProfile || adminProfile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json() as {
        code: string
        discount_type: 'percent' | 'fixed'
        discount_value: number
        max_uses: number | null
        valid_from: string | null
        valid_to: string | null
    }

    const { data: promo, error } = await supabase.from('promo_codes').insert({
        code: body.code,
        discount_type: body.discount_type,
        discount_value: body.discount_value,
        max_uses: body.max_uses,
        valid_from: body.valid_from,
        valid_to: body.valid_to,
        event_id: null,
        organiser_id: null,
        min_order_pence: 0,
        uses_count: 0,
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await logAuditAction({
        actorId: user.id,
        action: 'create_promo_code',
        entityType: 'platform',
        metadata: { code: body.code },
    })

    return NextResponse.json({ success: true, promo })
}
