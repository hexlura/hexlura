import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendAdminPayoutRequestEmail, sendPayoutRequestedOrganiserEmail } from '@/lib/email'
import { resolveOrganiserId } from '@/lib/organiser-access'

export async function POST() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const organiserId = await resolveOrganiserId(user.id)
    if (!organiserId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const serviceClient = createServiceClient()

    // Check organiser has payout method configured
    const { data: organiser } = await serviceClient
        .from('organiser_profiles')
        .select('payout_method, stripe_account_id, bank_account_number, org_name, user_id, identity_status')
        .eq('id', organiserId)
        .single()

    if (!organiser) return NextResponse.json({ error: 'Organiser not found' }, { status: 404 })

    const hasPayoutMethod =
        (organiser.payout_method === 'stripe_connect' && organiser.stripe_account_id) ||
        (organiser.payout_method === 'bank_transfer' && organiser.bank_account_number)

    if (!hasPayoutMethod) {
        return NextResponse.json({ error: 'Please configure your payout method in Settings first' }, { status: 400 })
    }

    if (organiser.identity_status !== 'verified') {
        return NextResponse.json(
            { error: 'Identity verification required before requesting a payout', action: 'verify_identity' },
            { status: 403 },
        )
    }

    // Update all pending payouts to requested
    const { data: updated, error } = await serviceClient
        .from('payouts')
        .update({
            status: 'requested',
            requested_at: new Date().toISOString(),
        })
        .eq('organiser_id', organiserId)
        .eq('status', 'pending')
        .select('net_pence')

    if (error) {
        return NextResponse.json({ error: 'Failed to submit withdrawal request' }, { status: 500 })
    }

    const totalRequested = (updated || []).reduce((sum, p) => sum + (p.net_pence || 0), 0)
    const payoutCount = updated?.length || 0

    // Notify admins (email to support + in-app notifications) — only if there's an actual request
    if (payoutCount > 0) {
        const adminClient = createAdminClient()

        // Get organiser's contact email and name
        const { data: organiserProfile } = await adminClient
            .from('profiles')
            .select('email, full_name')
            .eq('id', organiser.user_id)
            .single()

        const organiserEmail = organiserProfile?.email || user.email || 'unknown'

        await sendAdminPayoutRequestEmail({
            orgName: organiser.org_name,
            organiserEmail,
            totalRequestedPence: totalRequested,
            payoutCount,
        })

        await sendPayoutRequestedOrganiserEmail({
            to: organiserEmail,
            fullName: organiserProfile?.full_name || organiser.org_name,
            orgName: organiser.org_name,
            totalRequestedPence: totalRequested,
            payoutCount,
        })

        // In-app notification for all admins
        const { data: admins } = await adminClient
            .from('profiles')
            .select('id')
            .eq('role', 'admin')
        if (admins?.length) {
            await adminClient.from('notifications').insert(
                admins.map(admin => ({
                    user_id: admin.id,
                    type: 'payout_requested',
                    title: 'New payout request',
                    body: `${organiser.org_name} requested £${(totalRequested / 100).toFixed(2)} across ${payoutCount} payout${payoutCount === 1 ? '' : 's'}.`,
                    link: '/admin/payouts',
                }))
            )
        }
    }

    return NextResponse.json({ success: true, totalRequested, count: payoutCount })
}
