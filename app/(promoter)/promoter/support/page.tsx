import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { statusBadgeClasses, statusLabel, categoryLabel, type SupportStatus, type SupportCategory } from '@/lib/support'

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
        <section className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                    <h1 className="font-heading text-4xl text-text tracking-wide">SUPPORT</h1>
                    <p className="text-muted text-sm mt-1">Get help with your account, bookings, or events</p>
                </div>
                <Link
                    href={`${BASE}/new`}
                    className="inline-flex items-center justify-center px-5 py-2.5 bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors"
                >
                    New ticket
                </Link>
            </div>

            <div className="bg-card border border-border">
                {tickets.length === 0 ? (
                    <div className="p-12 text-center">
                        <p className="text-muted text-sm">You haven&apos;t opened any support tickets yet.</p>
                        <Link href={`${BASE}/new`} className="text-accent text-sm hover:underline mt-2 inline-block">
                            Create your first ticket →
                        </Link>
                    </div>
                ) : (
                    <ul className="divide-y divide-border">
                        {tickets.map(t => {
                            const lastActivity = t.last_reply_at ?? t.created_at
                            const needsReply = t.last_reply_by_admin && t.status !== 'closed' && t.status !== 'resolved'
                            return (
                                <li key={t.id}>
                                    <Link
                                        href={`${BASE}/${t.id}`}
                                        className="block px-5 py-4 hover:bg-surface transition-colors"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-text truncate">{t.subject}</p>
                                                <p className="text-xs text-muted mt-0.5">
                                                    {categoryLabel(t.category)} · Updated {fmt(lastActivity)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                {needsReply && (
                                                    <span className="text-[10px] text-accent uppercase tracking-wider font-semibold">
                                                        New reply
                                                    </span>
                                                )}
                                                <span className={`text-xs px-2 py-0.5 border rounded-full ${statusBadgeClasses(t.status)}`}>
                                                    {statusLabel(t.status)}
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </div>
        </section>
    )
}
