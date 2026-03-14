import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditAction } from '@/lib/audit'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()

    const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || profile.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json() as { user_id: string }
    const { user_id } = body

    const cookieStore = cookies()
    cookieStore.set('hexlura_impersonating', user_id, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 3600,
    })

    await logAuditAction({
        actorId: user.id,
        action: 'impersonate_user',
        entityType: 'user',
        entityId: user_id,
    })

    return NextResponse.json({ success: true })
}
