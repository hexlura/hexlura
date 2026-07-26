import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditAction } from '@/lib/audit'

export async function POST(req: Request, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()
    const { data: adminProfile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
    if (!adminProfile || adminProfile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json().catch(() => ({}))
    const adminNotes = typeof body?.admin_notes === 'string' ? body.admin_notes.trim().slice(0, 2000) : null

    const { data: claimedRequest } = await adminClient
        .from('organiser_account_deletion_requests')
        .update({ status: 'rejected', reviewed_by: user.id, reviewed_at: new Date().toISOString(), admin_notes: adminNotes })
        .eq('id', params.id)
        .eq('status', 'pending')
        .select('id, org_name, user_id')
        .single()

    if (!claimedRequest) {
        return NextResponse.json({ error: 'Request not found or already resolved.' }, { status: 409 })
    }

    if (claimedRequest.user_id) {
        await adminClient.from('notifications').insert({
            user_id: claimedRequest.user_id,
            type: 'account_deletion_rejected',
            title: 'Account deletion request declined',
            body: adminNotes
                ? `Your account deletion request was declined: ${adminNotes}`
                : 'Your account deletion request was declined. Your account remains active.',
            link: '/organiser/settings',
        })
    }

    await logAuditAction({
        actorId: user.id,
        action: 'admin_rejected_account_deletion',
        entityType: 'organiser_account_deletion_request',
        entityId: claimedRequest.id,
        metadata: { orgName: claimedRequest.org_name, adminNotes },
    })

    return NextResponse.json({ success: true })
}
