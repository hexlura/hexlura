import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { statusLabel, categoryLabel, type SupportStatus, type SupportCategory } from '@/lib/support'

export const dynamic = 'force-dynamic'

type TicketRow = {
    id: string
    subject: string
    category: SupportCategory
    status: SupportStatus
    last_reply_at: string | null
    last_reply_by_admin: boolean
    created_at: string
}

const STATUS_PILL: Record<SupportStatus, string> = {
    open: 'bg-warm-amber/15 text-warm-amberText',
    pending_user: 'bg-warm-yellow/15 text-warm-yellowText',
    in_progress: 'bg-blue-500/10 text-blue-600',
    resolved: 'bg-warm-green/15 text-warm-green',
    closed: 'bg-border text-muted',
}

function fmt(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function SupportPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login?next=/support')

    const { data: ticketsRaw } = await supabase
        .from('support_tickets')
        .select('id, subject, category, status, last_reply_at, last_reply_by_admin, created_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

    const tickets = (ticketsRaw || []) as TicketRow[]

    return (
        <section className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
                <div>
                    <h1 className="font-heading text-3xl tracking-wide">HELP &amp; SUPPORT</h1>
                    <p className="text-muted text-sm mt-1">Get help with your account, bookings, or events</p>
                </div>
                <Link
                    href="/support/new"
                    className="px-5 py-2.5 rounded-full bg-accent text-white text-sm font-semibold shadow-glow hover:brightness-110 transition"
                >
                    + New Ticket
                </Link>
            </div>

            {tickets.length === 0 ? (
                <div className="py-16 text-center bg-card rounded-2xl border border-dashed border-border">
                    <p className="text-muted text-sm">You haven&apos;t opened any support tickets yet.</p>
                    <Link href="/support/new" className="text-accent text-sm font-semibold hover:underline mt-2 inline-block">
                        Create your first ticket →
                    </Link>
                </div>
            ) : (
                <div className="space-y-3">
                    {tickets.map(t => {
                        const lastActivity = t.last_reply_at ?? t.created_at
                        const needsReply = t.last_reply_by_admin && t.status !== 'closed' && t.status !== 'resolved'
                        return (
                            <Link
                                key={t.id}
                                href={`/support/${t.id}`}
                                className="block bg-card rounded-2xl border border-border shadow-soft hover:shadow-hover transition p-4"
                            >
                                <div className="flex items-center justify-between gap-3 mb-1">
                                    <p className="font-semibold text-sm truncate">{t.subject}</p>
                                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase shrink-0 ${STATUS_PILL[t.status]}`}>
                                        {statusLabel(t.status)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-xs text-muted">
                                        {categoryLabel(t.category)} · Updated {fmt(lastActivity)}
                                    </p>
                                    {needsReply && (
                                        <span className="px-2 py-0.5 rounded-full bg-accent text-white text-[10px] font-bold">NEW REPLY</span>
                                    )}
                                </div>
                            </Link>
                        )
                    })}
                </div>
            )}
        </section>
    )
}
