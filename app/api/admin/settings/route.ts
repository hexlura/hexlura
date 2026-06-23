import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditAction } from '@/lib/audit'

export async function POST(request: NextRequest) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()

    const { data: adminProfile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
    if (!adminProfile || adminProfile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { key, value } = await request.json() as { key: string; value: string }

    const VALID_SETTING_KEYS = [
        'booking_fee_percent',
        'booking_fee_min_pence',
        'booking_fee_max_pence',
        'max_featured_slots',
        'maintenance_mode',
        'auto_approve_organisers',
        'stripe_connect_enabled',
        'payout_cooldown_days',
        'from_name',
        'from_email',
        'support_email',
    ] as const

    if (!VALID_SETTING_KEYS.includes(key as typeof VALID_SETTING_KEYS[number])) {
        return NextResponse.json({ error: 'Invalid setting key' }, { status: 400 })
    }

    const NUMERIC_KEYS = ['booking_fee_percent', 'booking_fee_min_pence', 'booking_fee_max_pence', 'max_featured_slots', 'payout_cooldown_days']
    const BOOLEAN_KEYS = ['maintenance_mode', 'auto_approve_organisers', 'stripe_connect_enabled']

    if (NUMERIC_KEYS.includes(key)) {
        const num = Number(value)
        if (!Number.isFinite(num) || num < 0) {
            return NextResponse.json({ error: 'Invalid numeric value' }, { status: 400 })
        }
    }

    if (BOOLEAN_KEYS.includes(key) && value !== 'true' && value !== 'false') {
        return NextResponse.json({ error: 'Value must be true or false' }, { status: 400 })
    }

    await adminClient.from('platform_settings').upsert({
        key,
        value,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
    }, { onConflict: 'key' })

    await logAuditAction({
        actorId: user.id,
        action: 'update_setting',
        entityType: 'platform',
        metadata: { key, value },
    })

    return NextResponse.json({ success: true })
}
