import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { statusLabel, categoryLabel, type SupportStatus, type SupportCategory } from '@/lib/support'
import { UserReplyForm } from '@/app/(user)/support/[id]/user-reply-form'

export const dynamic = 'force-dynamic'

const BASE = '/promoter/support'

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

export default async function PromoterSupportTicketPage({ params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect(`/auth/login?next=${BASE}/${params.id}`)

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
        <section className="max-w-3xl">
            <Link href={BASE} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-text transition-colors mb-4">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
                Back to support
            </Link>

            <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
                <h1 className="font-heading text-3xl tracking-wide break-words">{ticket.subject}</h1>
                <span className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap ${statusPill[ticket.status]}`}>
                    {statusLabel(ticket.status)}
                </span>
            </div>
            <p className="text-xs text-muted mb-8">{categoryLabel(ticket.category)} · Opened {fmt(ticket.created_at)}</p>

            <div className="flex flex-col gap-4 mb-6">
                {messages.map(m => m.is_admin ? (
                    <div key={m.id} className="bg-warm-red/5 border border-warm-red/10 rounded-2xl p-5 max-w-[85%] ml-auto">
                        <div className="flex items-center gap-2 mb-2 justify-end">
                            <p className="text-[10px] text-muted">{fmt(m.created_at)}</p>
                            <p className="text-xs font-semibold">Hexlura Support</p>
                            <div className="w-7 h-7 rounded-full bg-text flex items-center justify-center text-white text-[10px] font-bold">HS</div>
                        </div>
                        <p className="text-sm text-right whitespace-pre-wrap break-words">{m.body}</p>
                    </div>
                ) : (
                    <div key={m.id} className="bg-card rounded-2xl shadow-card p-5 max-w-[85%]">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-warm-orange to-accent flex items-center justify-center text-white text-[10px] font-bold">{userInitial}</div>
                            <p className="text-xs font-semibold">You</p>
                            <p className="text-[10px] text-muted">{fmt(m.created_at)}</p>
                        </div>
                        <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                    </div>
                ))}
            </div>

            {isClosed ? (
                <div className="bg-card rounded-2xl shadow-card p-4 text-center">
                    <p className="text-sm text-muted">This ticket is closed. Open a new ticket if you need further help.</p>
                    <Link href={`${BASE}/new`} className="text-accent text-sm font-semibold hover:underline mt-2 inline-block">
                        Open a new ticket →
                    </Link>
                </div>
            ) : (
                <UserReplyForm ticketId={ticket.id} />
            )}
        </section>
    )
}
