import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditAction } from '@/lib/audit'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()

    const { data: adminProfile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
    if (!adminProfile || adminProfile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { allowed } = await request.json() as { allowed: boolean }
    if (typeof allowed !== 'boolean') {
        return NextResponse.json({ error: 'allowed must be a boolean' }, { status: 400 })
    }

    const updateRow: Record<string, boolean | string> = { stripe_connect_allowed: allowed }
    if (!allowed) {
        // Revoking access — fall back to bank_transfer so the organiser isn't
        // left selecting a payout method they're no longer permitted to use.
        updateRow.payout_method = 'bank_transfer'
    }
    await adminClient.from('organiser_profiles').update(updateRow).eq('id', params.id)

    await logAuditAction({
        actorId: user.id,
        action: allowed ? 'allow_stripe_connect' : 'revoke_stripe_connect',
        entityType: 'organiser',
        entityId: params.id,
    })

    return NextResponse.json({ success: true })
}
