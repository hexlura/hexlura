import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { resolvePromoterId } from '@/lib/promoter-access'
import { markEarningsAvailable } from '@/lib/promoter-earnings'
import { formatPence } from '@/lib/fees'

export const dynamic = 'force-dynamic'

function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default async function PromoterDashboardPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login?next=/promoter')

    const promoterId = await resolvePromoterId(user.id)
    if (!promoterId) redirect('/promoter/apply')

    // Lazily flip pending → available based on cooldown
    await markEarningsAvailable(promoterId)

    const serviceClient = createServiceClient()

    const [earningsRes, clicksRes, recentRes] = await Promise.all([
        serviceClient
            .from('promoter_earnings')
            .select('commission_pence, status, created_at, event:events(title)')
            .eq('promoter_id', promoterId),
        serviceClient
            .from('promoter_link_clicks')
            .select('id', { count: 'exact', head: true })
            .eq('promoter_id', promoterId),
        serviceClient
            .from('promoter_earnings')
            .select('id, commission_pence, created_at, event:events(title), booking:bookings(booking_ref)')
            .eq('promoter_id', promoterId)
            .order('created_at', { ascending: false })
            .limit(10),
    ])

    type EarningRow = { commission_pence: number; status: string; created_at: string; event: { title: string } | null }
    const earnings = (earningsRes.data || []) as unknown as EarningRow[]

    const totalEarnedPence = earnings
        .filter(e => e.status === 'available' || e.status === 'paid')
        .reduce((sum, e) => sum + (e.commission_pence || 0), 0)
    const pendingPayoutPence = earnings
        .filter(e => e.status === 'available')
        .reduce((sum, e) => sum + (e.commission_pence || 0), 0)
    const ticketsSold = earnings.filter(e => e.status !== 'reversed').length
    const totalClicks = clicksRes.count ?? 0

    // Revenue last 7 days
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const days: { label: string; pence: number }[] = []
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        days.push({ label: d.toLocaleDateString('en-GB', { weekday: 'short' }), pence: 0 })
    }
    const startISO = new Date(today.getTime() - 6 * 86400000).toISOString()
    for (const e of earnings) {
        if (e.status === 'reversed') continue
        if (e.created_at < startISO) continue
        const dayIndex = Math.floor((new Date(e.created_at).getTime() - new Date(startISO).getTime()) / 86400000)
        if (dayIndex >= 0 && dayIndex < 7) days[dayIndex].pence += e.commission_pence || 0
    }
    const maxPence = Math.max(1, ...days.map(d => d.pence))

    type RecentRow = {
        id: string; commission_pence: number; created_at: string;
        event: { title: string } | null;
        booking: { booking_ref: string } | null;
    }
    const recent = (recentRes.data || []) as unknown as RecentRow[]

    const kpis = [
        { label: 'Total Earned', value: formatPence(totalEarnedPence), color: '#F5A623', sub: 'All time' },
        { label: 'Tickets Sold', value: String(ticketsSold), color: '#0A0A0F', sub: 'Via your links' },
        { label: 'Link Clicks', value: totalClicks.toLocaleString('en-GB'), color: '#6B9FFF', sub: 'Total visits' },
        { label: 'Pending Payout', value: formatPence(pendingPayoutPence), color: '#00C48A', sub: 'Ready to request' },
    ]

    return (
        <div className="max-w-7xl">
            <h1 className="font-heading text-4xl text-text tracking-wide mb-2">DASHBOARD</h1>
            <p className="text-muted text-sm mb-8">Track your referrals, sales and payouts.</p>

            {/* KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {kpis.map(k => (
                    <div key={k.label} className="bg-card border border-border p-5">
                        <div className="text-xs uppercase tracking-wider text-muted mb-2">{k.label}</div>
                        <div className="font-heading text-3xl" style={{ color: k.color }}>{k.value}</div>
                        <div className="text-xs text-muted mt-2">{k.sub}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue last 7 days */}
                <div className="bg-card border border-border p-5">
                    <h2 className="text-sm font-medium text-text mb-1">Revenue — Last 7 Days</h2>
                    <p className="text-xs text-muted mb-4">Daily commission earnings</p>
                    <div className="flex items-end gap-2 h-40 mt-6">
                        {days.map((d, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                <div
                                    className="w-full bg-accent/80 rounded-t-sm transition-all"
                                    style={{
                                        height: `${(d.pence / maxPence) * 100}%`,
                                        minHeight: d.pence > 0 ? 8 : 4,
                                        opacity: d.pence > 0 ? 1 : 0.15,
                                    }}
                                    title={formatPence(d.pence)}
                                />
                                <span className="text-xs text-muted">{d.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent sales */}
                <div className="bg-card border border-border p-5">
                    <h2 className="text-sm font-medium text-text mb-1">Recent Sales</h2>
                    <p className="text-xs text-muted mb-4">Latest bookings via your links</p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-xs text-muted uppercase tracking-wider">
                                    <th className="text-left font-normal pb-2">Event</th>
                                    <th className="text-right font-normal pb-2">Commission</th>
                                    <th className="text-right font-normal pb-2">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recent.length === 0 && (
                                    <tr><td colSpan={3} className="text-center text-muted text-xs py-6">No sales yet — share your links to start earning</td></tr>
                                )}
                                {recent.map(r => (
                                    <tr key={r.id} className="border-t border-border/50">
                                        <td className="py-2 text-text truncate max-w-[180px]">{r.event?.title || '—'}</td>
                                        <td className="py-2 text-right text-success">+{formatPence(r.commission_pence)}</td>
                                        <td className="py-2 text-right text-muted text-xs whitespace-nowrap">{fmtDate(r.created_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
