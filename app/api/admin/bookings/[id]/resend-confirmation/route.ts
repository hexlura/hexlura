import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAuditAction } from '@/lib/audit'

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!adminProfile || adminProfile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await logAuditAction({
        actorId: user.id,
        action: 'resend_confirmation',
        entityType: 'booking',
        entityId: params.id,
    })

    // Email sending would be implemented with Resend here
    return NextResponse.json({ success: true })
}
