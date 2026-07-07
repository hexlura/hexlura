import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditAction } from '@/lib/audit'

const VALID_FIELDS = ['booking_fee_exempt', 'processing_fee_exempt'] as const
type ExemptField = typeof VALID_FIELDS[number]

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()

    const { data: adminProfile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
    if (!adminProfile || adminProfile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { field, exempt } = await request.json() as { field: string; exempt: boolean }
    if (!VALID_FIELDS.includes(field as ExemptField)) {
        return NextResponse.json({ error: 'Invalid field' }, { status: 400 })
    }
    if (typeof exempt !== 'boolean') {
        return NextResponse.json({ error: 'exempt must be a boolean' }, { status: 400 })
    }

    await adminClient.from('organiser_profiles').update({ [field]: exempt }).eq('id', params.id)

    await logAuditAction({
        actorId: user.id,
        action: `${exempt ? 'grant' : 'revoke'}_${field}`,
        entityType: 'organiser',
        entityId: params.id,
    })

    return NextResponse.json({ success: true })
}
