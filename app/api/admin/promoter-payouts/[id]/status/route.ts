import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditAction } from '@/lib/audit'
import { sendPromoterPayoutPaidEmail } from '@/lib/email'
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

    const body = await request.json() as { status: string; reference?: string; override_bank_hold_reason?: string }
    const { status } = body
    const reference = typeof body.reference === 'string' ? body.reference.trim() : ''

    if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const { data: payout } = await adminClient
        .from('promoter_payouts')
        .select('id, status, net_pence, reference, promoter_id, promoter_profiles(display_name, referral_code, user_id, bank_account_number, bank_details_changed_at)')
        .eq('id', params.id)
        .single()

    if (!payout) return NextResponse.json({ error: 'Payout not found' }, { status: 404 })

    type PayoutWithPromoter = {
        id: string
        status: string
        net_pence: number
        reference: string | null
        promoter_id: string
        promoter_profiles: { display_name: string; referral_code: string; user_id: string; bank_account_number: string | null; bank_details_changed_at: string | null } | null
    }
    const p = payout as unknown as PayoutWithPromoter

    // Bank-change hold: marking a payout paid records money already sent by hand to the bank details on
    // file. For 7 days after they change that needs an audited reason (every admin is alerted).
    const transitioningToPaid = status === 'paid' && p.status !== 'paid'
    let holdOverride: { reason: string; hold: ReturnType<typeof bankHold> } | null = null
    if (transitioningToPaid) {
        const hold = bankHold(p.promoter_profiles?.bank_details_changed_at)
        if (hold.held) {
            const reason = parseHoldOverrideReason(body.override_bank_hold_reason)
            if (!reason) {
                return NextResponse.json({
                    error: `This promoter's bank details changed on ${formatHoldDate(hold.changedAt)}. Payouts to them are held for ${BANK_CHANGE_HOLD_DAYS} days (until ${formatHoldDate(hold.releasesAt)}). Confirm the change with them, then override with a reason.`,
                    requires_bank_hold_override: true,
                    held_until: hold.releasesAt,
                }, { status: 409 })
            }
            holdOverride = { reason, hold }
        }
    }

    const update: Record<string, string | null> = { status }
    const paidAt = status === 'paid' ? new Date() : null

    if (status === 'paid') update.paid_at = paidAt!.toISOString()
    if (status === 'requested') update.requested_at = new Date().toISOString()
    if (status !== 'paid' && p.status === 'paid') update.paid_at = null
    if (reference) update.reference = reference

    const { error: updateError } = await adminClient.from('promoter_payouts').update(update).eq('id', params.id)
    if (updateError) {
        console.error(`Promoter payout ${params.id} status update failed:`, updateError)
        return NextResponse.json({ error: 'Could not save the status change' }, { status: 500 })
    }

    // Mark linked earnings as paid (timestamp lives on the payout, not the earning)
    if (status === 'paid' && p.status !== 'paid' && paidAt) {
        const { error: earningsError } = await adminClient
            .from('promoter_earnings')
            .update({ status: 'paid' })
            .eq('payout_id', params.id)
        if (earningsError) console.error(`Promoter payout ${params.id}: could not mark earnings paid:`, earningsError.message)
    }

    await logAuditAction({
        actorId: user.id,
        action: 'update_promoter_payout_status',
        entityType: 'promoter_payout',
        entityId: params.id,
        metadata: {
            from: p.status,
            to: status,
            reference: reference || undefined,
            bank_hold_override: holdOverride ? { reason: holdOverride.reason, changed_at: holdOverride.hold.changedAt } : undefined,
        },
    })

    if (holdOverride) {
        await recordHoldOverride({
            actorId: user.id,
            actorEmail: user.email,
            entityType: 'promoter',
            entityId: p.promoter_id,
            label: p.promoter_profiles?.display_name ?? 'a promoter',
            reason: holdOverride.reason,
            hold: holdOverride.hold,
            accountMasked: maskAccountNumber(p.promoter_profiles?.bank_account_number),
            via: 'status',
        })
    }
    if (transitioningToPaid) {
        await notifyAdmins({
            type: 'payout_processed',
            title: 'Promoter payout marked as paid',
            body: `${user.email ?? 'An admin'} marked ${p.promoter_profiles?.display_name ?? 'a promoter'}'s payout of £${(p.net_pence / 100).toFixed(2)} as paid.`,
            link: '/admin/payouts',
        })
    }

    if (status === 'paid' && p.status !== 'paid' && paidAt && p.promoter_profiles) {
        const { data: promoterUser } = await adminClient
            .from('profiles')
            .select('email, full_name')
            .eq('id', p.promoter_profiles.user_id)
            .single()

        if (promoterUser?.email) {
            await sendPromoterPayoutPaidEmail({
                to: promoterUser.email,
                fullName: promoterUser.full_name || p.promoter_profiles.display_name,
                displayName: p.promoter_profiles.display_name,
                referralCode: p.promoter_profiles.referral_code,
                netPence: p.net_pence,
                paidAt,
                payoutId: p.id,
                reference: reference || p.reference,
            })
        }

        await adminClient.from('notifications').insert({
            user_id: p.promoter_profiles.user_id,
            type: 'promoter_payout_paid',
            title: 'Commission paid',
            body: `£${(p.net_pence / 100).toFixed(2)} has been sent to your bank account.`,
            link: '/promoter/payouts',
        })
    }

    return NextResponse.json({ success: true })
}
