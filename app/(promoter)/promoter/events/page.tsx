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
    if (eventStatus === 'cancelled') return { label: 'Cancelled', className: 'text-muted bg-border' }
    const now = new Date()
    const start = new Date(startAt)
    if (start < now) return { label: 'Ended', className: 'text-muted bg-border' }
    const daysAway = (start.getTime() - now.getTime()) / 86400000
    if (daysAway > 7) return { label: 'Upcoming', className: 'text-warm-amberText bg-warm-amber/15' }
    return { label: 'Active', className: 'text-warm-green bg-warm-green/10' }
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
            <div className="mb-6">
                <h1 className="font-heading text-4xl tracking-wide">ASSIGNED EVENTS</h1>
                <p className="text-muted text-sm mt-1">Events you have been assigned to promote.</p>
            </div>

            <div className="bg-card rounded-2xl shadow-card overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-xs text-muted uppercase tracking-wider border-b border-border">
                            {['Event', 'Date', 'Organiser', 'Commission', 'Sales', 'Earned', 'Status'].map((h, i) => (
                                <th key={h} className={`font-medium py-3 ${i === 0 || i === 6 ? 'px-6' : 'px-4'}`}>{h}</th>
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
                                ? { label: 'Invite pending', className: 'text-warm-yellowText bg-warm-yellow/15' }
                                : statusFor(r.event.status, r.event.start_at)
                            return (
                                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-[#FAF6F3]/60 transition-colors">
                                    <td className="py-3.5 px-6">
                                        <p className="font-medium">{r.event.title}</p>
                                        <p className="text-xs text-muted">{r.event.venue_name || ''}</p>
                                    </td>
                                    <td className="py-3.5 px-4 text-xs text-muted whitespace-nowrap">{fmtDate(r.event.start_at)}</td>
                                    <td className="py-3.5 px-4 text-xs">{r.event.organiser?.org_name || '—'}</td>
                                    <td className="py-3.5 px-4">
                                        <span className="text-xs font-semibold text-accent bg-warm-red/10 px-2.5 py-1 rounded-full">{r.commission_percent}%</span>
                                    </td>
                                    <td className="py-3.5 px-4">{stats.count}</td>
                                    <td className="py-3.5 px-4 font-semibold text-warm-green">{formatPence(stats.earnedPence)}</td>
                                    <td className="py-3.5 px-6">
                                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${status.className}`}>
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
