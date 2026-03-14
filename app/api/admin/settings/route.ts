import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAuditAction } from '@/lib/audit'

export async function POST(request: NextRequest) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!adminProfile || adminProfile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { key, value } = await request.json() as { key: string; value: string }

    await supabase.from('platform_settings').upsert({
        key,
        value,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
    }, { onConflict: 'key' })

    await logAuditAction({
        actorId: user.id,
        action: 'update_setting',
        entityType: 'platform',
        metadata: { key, value },
    })

    return NextResponse.json({ success: true })
}
