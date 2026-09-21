import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatPence } from '@/lib/fees'
import { getEventSettlement, isUuid, type SettlementBooking, type SettlementRoute } from '@/lib/event-settlement'
import { CopyId } from './copy-id'

// Live Stripe lookups — never serve a cached copy of financial data.
export const dynamic = 'force-dynamic'

const ROUTE_LABEL: Record<SettlementRoute, string> = {
    destination: 'Connect',
    transfer: 'Transfer',
    direct: 'Direct',
    platform: 'Platform',
    free: 'Free',
    unknown: '—',
}

const STRIPE = 'https://dashboard.stripe.com'

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })

export default async function AdminEventSettlementPage({ params }: { params: { id: string } }) {
    // 1. Auth
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    // 2. Authorization — the layout checks this too, but layouts don't re-run on
    // client-side navigation and this page exposes fees and Stripe data.
    const adminClient = createAdminClient()
    const { data: profile, error: profileError } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
    if (profileError || profile?.role !== 'admin') redirect('/')

    // 3. Input validation
    if (!isUuid(params.id)) notFound()

    const s = await getEventSettlement(params.id)
    if (!s) notFound()

    const { totals } = s
    const pctSettled = totals.owedPence > 0 ? Math.min(100, Math.round((totals.receivedPence / totals.owedPence) * 100)) : 0
    const errors = s.issues.filter(i => i.severity === 'error')
    const warnings = s.issues.filter(i => i.severity === 'warn')
    const totalBookings = s.settled.length + s.held.length
    const sum = (rows: SettlementBooking[], pick: (b: SettlementBooking) => number) => rows.reduce((t, b) => t + pick(b), 0)

    return (
        <div className="max-w-7xl">
            <Link href="/admin/payouts" className="text-xs text-muted hover:text-text">← Payouts</Link>

            {/* Header */}
            <div className="mt-3 mb-6">
                <h1 className="font-heading text-4xl text-text tracking-wide uppercase">{s.event.title}</h1>
                <p className="text-muted text-sm mt-1">Settlement &middot; {s.organiser.name}</p>
                <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
                    <div>
                        <dt className="text-[11px] uppercase tracking-wider text-muted">Event</dt>
                        <dd className="text-text">{fmtDate(s.event.startAt)} UTC &middot; {s.event.status}</dd>
                    </div>
                    <div>
                        <dt className="text-[11px] uppercase tracking-wider text-muted">Bookings / tickets</dt>
                        <dd className="text-text">{totalBookings} / {s.ticketCount ?? '—'}</dd>
                    </div>
                    <div>
                        <dt className="text-[11px] uppercase tracking-wider text-muted">Payout method</dt>
                        <dd className="text-text">{s.organiser.payoutMethod ?? '—'}</dd>
                    </div>
                    <div>
                        <dt className="text-[11px] uppercase tracking-wider text-muted">Connect account</dt>
                        <dd>
                            {s.organiser.stripeAccountId
                                ? <CopyId value={s.organiser.stripeAccountId} href={`${STRIPE}/connect/accounts/${s.organiser.stripeAccountId}`} />
                                : <span className="text-muted">None</span>}
                        </dd>
                    </div>
                </dl>
            </div>

            {/* Integrity checks */}
            {s.issues.length === 0 ? (
                <div className="border border-success/30 bg-card px-4 py-3 mb-6 text-sm text-success">
                    ✓ All checks passed — every booking&rsquo;s routing in Stripe matches its payout flag, and the payout rows add up.
                </div>
            ) : (
                <div className={`border bg-card px-4 py-3 mb-6 ${errors.length ? 'border-accent/50' : 'border-gold/40'}`}>
                    <p className={`text-sm font-medium ${errors.length ? 'text-accent' : 'text-gold'}`}>
                        {errors.length > 0 && `${errors.length} problem${errors.length === 1 ? '' : 's'} need attention`}
                        {errors.length > 0 && warnings.length > 0 && ' · '}
                        {warnings.length > 0 && `${warnings.length} warning${warnings.length === 1 ? '' : 's'}`}
                    </p>
                    <ul className="mt-2 space-y-1.5 text-sm text-text">
                        {[...errors, ...warnings].map((i, idx) => (
                            <li key={idx} className="flex gap-2">
                                <span className={i.severity === 'error' ? 'text-accent' : 'text-gold'}>{i.severity === 'error' ? '✕' : '!'}</span>
                                <span>
                                    {i.bookingRef && <span className="font-mono text-[12px] mr-1.5">{i.bookingRef}</span>}
                                    {i.message}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <div className="bg-card border border-border p-4">
                    <p className="text-[11px] uppercase tracking-wider text-muted">Buyers paid</p>
                    <p className="font-heading text-3xl text-text mt-1">{formatPence(totals.buyersPaidPence)}</p>
                    <p className="text-xs text-muted mt-1">Matches &ldquo;Gross Sales&rdquo;</p>
                </div>
                <div className="bg-card border border-border p-4">
                    <p className="text-[11px] uppercase tracking-wider text-muted">Owed to organiser</p>
                    <p className="font-heading text-3xl text-text mt-1">{formatPence(totals.owedPence)}</p>
                    <p className="text-xs text-muted mt-1">100% of ticket price</p>
                </div>
                <div className="bg-card border border-border p-4">
                    <p className="text-[11px] uppercase tracking-wider text-muted">Already received</p>
                    <p className="font-heading text-3xl text-success mt-1">{formatPence(totals.receivedPence)}</p>
                    <p className="text-xs text-muted mt-1">{s.settled.length} booking{s.settled.length === 1 ? '' : 's'} settled via Stripe</p>
                </div>
                <div className="bg-card border border-accent p-4">
                    <p className="text-[11px] uppercase tracking-wider text-accent">Still to pay</p>
                    <p className="font-heading text-3xl text-accent mt-1">{formatPence(totals.duePence)}</p>
                    <p className="text-xs text-muted mt-1">{s.held.length} booking{s.held.length === 1 ? '' : 's'} held by platform</p>
                </div>
            </div>

            {/* Progress + fee split */}
            <div className="grid lg:grid-cols-3 gap-3 mb-8">
                <div className="lg:col-span-2 bg-card border border-border p-4">
                    <div className="flex items-baseline justify-between mb-2">
                        <h2 className="text-[11px] uppercase tracking-wider text-muted">Settlement progress</h2>
                        <p className="text-sm font-medium text-text">{pctSettled}% settled</p>
                    </div>
                    <div className="h-3 bg-border flex" role="img" aria-label={`${pctSettled}% of ticket revenue already paid to the organiser`}>
                        <div className="bg-success h-full" style={{ width: `${pctSettled}%` }} />
                        <div className="bg-accent h-full" style={{ width: `${100 - pctSettled}%` }} />
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-xs text-muted">
                        <span><span className="inline-block w-2 h-2 bg-success mr-1.5" />Paid {formatPence(totals.receivedPence)}</span>
                        <span><span className="inline-block w-2 h-2 bg-accent mr-1.5" />Held {formatPence(totals.duePence)}</span>
                    </div>
                    {s.excluded.length > 0 && (
                        <p className="text-xs text-muted mt-3">
                            Not counted: {s.excluded.map(e => `${e.count} ${e.status}`).join(', ')}.
                        </p>
                    )}
                </div>
                <div className="bg-card border border-border p-4">
                    <h2 className="text-[11px] uppercase tracking-wider text-muted mb-2">Where the money went</h2>
                    <dl className="text-sm space-y-1.5">
                        <div className="flex justify-between"><dt className="text-muted">Ticket revenue</dt><dd className="text-text">{formatPence(totals.owedPence)}</dd></div>
                        <div className="flex justify-between"><dt className="text-muted">Booking fees</dt><dd className="text-text">{formatPence(totals.bookingFeesPence)}</dd></div>
                        <div className="flex justify-between"><dt className="text-muted">Processing fees</dt><dd className="text-text">{formatPence(totals.processingFeesPence)}</dd></div>
                        <div className="flex justify-between border-t border-border pt-1.5 font-medium"><dt className="text-text">Buyers paid</dt><dd className="text-text">{formatPence(totals.buyersPaidPence)}</dd></div>
                        <div className="flex justify-between font-medium"><dt className="text-accent">Platform revenue</dt><dd className="text-accent">{formatPence(totals.bookingFeesPence + totals.processingFeesPence)}</dd></div>
                    </dl>
                </div>
            </div>

            {/* Payout rows */}
            <section className="mb-8">
                <h2 className="text-sm font-medium text-text mb-2">Payout rows ({s.payouts.length})</h2>
                <div className="bg-card border border-border overflow-x-auto">
                    <table className="w-full text-sm min-w-[720px]">
                        <thead>
                            <tr className="text-left text-[11px] uppercase tracking-wider text-muted border-b border-border">
                                <th className="py-2.5 px-4 font-medium">Status</th>
                                <th className="py-2.5 px-3 font-medium text-right">Amount</th>
                                <th className="py-2.5 px-3 font-medium">Reference</th>
                                <th className="py-2.5 px-3 font-medium">Created</th>
                                <th className="py-2.5 px-3 font-medium">Requested</th>
                                <th className="py-2.5 px-4 font-medium">Paid</th>
                            </tr>
                        </thead>
                        <tbody>
                            {s.payouts.length === 0 && (
                                <tr><td colSpan={6} className="py-4 px-4 text-muted text-sm">No payout rows yet.</td></tr>
                            )}
                            {s.payouts.map(p => (
                                <tr key={p.id} className="border-b border-border last:border-0">
                                    <td className="py-2.5 px-4 text-text">{p.status}</td>
                                    <td className="py-2.5 px-3 text-right text-text">{formatPence(p.netPence)}</td>
                                    <td className="py-2.5 px-3 text-muted text-xs">{p.reference ?? '—'}</td>
                                    <td className="py-2.5 px-3 text-muted text-xs whitespace-nowrap">{fmtDate(p.createdAt)}</td>
                                    <td className="py-2.5 px-3 text-muted text-xs whitespace-nowrap">{p.requestedAt ? fmtDate(p.requestedAt) : '—'}</td>
                                    <td className="py-2.5 px-4 text-muted text-xs whitespace-nowrap">{p.paidAt ? fmtDate(p.paidAt) : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className="text-xs text-muted mt-2">
                    Two rows for one event is normal when charges were routed differently: a <b>paid</b> record for bookings already settled via Connect, and a separate row for bookings still held by the platform.
                </p>
            </section>

            {/* Settled */}
            <BookingsTable
                title="Settled via Stripe"
                subtitle="Funds already sent to the organiser's connected account"
                rows={s.settled}
                settled
                totals={{
                    ticket: sum(s.settled, b => b.ticketPence),
                    bookingFee: sum(s.settled, b => b.bookingFeePence),
                    processingFee: sum(s.settled, b => b.processingFeePence),
                    paid: sum(s.settled, b => b.totalPence),
                    transferred: sum(s.settled, b => b.transferredPence ?? 0),
                    appFee: sum(s.settled, b => b.appFeePence ?? 0),
                    received: sum(s.settled, b => b.receivedPence ?? 0),
                }}
            />

            {/* Held */}
            <BookingsTable
                title="Held by the platform"
                subtitle="Still owed to the organiser"
                rows={s.held}
                settled={false}
                totals={{
                    ticket: sum(s.held, b => b.ticketPence),
                    bookingFee: sum(s.held, b => b.bookingFeePence),
                    processingFee: sum(s.held, b => b.processingFeePence),
                    paid: sum(s.held, b => b.totalPence),
                    transferred: 0,
                    appFee: 0,
                    received: 0,
                }}
            />

            <p className="text-xs text-muted mb-8">
                Live from Stripe and the database at {new Date().toLocaleString('en-GB', { timeZone: 'UTC' })} UTC. PaymentIntent and charge IDs are on the platform account; transfers also appear on the organiser&rsquo;s connected account. Click an ID to copy it.
            </p>
        </div>
    )
}

function BookingsTable({
    title,
    subtitle,
    rows,
    settled,
    totals,
}: {
    title: string
    subtitle: string
    rows: SettlementBooking[]
    settled: boolean
    totals: { ticket: number; bookingFee: number; processingFee: number; paid: number; transferred: number; appFee: number; received: number }
}) {
    const cols = settled ? 13 : 9
    return (
        <section className="mb-8">
            <div className="flex flex-wrap items-baseline gap-x-3 mb-2">
                <h2 className="text-sm font-medium text-text">{title} ({rows.length})</h2>
                <p className="text-xs text-muted">{subtitle}</p>
            </div>
            <div className="bg-card border border-border overflow-x-auto">
                <table className={`w-full text-sm ${settled ? 'min-w-[1400px]' : 'min-w-[980px]'}`}>
                    <thead>
                        <tr className="text-left text-[11px] uppercase tracking-wider text-muted border-b border-border">
                            <th className="py-2.5 px-4 font-medium">Ref</th>
                            <th className="py-2.5 px-3 font-medium">Date (UTC)</th>
                            <th className="py-2.5 px-3 font-medium">Route</th>
                            <th className="py-2.5 px-3 font-medium text-right">Ticket</th>
                            <th className="py-2.5 px-3 font-medium text-right">Booking fee</th>
                            <th className="py-2.5 px-3 font-medium text-right">Proc. fee</th>
                            <th className="py-2.5 px-3 font-medium text-right">Buyer paid</th>
                            {settled && (
                                <>
                                    <th className="py-2.5 px-3 font-medium text-right">Transferred</th>
                                    <th className="py-2.5 px-3 font-medium text-right">App fee</th>
                                    <th className="py-2.5 px-3 font-medium text-right">Net to organiser</th>
                                </>
                            )}
                            <th className="py-2.5 px-3 font-medium">PaymentIntent</th>
                            <th className="py-2.5 px-3 font-medium">Charge</th>
                            {settled && <th className="py-2.5 px-4 font-medium">Transfer</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 && (
                            <tr><td colSpan={cols} className="py-4 px-4 text-muted text-sm">No bookings.</td></tr>
                        )}
                        {rows.map(b => (
                            <tr key={b.id} className="border-b border-border last:border-0 align-top">
                                <td className="py-2.5 px-4 font-mono text-[12px] text-text whitespace-nowrap">{b.ref}</td>
                                <td className="py-2.5 px-3 text-muted text-xs whitespace-nowrap">{fmtDate(b.createdAt)}</td>
                                <td className="py-2.5 px-3 text-xs whitespace-nowrap">
                                    {b.stripeError
                                        ? <span className="text-gold">lookup failed</span>
                                        : <span className="text-muted">{ROUTE_LABEL[b.route]}</span>}
                                </td>
                                <td className="py-2.5 px-3 text-right text-text">{formatPence(b.ticketPence)}</td>
                                <td className="py-2.5 px-3 text-right text-muted">{formatPence(b.bookingFeePence)}</td>
                                <td className="py-2.5 px-3 text-right text-muted">{formatPence(b.processingFeePence)}</td>
                                <td className="py-2.5 px-3 text-right text-text">{formatPence(b.totalPence)}</td>
                                {settled && (
                                    <>
                                        <td className="py-2.5 px-3 text-right text-text">{b.transferredPence === null ? '—' : formatPence(b.transferredPence)}</td>
                                        <td className="py-2.5 px-3 text-right text-accent">{b.appFeePence === null ? '—' : `−${formatPence(b.appFeePence)}`}</td>
                                        <td className="py-2.5 px-3 text-right font-medium text-success">{b.receivedPence === null ? '—' : formatPence(b.receivedPence)}</td>
                                    </>
                                )}
                                <td className="py-2.5 px-3">
                                    {b.paymentIntentId ? <CopyId value={b.paymentIntentId} href={`${STRIPE}/payments/${b.paymentIntentId}`} /> : <span className="text-muted">—</span>}
                                </td>
                                <td className="py-2.5 px-3">
                                    {b.chargeId ? <CopyId value={b.chargeId} /> : <span className="text-muted">—</span>}
                                </td>
                                {settled && (
                                    <td className="py-2.5 px-4">
                                        {b.transferIds.length === 0
                                            ? <span className="text-muted">—</span>
                                            : b.transferIds.map(id => (
                                                <div key={id}><CopyId value={id} href={`${STRIPE}/connect/transfers/${id}`} /></div>
                                            ))}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                    {rows.length > 0 && (
                        <tfoot>
                            <tr className="bg-surface font-medium border-t border-border">
                                <td className="py-2.5 px-4 text-text" colSpan={3}>Total</td>
                                <td className="py-2.5 px-3 text-right text-text">{formatPence(totals.ticket)}</td>
                                <td className="py-2.5 px-3 text-right text-text">{formatPence(totals.bookingFee)}</td>
                                <td className="py-2.5 px-3 text-right text-text">{formatPence(totals.processingFee)}</td>
                                <td className="py-2.5 px-3 text-right text-text">{formatPence(totals.paid)}</td>
                                {settled && (
                                    <>
                                        <td className="py-2.5 px-3 text-right text-text">{formatPence(totals.transferred)}</td>
                                        <td className="py-2.5 px-3 text-right text-accent">−{formatPence(totals.appFee)}</td>
                                        <td className="py-2.5 px-3 text-right text-success">{formatPence(totals.received)}</td>
                                    </>
                                )}
                                <td colSpan={settled ? 3 : 2} />
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </section>
    )
}
