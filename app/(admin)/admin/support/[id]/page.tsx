import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import {
    statusBadgeClasses, statusLabel, categoryLabel,
    type SupportStatus, type SupportCategory, type SupportPriority,
} from '@/lib/support'
import { AdminTicketControls } from './admin-ticket-controls'

export const dynamic = 'force-dynamic'

type Ticket = {
    id: string
    user_id: string
    subject: string
    category: SupportCategory
    status: SupportStatus
    priority: SupportPriority
    created_at: string
    user: { full_name: string | null; email: string | null; role: string } | null
}

type Message = {
    id: string
    body: string
    is_admin: boolean
    created_at: string
    author: { full_name: string | null } | null
}

function fmt(d: string) {
    return new Date(d).toLocaleString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    })
}

export default async function AdminSupportTicketPage({ params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const adminClient = createAdminClient()
    const { data: profile } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
    if (profile?.role !== 'admin') redirect('/')

    const { data: ticketData } = await adminClient
        .from('support_tickets')
        .select('id, user_id, subject, category, status, priority, created_at, user:profiles!user_id(full_name, email, role)')
        .eq('id', params.id)
        .single()

    if (!ticketData) notFound()
    const ticket = ticketData as unknown as Ticket

    const { data: messagesData } = await adminClient
        .from('support_messages')
        .select('id, body, is_admin, created_at, author:profiles!author_id(full_name)')
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: true })

    const messages = (messagesData || []) as unknown as Message[]

    return (
        <div style={{ padding: '32px', maxWidth: '1100px', margin: '0 auto' }}>
            <Link href="/admin/support" className="text-xs text-muted hover:text-text transition-colors">← Back to tickets</Link>

            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 mt-3">
                {/* Thread */}
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
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

                    <div className="space-y-3">
                        {messages.map(m => (
                            <div
                                key={m.id}
                                className={`border p-4 ${m.is_admin ? 'bg-accent/5 border-accent/30' : 'bg-card border-border'}`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                                        {m.is_admin ? 'Hexlura Support' : (m.author?.full_name || 'User')}
                                    </span>
                                    <span className="text-xs text-muted">{fmt(m.created_at)}</span>
                                </div>
                                <p className="text-sm text-text whitespace-pre-wrap break-words">{m.body}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sidebar — controls */}
                <div className="space-y-4">
                    <div className="bg-card border border-border p-4">
                        <p className="text-xs text-muted uppercase tracking-wider mb-2">User</p>
                        <p className="text-sm text-text font-medium">{ticket.user?.full_name || '—'}</p>
                        <p className="text-xs text-muted truncate">{ticket.user?.email}</p>
                        <p className="text-[10px] text-muted uppercase tracking-wider mt-2">{ticket.user?.role}</p>
                    </div>

                    <AdminTicketControls
                        ticketId={ticket.id}
                        initialStatus={ticket.status}
                        initialPriority={ticket.priority}
                    />
                </div>
            </div>
        </div>
    )
}
