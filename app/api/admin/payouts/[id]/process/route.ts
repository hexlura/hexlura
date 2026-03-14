import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAuditAction } from '@/lib/audit'

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!adminProfile || adminProfile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: payout } = await supabase
        .from('payouts')
        .select('id, net_pence, organiser_id, organiser_profiles(stripe_account_id)')
        .eq('id', params.id)
        .single()

    if (!payout) return NextResponse.json({ error: 'Payout not found' }, { status: 404 })

    type PayoutWithOrg = {
        id: string
        net_pence: number | null
        organiser_id: string
        organiser_profiles: { stripe_account_id: string | null } | null
    }
    const p = payout as unknown as PayoutWithOrg

    let transferId: string | null = null

    if (p.organiser_profiles?.stripe_account_id) {
        try {
            const stripe = (await import('stripe')).default
            const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2026-02-25.clover' })
            const transfer = await stripeClient.transfers.create({
                amount: p.net_pence || 0,
                currency: 'gbp',
                destination: p.organiser_profiles.stripe_account_id,
            })
            transferId = transfer.id
        } catch {
            // Mark as failed
        }
    }

    await supabase.from('payouts').update({
        status: transferId ? 'paid' : 'failed',
        paid_at: transferId ? new Date().toISOString() : null,
        stripe_transfer_id: transferId,
    }).eq('id', params.id)

    await logAuditAction({
        actorId: user.id,
        action: 'process_payout',
        entityType: 'payout',
        entityId: params.id,
        metadata: { net_pence: p.net_pence, stripe_transfer_id: transferId },
    })

    return NextResponse.json({ success: true })
}
