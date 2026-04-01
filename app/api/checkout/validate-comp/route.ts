import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
    const body = await request.json()
    const { code, event_id } = body

    if (!code || !event_id) {
        return NextResponse.json({ valid: false, error: 'Missing fields' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    const { data: compCode } = await adminClient
        .from('promo_codes')
        .select('id, is_complimentary, max_uses, uses_count')
        .eq('event_id', event_id)
        .ilike('code', code.trim())
        .eq('is_complimentary', true)
        .single()

    if (!compCode) {
        return NextResponse.json({ valid: false, error: 'Invalid or expired code' })
    }

    if (compCode.max_uses !== null && compCode.uses_count >= compCode.max_uses) {
        return NextResponse.json({ valid: false, error: 'This code has reached its usage limit' })
    }

    return NextResponse.json({ valid: true, code_id: compCode.id })
}
