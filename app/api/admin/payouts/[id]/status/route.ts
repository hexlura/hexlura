import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditAction } from '@/lib/audit'
import { sendOrganiserPayoutPaidEmail } from '@/lib/email'

const VALID_STATUSES = ['pending', 'requested', 'processing', 'paid', 'failed']

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()

    const { data: adminProfile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
    if (!adminProfile || adminProfile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json() as { status: string; reference?: string; force?: boolean; override_reason?: string }
    const { status } = body
    const reference = typeof body.reference === 'string' ? body.reference.trim() : ''
    const force = body.force === true
    const overrideReason = typeof body.override_reason === 'string' ? body.override_reason.trim() : ''

    if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const { data: payout } = await adminClient
        .from('payouts')
        .select('id, status, net_pence, reference, organiser_profiles(org_name, user_id, identity_status, identity_verified_at), events(title)')
        .eq('id', params.id)
        .single()

    if (!payout) return NextResponse.json({ error: 'Payout not found' }, { status: 404 })

    type PayoutWithOrg = {
        id: string
        status: string
        net_pence: number | null
        reference: string | null
        organiser_profiles: {
            org_name: string
            user_id: string
            identity_status: string | null
            identity_verified_at: string | null
        } | null
        events: { title: string } | null
    }
    const p = payout as unknown as PayoutWithOrg

    // Gate C: identity required only on the → paid transition
    const transitioningToPaid = status === 'paid' && p.status !== 'paid'
    const identityVerified = p.organiser_profiles?.identity_verified_at != null
    if (transitioningToPaid && !identityVerified) {
        if (!force) {
            return NextResponse.json(
                { error: 'Organiser identity not verified', requires_override: true },
                { status: 403 },
            )
        }
        if (!overrideReason) {
            return NextResponse.json(
                { error: 'Override requires a reason' },
                { status: 400 },
            )
        }
    }

    const update: Record<string, string | null> = { status }
    const paidAt = status === 'paid' ? new Date() : null

    if (status === 'paid') {
        update.paid_at = paidAt!.toISOString()
    }
    if (status === 'requested') {
        update.requested_at = new Date().toISOString()
    }
    // Clear paid_at if moving away from paid
    if (status !== 'paid' && p.status === 'paid') {
        update.paid_at = null
    }
    if (reference) {
        update.reference = reference
    }

    await adminClient.from('payouts').update(update).eq('id', params.id)

    await logAuditAction({
        actorId: user.id,
        action: 'update_payout_status',
        entityType: 'payout',
        entityId: params.id,
        metadata: {
            from: p.status,
            to: status,
            reference: reference || undefined,
            identity_override: transitioningToPaid && !identityVerified ? { reason: overrideReason } : undefined,
        },
    })

    // Notify organiser only on the pending/requested/processing → paid transition
    if (status === 'paid' && p.status !== 'paid' && paidAt && p.organiser_profiles) {
        const { data: organiserUser } = await adminClient
            .from('profiles')
            .select('email, full_name')
            .eq('id', p.organiser_profiles.user_id)
            .single()

        if (organiserUser?.email) {
            await sendOrganiserPayoutPaidEmail({
                to: organiserUser.email,
                fullName: organiserUser.full_name || p.organiser_profiles.org_name,
                orgName: p.organiser_profiles.org_name,
                netPence: p.net_pence || 0,
                paidAt,
                payoutId: p.id,
                reference: reference || p.reference,
                eventName: p.events?.title,
            })
        }

        await adminClient.from('notifications').insert({
            user_id: p.organiser_profiles.user_id,
            type: 'payout_paid',
            title: 'Payout sent',
            body: `£${((p.net_pence || 0) / 100).toFixed(2)} has been sent to your bank account.`,
            link: '/organiser/payouts',
        })
    }

    return NextResponse.json({ success: true })
}
