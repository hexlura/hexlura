import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { statusLabel, categoryLabel, type SupportStatus, type SupportCategory } from '@/lib/support'

export const dynamic = 'force-dynamic'

const BASE = '/promoter/support'

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

export default async function PromoterSupportPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect(`/auth/login?next=${BASE}`)

    const { data: ticketsRaw } = await supabase
        .from('support_tickets')
        .select('id, subject, category, status, last_reply_at, last_reply_by_admin, created_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

    const tickets = (ticketsRaw || []) as TicketRow[]

    return (
        <section className="max-w-7xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                <div>
                    <h1 className="font-heading text-4xl tracking-wide">HELP &amp; SUPPORT</h1>
                    <p className="text-muted text-sm mt-1">Get help from the Hexlura team</p>
                </div>
                <Link
                    href={`${BASE}/new`}
                    className="bg-text text-white px-5 py-3 rounded-xl text-sm font-semibold shadow-soft hover:shadow-hover hover:-translate-y-0.5 transition-all flex items-center gap-2 self-start"
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                    New ticket
                </Link>
            </div>

            <div className="bg-card rounded-2xl shadow-card overflow-hidden">
                {tickets.length === 0 ? (
                    <div className="p-12 text-center">
                        <p className="text-muted text-sm">You haven&apos;t opened any support tickets yet.</p>
                        <Link href={`${BASE}/new`} className="text-accent text-sm font-semibold hover:underline mt-2 inline-block">
                            Create your first ticket →
                        </Link>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs text-muted uppercase tracking-wider border-b border-border">
                                <th className="font-medium py-3.5 px-6">Subject</th>
                                <th className="font-medium py-3.5 px-4">Status</th>
                                <th className="font-medium py-3.5 px-6 text-right">Updated</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tickets.map(t => {
                                const lastActivity = t.last_reply_at ?? t.created_at
                                const needsReply = t.last_reply_by_admin && t.status !== 'closed' && t.status !== 'resolved'
                                return (
                                    <tr key={t.id} className="border-b border-border last:border-0 hover:bg-background/60 transition-colors">
                                        <td className="py-3.5 px-6">
                                            <Link href={`${BASE}/${t.id}`} className="font-medium hover:underline">{t.subject}</Link>
                                            <p className="text-xs text-muted">{categoryLabel(t.category)}</p>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            {needsReply && <span className="text-xs font-semibold text-accent mr-2">New reply</span>}
                                            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_PILL[t.status]}`}>
                                                {statusLabel(t.status)}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-6 text-right text-xs text-muted">{fmt(lastActivity)}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </section>
    )
}
