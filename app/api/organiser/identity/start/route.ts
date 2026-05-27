import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'
import { resolveOrganiserId } from '@/lib/organiser-access'
import { logAuditAction } from '@/lib/audit'

export async function POST() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const organiserId = await resolveOrganiserId(user.id)
    if (!organiserId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const adminClient = createAdminClient()

    // Block re-verification once already verified
    const { data: organiser, error: organiserErr } = await adminClient
        .from('organiser_profiles')
        .select('id, identity_status')
        .eq('id', organiserId)
        .single()

    if (organiserErr) {
        // Most common cause: migration 030 hasn't been applied yet, so identity_status doesn't exist
        console.error('[identity/start] organiser lookup failed:', organiserErr)
        return NextResponse.json(
            { error: `Database error — has migration 030_organiser_identity been applied? (${organiserErr.message})` },
            { status: 500 },
        )
    }

    if (!organiser) return NextResponse.json({ error: 'Organiser not found' }, { status: 404 })
    if (organiser.identity_status === 'verified') {
        return NextResponse.json({ error: 'Already verified' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hexlura.com'

    const flowId = process.env.STRIPE_IDENTITY_FLOW_ID

    let session
    try {
        const stripe = getStripe()
        session = await stripe.identity.verificationSessions.create({
            ...(flowId
                ? { verification_flow: flowId }
                : { type: 'document' as const }),
            metadata: {
                organiser_id: organiserId,
                user_id: user.id,
            },
            return_url: `${appUrl}/organiser/settings?identity=done`,
        })
    } catch (err) {
        const e = err as { message?: string; code?: string; type?: string; raw?: { message?: string } }
        const detail = e.raw?.message || e.message || 'unknown Stripe error'
        console.error('[identity/start] Stripe verification session create failed:', e)
        return NextResponse.json(
            {
                error: `Stripe error: ${detail}. If this says Identity isn't enabled, activate it in Stripe Dashboard → Settings → Identity.`,
                code: e.code,
                type: e.type,
            },
            { status: 500 },
        )
    }

    const { error: updateErr } = await adminClient
        .from('organiser_profiles')
        .update({
            identity_session_id: session.id,
            identity_status: 'processing',
            identity_last_attempt_at: new Date().toISOString(),
            identity_failure_reason: null,
        })
        .eq('id', organiserId)

    if (updateErr) {
        // Same likely cause — migration not run
        console.error('[identity/start] organiser update failed:', updateErr)
        return NextResponse.json(
            { error: `Database error saving session — has migration 030 been applied? (${updateErr.message})` },
            { status: 500 },
        )
    }

    await logAuditAction({
        actorId: user.id,
        action: 'start_identity_verification',
        entityType: 'organiser',
        entityId: organiserId,
        metadata: { session_id: session.id },
    })

    return NextResponse.json({ url: session.url })
}
