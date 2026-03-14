import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAuditAction } from '@/lib/audit'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!adminProfile || adminProfile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { reason } = await request.json() as { reason: string }
    await supabase.from('profiles').update({ is_suspended: true }).eq('id', params.id)

    await logAuditAction({
        actorId: user.id,
        action: 'suspend_user',
        entityType: 'user',
        entityId: params.id,
        metadata: { reason },
    })

    return NextResponse.json({ success: true })
}
