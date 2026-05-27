import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditAction } from '@/lib/audit'
import { sendPromoterPayoutPaidEmail } from '@/lib/email'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()

    const { data: adminProfile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
    if (!adminProfile || adminProfile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    let reference = ''
    try {
        const body = await request.json() as { reference?: string }
        if (typeof body.reference === 'string') reference = body.reference.trim()
    } catch {
        // No body — fall back to derived
    }

    const { data: payout } = await adminClient
        .from('promoter_payouts')
        .select('id, net_pence, payout_method, promoter_profiles(display_name, referral_code, stripe_account_id, user_id)')
        .eq('id', params.id)
        .single()

    if (!payout) return NextResponse.json({ error: 'Payout not found' }, { status: 404 })

    type PayoutWithPromoter = {
        id: string
        net_pence: number
        payout_method: string | null
        promoter_profiles: {
            display_name: string
            referral_code: string
            stripe_account_id: string | null
            user_id: string
        } | null
    }
    const p = payout as unknown as PayoutWithPromoter
    const payoutMethod = p.payout_method ?? 'bank_transfer'

    let transferId: string | null = null
    let success = false

    if (payoutMethod === 'stripe_connect' && p.promoter_profiles?.stripe_account_id) {
        try {
            const stripe = (await import('stripe')).default
            const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2026-02-25.clover' })
            const transfer = await stripeClient.transfers.create({
                amount: p.net_pence,
                currency: 'gbp',
                destination: p.promoter_profiles.stripe_account_id,
            })
            transferId = transfer.id
            success = true
        } catch {
            // Mark as failed
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
    if (!success) updateRow.failure_reason = 'Stripe transfer failed'

    await adminClient.from('promoter_payouts').update(updateRow).eq('id', params.id)

    // Mark linked earnings as paid (timestamp lives on the payout, not the earning)
    if (success) {
        await adminClient
            .from('promoter_earnings')
            .update({ status: 'paid' })
            .eq('payout_id', params.id)
    }

    await logAuditAction({
        actorId: user.id,
        action: 'process_promoter_payout',
        entityType: 'promoter_payout',
        entityId: params.id,
        metadata: { net_pence: p.net_pence, payout_method: payoutMethod, reference: success ? finalReference : undefined },
    })

    if (success && paidAt && p.promoter_profiles) {
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

    return NextResponse.json({ success: true })
}
