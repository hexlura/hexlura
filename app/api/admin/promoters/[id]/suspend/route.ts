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

    let reason = ''
    try {
        const body = await request.json() as { reason?: string }
        if (typeof body.reason === 'string') reason = body.reason.trim()
    } catch {
        // No body — proceed without reason
    }

    await adminClient.from('promoter_profiles').update({ status: 'suspended' }).eq('id', params.id)

    await logAuditAction({
        actorId: user.id,
        action: 'suspend_promoter',
        entityType: 'promoter',
        entityId: params.id,
        metadata: { reason: reason || undefined },
    })

    return NextResponse.json({ success: true })
}
