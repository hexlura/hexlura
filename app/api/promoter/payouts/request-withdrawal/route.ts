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
        .select('display_name, referral_code, payout_method, bank_account_number, stripe_account_id')
        .eq('id', promoterId)
        .single()

    if (!profile) return NextResponse.json({ error: 'Promoter profile not found' }, { status: 404 })

    const hasMethod =
        (profile.payout_method === 'stripe_connect' && profile.stripe_account_id) ||
        (profile.payout_method === 'bank_transfer' && profile.bank_account_number)
    if (!hasMethod) {
        return NextResponse.json({ error: 'Set up your payout method in Settings first' }, { status: 400 })
    }

    // Refresh available earnings before locking them in
    await markEarningsAvailable(promoterId)

    const { data: available } = await adminClient
        .from('promoter_earnings')
        .select('id, commission_pence')
        .eq('promoter_id', promoterId)
        .eq('status', 'available')

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

    // Lock the earnings rows to this payout (still 'available' until admin marks paid)
    await adminClient
        .from('promoter_earnings')
        .update({ payout_id: payout.id })
        .in('id', earningsRows.map(r => r.id))

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
        totalRequestedPence: grossPence,
        payoutCount: earningsRows.length,
    })

    const { data: admins } = await adminClient.from('profiles').select('id').eq('role', 'admin')
    if (admins?.length) {
        await adminClient.from('notifications').insert(
            admins.map(a => ({
                user_id: a.id,
                type: 'promoter_payout_requested',
                title: 'New promoter payout request',
                body: `${profile.display_name} (${profile.referral_code}) requested £${(grossPence / 100).toFixed(2)} across ${earningsRows.length} sale${earningsRows.length === 1 ? '' : 's'}.`,
                link: '/admin/payouts',
            }))
        )
    }

    return NextResponse.json({ success: true, totalRequested: grossPence, count: earningsRows.length })
}
