import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

    const message = typeof body.message === 'string' ? body.message.trim() : ''
    if (message.length < 1 || message.length > 5000) {
        return NextResponse.json({ error: 'Message must be 1–5000 characters' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    const { data: profile } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    const isAdmin = profile?.role === 'admin'

    const { data: ticket } = await adminClient
        .from('support_tickets')
        .select('id, user_id, subject, status')
        .eq('id', params.id)
        .single()

    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

    // Only the ticket owner or an admin can reply
    if (!isAdmin && ticket.user_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (ticket.status === 'closed') {
        return NextResponse.json({ error: 'Ticket is closed' }, { status: 400 })
    }

    const { error: msgErr } = await adminClient
        .from('support_messages')
        .insert({
            ticket_id: ticket.id,
            author_id: user.id,
            is_admin: isAdmin,
            body: message,
        })

    if (msgErr) {
        console.error('[support/reply] insert message failed:', msgErr)
        return NextResponse.json({ error: msgErr.message }, { status: 500 })
    }

    // Update ticket: bump last_reply_at, mark who replied last, transition status
    const updates: Record<string, string | boolean> = {
        last_reply_at: new Date().toISOString(),
        last_reply_by_admin: isAdmin,
    }
    if (isAdmin && ticket.status === 'open') updates.status = 'in_progress'
    if (!isAdmin && (ticket.status === 'pending_user' || ticket.status === 'resolved')) updates.status = 'open'

    await adminClient.from('support_tickets').update(updates).eq('id', ticket.id)

    // Notify the other side
    if (isAdmin) {
        await adminClient.from('notifications').insert({
            user_id: ticket.user_id,
            type: 'support_ticket_reply',
            title: 'Support reply',
            body: ticket.subject,
            link: `/support/${ticket.id}`,
        })
    } else {
        const { data: admins } = await adminClient
            .from('profiles')
            .select('id')
            .eq('role', 'admin')

        if (admins?.length) {
            await adminClient.from('notifications').insert(
                admins.map(a => ({
                    user_id: a.id,
                    type: 'support_ticket_reply',
                    title: 'Support: user replied',
                    body: ticket.subject,
                    link: `/admin/support/${ticket.id}`,
                })),
            )
        }
    }

    return NextResponse.json({ success: true })
}
