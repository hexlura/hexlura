import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { formatPence } from '@/lib/fees'
import { FinancialsClient } from './financials-client'
import Link from 'next/link'

export default async function AdminFinancialsPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const adminClient = createAdminClient()

    const { data: allBookings } = await adminClient
        .from('bookings')
        .select('total_pence, booking_fee_pence, confirmed_at')
        .eq('status', 'confirmed')

    const { data: allPayouts } = await adminClient
        .from('payouts')
        .select('net_pence, gross_pence, paid_at, status')
        .eq('status', 'paid')

    const bookings = (allBookings || []) as { total_pence: number | null; booking_fee_pence: number | null; confirmed_at: string | null }[]
    const payouts = (allPayouts || []) as { net_pence: number | null; gross_pence: number | null; paid_at: string | null; status: string }[]

    const totalGmv = bookings.reduce((s, b) => s + (b.total_pence || 0), 0)
    const totalRevenue = bookings.reduce((s, b) => s + (b.booking_fee_pence || 0), 0)
    const totalPaidOut = payouts.reduce((s, p) => s + (p.net_pence || 0), 0)
    const platformCosts = (1600 + 2000) // Vercel £16 + Supabase £20 in pence
    const netRevenue = totalRevenue - platformCosts

    // Monthly breakdown: last 12 months
    const months: { key: string; label: string }[] = []
    for (let i = 11; i >= 0; i--) {
        const d = new Date()
        d.setDate(1)
        d.setMonth(d.getMonth() - i)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const label = d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
        months.push({ key, label })
    }

    const monthlyStats: Record<string, { gmv: number; revenue: number; payouts: number; bookings_count: number }> = {}
    for (const m of months) {
        monthlyStats[m.key] = { gmv: 0, revenue: 0, payouts: 0, bookings_count: 0 }
    }

    for (const b of bookings) {
        if (!b.confirmed_at) continue
        const d = new Date(b.confirmed_at)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (monthlyStats[key]) {
            monthlyStats[key].gmv += b.total_pence || 0
            monthlyStats[key].revenue += b.booking_fee_pence || 0
            monthlyStats[key].bookings_count++
        }
    }
    for (const p of payouts) {
        if (!p.paid_at) continue
        const d = new Date(p.paid_at)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (monthlyStats[key]) {
            monthlyStats[key].payouts += p.net_pence || 0
        }
    }

    const monthlyData = months.map(m => ({
        month: m.label,
        gmv: monthlyStats[m.key].gmv / 100,
        revenue: monthlyStats[m.key].revenue / 100,
        payouts: monthlyStats[m.key].payouts / 100,
        bookings_count: monthlyStats[m.key].bookings_count,
    }))

    // Cumulative GMV for area chart
    let cumulative = 0
    const cumulativeData = monthlyData.map(m => {
        cumulative += m.gmv
        return { month: m.month, cumulative }
    })

    const kpis = [
        { label: 'Total GMV', value: formatPence(totalGmv) },
        { label: 'Total Platform Revenue', value: formatPence(totalRevenue) },
        { label: 'Total Paid Out', value: formatPence(totalPaidOut) },
        { label: 'Net Platform Revenue', value: formatPence(netRevenue), note: 'After Vercel £16 + Supabase £20' },
    ]

    return (
        <div className="max-w-7xl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="font-heading text-4xl text-text tracking-wide">FINANCIALS</h1>
                    <p className="text-muted text-sm mt-1">Platform revenue and payout overview</p>
                </div>
                <div className="flex gap-3">
                    <Link href="/api/admin/export/revenue" className="text-xs px-3 py-2 rounded-sm bg-card border border-border text-muted hover:text-text transition-colors">Export Revenue CSV</Link>
                    <Link href="/api/admin/export/bookings" className="text-xs px-3 py-2 rounded-sm bg-card border border-border text-muted hover:text-text transition-colors">Export Bookings CSV</Link>
                    <Link href="/api/admin/export/payouts" className="text-xs px-3 py-2 rounded-sm bg-card border border-border text-muted hover:text-text transition-colors">Export Payouts CSV</Link>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-8">
                {kpis.map(k => (
                    <div key={k.label} className="bg-card border border-border rounded-none p-5">
                        <p className="text-xs text-muted uppercase tracking-wider mb-1">{k.label}</p>
                        <p className="font-heading text-3xl text-text">{k.value}</p>
                        {k.note && <p className="text-xs text-muted mt-2">{k.note}</p>}
                    </div>
                ))}
            </div>

            <FinancialsClient monthlyData={monthlyData} cumulativeData={cumulativeData} />

            {/* Monthly Breakdown Table */}
            <div className="mt-8 bg-card border border-border rounded-none overflow-hidden">
                <div className="p-6 border-b border-border">
                    <h2 className="text-sm font-medium text-text">Monthly Breakdown — Last 12 Months</h2>
                </div>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border">
                            {['Month', 'GMV (£)', 'Platform Revenue (£)', 'Payouts Sent (£)', 'Bookings Count'].map(h => (
                                <th key={h} className="text-left text-xs text-muted py-3 px-4 font-normal">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {monthlyData.map(m => (
                            <tr key={m.month} className="border-b border-border/50 hover:bg-surface transition-colors">
                                <td className="py-3 px-4 text-text text-sm font-medium">{m.month}</td>
                                <td className="py-3 px-4 text-text text-sm">£{m.gmv.toFixed(2)}</td>
                                <td className="py-3 px-4 text-text text-sm">£{m.revenue.toFixed(2)}</td>
                                <td className="py-3 px-4 text-text text-sm">£{m.payouts.toFixed(2)}</td>
                                <td className="py-3 px-4 text-text text-sm">{m.bookings_count}</td>
                            </tr>
                        ))}
                        <tr className="border-t-2 border-border bg-surface">
                            <td className="py-3 px-4 text-text text-sm font-bold">Totals</td>
                            <td className="py-3 px-4 text-text text-sm font-bold">£{monthlyData.reduce((s, m) => s + m.gmv, 0).toFixed(2)}</td>
                            <td className="py-3 px-4 text-text text-sm font-bold">£{monthlyData.reduce((s, m) => s + m.revenue, 0).toFixed(2)}</td>
                            <td className="py-3 px-4 text-text text-sm font-bold">£{monthlyData.reduce((s, m) => s + m.payouts, 0).toFixed(2)}</td>
                            <td className="py-3 px-4 text-text text-sm font-bold">{monthlyData.reduce((s, m) => s + m.bookings_count, 0)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    )
}
