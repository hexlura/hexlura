import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolvePromoterId } from '@/lib/promoter-access'
import { markEarningsAvailable } from '@/lib/promoter-earnings'
import { sendAdminPromoterPayoutRequestEmail } from '@/lib/email'

export async function POST() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const promoterId = await resolvePromoterId(user.id)
    if (!promoterId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const adminClient = createAdminClient()

    const { data: profile } = await adminClient
        .from('promoter_profiles')
        .select('display_name, referral_code, payout_method, bank_account_number, stripe_account_id, status')
        .eq('id', promoterId)
        .single()

    if (!profile) return NextResponse.json({ error: 'Promoter profile not found' }, { status: 404 })
    if (profile.status === 'suspended') return NextResponse.json({ error: 'Your account has been suspended' }, { status: 403 })

    const hasMethod =
        (profile.payout_method === 'stripe_connect' && profile.stripe_account_id) ||
        (profile.payout_method === 'bank_transfer' && profile.bank_account_number)
    if (!hasMethod) {
        return NextResponse.json({ error: 'Set up your payout method in Settings first' }, { status: 400 })
    }

    // Refresh available earnings before locking them in
    await markEarningsAvailable(promoterId)

    // Earnings stay 'available' until an admin marks them paid, so skip any already locked to an
    // earlier payout request (payout_id set) — otherwise a second request pays the same money twice.
    const { data: available, error: availableErr } = await adminClient
        .from('promoter_earnings')
        .select('id, commission_pence')
        .eq('promoter_id', promoterId)
        .eq('status', 'available')
        .is('payout_id', null)
    if (availableErr) return NextResponse.json({ error: 'Could not load your earnings' }, { status: 500 })

    const earningsRows = available || []
    if (earningsRows.length === 0) {
        return NextResponse.json({ error: 'No available earnings to withdraw' }, { status: 400 })
    }

    const grossPence = earningsRows.reduce((sum, e) => sum + (e.commission_pence || 0), 0)
    if (grossPence <= 0) {
        return NextResponse.json({ error: 'No available earnings to withdraw' }, { status: 400 })
    }

    // Create the payout row
    const { data: payout, error: payoutErr } = await adminClient
        .from('promoter_payouts')
        .insert({
            promoter_id: promoterId,
            gross_pence: grossPence,
            fee_pence: 0,
            net_pence: grossPence,
            status: 'requested',
            requested_at: new Date().toISOString(),
            payout_method: profile.payout_method,
        })
        .select('id')
        .single()

    if (payoutErr || !payout) {
        return NextResponse.json({ error: payoutErr?.message || 'Failed to create payout' }, { status: 500 })
    }

    // Lock the earnings rows to this payout (still 'available' until admin marks paid).
    // Only rows still unlocked are claimed, so two requests arriving together can't both take the
    // same earnings; whatever this request did claim decides the payout amount.
    const { data: claimed, error: claimErr } = await adminClient
        .from('promoter_earnings')
        .update({ payout_id: payout.id })
        .in('id', earningsRows.map(r => r.id))
        .is('payout_id', null)
        .select('id, commission_pence')
    if (claimErr || !claimed || claimed.length === 0) {
        await adminClient.from('promoter_payouts').delete().eq('id', payout.id)
        if (claimErr) return NextResponse.json({ error: 'Could not lock your earnings for payout' }, { status: 500 })
        return NextResponse.json({ error: 'You already have a withdrawal request for these earnings' }, { status: 409 })
    }
    const claimedPence = claimed.reduce((sum, e) => sum + (e.commission_pence || 0), 0)
    if (claimed.length !== earningsRows.length) {
        const { error: fixErr } = await adminClient
            .from('promoter_payouts')
            .update({ gross_pence: claimedPence, net_pence: claimedPence })
            .eq('id', payout.id)
        if (fixErr) console.error('Promoter payout amount correction failed:', fixErr.message)
    }

    // Notify admins (email to support inbox + in-app notifications)
    const { data: profileEmail } = await adminClient
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single()

    await sendAdminPromoterPayoutRequestEmail({
        promoterName: profile.display_name,
        promoterEmail: profileEmail?.email || user.email || 'unknown',
        referralCode: profile.referral_code,
        totalRequestedPence: claimedPence,
        payoutCount: claimed.length,
    })

    const { data: admins } = await adminClient.from('profiles').select('id').eq('role', 'admin')
    if (admins?.length) {
        await adminClient.from('notifications').insert(
            admins.map(a => ({
                user_id: a.id,
                type: 'promoter_payout_requested',
                title: 'New promoter payout request',
                body: `${profile.display_name} (${profile.referral_code}) requested £${(claimedPence / 100).toFixed(2)} across ${claimed.length} sale${claimed.length === 1 ? '' : 's'}.`,
                link: '/admin/payouts',
            }))
        )
    }

    return NextResponse.json({ success: true, totalRequested: claimedPence, count: claimed.length })
}
