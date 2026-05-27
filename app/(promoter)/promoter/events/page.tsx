import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { resolvePromoterId } from '@/lib/promoter-access'
import { formatPence } from '@/lib/fees'

export const dynamic = 'force-dynamic'

function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function statusFor(eventStatus: string, startAt: string): { label: string; className: string } {
    if (eventStatus === 'cancelled') return { label: 'Cancelled', className: 'text-muted bg-muted/10 border-muted/20' }
    const now = new Date()
    const start = new Date(startAt)
    if (start < now) return { label: 'Ended', className: 'text-muted bg-muted/10 border-muted/20' }
    const daysAway = (start.getTime() - now.getTime()) / 86400000
    if (daysAway > 7) return { label: 'Upcoming', className: 'text-gold bg-gold/10 border-gold/20' }
    return { label: 'Active', className: 'text-success bg-success/10 border-success/20' }
}

export default async function PromoterEventsPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login?next=/promoter/events')

    const promoterId = await resolvePromoterId(user.id)
    if (!promoterId) redirect('/promoter/apply')

    const serviceClient = createServiceClient()

    const { data: assignments } = await serviceClient
        .from('promoter_event_assignments')
        .select(`
            id, commission_percent, status, created_at,
            event:events(id, title, start_at, status, venue_name, organiser:organiser_profiles(org_name))
        `)
        .eq('promoter_id', promoterId)
        .neq('status', 'removed')
        .order('created_at', { ascending: false })

    type Row = {
        id: string
        commission_percent: number
        status: string
        event: {
            id: string
            title: string
            start_at: string
            status: string
            venue_name: string | null
            organiser: { org_name: string } | null
        } | null
    }
    const rows = (assignments || []) as unknown as Row[]
    const activeEventIds = rows.filter(r => r.status === 'active' && r.event).map(r => r.event!.id)

    const { data: earnings } = activeEventIds.length === 0
        ? { data: [] as { event_id: string; commission_pence: number; status: string }[] }
        : await serviceClient
            .from('promoter_earnings')
            .select('event_id, commission_pence, status')
            .eq('promoter_id', promoterId)
            .in('event_id', activeEventIds)

    const salesByEvent: Record<string, { count: number; earnedPence: number }> = {}
    for (const e of earnings || []) {
        if (e.status === 'reversed') continue
        if (!salesByEvent[e.event_id]) salesByEvent[e.event_id] = { count: 0, earnedPence: 0 }
        salesByEvent[e.event_id].count += 1
        salesByEvent[e.event_id].earnedPence += e.commission_pence || 0
    }

    return (
        <div className="max-w-7xl">
            <h1 className="font-heading text-4xl text-text tracking-wide mb-2">ASSIGNED EVENTS</h1>
            <p className="text-muted text-sm mb-8">Events you have been assigned to promote.</p>

            <div className="bg-card border border-border overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border">
                            {['Event', 'Date', 'Organiser', 'Commission', 'Sales', 'Earned', 'Status'].map(h => (
                                <th key={h} className="text-left text-xs text-muted py-3 px-4 font-normal uppercase tracking-wider">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 && (
                            <tr><td colSpan={7} className="text-center text-muted text-xs py-12">No assigned events yet</td></tr>
                        )}
                        {rows.map(r => {
                            if (!r.event) return null
                            const stats = salesByEvent[r.event.id] || { count: 0, earnedPence: 0 }
                            const status = r.status === 'invited'
                                ? { label: 'Invite Pending', className: 'text-gold bg-gold/10 border-gold/20' }
                                : statusFor(r.event.status, r.event.start_at)
                            return (
                                <tr key={r.id} className="border-b border-border/50 hover:bg-surface transition-colors">
                                    <td className="py-3 px-4">
                                        <div className="text-text font-medium">{r.event.title}</div>
                                        <div className="text-xs text-muted">{r.event.venue_name || ''}</div>
                                    </td>
                                    <td className="py-3 px-4 text-xs text-muted whitespace-nowrap">{fmtDate(r.event.start_at)}</td>
                                    <td className="py-3 px-4 text-xs text-text">{r.event.organiser?.org_name || '—'}</td>
                                    <td className="py-3 px-4">
                                        <span className="text-xs text-accent bg-accent/10 px-2 py-0.5 rounded-full">{r.commission_percent}%</span>
                                    </td>
                                    <td className="py-3 px-4 text-text">{stats.count}</td>
                                    <td className="py-3 px-4 text-success font-medium">{formatPence(stats.earnedPence)}</td>
                                    <td className="py-3 px-4">
                                        <span className={`text-xs px-2 py-0.5 rounded-full border whitespace-nowrap ${status.className}`}>
                                            {status.label}
                                        </span>
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
