import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditAction } from '@/lib/audit'
import { sendOrganiserPayoutPaidEmail } from '@/lib/email'
import { notifyAdmins } from '@/lib/notify-admins'
import { maskAccountNumber } from '@/lib/bank-details'
import { BANK_CHANGE_HOLD_DAYS, bankHold, formatHoldDate, parseHoldOverrideReason, recordHoldOverride } from '@/lib/bank-change-guard'

const VALID_STATUSES = ['pending', 'requested', 'processing', 'paid', 'failed']

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()

    const { data: adminProfile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
    if (!adminProfile || adminProfile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json() as { status: string; reference?: string; force?: boolean; override_reason?: string; override_bank_hold_reason?: string }
    const { status } = body
    const reference = typeof body.reference === 'string' ? body.reference.trim() : ''
    const force = body.force === true
    const overrideReason = typeof body.override_reason === 'string' ? body.override_reason.trim() : ''

    if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const { data: payout } = await adminClient
        .from('payouts')
        .select('id, status, net_pence, reference, organiser_id, organiser_profiles(org_name, user_id, identity_status, identity_verified_at, bank_details_changed_at, bank_account_number), events(title)')
        .eq('id', params.id)
        .single()

    if (!payout) return NextResponse.json({ error: 'Payout not found' }, { status: 404 })

    type PayoutWithOrg = {
        id: string
        status: string
        net_pence: number | null
        reference: string | null
        organiser_id: string
        organiser_profiles: {
            org_name: string
            user_id: string
            identity_status: string | null
            identity_verified_at: string | null
            bank_details_changed_at: string | null
            bank_account_number: string | null
        } | null
        events: { title: string } | null
    }
    const p = payout as unknown as PayoutWithOrg

    // Gate C: identity required on the → paid and → requested transitions.
    // Requested must be gated too — it's the same protection the organiser's
    // own self-service withdrawal route already enforces (identity_status
    // !== 'verified' is blocked there); this admin dropdown was the one path
    // that let an unverified organiser's payout reach 'requested' unchecked.
    const transitioningToPaid = status === 'paid' && p.status !== 'paid'
    const transitioningToRequested = status === 'requested' && p.status !== 'requested'
    const requiresIdentityGate = transitioningToPaid || transitioningToRequested
    const identityVerified = p.organiser_profiles?.identity_verified_at != null
    if (requiresIdentityGate && !identityVerified) {
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

    // Bank-change hold: marking a payout "paid" records money the admin has already sent by hand, to
    // the bank details on file. For 7 days after those details change that needs an audited reason
    // (and every admin is alerted) — see lib/bank-change-guard.ts.
    let holdOverride: { reason: string; hold: ReturnType<typeof bankHold> } | null = null
    if (transitioningToPaid) {
        const hold = bankHold(p.organiser_profiles?.bank_details_changed_at)
        if (hold.held) {
            const reason = parseHoldOverrideReason(body.override_bank_hold_reason)
            if (!reason) {
                return NextResponse.json({
                    error: `This organiser's bank details changed on ${formatHoldDate(hold.changedAt)}. Payouts to them are held for ${BANK_CHANGE_HOLD_DAYS} days (until ${formatHoldDate(hold.releasesAt)}). Confirm the change with the organiser, then override with a reason.`,
                    requires_bank_hold_override: true,
                    held_until: hold.releasesAt,
                }, { status: 409 })
            }
            holdOverride = { reason, hold }
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

    const { error: updateError } = await adminClient.from('payouts').update(update).eq('id', params.id)
    if (updateError) {
        // Don't audit-log, email or notify for a change that never saved.
        console.error(`Payout ${params.id} status update failed:`, updateError)
        return NextResponse.json({ error: 'Could not save the status change' }, { status: 500 })
    }

    await logAuditAction({
        actorId: user.id,
        action: 'update_payout_status',
        entityType: 'payout',
        entityId: params.id,
        metadata: {
            from: p.status,
            to: status,
            reference: reference || undefined,
            identity_override: requiresIdentityGate && !identityVerified ? { reason: overrideReason } : undefined,
            bank_hold_override: holdOverride ? { reason: holdOverride.reason, changed_at: holdOverride.hold.changedAt } : undefined,
        },
    })

    if (holdOverride) {
        await recordHoldOverride({
            actorId: user.id,
            actorEmail: user.email,
            entityType: 'organiser',
            entityId: p.organiser_id,
            label: p.organiser_profiles?.org_name ?? 'an organiser',
            reason: holdOverride.reason,
            hold: holdOverride.hold,
            accountMasked: maskAccountNumber(p.organiser_profiles?.bank_account_number),
            via: 'status',
        })
    }
    if (transitioningToPaid) {
        await notifyAdmins({
            type: 'payout_processed',
            title: 'Payout marked as paid',
            body: `${user.email ?? 'An admin'} marked ${p.organiser_profiles?.org_name ?? 'an organiser'}'s payout of £${((p.net_pence || 0) / 100).toFixed(2)} as paid.`,
            link: '/admin/payouts',
        })
    }

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
