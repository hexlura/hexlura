import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditAction } from '@/lib/audit'
import { HOME_THEME_MODES } from '@/lib/home-theme-config'
import { normaliseWhatsAppNumber } from '@/lib/whatsapp-shared'
import { revalidatePath } from 'next/cache'

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
        'order_processing_fee_pence',
        'max_featured_slots',
        'maintenance_mode',
        'auto_approve_organisers',
        'stripe_connect_enabled',
        'payout_cooldown_days',
        'from_name',
        'from_email',
        'support_email',
        'meta_pixel_id',
        'home_theme_mode',
        'home_theme_particles',
        'whatsapp_number',
        'whatsapp_message',
        'whatsapp_floating',
    ] as const

    if (!VALID_SETTING_KEYS.includes(key as typeof VALID_SETTING_KEYS[number])) {
        return NextResponse.json({ error: 'Invalid setting key' }, { status: 400 })
    }

    const NUMERIC_KEYS = ['booking_fee_percent', 'booking_fee_min_pence', 'booking_fee_max_pence', 'order_processing_fee_pence', 'max_featured_slots', 'payout_cooldown_days']
    const BOOLEAN_KEYS = ['maintenance_mode', 'auto_approve_organisers', 'stripe_connect_enabled', 'home_theme_particles', 'whatsapp_floating']

    if (NUMERIC_KEYS.includes(key)) {
        const num = Number(value)
        if (!Number.isFinite(num) || num < 0) {
            return NextResponse.json({ error: 'Invalid numeric value' }, { status: 400 })
        }
    }

    if (BOOLEAN_KEYS.includes(key) && value !== 'true' && value !== 'false') {
        return NextResponse.json({ error: 'Value must be true or false' }, { status: 400 })
    }

    if (key === 'home_theme_mode' && !(HOME_THEME_MODES as readonly string[]).includes(value)) {
        return NextResponse.json({ error: 'Invalid theme mode' }, { status: 400 })
    }

    // Value actually stored. WhatsApp fields are cleaned/validated so a typo can't end up on every page of the site.
    let storedValue = value
    if (key === 'whatsapp_number') {
        // Blank is allowed on purpose: it switches WhatsApp off everywhere.
        if (typeof value !== 'string' || value.trim() === '') {
            storedValue = ''
        } else {
            const digits = normaliseWhatsAppNumber(value)
            if (!digits) {
                return NextResponse.json({ error: 'Enter a valid mobile number with country code, e.g. +44 7471 442401' }, { status: 400 })
            }
            storedValue = digits
        }
    }
    if (key === 'whatsapp_message') {
        const msg = typeof value === 'string' ? value.trim() : ''
        // eslint-disable-next-line no-control-regex
        if (msg.length > 200 || /[\u0000-\u001f\u007f]/.test(msg)) {
            return NextResponse.json({ error: 'Message must be 200 characters or fewer, on one line' }, { status: 400 })
        }
        storedValue = msg
    }

    const { error: upsertError } = await adminClient.from('platform_settings').upsert({
        key,
        value: storedValue,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
    }, { onConflict: 'key' })

    if (upsertError) {
        console.error('platform_settings upsert failed:', upsertError)
        return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    await logAuditAction({
        actorId: user.id,
        action: 'update_setting',
        entityType: 'platform',
        metadata: { key, value: storedValue },
    })

    // The WhatsApp icon lives in the root layout and the contact page shows the number — drop every cached
    // copy so an admin change appears straight away instead of after the pages' normal refresh time.
    if (key.startsWith('whatsapp_')) revalidatePath('/', 'layout')

    return NextResponse.json({ success: true })
}
