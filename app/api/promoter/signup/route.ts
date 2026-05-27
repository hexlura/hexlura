import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateUniqueReferralCode } from '@/lib/promoter-access'
import { sendPromoterWelcomeEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({})) as { display_name?: string; bio?: string }
    const displayName = (body.display_name ?? '').trim()
    if (!displayName || displayName.length < 2) {
        return NextResponse.json({ error: 'Display name must be at least 2 characters' }, { status: 400 })
    }
    if (displayName.length > 50) {
        return NextResponse.json({ error: 'Display name must be 50 characters or fewer' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Idempotent: if a row already exists, return it instead of erroring
    const { data: existing } = await adminClient
        .from('promoter_profiles')
        .select('id, referral_code')
        .eq('user_id', user.id)
        .maybeSingle()

    if (existing) {
        return NextResponse.json({ ok: true, id: existing.id, referral_code: existing.referral_code })
    }

    const referralCode = await generateUniqueReferralCode(displayName)

    const { data: created, error } = await adminClient
        .from('promoter_profiles')
        .insert({
            user_id: user.id,
            display_name: displayName,
            referral_code: referralCode,
            bio: body.bio?.trim() || null,
        })
        .select('id, referral_code')
        .single()

    if (error || !created) {
        return NextResponse.json({ error: error?.message || 'Failed to create promoter profile' }, { status: 500 })
    }

    // Welcome email — best-effort
    if (user.email) {
        void sendPromoterWelcomeEmail({
            to: user.email,
            displayName,
            referralCode: created.referral_code,
        })
    }

    return NextResponse.json({ ok: true, id: created.id, referral_code: created.referral_code })
}
