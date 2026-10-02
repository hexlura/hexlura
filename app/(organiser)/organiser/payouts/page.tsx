import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { formatPence } from '@/lib/fees'
import { resolveOrganiserId } from '@/lib/organiser-access'
import { generatePayoutsForOrganiser } from '@/lib/generate-payouts'
import { WithdrawButton } from './payouts-client'

const PAGE_SIZE = 1000

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
    pending: { label: 'Available', cls: 'text-warm-yellowText bg-warm-yellow/10' },
    requested: { label: 'Requested', cls: 'text-warm-orangeText bg-warm-orange/10' },
    processing: { label: 'Processing', cls: 'text-warm-orangeText bg-warm-orange/10' },
    paid: { label: 'Paid', cls: 'text-warm-green bg-warm-green/10' },
    failed: { label: 'Failed', cls: 'text-warm-red bg-warm-red/10' },
}

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

function Banner({ title, hint, href, cta }: { title: string; hint?: string; href: string; cta: string }) {
    return (
        <div className="bg-warm-yellow/10 border border-warm-yellow/30 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-warm-yellow/20 flex items-center justify-center text-warm-yellowText shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
                </span>
                <div>
                    <p className="text-sm font-medium">{title}</p>
                    {hint && <p className="text-xs text-muted mt-0.5">{hint}</p>}
                </div>
            </div>
            <a href={href} className="bg-text text-white px-4 py-2 rounded-xl text-xs font-semibold shrink-0 text-center">{cta}</a>
        </div>
    )
}

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
        .select('id, stripe_account_id, payout_method, bank_account_number, identity_status')
        .eq('id', organiserId)
        .single()
    if (!organiser) redirect('/organiser/pending')

    const identityVerified = organiser.identity_status === 'verified'

    const { data: payoutsData, error: payoutsErr } = await serviceClient
        .from('payouts')
        .select('id, net_pence, status, requested_at, paid_at, reference, created_at, event:events(title)')
        .eq('organiser_id', organiserId)
        .order('created_at', { ascending: false })
    if (payoutsErr) throw payoutsErr

    const payouts = (payoutsData || []) as unknown as {
        id: string; net_pence: number | null;
        status: string; requested_at: string | null; paid_at: string | null; reference: string | null; created_at: string;
        event: { title?: string } | null
    }[]

    const pendingBalance = payouts
        .filter(p => p.status === 'pending')
        .reduce((s, p) => s + (p.net_pence || 0), 0)

    const requestedBalance = payouts
        .filter(p => p.status === 'requested')
        .reduce((s, p) => s + (p.net_pence || 0), 0)

    const hasPayoutMethod =
        (organiser.payout_method === 'stripe_connect' && !!organiser.stripe_account_id) ||
        (organiser.payout_method === 'bank_transfer' && !!organiser.bank_account_number)

    const canRequestWithdrawal = hasPayoutMethod && identityVerified

    // Stripe Connect is the standard route: earnings settle at the time of sale, so there is nothing to withdraw.
    // The balance / withdrawal / payout-history sections only appear for organisers who still have old payouts
    // (or a bank-transfer setup) from the previous system.
    const connectReady = organiser.payout_method !== 'bank_transfer' && !!organiser.stripe_account_id
    const showLegacyPayouts = payouts.length > 0 || organiser.payout_method === 'bank_transfer'

    // ── Earnings: ticket revenue from confirmed bookings, net of promo-code discounts ──
    const { data: events, error: eventsErr } = await serviceClient
        .from('events')
        .select('id, title')
        .eq('organiser_id', organiserId)
    if (eventsErr) throw eventsErr
    const eventTitle = new Map((events || []).map(e => [e.id as string, e.title as string]))
    const eventIds = Array.from(eventTitle.keys())

    type BookingRow = { booking_ref: string; event_id: string; ticket_subtotal_pence: number | null; discount_pence: number | null; created_at: string }
    const bookings: BookingRow[] = []
    if (eventIds.length > 0) {
        for (let from = 0; ; from += PAGE_SIZE) {
            const { data, error } = await serviceClient
                .from('bookings')
                .select('booking_ref, event_id, ticket_subtotal_pence, discount_pence, created_at')
                .in('event_id', eventIds)
                .eq('status', 'confirmed')
                .order('created_at', { ascending: false })
                .range(from, from + PAGE_SIZE - 1)
            if (error) throw error
            bookings.push(...((data || []) as BookingRow[]))
            if (!data || data.length < PAGE_SIZE) break
        }
    }
    const net = (b: BookingRow) => (b.ticket_subtotal_pence || 0) - (b.discount_pence || 0)

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000)
    const thisMonth = bookings.filter(b => new Date(b.created_at) >= monthStart)
    const last30 = bookings.filter(b => new Date(b.created_at) >= thirtyDaysAgo)
    const thisMonthPence = thisMonth.reduce((s, b) => s + net(b), 0)
    const last30Pence = last30.reduce((s, b) => s + net(b), 0)
    const totalPence = bookings.reduce((s, b) => s + net(b), 0)
    const recentEarnings = bookings.slice(0, 15)

    const cardLabel = 'text-xs text-muted uppercase tracking-wider mb-2'

    return (
        <div className="max-w-7xl">
            <div className="mb-6">
                <h1 className="font-heading text-4xl tracking-wide">PAYOUTS</h1>
                <p className="text-muted text-sm mt-1">
                    {connectReady && !showLegacyPayouts
                        ? 'Your earnings settle to your Stripe account the moment a ticket sells'
                        : 'Your earnings and payout history'}
                </p>
            </div>

            {/* Action-needed banners */}
            {!identityVerified && (
                <Banner
                    title={
                        organiser.identity_status === 'processing'
                            ? 'Identity verification in progress'
                            : organiser.identity_status === 'requires_input'
                                ? 'Identity verification needs another try'
                                : 'Verify your identity to enable payouts'
                    }
                    hint={
                        organiser.identity_status === 'processing'
                            ? 'Stripe is reviewing your submission. This usually takes a few seconds.'
                            : 'A one-time check is required before any payout can be processed.'
                    }
                    href="/organiser/settings#identity"
                    cta={organiser.identity_status === 'processing' ? 'Check status →' : 'Verify Identity →'}
                />
            )}
            {organiser.payout_method === 'bank_transfer' && !organiser.bank_account_number && (
                <Banner
                    title="Add your bank details to receive payouts"
                    hint="Go to Settings → Payout Method to add your UK bank account"
                    href="/organiser/settings"
                    cta="Add Bank Details →"
                />
            )}
            {organiser.payout_method !== 'bank_transfer' && !organiser.stripe_account_id && (
                <Banner
                    title="Finish setting up Stripe Connect before you can receive payouts."
                    hint="Required for automatic Stripe payouts"
                    href="/api/stripe/connect"
                    cta="Finish on Stripe →"
                />
            )}

            {/* Earnings cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
                <div className="bg-card rounded-2xl shadow-card p-6">
                    <p className={cardLabel}>This Month</p>
                    <p className="font-heading text-4xl">{formatPence(thisMonthPence)}</p>
                    <p className="text-xs text-warm-green mt-2 font-medium">
                        Across {thisMonth.length.toLocaleString()} booking{thisMonth.length === 1 ? '' : 's'}
                    </p>
                </div>
                <div className="bg-card rounded-2xl shadow-card p-6">
                    <p className={cardLabel}>Last 30 Days</p>
                    <p className="font-heading text-4xl">{formatPence(last30Pence)}</p>
                    <p className="text-xs text-muted mt-2 font-medium">Across all events</p>
                </div>
                <div className="bg-gradient-to-br from-accent to-warm-orange rounded-2xl shadow-glow p-6 text-white">
                    <p className={`${cardLabel} !text-white opacity-90`}>Total Earned</p>
                    <p className="font-heading text-4xl">{formatPence(totalPence)}</p>
                    <p className="text-xs font-medium mt-2 opacity-90">
                        {bookings.length.toLocaleString()} booking{bookings.length === 1 ? '' : 's'} · all time
                    </p>
                </div>
            </div>

            {showLegacyPayouts && (
                <>
            {/* Available balance + withdrawal */}
            <div className="bg-card rounded-2xl shadow-card p-6 mb-6">
                <p className={cardLabel}>Available Balance</p>
                <p className="font-heading text-4xl">{formatPence(pendingBalance)}</p>
                <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-background border border-border text-muted">
                        {organiser.payout_method === 'stripe_connect' ? 'Stripe Connect' : 'Bank Transfer'}
                    </span>
                    {organiser.payout_method === 'bank_transfer' && organiser.bank_account_number && (
                        <span className="text-xs text-muted">ending ···· {String(organiser.bank_account_number).slice(-4)}</span>
                    )}
                    {organiser.payout_method === 'stripe_connect' && organiser.stripe_account_id && (
                        <span className="text-xs text-warm-green font-medium">✓ Connected</span>
                    )}
                </div>
                <WithdrawButton pendingBalance={pendingBalance} canRequestWithdrawal={canRequestWithdrawal} />
                {requestedBalance > 0 && (
                    <p className="text-sm text-warm-orangeText bg-warm-orange/10 rounded-xl px-4 py-3 mt-4">
                        Withdrawal of {formatPence(requestedBalance)} requested — awaiting admin processing
                    </p>
                )}
            </div>
                </>
            )}

            <p className="text-xs text-muted mb-4">
                Earnings are ticket revenue from confirmed bookings, after any promo-code discounts.
            </p>

            {/* Earnings history */}
            <div className="bg-card rounded-2xl shadow-card overflow-hidden mb-6">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <h2 className="text-sm font-semibold">Earnings History</h2>
                </div>
                {recentEarnings.length === 0 ? (
                    <p className="text-center text-muted text-sm py-12">No earnings yet</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[520px] text-sm">
                            <thead>
                                <tr className="text-left text-xs text-muted uppercase tracking-wider border-b border-border">
                                    <th className="font-medium py-3 px-6">Event</th>
                                    <th className="font-medium py-3 px-4">Booking Ref</th>
                                    <th className="font-medium py-3 px-4 text-right">Amount</th>
                                    <th className="font-medium py-3 px-6 text-right">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentEarnings.map(b => (
                                    <tr key={b.booking_ref} className="border-b border-border last:border-0 hover:bg-[#FAF6F3]/60 transition-colors">
                                        <td className="py-3.5 px-6 font-medium max-w-[240px] truncate">{eventTitle.get(b.event_id) || '—'}</td>
                                        <td className="py-3.5 px-4 font-mono text-xs text-accent">{b.booking_ref}</td>
                                        <td className="py-3.5 px-4 text-right font-medium">{formatPence(net(b))}</td>
                                        <td className="py-3.5 px-6 text-right text-muted text-xs whitespace-nowrap">{fmtDate(b.created_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showLegacyPayouts && (
                <>
            {/* Payout history */}
            <div className="bg-card rounded-2xl shadow-card overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <h2 className="text-sm font-semibold">Payout History</h2>
                </div>
                {payouts.length === 0 ? (
                    <p className="text-center text-muted text-sm py-12">No payouts yet</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] text-sm">
                            <thead>
                                <tr className="text-left text-xs text-muted uppercase tracking-wider border-b border-border">
                                    <th className="font-medium py-3 px-6">Event</th>
                                    <th className="font-medium py-3 px-4 text-right">Amount</th>
                                    <th className="font-medium py-3 px-4">Status</th>
                                    <th className="font-medium py-3 px-4">Date</th>
                                    <th className="font-medium py-3 px-6 text-right">Invoice</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payouts.map(p => {
                                    const st = STATUS_STYLES[p.status] || { label: p.status, cls: 'text-muted bg-border' }
                                    return (
                                        <tr key={p.id} className="border-b border-border last:border-0 hover:bg-[#FAF6F3]/60 transition-colors">
                                            <td className="py-3.5 px-6 max-w-[240px]">
                                                <p className="font-medium truncate">{p.event?.title || '—'}</p>
                                                {p.status === 'paid' && p.reference && (
                                                    <p className="text-[10px] text-muted font-mono mt-0.5 truncate">Ref: {p.reference}</p>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-right font-medium">{formatPence(p.net_pence || 0)}</td>
                                            <td className="py-3.5 px-4">
                                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${st.cls}`}>{st.label}</span>
                                            </td>
                                            <td className="py-3.5 px-4 text-muted text-xs whitespace-nowrap">{fmtDate(p.paid_at || p.requested_at || p.created_at)}</td>
                                            <td className="py-3.5 px-6 text-right">
                                                <a
                                                    href={`/api/organiser/payouts/${p.id}/invoice`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-accent font-semibold hover:underline whitespace-nowrap"
                                                >
                                                    Download Invoice
                                                </a>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
                </>
            )}
        </div>
    )
}
