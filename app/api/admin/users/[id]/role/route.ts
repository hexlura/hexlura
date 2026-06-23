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

    const { role } = await request.json() as { role: string }

    const VALID_ROLES = ['user', 'organiser', 'promoter', 'door_staff', 'admin'] as const
    if (!VALID_ROLES.includes(role as typeof VALID_ROLES[number])) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const { data: currentProfile } = await adminClient.from('profiles').select('role').eq('id', params.id).single()

    await adminClient.from('profiles').update({ role }).eq('id', params.id)

    await logAuditAction({
        actorId: user.id,
        action: 'change_role',
        entityType: 'user',
        entityId: params.id,
        metadata: { from_role: currentProfile?.role, to_role: role },
    })

    return NextResponse.json({ success: true })
}
