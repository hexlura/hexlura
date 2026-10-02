import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { statusLabel, type SupportStatus } from '@/lib/support'
import { OrganiserReplyForm, SUPPORT_STATUS_PILL } from '@/components/organiser/OrganiserSupport'

export const dynamic = 'force-dynamic'

const BASE = '/organiser/support'

type Ticket = {
    id: string
    user_id: string
    subject: string
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
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    })
}

function initialsOf(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return 'ME'
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[1][0]).toUpperCase()
}

export default async function OrganiserSupportTicketPage({ params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect(`/auth/login?next=${BASE}/${params.id}`)

    const { data: ticketData, error: ticketErr } = await supabase
        .from('support_tickets')
        .select('id, user_id, subject, status, created_at')
        .eq('id', params.id)
        .maybeSingle()
    if (ticketErr) throw ticketErr
    if (!ticketData) notFound()
    const ticket = ticketData as Ticket
    if (ticket.user_id !== user.id) notFound()

    const { data: messagesData, error: msgErr } = await supabase
        .from('support_messages')
        .select('id, body, is_admin, created_at')
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: true })
    if (msgErr) throw msgErr

    // Avatar initials for the organiser's own messages
    const { data: org } = await createServiceClient()
        .from('organiser_profiles')
        .select('org_name')
        .eq('user_id', user.id)
        .maybeSingle()
    const myInitials = initialsOf(org?.org_name || '')

    const messages = (messagesData || []) as Message[]
    const isClosed = ticket.status === 'closed'

    return (
        <div className="max-w-7xl">
            <Link href={BASE} className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-text transition-colors mb-4">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
                Back to Support
            </Link>

            <div className="max-w-3xl">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
                    <h1 className="font-heading text-3xl tracking-wide break-words min-w-0">{ticket.subject}</h1>
                    <span className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap ${SUPPORT_STATUS_PILL[ticket.status]}`}>
                        {statusLabel(ticket.status)}
                    </span>
                </div>

                <div className="flex flex-col gap-4 mb-6">
                    {messages.map(m =>
                        m.is_admin ? (
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
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-warm-orange to-accent flex items-center justify-center text-white text-[10px] font-bold">{myInitials}</div>
                                    <p className="text-xs font-semibold">You</p>
                                    <p className="text-[10px] text-muted">{fmt(m.created_at)}</p>
                                </div>
                                <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                            </div>
                        )
                    )}
                </div>

                {isClosed ? (
                    <div className="bg-card rounded-2xl shadow-card p-4 text-center">
                        <p className="text-sm text-muted">This ticket is closed. Open a new ticket if you need further help.</p>
                        <Link href={`${BASE}/new`} className="text-accent text-sm font-semibold hover:underline mt-2 inline-block">
                            Open a new ticket →
                        </Link>
                    </div>
                ) : (
                    <OrganiserReplyForm ticketId={ticket.id} />
                )}
            </div>
        </div>
    )
}
