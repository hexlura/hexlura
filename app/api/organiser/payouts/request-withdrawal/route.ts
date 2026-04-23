import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
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
        .select('payout_method, stripe_account_id, bank_account_number')
        .eq('id', organiserId)
        .single()

    if (!organiser) return NextResponse.json({ error: 'Organiser not found' }, { status: 404 })

    const hasPayoutMethod =
        (organiser.payout_method === 'stripe_connect' && organiser.stripe_account_id) ||
        (organiser.payout_method === 'bank_transfer' && organiser.bank_account_number)

    if (!hasPayoutMethod) {
        return NextResponse.json({ error: 'Please configure your payout method in Settings first' }, { status: 400 })
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

    return NextResponse.json({ success: true, totalRequested, count: updated?.length || 0 })
}
