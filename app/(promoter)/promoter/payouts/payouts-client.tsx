'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatPence } from '@/lib/fees'

interface HistoryRow {
    id: string
    gross_pence: number
    net_pence: number
    status: string
    requested_at: string | null
    paid_at: string | null
    created_at: string
    payout_method: string | null
    reference: string | null
}

interface Props {
    availablePence: number
    totalEarnedPence: number
    totalPaidPence: number
    thisMonthPence: number
    payoutMethod: string | null
    history: HistoryRow[]
}

const STATUS_BADGE: Record<string, string> = {
    pending: 'text-muted bg-border',
    requested: 'text-warm-yellowText bg-warm-yellow/15',
    processing: 'text-blue-600 bg-blue-500/10',
    paid: 'text-warm-green bg-warm-green/10',
    failed: 'text-accent bg-accent/10',
}

function fmtDate(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function PayoutsClient({
    availablePence, totalEarnedPence, totalPaidPence, thisMonthPence, payoutMethod, history,
}: Props) {
    const router = useRouter()
    const [submitting, setSubmitting] = useState(false)
    const [toast, setToast] = useState<string | null>(null)

    function showToast(msg: string) {
        setToast(msg)
        setTimeout(() => setToast(null), 3000)
    }

    async function handleRequest() {
        if (!payoutMethod) {
            showToast('Set up your payout method in Settings first.')
            return
        }
        if (availablePence <= 0) return
        setSubmitting(true)
        const res = await fetch('/api/promoter/payouts/request-withdrawal', { method: 'POST' })
        const json = await res.json().catch(() => ({}))
        setSubmitting(false)
        if (!res.ok) {
            showToast(json.error || 'Failed to submit request')
            return
        }
        showToast(`Request submitted: ${formatPence(json.totalRequested || 0)}`)
        router.refresh()
    }

    return (
        <div className="max-w-7xl">
            {toast && (
                <div className="fixed top-4 right-4 z-50 bg-card border border-border shadow-hover text-text px-4 py-3 rounded-xl text-sm font-semibold">{toast}</div>
            )}

            <div className="mb-6">
                <h1 className="font-heading text-4xl tracking-wide">PAYOUTS</h1>
                <p className="text-muted text-sm mt-1">Request your available commission and track past payouts.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
                {/* Available balance — hero card */}
                <div className="lg:col-span-2 bg-gradient-to-br from-accent to-warm-orange rounded-2xl shadow-glow p-7 text-white relative overflow-hidden">
                    <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
                    <p className="text-xs uppercase tracking-wider opacity-90 mb-2 relative">Available balance</p>
                    <p className="font-heading text-6xl mb-5 relative">{formatPence(availablePence)}</p>
                    <button
                        onClick={handleRequest}
                        disabled={submitting || availablePence <= 0}
                        className="bg-white text-text font-bold text-sm px-6 py-3 rounded-full hover:bg-white/90 transition relative disabled:opacity-60"
                    >
                        {submitting ? 'Requesting…' : 'Request payout →'}
                    </button>
                    <p className="text-xs mt-3 opacity-90 relative">
                        {payoutMethod
                            ? `${payoutMethod === 'bank_transfer' ? 'Bank transfer' : 'Stripe Connect'} · 2–5 business days`
                            : 'Set a payout method in Settings to request a withdrawal'}
                    </p>
                </div>

                <div className="grid grid-cols-3 lg:grid-cols-1 gap-5">
                    <div className="bg-card rounded-2xl shadow-card p-5">
                        <p className="text-xs text-muted uppercase tracking-wider mb-1">Total earned</p>
                        <p className="font-heading text-3xl">{formatPence(totalEarnedPence)}</p>
                    </div>
                    <div className="bg-card rounded-2xl shadow-card p-5">
                        <p className="text-xs text-muted uppercase tracking-wider mb-1">Total paid out</p>
                        <p className="font-heading text-3xl text-warm-green">{formatPence(totalPaidPence)}</p>
                    </div>
                    <div className="bg-card rounded-2xl shadow-card p-5">
                        <p className="text-xs text-muted uppercase tracking-wider mb-1">This month</p>
                        <p className="font-heading text-3xl">{formatPence(thisMonthPence)}</p>
                    </div>
                </div>
            </div>

            <div className="bg-card rounded-2xl shadow-card overflow-x-auto">
                <div className="px-6 py-4 border-b border-border">
                    <h2 className="text-sm font-semibold">Payout history</h2>
                    <p className="text-xs text-muted">Your commission payouts</p>
                </div>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-xs text-muted uppercase tracking-wider border-b border-border">
                            {['Reference', 'Amount', 'Method', 'Status', 'Requested', 'Paid'].map((h, i) => (
                                <th key={h} className={`font-medium py-3 ${i === 0 || i === 5 ? 'px-6' : 'px-4'}`}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {history.length === 0 && (
                            <tr><td colSpan={6} className="text-center text-muted text-xs py-12">No payouts yet</td></tr>
                        )}
                        {history.map(p => (
                            <tr key={p.id} className="border-b border-border last:border-0 hover:bg-background/60 transition-colors">
                                <td className="py-3.5 px-6 font-mono text-xs text-accent">{p.reference || p.id.slice(0, 8).toUpperCase()}</td>
                                <td className="py-3.5 px-4 font-semibold text-warm-green">{formatPence(p.net_pence)}</td>
                                <td className="py-3.5 px-4 text-xs">{p.payout_method === 'bank_transfer' ? 'Bank transfer' : p.payout_method === 'stripe_connect' ? 'Stripe' : '—'}</td>
                                <td className="py-3.5 px-4">
                                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_BADGE[p.status] || STATUS_BADGE.pending}`}>
                                        {p.status}
                                    </span>
                                </td>
                                <td className="py-3.5 px-4 text-xs text-muted whitespace-nowrap">{fmtDate(p.requested_at)}</td>
                                <td className="py-3.5 px-6 text-xs text-muted whitespace-nowrap">{fmtDate(p.paid_at)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
