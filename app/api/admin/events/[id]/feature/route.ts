import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditAction } from '@/lib/audit'

async function requireAdmin() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const adminClient = createAdminClient()
    const { data: adminProfile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
    if (!adminProfile || adminProfile.role !== 'admin') return null
    return { user, adminClient }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    const auth = await requireAdmin()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, adminClient } = auth

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

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
    const auth = await requireAdmin()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, adminClient } = auth

    const body = await request.json() as { is_featured: boolean; featured_order?: number }
    const { is_featured, featured_order } = body

    await adminClient
        .from('events')
        .update({ is_featured, featured_order: featured_order ?? 0 })
        .eq('id', params.id)

    await logAuditAction({
        actorId: user.id,
        action: is_featured ? 'feature_event' : 'unfeature_event',
        entityType: 'event',
        entityId: params.id,
    })

    return NextResponse.json({ success: true })
}
