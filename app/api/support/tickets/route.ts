import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const VALID_CATEGORIES = ['general', 'payment', 'event', 'account', 'bug', 'other'] as const

export async function POST(req: NextRequest) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

    const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    const category = typeof body.category === 'string' ? body.category : 'general'

    if (subject.length < 3 || subject.length > 200) {
        return NextResponse.json({ error: 'Subject must be 3–200 characters' }, { status: 400 })
    }
    if (message.length < 1 || message.length > 5000) {
        return NextResponse.json({ error: 'Message must be 1–5000 characters' }, { status: 400 })
    }
    if (!VALID_CATEGORIES.includes(category as typeof VALID_CATEGORIES[number])) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    const now = new Date().toISOString()
    const { data: ticket, error: ticketErr } = await adminClient
        .from('support_tickets')
        .insert({
            user_id: user.id,
            subject,
            category,
            status: 'open',
            priority: 'normal',
            last_reply_at: now,
            last_reply_by_admin: false,
        })
        .select('id')
        .single()

    if (ticketErr || !ticket) {
        console.error('[support/tickets] insert ticket failed:', ticketErr)
        return NextResponse.json({ error: ticketErr?.message ?? 'Failed to create ticket' }, { status: 500 })
    }

    const { error: msgErr } = await adminClient
        .from('support_messages')
        .insert({
            ticket_id: ticket.id,
            author_id: user.id,
            is_admin: false,
            body: message,
        })

    if (msgErr) {
        console.error('[support/tickets] insert first message failed:', msgErr)
        return NextResponse.json({ error: msgErr.message }, { status: 500 })
    }

    // Notify all admins of the new ticket
    const { data: admins } = await adminClient
        .from('profiles')
        .select('id')
        .eq('role', 'admin')

    if (admins?.length) {
        await adminClient.from('notifications').insert(
            admins.map(a => ({
                user_id: a.id,
                type: 'support_ticket_created',
                title: 'New support ticket',
                body: subject,
                link: `/admin/support/${ticket.id}`,
            })),
        )
    }

    return NextResponse.json({ id: ticket.id }, { status: 201 })
}
