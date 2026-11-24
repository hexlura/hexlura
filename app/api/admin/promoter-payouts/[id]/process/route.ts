import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditAction } from '@/lib/audit'
import { sendPromoterPayoutPaidEmail } from '@/lib/email'
import { notifyAdmins } from '@/lib/notify-admins'
import { maskAccountNumber } from '@/lib/bank-details'
import { BANK_CHANGE_HOLD_DAYS, bankHold, formatHoldDate, parseHoldOverrideReason, recordHoldOverride } from '@/lib/bank-change-guard'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()

    const { data: adminProfile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
    if (!adminProfile || adminProfile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    let reference = ''
    let holdOverrideRaw: unknown = null
    try {
        const body = await request.json() as { reference?: string; override_bank_hold_reason?: string }
        if (typeof body.reference === 'string') reference = body.reference.trim()
        holdOverrideRaw = body.override_bank_hold_reason
    } catch {
        // No body — fall back to derived
    }

    const { data: payout } = await adminClient
        .from('promoter_payouts')
        .select('id, status, net_pence, payout_method, promoter_id, promoter_profiles(display_name, referral_code, stripe_account_id, user_id, bank_account_number, bank_details_changed_at)')
        .eq('id', params.id)
        .single()

    if (!payout) return NextResponse.json({ error: 'Payout not found' }, { status: 404 })

    type PayoutWithPromoter = {
        id: string
        status: string
        net_pence: number
        payout_method: string | null
        promoter_id: string
        promoter_profiles: {
            display_name: string
            referral_code: string
            stripe_account_id: string | null
            user_id: string
            bank_account_number: string | null
            bank_details_changed_at: string | null
        } | null
    }
    const p = payout as unknown as PayoutWithPromoter
    const payoutMethod = p.payout_method ?? 'bank_transfer'

    // Only an unpaid payout can be processed — re-processing a paid one would send a second real transfer.
    const PROCESSABLE = ['pending', 'requested', 'failed']
    if (!PROCESSABLE.includes(p.status)) {
        return NextResponse.json({ error: `Payout is already ${p.status}` }, { status: 409 })
    }

    // Bank-change hold (see lib/bank-change-guard.ts): 7 days after a promoter's bank details change,
    // bank-transfer payouts need an audited reason and alert every admin. Stripe payouts are unaffected.
    let holdOverride: { reason: string; hold: ReturnType<typeof bankHold> } | null = null
    if (payoutMethod === 'bank_transfer') {
        const hold = bankHold(p.promoter_profiles?.bank_details_changed_at)
        if (hold.held) {
            const reason = parseHoldOverrideReason(holdOverrideRaw)
            if (!reason) {
                return NextResponse.json({
                    error: `This promoter's bank details changed on ${formatHoldDate(hold.changedAt)}. Bank-transfer payouts are held for ${BANK_CHANGE_HOLD_DAYS} days (until ${formatHoldDate(hold.releasesAt)}). Confirm the change with them, then override with a reason.`,
                    requires_bank_hold_override: true,
                    held_until: hold.releasesAt,
                }, { status: 409 })
            }
            holdOverride = { reason, hold }
        }
    }

    if (payoutMethod === 'stripe_connect' && !p.promoter_profiles?.stripe_account_id) {
        return NextResponse.json({ error: 'This promoter has no connected Stripe account — use bank transfer instead.' }, { status: 400 })
    }

    // Atomically claim it so a double-click or two admins cannot pay twice.
    const { data: claimed } = await adminClient
        .from('promoter_payouts')
        .update({ status: 'processing' })
        .eq('id', params.id)
        .in('status', PROCESSABLE)
        .select('id')
        .maybeSingle()
    if (!claimed) return NextResponse.json({ error: 'Payout is already being processed' }, { status: 409 })

    let transferId: string | null = null
    let success = false
    let failureReason: string | null = null

    if (payoutMethod === 'stripe_connect' && p.promoter_profiles?.stripe_account_id) {
        try {
            const stripe = (await import('stripe')).default
            const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2026-02-25.clover' })
            // A retried request for the same payout returns the original transfer instead of a second one.
            const idempotencyKey = p.status === 'failed' ? `promoter-payout-${p.id}-retry-${Date.now()}` : `promoter-payout-${p.id}`
            const transfer = await stripeClient.transfers.create({
                amount: p.net_pence,
                currency: 'gbp',
                destination: p.promoter_profiles.stripe_account_id,
            }, { idempotencyKey })
            transferId = transfer.id
            success = true
        } catch (err) {
            failureReason = err instanceof Error ? err.message : 'Stripe transfer failed'
            console.error(`Promoter payout ${p.id} transfer failed:`, err)
        }
    } else if (payoutMethod === 'bank_transfer') {
        success = true
    }

    const paidAt = success ? new Date() : null

    const derivedRef = `HXL-PRM-${p.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`
    const finalReference = reference
        || (payoutMethod === 'stripe_connect' ? (transferId || derivedRef) : derivedRef)

    const updateRow: Record<string, string | null> = {
        status: success ? 'paid' : 'failed',
        paid_at: paidAt ? paidAt.toISOString() : null,
        processed_at: new Date().toISOString(),
    }
    if (success) updateRow.reference = finalReference
    if (!success) updateRow.failure_reason = failureReason ?? 'Stripe transfer failed'

    const { error: updateError } = await adminClient.from('promoter_payouts').update(updateRow).eq('id', params.id)
    if (updateError) {
        // Money may already have moved — never report this as a clean result.
        console.error(`Promoter payout ${p.id} status update failed after processing:`, updateError)
        await notifyAdmins({
            type: 'payout_failed',
            title: 'Promoter payout status update failed — check manually',
            body: `Promoter payout ${p.id} (${p.promoter_profiles?.display_name ?? 'promoter'}, £${(p.net_pence / 100).toFixed(2)}) ${success ? `was sent${transferId ? ` (transfer ${transferId})` : ''}` : 'failed'} but its row could not be updated and is stuck as 'processing'. Do not retry before checking Stripe.`,
            link: '/admin/payouts',
        })
        return NextResponse.json({ error: 'Payout was processed but its status could not be saved. Check Stripe before retrying.' }, { status: 500 })
    }

    // Mark linked earnings as paid (timestamp lives on the payout, not the earning)
    if (success) {
        const { error: earningsError } = await adminClient
            .from('promoter_earnings')
            .update({ status: 'paid' })
            .eq('payout_id', params.id)
        if (earningsError) console.error(`Promoter payout ${p.id}: could not mark earnings paid:`, earningsError.message)
    }

    await logAuditAction({
        actorId: user.id,
        action: 'process_promoter_payout',
        entityType: 'promoter_payout',
        entityId: params.id,
        metadata: {
            net_pence: p.net_pence,
            payout_method: payoutMethod,
            reference: success ? finalReference : undefined,
            failure_reason: failureReason ?? undefined,
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
            via: 'process',
        })
    }

    if (success && paidAt && p.promoter_profiles) {
        await notifyAdmins({
            type: 'payout_processed',
            title: 'Promoter payout processed',
            body: `${user.email ?? 'An admin'} processed ${p.promoter_profiles.display_name}'s commission payout of £${(p.net_pence / 100).toFixed(2)} by ${payoutMethod === 'stripe_connect' ? 'Stripe' : 'bank transfer'}.`,
            link: '/admin/payouts',
        })

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
                reference: finalReference,
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

    if (!success) {
        return NextResponse.json({ error: failureReason ?? 'Payout failed' }, { status: 502 })
    }

    return NextResponse.json({ success: true })
}
