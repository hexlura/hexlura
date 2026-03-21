import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatPence } from '@/lib/fees'
import { AdminDashboardClient } from './dashboard-client'

export default async function AdminDashboardPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const adminClient = createAdminClient()

    // KPI: GMV and platform revenue from confirmed bookings
    const { data: bookings } = await adminClient
        .from('bookings')
        .select('total_pence, booking_fee_pence, confirmed_at, created_at')
        .eq('status', 'confirmed')

    const allBookings = (bookings || []) as { total_pence: number | null; booking_fee_pence: number | null; confirmed_at: string | null; created_at: string }[]

    const gmvPence = allBookings.reduce((s, b) => s + (b.total_pence || 0), 0)
    const revenuePence = allBookings.reduce((s, b) => s + (b.booking_fee_pence || 0), 0)

    // KPI: Total users (role='user')
    const { count: totalUsers } = await adminClient
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'user')

    // KPI: Total approved organisers
    const { count: totalOrganisers } = await adminClient
        .from('organiser_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('is_approved', true)

    // KPI: Live events
    const { count: liveEvents } = await adminClient
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published')
        .gt('start_at', new Date().toISOString())

    // KPI: Tickets sold today
    const todayMidnight = new Date()
    todayMidnight.setHours(0, 0, 0, 0)
    const { data: todayItems } = await adminClient
        .from('booking_items')
        .select('quantity, booking_id')
        .gte('created_at', todayMidnight.toISOString())

    // We need to join with confirmed bookings. Fetch confirmed booking IDs for today
    const { data: confirmedTodayBookings } = await adminClient
        .from('bookings')
        .select('id')
        .eq('status', 'confirmed')
        .gte('confirmed_at', todayMidnight.toISOString())

    const confirmedTodayIds = new Set((confirmedTodayBookings || []).map((b: { id: string }) => b.id))
    const ticketsSoldToday = (todayItems || [])
        .filter((i: { quantity: number; booking_id: string }) => confirmedTodayIds.has(i.booking_id))
        .reduce((s: number, i: { quantity: number; booking_id: string }) => s + i.quantity, 0)

    // KPI: New users this week
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const { count: newUsersWeek } = await adminClient
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString())

    // KPI: Pending applications
    const { count: pendingApps } = await adminClient
        .from('organiser_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('is_approved', false)

    // GMV chart: last 90 days
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    const chartMap: Record<string, number> = {}
    for (let i = 89; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        chartMap[d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })] = 0
    }
    for (const b of allBookings.filter(b => b.confirmed_at && new Date(b.confirmed_at) >= ninetyDaysAgo)) {
        const k = new Date(b.confirmed_at!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        if (k in chartMap) chartMap[k] += (b.total_pence || 0) / 100
    }
    const gmvChartData = Object.entries(chartMap).map(([date, revenue]) => ({ date, revenue }))

    // Bookings by category
    const { data: eventsWithBookings } = await adminClient
        .from('bookings')
        .select('total_pence, event:events(category)')
        .eq('status', 'confirmed')
    type BookingWithEvent = { total_pence: number | null; event: { category: string } | null }
    const byCat: Record<string, number> = {}
    for (const bk of ((eventsWithBookings || []) as unknown as BookingWithEvent[])) {
        const cat = bk.event?.category ?? 'Other'
        byCat[cat] = (byCat[cat] || 0) + 1
    }
    const categoryChartData = Object.entries(byCat).map(([category, count]) => ({ category, count }))

    // Pending organiser applications (up to 5)
    const { data: pendingOrgs } = await adminClient
        .from('organiser_profiles')
        .select('id, org_name, created_at, user_id, profiles(full_name, email)')
        .eq('is_approved', false)
        .order('created_at', { ascending: true })
        .limit(5)

    type PendingOrg = {
        id: string
        org_name: string
        created_at: string
        user_id: string
        profiles: { full_name: string | null; email: string | null } | null
    }
    const pendingOrgList = (pendingOrgs || []) as unknown as PendingOrg[]

    // Recent refund requests (up to 5)
    const { data: refundReqs } = await adminClient
        .from('refund_requests')
        .select('id, status, created_at, booking:bookings(booking_ref, total_pence)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5)

    type RefundReq = {
        id: string
        status: string
        created_at: string
        booking: { booking_ref: string; total_pence: number | null } | null
    }
    const refundList = (refundReqs || []) as unknown as RefundReq[]

    const kpis1 = [
        { label: 'Gross Merchandise Value', value: formatPence(gmvPence), sub: 'All confirmed bookings' },
        { label: 'Platform Revenue', value: formatPence(revenuePence), sub: 'Booking fees collected' },
        { label: 'Total Users', value: (totalUsers || 0).toLocaleString(), sub: 'Registered accounts' },
        { label: 'Total Organisers', value: (totalOrganisers || 0).toLocaleString(), sub: 'Approved organisers' },
    ]
    const kpis2 = [
        { label: 'Live Events', value: (liveEvents || 0).toLocaleString(), sub: 'Published & upcoming', amber: false },
        { label: 'Tickets Sold Today', value: ticketsSoldToday.toLocaleString(), sub: 'Since midnight', amber: false },
        { label: 'New Users This Week', value: (newUsersWeek || 0).toLocaleString(), sub: 'Last 7 days', amber: false },
        { label: 'Pending Applications', value: (pendingApps || 0).toLocaleString(), sub: 'Awaiting review', amber: (pendingApps || 0) > 0 },
    ]

    function relativeDate(d: string) {
        const diff = Date.now() - new Date(d).getTime()
        const days = Math.floor(diff / 86400000)
        if (days === 0) return 'Today'
        if (days === 1) return '1 day ago'
        return `${days} days ago`
    }

    return (
        <div className="max-w-7xl">
            <div className="mb-8">
                <h1 className="font-heading text-4xl text-text tracking-wide">DASHBOARD</h1>
                <p className="text-muted text-sm mt-1">Platform overview</p>
            </div>

            {/* KPI Row 1 */}
            <div className="grid grid-cols-4 gap-4 mb-4">
                {kpis1.map(kpi => (
                    <div key={kpi.label} className="bg-card border border-border rounded-none p-5">
                        <p className="text-xs text-muted uppercase tracking-wider mb-1">{kpi.label}</p>
                        <p className="font-heading text-3xl text-text">{kpi.value}</p>
                        <p className="text-xs text-muted mt-2">{kpi.sub}</p>
                    </div>
                ))}
            </div>

            {/* KPI Row 2 */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                {kpis2.map(kpi => (
                    <div key={kpi.label} className={`border rounded-none p-5 ${kpi.amber ? 'bg-[#2A1F00] border-gold/40' : 'bg-card border-border'}`}>
                        <p className={`text-xs uppercase tracking-wider mb-1 ${kpi.amber ? 'text-gold' : 'text-muted'}`}>{kpi.label}</p>
                        <p className={`font-heading text-3xl ${kpi.amber ? 'text-gold' : 'text-text'}`}>{kpi.value}</p>
                        <p className={`text-xs mt-2 ${kpi.amber ? 'text-gold/60' : 'text-muted'}`}>{kpi.sub}</p>
                    </div>
                ))}
            </div>

            {/* Charts */}
            <AdminDashboardClient gmvChartData={gmvChartData} categoryChartData={categoryChartData} />

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-6 mt-8">
                {/* Pending Applications */}
                <div className="bg-card border border-border rounded-none p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-medium text-text">Pending Organiser Applications</h2>
                        <Link href="/admin/organisers" className="text-xs text-accent hover:underline">View All →</Link>
                    </div>
                    {pendingOrgList.length === 0 ? (
                        <p className="text-muted text-xs py-4 text-center">No pending applications</p>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {pendingOrgList.map(org => (
                                <div key={org.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                                    <div>
                                        <p className="text-sm text-text font-medium">{org.org_name}</p>
                                        <p className="text-xs text-muted">{org.profiles?.full_name ?? '—'} · {relativeDate(org.created_at)}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <form action={`/api/admin/organisers/${org.id}/approve`} method="POST">
                                            <button type="submit" className="text-xs px-2.5 py-1 rounded bg-success/10 text-success border border-success/20 hover:bg-success/20 transition-colors">Approve</button>
                                        </form>
                                        <form action={`/api/admin/organisers/${org.id}/reject`} method="POST">
                                            <button type="submit" className="text-xs px-2.5 py-1 rounded bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors">Reject</button>
                                        </form>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Refund Requests */}
                <div className="bg-card border border-border rounded-none p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-medium text-text">Recent Refund Requests</h2>
                        <Link href="/admin/bookings?tab=refunds" className="text-xs text-accent hover:underline">View All →</Link>
                    </div>
                    {refundList.length === 0 ? (
                        <p className="text-muted text-xs py-4 text-center">No pending refund requests</p>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {refundList.map(r => (
                                <div key={r.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                                    <div>
                                        <p className="text-sm font-mono text-accent">{r.booking?.booking_ref ?? '—'}</p>
                                        <p className="text-xs text-muted">{formatPence(r.booking?.total_pence || 0)} · {relativeDate(r.created_at)}</p>
                                    </div>
                                    <span className="text-xs px-2 py-0.5 rounded-full border bg-gold/10 text-gold border-gold/20">
                                        {r.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
