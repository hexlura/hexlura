import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolvePromoterId } from '@/lib/promoter-access'

export async function PATCH(request: NextRequest) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const promoterId = await resolvePromoterId(user.id)
    if (!promoterId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const adminClient = createAdminClient()
    const { data: promoterProfile } = await adminClient
        .from('promoter_profiles')
        .select('status')
        .eq('id', promoterId)
        .single()
    if (promoterProfile?.status === 'suspended') return NextResponse.json({ error: 'Your account has been suspended' }, { status: 403 })

    const body = await request.json().catch(() => ({})) as {
        display_name?: string
        bio?: string | null
        payout_method?: 'bank_transfer' | 'stripe_connect' | null
        bank_account_name?: string | null
        bank_account_number?: string | null
        bank_sort_code?: string | null
    }

    const update: Record<string, unknown> = {}
    if (typeof body.display_name === 'string') {
        const name = body.display_name.trim()
        if (name.length < 2 || name.length > 50) {
            return NextResponse.json({ error: 'Display name must be 2–50 characters' }, { status: 400 })
        }
        update.display_name = name
    }
    if (body.bio !== undefined) update.bio = body.bio?.toString().trim() || null
    if (body.payout_method !== undefined) update.payout_method = body.payout_method
    if (body.bank_account_name !== undefined) update.bank_account_name = body.bank_account_name
    if (body.bank_account_number !== undefined) update.bank_account_number = body.bank_account_number
    if (body.bank_sort_code !== undefined) update.bank_sort_code = body.bank_sort_code

    const { error } = await adminClient
        .from('promoter_profiles')
        .update(update)
        .eq('id', promoterId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
}
