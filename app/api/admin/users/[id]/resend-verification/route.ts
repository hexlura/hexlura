import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAuditAction } from '@/lib/audit'

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!adminProfile || adminProfile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: targetProfile } = await supabase.from('profiles').select('email').eq('id', params.id).single()
    if (targetProfile?.email) {
        await supabase.auth.resend({ type: 'signup', email: targetProfile.email })
    }

    await logAuditAction({
        actorId: user.id,
        action: 'resend_verification',
        entityType: 'user',
        entityId: params.id,
    })

    return NextResponse.json({ success: true })
}
