import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { statusBadgeClasses, statusLabel, categoryLabel, type SupportStatus, type SupportCategory } from '@/lib/support'
import { UserReplyForm } from './user-reply-form'

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
    const userInitial = (user.user_metadata?.full_name || user.email || 'Y').charAt(0).toUpperCase()

    const statusPill: Record<SupportStatus, string> = {
        open: 'bg-warm-amber/15 text-warm-amberText',
        pending_user: 'bg-warm-yellow/15 text-warm-yellowText',
        in_progress: 'bg-blue-500/10 text-blue-600',
        resolved: 'bg-warm-green/15 text-warm-green',
        closed: 'bg-border text-muted',
    }

    return (
        <section className="max-w-2xl mx-auto">
            <Link href="/support" className="text-sm text-muted hover:text-accent mb-2 inline-block">← Back to Support</Link>

            <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
                <div className="min-w-0">
                    <h1 className="font-heading text-2xl tracking-wide break-words">{ticket.subject}</h1>
                    <p className="text-xs text-muted mt-1">
                        {categoryLabel(ticket.category)} · Opened {fmt(ticket.created_at)}
                    </p>
                </div>
                <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase shrink-0 ${statusPill[ticket.status]}`}>
                    {statusLabel(ticket.status)}
                </span>
            </div>

            {/* Message thread */}
            <div className="space-y-4 mb-6">
                {messages.map(m => m.is_admin ? (
                    <div key={m.id} className="flex gap-3 justify-end">
                        <div className="bg-text text-white rounded-2xl rounded-tr-sm p-4 max-w-md">
                            <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                            <p className="text-[11px] text-white/50 mt-2">{fmt(m.created_at)}</p>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-text flex items-center justify-center text-white text-xs font-bold shrink-0">HX</div>
                    </div>
                ) : (
                    <div key={m.id} className="flex gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-warm-orange flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {(userInitial || 'Y')}
                        </div>
                        <div className="bg-card rounded-2xl rounded-tl-sm border border-border shadow-soft p-4 max-w-md">
                            <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                            <p className="text-[11px] text-muted mt-2">{fmt(m.created_at)}</p>
                        </div>
                    </div>
                ))}
            </div>

            {isClosed ? (
                <div className="bg-card rounded-2xl border border-border shadow-soft p-4 text-center">
                    <p className="text-sm text-muted">This ticket is closed. Open a new ticket if you need further help.</p>
                    <Link href="/support/new" className="text-accent text-sm font-semibold hover:underline mt-2 inline-block">
                        Open a new ticket →
                    </Link>
                </div>
            ) : (
                <UserReplyForm ticketId={ticket.id} />
            )}
        </section>
    )
}
