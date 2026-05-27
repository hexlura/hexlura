import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditAction } from '@/lib/audit'

const VALID_STATUSES = ['open', 'pending_user', 'in_progress', 'resolved', 'closed'] as const
const VALID_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()
    const { data: profile } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

    const updates: Record<string, string> = {}

    if (typeof body.status === 'string') {
        if (!VALID_STATUSES.includes(body.status as typeof VALID_STATUSES[number])) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
        }
        updates.status = body.status
    }

    if (typeof body.priority === 'string') {
        if (!VALID_PRIORITIES.includes(body.priority as typeof VALID_PRIORITIES[number])) {
            return NextResponse.json({ error: 'Invalid priority' }, { status: 400 })
        }
        updates.priority = body.priority
    }

    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
    }

    const { data: ticket, error } = await adminClient
        .from('support_tickets')
        .update(updates)
        .eq('id', params.id)
        .select('id, user_id, subject, status, priority')
        .single()

    if (error || !ticket) {
        return NextResponse.json({ error: error?.message ?? 'Update failed' }, { status: 500 })
    }

    // Notify user when ticket is resolved or closed
    if (updates.status === 'resolved' || updates.status === 'closed') {
        await adminClient.from('notifications').insert({
            user_id: ticket.user_id,
            type: 'support_ticket_status',
            title: `Support ticket ${updates.status}`,
            body: ticket.subject,
            link: `/support/${ticket.id}`,
        })
    }

    await logAuditAction({
        actorId: user.id,
        action: 'update_support_ticket',
        entityType: 'support_ticket',
        entityId: ticket.id,
        metadata: updates,
    })

    return NextResponse.json({ ticket })
}
