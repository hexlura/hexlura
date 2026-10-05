import { redirect } from 'next/navigation'
import Link from 'next/link'
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

    const dashHeader = (
        <div className="mb-6">
            <h1 className="font-heading text-4xl tracking-wide">DASHBOARD</h1>
            <p className="text-muted text-sm mt-1">Track your referrals, sales and payouts.</p>
        </div>
    )

    return (
        <div className="max-w-7xl">
            {dashHeader}

            {/* KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                <div className="bg-gradient-to-br from-accent to-warm-orange rounded-2xl shadow-glow p-6 text-white">
                    <p className="text-xs uppercase tracking-wider mb-2 opacity-90">Total Earned</p>
                    <p className="font-heading text-4xl">{formatPence(totalEarnedPence)}</p>
                    <p className="text-xs mt-2 opacity-90">All time</p>
                </div>
                <div className="bg-card rounded-2xl shadow-card p-6">
                    <p className="text-xs text-muted uppercase tracking-wider mb-2">Tickets Sold</p>
                    <p className="font-heading text-4xl">{ticketsSold}</p>
                    <p className="text-xs text-muted mt-2">Via your links</p>
                </div>
                <div className="bg-card rounded-2xl shadow-card p-6">
                    <p className="text-xs text-muted uppercase tracking-wider mb-2">Link Clicks</p>
                    <p className="font-heading text-4xl">{totalClicks.toLocaleString('en-GB')}</p>
                    <p className="text-xs text-muted mt-2">Total visits</p>
                </div>
                <div className="bg-card rounded-2xl shadow-card p-6">
                    <p className="text-xs text-muted uppercase tracking-wider mb-2">Pending Payout</p>
                    <p className="font-heading text-4xl">{formatPence(pendingPayoutPence)}</p>
                    <Link href="/promoter/payouts" className="text-xs text-warm-green font-semibold mt-2 inline-block">Ready to request →</Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue last 7 days */}
                <div className="bg-card rounded-2xl shadow-card p-6">
                    <h2 className="text-sm font-semibold">Revenue — last 7 days</h2>
                    <p className="text-xs text-muted mb-4">Daily commission earnings</p>
                    <div className="flex items-end gap-3 h-44">
                        {days.map((d, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                                <div
                                    className="w-full rounded-t-lg bg-gradient-to-t from-accent to-warm-orange transition-all"
                                    style={{
                                        height: `${Math.max((d.pence / maxPence) * 100, 4)}%`,
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
                <div className="bg-card rounded-2xl shadow-card overflow-hidden">
                    <div className="px-6 py-4 border-b border-border">
                        <h2 className="text-sm font-semibold">Recent sales</h2>
                        <p className="text-xs text-muted">Latest bookings via your links</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs text-muted uppercase tracking-wider border-b border-border">
                                    <th className="font-medium py-3 px-6">Event</th>
                                    <th className="font-medium py-3 px-4 text-right">Commission</th>
                                    <th className="font-medium py-3 px-6 text-right">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recent.length === 0 && (
                                    <tr><td colSpan={3} className="text-center text-muted text-xs py-8">No sales yet — share your links to start earning</td></tr>
                                )}
                                {recent.map((r, i) => (
                                    <tr key={r.id} className={`${i === recent.length - 1 ? '' : 'border-b border-border'} hover:bg-[#FAF6F3]/60`}>
                                        <td className="py-3.5 px-6 font-medium truncate max-w-[200px]">{r.event?.title || '—'}</td>
                                        <td className="py-3.5 px-4 text-right font-semibold text-warm-green">+{formatPence(r.commission_pence)}</td>
                                        <td className="py-3.5 px-6 text-right text-xs text-muted whitespace-nowrap">{fmtDate(r.created_at)}</td>
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
