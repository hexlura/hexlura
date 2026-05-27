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

    const { reason } = await request.json() as { reason: string }

    // Must use 'admin_rejected' — DB CHECK constraint (migration 009) does not allow plain 'rejected'
    const { error: dbError } = await adminClient.from('refund_requests').update({
        status: 'admin_rejected',
        admin_note: reason,
        resolved_at: new Date().toISOString(),
    }).eq('id', params.id)

    if (dbError) {
        console.error('Refund reject DB error:', dbError)
        return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    await logAuditAction({
        actorId: user.id,
        action: 'force_reject_refund',
        entityType: 'booking',
        entityId: params.id,
        metadata: { reason },
    })

    return NextResponse.json({ success: true })
}
