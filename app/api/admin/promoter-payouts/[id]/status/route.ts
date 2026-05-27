import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditAction } from '@/lib/audit'
import { sendPromoterPayoutPaidEmail } from '@/lib/email'

const VALID_STATUSES = ['pending', 'requested', 'processing', 'paid', 'failed']

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()

    const { data: adminProfile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
    if (!adminProfile || adminProfile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json() as { status: string; reference?: string }
    const { status } = body
    const reference = typeof body.reference === 'string' ? body.reference.trim() : ''

    if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const { data: payout } = await adminClient
        .from('promoter_payouts')
        .select('id, status, net_pence, reference, promoter_profiles(display_name, referral_code, user_id)')
        .eq('id', params.id)
        .single()

    if (!payout) return NextResponse.json({ error: 'Payout not found' }, { status: 404 })

    type PayoutWithPromoter = {
        id: string
        status: string
        net_pence: number
        reference: string | null
        promoter_profiles: { display_name: string; referral_code: string; user_id: string } | null
    }
    const p = payout as unknown as PayoutWithPromoter

    const update: Record<string, string | null> = { status }
    const paidAt = status === 'paid' ? new Date() : null

    if (status === 'paid') update.paid_at = paidAt!.toISOString()
    if (status === 'requested') update.requested_at = new Date().toISOString()
    if (status !== 'paid' && p.status === 'paid') update.paid_at = null
    if (reference) update.reference = reference

    await adminClient.from('promoter_payouts').update(update).eq('id', params.id)

    // Mark linked earnings as paid (timestamp lives on the payout, not the earning)
    if (status === 'paid' && p.status !== 'paid' && paidAt) {
        await adminClient
            .from('promoter_earnings')
            .update({ status: 'paid' })
            .eq('payout_id', params.id)
    }

    await logAuditAction({
        actorId: user.id,
        action: 'update_promoter_payout_status',
        entityType: 'promoter_payout',
        entityId: params.id,
        metadata: { from: p.status, to: status, reference: reference || undefined },
    })

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
