import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditAction } from '@/lib/audit'
import { sendOrganiserPayoutPaidEmail } from '@/lib/email'
import { notifyAdmins } from '@/lib/notify-admins'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()

    const { data: adminProfile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
    if (!adminProfile || adminProfile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    let reference = ''
    let force = false
    let overrideReason = ''
    try {
        const body = await request.json() as { reference?: string; force?: boolean; override_reason?: string }
        if (typeof body.reference === 'string') reference = body.reference.trim()
        if (body.force === true) force = true
        if (typeof body.override_reason === 'string') overrideReason = body.override_reason.trim()
    } catch {
        // No JSON body (e.g. "Process All" loop posts no body) — fine, fall back to derived
    }

    const { data: payout } = await adminClient
        .from('payouts')
        .select('id, status, net_pence, organiser_id, event_id, organiser_profiles(stripe_account_id, payout_method, org_name, user_id, identity_status, identity_verified_at), events(title)')
        .eq('id', params.id)
        .single()

    if (!payout) return NextResponse.json({ error: 'Payout not found' }, { status: 404 })

    type PayoutWithOrg = {
        id: string
        status: string
        net_pence: number | null
        organiser_id: string
        event_id: string | null
        organiser_profiles: {
            stripe_account_id: string | null
            payout_method: string
            org_name: string
            user_id: string
            identity_status: string | null
            identity_verified_at: string | null
        } | null
        events: { title: string } | null
    }
    const p = payout as unknown as PayoutWithOrg
    const payoutMethod = p.organiser_profiles?.payout_method ?? 'bank_transfer'

    // Gate B: identity must be verified, unless admin supplies a force override + reason
    const identityVerified = p.organiser_profiles?.identity_verified_at != null
    if (!identityVerified) {
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

    // Only an unpaid payout can be processed. Re-processing a 'paid' one would
    // send a second real Stripe transfer (or a second "payout sent" email).
    const PROCESSABLE = ['pending', 'requested', 'failed']
    if (!PROCESSABLE.includes(p.status)) {
        return NextResponse.json({ error: `Payout is already ${p.status}` }, { status: 409 })
    }

    // Atomically claim it: only one caller can move it to 'processing', so a
    // double-click, two admins, or "Process All" overlapping can't double-pay.
    const { data: claimed } = await adminClient
        .from('payouts')
        .update({ status: 'processing' })
        .eq('id', params.id)
        .in('status', PROCESSABLE)
        .select('id')
        .maybeSingle()
    if (!claimed) {
        return NextResponse.json({ error: 'Payout is already being processed' }, { status: 409 })
    }

    let transferId: string | null = null
    let success = false
    let failureReason: string | null = null

    if (payoutMethod === 'stripe_connect' && !p.organiser_profiles?.stripe_account_id) {
        failureReason = 'Organiser is set to Stripe Connect but has no connected account'
    } else if (payoutMethod === 'stripe_connect' && p.organiser_profiles?.stripe_account_id) {
        try {
            const stripe = (await import('stripe')).default
            const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2026-02-25.clover' })
            // Idempotency key: a retried request for the same payout returns the
            // original transfer instead of creating another. A retry after a
            // failure needs a fresh key (Stripe replays failures too).
            const idempotencyKey = p.status === 'failed' ? `payout-${p.id}-retry-${Date.now()}` : `payout-${p.id}`
            const transfer = await stripeClient.transfers.create({
                amount: p.net_pence || 0,
                currency: 'gbp',
                destination: p.organiser_profiles.stripe_account_id,
            }, { idempotencyKey })
            transferId = transfer.id
            success = true
        } catch (err) {
            failureReason = err instanceof Error ? err.message : 'Stripe transfer failed'
            console.error(`Payout ${p.id} transfer failed:`, err)
        }
    } else if (payoutMethod === 'bank_transfer') {
        // Manual bank transfer — admin has already sent payment externally
        success = true
    }

    const paidAt = success ? new Date() : null

    // Final reference: admin-supplied wins; otherwise use derived for bank transfers, transferId for Stripe
    const derivedRef = `HXL-PAY-${p.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`
    const finalReference = reference
        || (payoutMethod === 'stripe_connect' ? (transferId || derivedRef) : derivedRef)

    const updateRow: Record<string, string | null> = {
        status: success ? 'paid' : 'failed',
        paid_at: paidAt ? paidAt.toISOString() : null,
        stripe_transfer_id: transferId,
    }
    if (success) {
        updateRow.reference = finalReference
    }

    const { error: updateError } = await adminClient.from('payouts').update(updateRow).eq('id', params.id)
    if (updateError) {
        // Money may already have moved — never report this as a clean result.
        console.error(`Payout ${p.id} status update failed after processing:`, updateError)
        await notifyAdmins({
            type: 'payout_failed',
            title: 'Payout status update failed — check manually',
            body: `Payout ${p.id} (${p.organiser_profiles?.org_name ?? 'organiser'}, £${((p.net_pence || 0) / 100).toFixed(2)}) ${success ? `was sent (transfer ${transferId ?? 'bank'})` : 'failed'} but its row could not be updated and is stuck as 'processing'. Do not retry before checking Stripe.`,
            link: '/admin/payouts',
        })
        return NextResponse.json({ error: 'Payout was processed but its status could not be saved. Check Stripe before retrying.' }, { status: 500 })
    }

    await logAuditAction({
        actorId: user.id,
        action: 'process_payout',
        entityType: 'payout',
        entityId: params.id,
        metadata: {
            net_pence: p.net_pence,
            payout_method: payoutMethod,
            stripe_transfer_id: transferId,
            reference: success ? finalReference : undefined,
            failure_reason: failureReason ?? undefined,
            identity_override: !identityVerified ? { reason: overrideReason } : undefined,
        },
    })

    if (success && paidAt && p.organiser_profiles) {
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
                reference: finalReference,
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

    if (!success) {
        return NextResponse.json({ error: failureReason ?? 'Payout failed' }, { status: 502 })
    }

    return NextResponse.json({ success: true })
}
