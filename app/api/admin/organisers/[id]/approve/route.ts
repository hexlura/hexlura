import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditAction } from '@/lib/audit'

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()

    const { data: adminProfile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
    if (!adminProfile || adminProfile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await adminClient.from('organiser_profiles').update({
        is_approved: true,
        approved_at: new Date().toISOString(),
        approved_by: user.id,
    }).eq('id', params.id)

    await logAuditAction({
        actorId: user.id,
        action: 'approve_organiser',
        entityType: 'organiser',
        entityId: params.id,
    })

    return NextResponse.json({ success: true })
}
