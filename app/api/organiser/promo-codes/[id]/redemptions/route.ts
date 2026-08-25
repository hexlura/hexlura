import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface RouteParams {
    params: { id: string }
}

export async function GET(_request: Request, { params }: RouteParams) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()

    const { data: organiser } = await adminClient
        .from('organiser_profiles').select('id').eq('user_id', user.id).single()
    if (!organiser) return NextResponse.json({ error: 'Not an organiser' }, { status: 403 })

    const { data: code } = await adminClient
        .from('promo_codes')
        .select('id')
        .eq('id', params.id)
        .eq('organiser_id', organiser.id)
        .single()
    if (!code) return NextResponse.json({ error: 'Promo code not found' }, { status: 404 })

    const { data: redemptions } = await adminClient
        .from('promo_code_redemptions')
        .select('id, email, discount_pence, created_at, booking:bookings(booking_ref)')
        .eq('promo_code_id', params.id)
        .order('created_at', { ascending: false })

    return NextResponse.json({ redemptions: redemptions || [] })
}
