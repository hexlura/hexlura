import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidateTag } from 'next/cache'
import { logAuditAction } from '@/lib/audit'

export async function GET() {
    const adminClient = createAdminClient()
    const { data } = await adminClient
        .from('platform_settings')
        .select('key, value')
        .like('key', 'design_%')

    const settings: Record<string, string> = {}
    for (const row of data ?? []) settings[row.key] = row.value
    return NextResponse.json({ settings })
}

export async function POST(req: NextRequest) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()
    const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { settings } = await req.json() as { settings: Record<string, string> }

    const rows = Object.entries(settings).map(([key, value]) => ({
        key,
        value,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
    }))

    await adminClient.from('platform_settings').upsert(rows, { onConflict: 'key' })

    await logAuditAction({
        actorId: user.id,
        action: 'update_design_settings',
        entityType: 'platform',
        metadata: { keys: Object.keys(settings) },
    })

    revalidateTag('design-settings')

    return NextResponse.json({ success: true })
}
