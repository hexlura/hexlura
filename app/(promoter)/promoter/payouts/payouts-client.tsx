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
    pending: 'text-muted bg-muted/10 border-muted/20',
    requested: 'text-gold bg-gold/10 border-gold/20',
    processing: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    paid: 'text-success bg-success/10 border-success/20',
    failed: 'text-accent bg-accent/10 border-accent/20',
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
                <div className="fixed top-4 right-4 z-50 bg-success/20 border border-success/40 text-success px-4 py-2 rounded-none text-sm">{toast}</div>
            )}

            <h1 className="font-heading text-4xl text-text tracking-wide mb-6">PAYOUTS</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
                {/* Available balance — hero card */}
                <div className="lg:col-span-2 bg-accent text-white p-6 relative overflow-hidden">
                    <div className="text-xs uppercase tracking-wider opacity-90 mb-2">Available Balance</div>
                    <div className="font-heading text-5xl mb-4">{formatPence(availablePence)}</div>
                    <button
                        onClick={handleRequest}
                        disabled={submitting || availablePence <= 0}
                        className="bg-white text-accent font-bold px-5 py-2.5 text-sm uppercase tracking-wider hover:bg-white/90 disabled:opacity-50"
                    >
                        {submitting ? 'Requesting…' : 'Request Payout →'}
                    </button>
                    <p className="text-xs mt-3 opacity-80">{payoutMethod ? `${payoutMethod === 'bank_transfer' ? 'Bank transfer' : 'Stripe Connect'} · 2–5 business days` : 'Set a payout method in Settings to request a withdrawal'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 lg:flex lg:flex-col">
                    <div className="bg-card border border-border p-4">
                        <div className="text-xs uppercase tracking-wider text-muted mb-1">Total Earned</div>
                        <div className="font-heading text-2xl text-gold">{formatPence(totalEarnedPence)}</div>
                    </div>
                    <div className="bg-card border border-border p-4">
                        <div className="text-xs uppercase tracking-wider text-muted mb-1">Total Paid Out</div>
                        <div className="font-heading text-2xl text-success">{formatPence(totalPaidPence)}</div>
                    </div>
                    <div className="bg-card border border-border p-4 col-span-2 lg:col-span-1">
                        <div className="text-xs uppercase tracking-wider text-muted mb-1">This Month</div>
                        <div className="font-heading text-2xl text-text">{formatPence(thisMonthPence)}</div>
                    </div>
                </div>
            </div>

            <h2 className="text-sm font-medium text-text mb-1">Payout History</h2>
            <p className="text-xs text-muted mb-4">Your commission payouts</p>

            <div className="bg-card border border-border overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border">
                            {['Reference', 'Amount', 'Method', 'Status', 'Requested', 'Paid'].map(h => (
                                <th key={h} className="text-left text-xs text-muted py-3 px-4 font-normal uppercase tracking-wider">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {history.length === 0 && (
                            <tr><td colSpan={6} className="text-center text-muted text-xs py-12">No payouts yet</td></tr>
                        )}
                        {history.map(p => (
                            <tr key={p.id} className="border-b border-border/50">
                                <td className="py-3 px-4 font-mono text-xs text-accent">{p.reference || p.id.slice(0, 8).toUpperCase()}</td>
                                <td className="py-3 px-4 text-success font-medium">{formatPence(p.net_pence)}</td>
                                <td className="py-3 px-4 text-xs text-text">{p.payout_method === 'bank_transfer' ? 'Bank Transfer' : p.payout_method === 'stripe_connect' ? 'Stripe' : '—'}</td>
                                <td className="py-3 px-4">
                                    <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_BADGE[p.status] || STATUS_BADGE.pending}`}>
                                        {p.status}
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-xs text-muted whitespace-nowrap">{fmtDate(p.requested_at)}</td>
                                <td className="py-3 px-4 text-xs text-muted whitespace-nowrap">{fmtDate(p.paid_at)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
