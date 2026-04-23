import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { formatPence } from '@/lib/fees'
import { resolveOrganiserId } from '@/lib/organiser-access'
import { generatePayoutsForOrganiser } from '@/lib/generate-payouts'
import { WithdrawButton } from './payouts-client'

export default async function OrganiserPayoutsPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const organiserId = await resolveOrganiserId(user.id)
    if (!organiserId) redirect('/organiser/pending')

    const serviceClient = createServiceClient()

    // Auto-generate payout records for completed events
    await generatePayoutsForOrganiser(organiserId)

    const { data: organiser } = await serviceClient
        .from('organiser_profiles')
        .select('id, stripe_account_id, payout_method, bank_account_number')
        .eq('id', organiserId)
        .single()
    if (!organiser) redirect('/organiser/pending')

    const { data: payoutsData } = await serviceClient
        .from('payouts')
        .select('id, net_pence, status, requested_at, paid_at, created_at, event:events(title)')
        .eq('organiser_id', organiserId)
        .order('created_at', { ascending: false })

    const payouts = (payoutsData || []) as {
        id: string; net_pence: number | null;
        status: string; requested_at: string | null; paid_at: string | null; created_at: string;
        event: { title?: string } | null
    }[]

    const pendingBalance = payouts
        .filter(p => p.status === 'pending')
        .reduce((s, p) => s + (p.net_pence || 0), 0)

    const requestedBalance = payouts
        .filter(p => p.status === 'requested')
        .reduce((s, p) => s + (p.net_pence || 0), 0)

    const canRequestWithdrawal =
        (organiser.payout_method === 'stripe_connect' && !!organiser.stripe_account_id) ||
        (organiser.payout_method === 'bank_transfer' && !!organiser.bank_account_number)

    const STATUS_COLORS: Record<string, string> = {
        pending: 'text-gold bg-gold/10 border-gold/20',
        requested: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
        processing: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
        paid: 'text-success bg-success/10 border-success/20',
        failed: 'text-accent bg-accent/10 border-accent/20',
    }

    const STATUS_LABELS: Record<string, string> = {
        pending: 'Available',
        requested: 'Requested',
        processing: 'Processing',
        paid: 'Paid',
        failed: 'Failed',
    }

    function getDate(p: typeof payouts[number]) {
        const d = p.paid_at || p.requested_at || p.created_at
        return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    }

    return (
        <div className="max-w-5xl">
            <div className="mb-8">
                <h1 className="font-heading text-4xl text-text tracking-wide">PAYOUTS</h1>
                <p className="text-muted text-sm mt-1">Your earnings and payout history</p>
            </div>

            {/* Balance card */}
            <div className="bg-card border border-border rounded-none p-6 mb-6">
                <p className="text-xs text-muted uppercase tracking-wider mb-1">Available Balance</p>
                <p className="font-heading text-5xl text-text">{formatPence(pendingBalance)}</p>
                <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs px-2 py-0.5 rounded-full border border-border text-muted">
                        {organiser.payout_method === 'stripe_connect' ? 'Stripe Connect' : 'Bank Transfer'}
                    </span>
                    {organiser.payout_method === 'bank_transfer' && organiser.bank_account_number && (
                        <span className="text-xs text-muted">ending ···· {String(organiser.bank_account_number).slice(-4)}</span>
                    )}
                    {organiser.payout_method === 'stripe_connect' && organiser.stripe_account_id && (
                        <span className="text-xs text-success">✓ Connected</span>
                    )}
                </div>
                <WithdrawButton pendingBalance={pendingBalance} canRequestWithdrawal={canRequestWithdrawal} />
            </div>

            {/* Requested balance info */}
            {requestedBalance > 0 && (
                <div className="bg-blue-400/10 border border-blue-400/20 rounded-none p-4 mb-6">
                    <p className="text-blue-400 text-sm">Withdrawal of {formatPence(requestedBalance)} requested — awaiting admin processing</p>
                </div>
            )}

            {/* Payout method status banner */}
            {organiser.payout_method === 'bank_transfer' ? (
                organiser.bank_account_number ? (
                    <div className="bg-success/10 border border-success/20 rounded-none p-4 mb-6">
                        <p className="text-success text-sm">✓ Bank details on file — payouts processed by admin</p>
                    </div>
                ) : (
                    <div className="bg-gold/10 border border-gold/30 rounded-none p-4 mb-6 flex items-center justify-between">
                        <div>
                            <p className="text-gold text-sm font-medium">Add your bank details to receive payouts</p>
                            <p className="text-muted text-xs mt-0.5">Go to Settings → Payout Method to add your UK bank account</p>
                        </div>
                        <a href="/organiser/settings" className="px-4 py-2 bg-gold text-black text-sm rounded-sm font-medium hover:bg-yellow-400 transition-colors">
                            Add Bank Details
                        </a>
                    </div>
                )
            ) : (
                organiser.stripe_account_id ? (
                    <div className="bg-success/10 border border-success/20 rounded-none p-4 mb-6">
                        <p className="text-success text-sm">✓ Stripe account connected — automatic payouts enabled</p>
                    </div>
                ) : (
                    <div className="bg-gold/10 border border-gold/30 rounded-none p-4 mb-6 flex items-center justify-between">
                        <div>
                            <p className="text-gold text-sm font-medium">Connect your Stripe account to receive payouts</p>
                            <p className="text-muted text-xs mt-0.5">Required for automatic Stripe payouts</p>
                        </div>
                        <a href="/api/stripe/connect" className="px-4 py-2 bg-gold text-black text-sm rounded-sm font-medium hover:bg-yellow-400 transition-colors">
                            Connect with Stripe
                        </a>
                    </div>
                )
            )}

            {/* Payouts table — simplified */}
            <div className="bg-card border border-border rounded-none p-6">
                <h2 className="text-sm font-medium text-text mb-4">Payout History</h2>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border">
                            {['Event', 'Amount', 'Status', 'Date'].map(h => (
                                <th key={h} className="text-left text-xs text-muted pb-3 font-normal pr-4">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {payouts.length === 0 && (
                            <tr><td colSpan={4} className="text-center text-muted text-xs py-12">No payouts yet</td></tr>
                        )}
                        {payouts.map(p => (
                            <tr key={p.id} className="border-b border-border/50">
                                <td className="py-3 pr-4 text-text text-xs max-w-[200px] truncate">
                                    {p.event?.title || '—'}
                                </td>
                                <td className="py-3 pr-4 text-text text-xs font-medium">{formatPence(p.net_pence || 0)}</td>
                                <td className="py-3 pr-4">
                                    <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[p.status] || 'text-muted border-border'}`}>
                                        {STATUS_LABELS[p.status] || p.status}
                                    </span>
                                </td>
                                <td className="py-3 text-muted text-xs">{getDate(p)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
