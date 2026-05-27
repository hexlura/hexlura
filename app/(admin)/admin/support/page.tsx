import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
    statusBadgeClasses, statusLabel, categoryLabel, priorityLabel,
    SUPPORT_STATUSES, SUPPORT_CATEGORIES, SUPPORT_PRIORITIES,
    type SupportStatus, type SupportCategory, type SupportPriority,
} from '@/lib/support'
import { FilterSelect } from './filter-select'

export const dynamic = 'force-dynamic'

type TicketRow = {
    id: string
    subject: string
    category: SupportCategory
    status: SupportStatus
    priority: SupportPriority
    last_reply_at: string | null
    last_reply_by_admin: boolean
    created_at: string
    user: { full_name: string | null; email: string | null } | null
}

interface PageProps {
    searchParams: { status?: string; category?: string; priority?: string }
}

function fmt(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function priorityChip(p: SupportPriority): string {
    switch (p) {
        case 'urgent': return 'text-accent bg-accent/10 border-accent/30'
        case 'high': return 'text-gold bg-gold/10 border-gold/30'
        case 'normal': return 'text-muted bg-muted/10 border-border'
        case 'low': return 'text-muted bg-transparent border-border'
    }
}

export default async function AdminSupportPage({ searchParams }: PageProps) {
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

    const status = searchParams.status as SupportStatus | undefined
    const category = searchParams.category as SupportCategory | undefined
    const priority = searchParams.priority as SupportPriority | undefined

    let q = adminClient
        .from('support_tickets')
        .select('id, subject, category, status, priority, last_reply_at, last_reply_by_admin, created_at, user:profiles!user_id(full_name, email)')
        .order('updated_at', { ascending: false })
        .limit(200)

    if (status) q = q.eq('status', status)
    if (category) q = q.eq('category', category)
    if (priority) q = q.eq('priority', priority)

    const { data: ticketsRaw } = await q
    const tickets = (ticketsRaw || []) as unknown as TicketRow[]

    return (
        <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '36px', color: '#0A0A0F', margin: '0 0 8px 0' }}>
                SUPPORT
            </h1>
            <p style={{ fontSize: '13px', color: '#666677', margin: '0 0 24px 0' }}>
                {tickets.length} ticket{tickets.length !== 1 ? 's' : ''} shown
            </p>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
                <FilterSelect label="Status" paramKey="status" options={SUPPORT_STATUSES.map(s => ({ value: s.value, label: s.label }))} />
                <FilterSelect label="Category" paramKey="category" options={SUPPORT_CATEGORIES.map(c => ({ value: c.value, label: c.label }))} />
                <FilterSelect label="Priority" paramKey="priority" options={SUPPORT_PRIORITIES.map(p => ({ value: p.value, label: p.label }))} />
                {(status || category || priority) && (
                    <Link href="/admin/support" className="text-xs text-accent hover:underline">Clear filters</Link>
                )}
            </div>

            {/* Tickets table */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E0E0E0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #E0E0E0', background: '#F8F8FA' }}>
                            {['Subject', 'User', 'Category', 'Priority', 'Status', 'Updated'].map(h => (
                                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#666677', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {tickets.length === 0 && (
                            <tr>
                                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#8888AA', fontSize: '14px' }}>
                                    No tickets match the current filters.
                                </td>
                            </tr>
                        )}
                        {tickets.map(t => {
                            const lastActivity = t.last_reply_at ?? t.created_at
                            const needsAdmin = !t.last_reply_by_admin && t.status !== 'closed' && t.status !== 'resolved'
                            return (
                                <tr key={t.id} style={{ borderBottom: '1px solid #F0F0F0' }}>
                                    <td style={{ padding: '12px 16px', maxWidth: '320px' }}>
                                        <Link href={`/admin/support/${t.id}`} className="text-accent text-sm font-medium hover:underline block truncate">
                                            {t.subject}
                                        </Link>
                                        {needsAdmin && (
                                            <span className="text-[10px] text-accent uppercase tracking-wider font-semibold">
                                                Awaiting reply
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#0A0A0F' }}>
                                        <div className="truncate max-w-[180px]">{t.user?.full_name || '—'}</div>
                                        <div className="text-xs text-muted truncate max-w-[180px]">{t.user?.email || ''}</div>
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#0A0A0F' }}>
                                        {categoryLabel(t.category)}
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span className={`text-xs px-2 py-0.5 border rounded-full ${priorityChip(t.priority)}`}>
                                            {priorityLabel(t.priority)}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span className={`text-xs px-2 py-0.5 border rounded-full ${statusBadgeClasses(t.status)}`}>
                                            {statusLabel(t.status)}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#666677' }}>
                                        {fmt(lastActivity)}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

