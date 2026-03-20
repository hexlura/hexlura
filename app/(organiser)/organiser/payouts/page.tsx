import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { formatPence } from '@/lib/fees'

export default async function OrganiserPayoutsPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const serviceClient = createServiceClient()
    const { data: organiser } = await serviceClient
        .from('organiser_profiles')
        .select('id, stripe_account_id')
        .eq('user_id', user.id)
        .single()
    if (!organiser) redirect('/organiser/pending')

    const { data: payoutsData } = await supabase
        .from('payouts')
        .select('id, gross_pence, fee_pence, net_pence, status, paid_at, created_at, event:events(title)')
        .eq('organiser_id', organiser.id)
        .order('created_at', { ascending: false })

    const payouts = (payoutsData || []) as {
        id: string; gross_pence: number | null; fee_pence: number | null; net_pence: number | null;
        status: string; paid_at: string | null; created_at: string; event: { title?: string } | null
    }[]

    const pendingBalance = payouts
        .filter(p => p.status === 'pending')
        .reduce((s, p) => s + (p.net_pence || 0), 0)

    const STATUS_COLORS: Record<string, string> = {
        pending: 'text-gold bg-gold/10 border-gold/20',
        processing: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
        paid: 'text-success bg-success/10 border-success/20',
        failed: 'text-accent bg-accent/10 border-accent/20',
    }

    return (
        <div className="max-w-5xl">
            <div className="mb-8">
                <h1 className="font-heading text-4xl text-text tracking-wide">PAYOUTS</h1>
                <p className="text-muted text-sm mt-1">Your earnings and payout history</p>
            </div>

            {/* Balance card */}
            <div className="bg-card border border-border rounded-xl p-6 mb-6">
                <p className="text-xs text-muted uppercase tracking-wider mb-1">Available Balance</p>
                <p className="font-heading text-5xl text-text">{formatPence(pendingBalance)}</p>
                {!organiser.stripe_account_id ? (
                    <p className="text-xs text-muted mt-2">Connect Stripe to receive payouts</p>
                ) : (
                    <p className="text-xs text-success mt-2">Bank account connected ✓</p>
                )}
            </div>

            {/* Stripe status banner */}
            {!organiser.stripe_account_id ? (
                <div className="bg-gold/10 border border-gold/30 rounded-xl p-4 mb-6 flex items-center justify-between">
                    <div>
                        <p className="text-gold text-sm font-medium">Connect your bank account to receive payouts</p>
                        <p className="text-muted text-xs mt-0.5">Required to receive automatic Stripe payouts</p>
                    </div>
                    <a href="/api/stripe/connect" className="px-4 py-2 bg-gold text-black text-sm rounded-lg font-medium hover:bg-yellow-400 transition-colors">
                        Connect with Stripe
                    </a>
                </div>
            ) : (
                <div className="bg-success/10 border border-success/20 rounded-xl p-4 mb-6">
                    <p className="text-success text-sm">✓ Bank account connected</p>
                </div>
            )}

            {/* Payouts table */}
            <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="text-sm font-medium text-text mb-4">Payout History</h2>
                <p className="text-xs text-muted mb-4">* Hexlura fee is paid by buyers, not deducted from your payout</p>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border">
                            {['Event', 'Gross Revenue', 'Hexlura Fee *', 'Net Payout', 'Status', 'Date'].map(h => (
                                <th key={h} className="text-left text-xs text-muted pb-3 font-normal pr-4">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {payouts.length === 0 && (
                            <tr><td colSpan={6} className="text-center text-muted text-xs py-12">No payouts yet</td></tr>
                        )}
                        {payouts.map(p => (
                            <tr key={p.id} className="border-b border-border/50">
                                <td className="py-3 pr-4 text-text text-xs max-w-[160px] truncate">
                                    {p.event?.title || '—'}
                                </td>
                                <td className="py-3 pr-4 text-text text-xs">{formatPence(p.gross_pence || 0)}</td>
                                <td className="py-3 pr-4 text-muted text-xs">{formatPence(p.fee_pence || 0)}</td>
                                <td className="py-3 pr-4 text-text text-xs font-medium">{formatPence(p.net_pence || 0)}</td>
                                <td className="py-3 pr-4">
                                    <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[p.status] || 'text-muted border-border'}`}>
                                        {p.status}
                                    </span>
                                </td>
                                <td className="py-3 text-muted text-xs">
                                    {p.paid_at
                                        ? new Date(p.paid_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                                        : new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
