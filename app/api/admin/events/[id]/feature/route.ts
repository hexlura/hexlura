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

    const { is_featured } = await request.json() as { is_featured: boolean }
    await adminClient.from('events').update({ is_featured }).eq('id', params.id)

    await logAuditAction({
        actorId: user.id,
        action: is_featured ? 'feature_event' : 'unfeature_event',
        entityType: 'event',
        entityId: params.id,
    })

    return NextResponse.json({ success: true })
}
