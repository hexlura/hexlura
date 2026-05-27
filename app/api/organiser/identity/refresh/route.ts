import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'
import { resolveOrganiserId } from '@/lib/organiser-access'
import { sendOrganiserIdentityVerifiedEmail } from '@/lib/email'

// Manual fallback for when the webhook is delayed / not subscribed.
// Pulls the latest Stripe Verification Session for this organiser, maps the
// status to our enum, updates the DB, and on a → verified transition fires the
// same email + notification side-effects the webhook would have.
export async function POST() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const organiserId = await resolveOrganiserId(user.id)
    if (!organiserId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const adminClient = createAdminClient()

    const { data: organiser } = await adminClient
        .from('organiser_profiles')
        .select('id, user_id, org_name, identity_status, identity_session_id, identity_verified_at')
        .eq('id', organiserId)
        .single()

    if (!organiser) return NextResponse.json({ error: 'Organiser not found' }, { status: 404 })
    if (!organiser.identity_session_id) {
        return NextResponse.json({ error: 'No verification session in progress' }, { status: 400 })
    }

    let session
    try {
        session = await getStripe().identity.verificationSessions.retrieve(organiser.identity_session_id)
    } catch (err) {
        const e = err as { message?: string }
        return NextResponse.json({ error: `Stripe error: ${e.message ?? 'unknown'}` }, { status: 500 })
    }

    // Map Stripe status to our enum
    type DbStatus = 'processing' | 'verified' | 'requires_input' | 'canceled'
    let nextStatus: DbStatus
    switch (session.status) {
        case 'verified': nextStatus = 'verified'; break
        case 'requires_input': nextStatus = 'requires_input'; break
        case 'canceled': nextStatus = 'canceled'; break
        case 'processing': nextStatus = 'processing'; break
        default: nextStatus = 'processing'
    }

    const wasAlreadyVerified = organiser.identity_status === 'verified'
    const update: Record<string, string | null> = { identity_status: nextStatus }

    if (nextStatus === 'verified' && !wasAlreadyVerified) {
        update.identity_verified_at = new Date().toISOString()
        update.identity_failure_reason = null
    } else if (nextStatus === 'requires_input') {
        update.identity_failure_reason = session.last_error?.reason ?? session.last_error?.code ?? 'unknown'
    } else if (nextStatus === 'canceled') {
        update.identity_failure_reason = null
    }

    await adminClient
        .from('organiser_profiles')
        .update(update)
        .eq('id', organiserId)

    // Side-effects: only fire on the pending/processing → verified transition,
    // matching the webhook handler so we don't double-send.
    if (nextStatus === 'verified' && !wasAlreadyVerified) {
        await adminClient.from('notifications').insert({
            user_id: organiser.user_id,
            type: 'identity_verified',
            title: 'Identity verified',
            body: 'Your identity has been verified — payouts are now enabled.',
            link: '/organiser/payouts',
        })

        const { data: profile } = await adminClient
            .from('profiles')
            .select('email, full_name')
            .eq('id', organiser.user_id)
            .single()

        if (profile?.email) {
            await sendOrganiserIdentityVerifiedEmail({
                to: profile.email,
                fullName: profile.full_name || organiser.org_name,
                orgName: organiser.org_name,
                verifiedAt: new Date(update.identity_verified_at!),
            })
        }
    }

    return NextResponse.json({ status: nextStatus })
}
