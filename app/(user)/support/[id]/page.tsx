import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { statusBadgeClasses, statusLabel, categoryLabel, type SupportStatus, type SupportCategory } from '@/lib/support'
import { ReplyForm } from './reply-form'

export const dynamic = 'force-dynamic'

type Ticket = {
    id: string
    user_id: string
    subject: string
    category: SupportCategory
    status: SupportStatus
    created_at: string
}

type Message = {
    id: string
    body: string
    is_admin: boolean
    created_at: string
}

function fmt(d: string) {
    return new Date(d).toLocaleString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    })
}

export default async function SupportTicketPage({ params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect(`/auth/login?next=/support/${params.id}`)

    const { data: ticketData } = await supabase
        .from('support_tickets')
        .select('id, user_id, subject, category, status, created_at')
        .eq('id', params.id)
        .single()

    if (!ticketData) notFound()
    const ticket = ticketData as Ticket
    if (ticket.user_id !== user.id) notFound()

    const { data: messagesData } = await supabase
        .from('support_messages')
        .select('id, body, is_admin, created_at')
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: true })

    const messages = (messagesData || []) as Message[]
    const isClosed = ticket.status === 'closed'

    return (
        <section className="max-w-3xl mx-auto space-y-6">
            <div>
                <Link href="/support" className="text-xs text-muted hover:text-text transition-colors">← Back to tickets</Link>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mt-3">
                    <div className="min-w-0">
                        <h1 className="font-heading text-3xl text-text tracking-wide break-words">{ticket.subject}</h1>
                        <p className="text-xs text-muted mt-1">
                            {categoryLabel(ticket.category)} · Opened {fmt(ticket.created_at)}
                        </p>
                    </div>
                    <span className={`text-xs px-2 py-1 border rounded-full whitespace-nowrap ${statusBadgeClasses(ticket.status)}`}>
                        {statusLabel(ticket.status)}
                    </span>
                </div>
            </div>

            <div className="space-y-3">
                {messages.map(m => (
                    <div
                        key={m.id}
                        className={`border p-4 ${m.is_admin ? 'bg-accent/5 border-accent/30' : 'bg-card border-border'}`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                                {m.is_admin ? 'Hexlura Support' : 'You'}
                            </span>
                            <span className="text-xs text-muted">{fmt(m.created_at)}</span>
                        </div>
                        <p className="text-sm text-text whitespace-pre-wrap break-words">{m.body}</p>
                    </div>
                ))}
            </div>

            {isClosed ? (
                <div className="bg-card border border-border p-4 text-center">
                    <p className="text-sm text-muted">This ticket is closed. Open a new ticket if you need further help.</p>
                    <Link href="/support/new" className="text-accent text-sm hover:underline mt-2 inline-block">
                        Open a new ticket →
                    </Link>
                </div>
            ) : (
                <ReplyForm ticketId={ticket.id} />
            )}
        </section>
    )
}
