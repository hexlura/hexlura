import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditAction } from '@/lib/audit'

const VALID_STATUSES = ['pending', 'requested', 'processing', 'paid', 'failed']

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()

    const { data: adminProfile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
    if (!adminProfile || adminProfile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { status } = await request.json() as { status: string }

    if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const { data: payout } = await adminClient
        .from('payouts')
        .select('id, status')
        .eq('id', params.id)
        .single()

    if (!payout) return NextResponse.json({ error: 'Payout not found' }, { status: 404 })

    const update: Record<string, string | null> = { status }

    if (status === 'paid') {
        update.paid_at = new Date().toISOString()
    }
    if (status === 'requested') {
        update.requested_at = new Date().toISOString()
    }
    // Clear paid_at if moving away from paid
    if (status !== 'paid' && payout.status === 'paid') {
        update.paid_at = null
    }

    await adminClient.from('payouts').update(update).eq('id', params.id)

    await logAuditAction({
        actorId: user.id,
        action: 'update_payout_status',
        entityType: 'payout',
        entityId: params.id,
        metadata: { from: payout.status, to: status },
    })

    return NextResponse.json({ success: true })
}
