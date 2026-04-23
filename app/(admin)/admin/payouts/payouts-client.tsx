'use client'

import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { formatPence } from '@/lib/fees'

interface PayoutRow {
    id: string
    gross_pence: number | null
    net_pence: number | null
    fee_pence?: number | null
    status: string
    scheduled_at: string | null
    requested_at: string | null
    paid_at: string | null
    stripe_transfer_id?: string | null
    created_at: string
    organiser_id: string
    event_id: string | null
    organiser_profiles: {
        org_name: string
        payout_method?: string
        bank_account_name?: string | null
        bank_sort_code?: string | null
        bank_account_number?: string | null
        stripe_account_id?: string | null
        profiles?: { full_name: string | null; email: string | null } | null
    } | null
    events: { title: string; end_at?: string | null; start_at?: string } | null
}

interface Props {
    duePayouts: PayoutRow[]
    allPayouts: PayoutRow[]
    totalRows: number
    page: number
    pageSize: number
}

const STATUS_BADGE: Record<string, string> = {
    pending: 'text-gold bg-gold/10 border-gold/20',
    requested: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    processing: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    paid: 'text-success bg-success/10 border-success/20',
    failed: 'text-accent bg-accent/10 border-accent/20',
}

function fmt(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function PayoutsClient({ duePayouts, allPayouts, totalRows, page, pageSize }: Props) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [confirmModal, setConfirmModal] = useState<PayoutRow | null>(null)
    const [bankModal, setBankModal] = useState<PayoutRow | null>(null)
    const [statusModal, setStatusModal] = useState<PayoutRow | null>(null)
    const [selectedStatus, setSelectedStatus] = useState('')
    const [processingAll, setProcessingAll] = useState(false)
    const [processProgress, setProcessProgress] = useState<{ current: number; total: number } | null>(null)
    const [loading, setLoading] = useState<string | null>(null)
    const [toastMsg, setToastMsg] = useState<string | null>(null)

    function showToast(msg: string) {
        setToastMsg(msg)
        setTimeout(() => setToastMsg(null), 4000)
    }

    function updateParam(key: string, value: string) {
        const params = new URLSearchParams(searchParams.toString())
        if (value) params.set(key, value)
        else params.delete(key)
        params.delete('page')
        router.push(`${pathname}?${params.toString()}`)
    }

    async function handleProcessPayout(payout: PayoutRow) {
        setLoading(payout.id)
        const res = await fetch(`/api/admin/payouts/${payout.id}/process`, { method: 'POST' })
        setLoading(null)
        if (res.ok) {
            showToast(`Payout of ${formatPence(payout.net_pence || 0)} processed`)
            setConfirmModal(null)
            router.refresh()
        } else {
            showToast('Failed to process payout')
        }
    }

    async function handleProcessAll() {
        setProcessingAll(true)
        setProcessProgress({ current: 0, total: duePayouts.length })
        for (let i = 0; i < duePayouts.length; i++) {
            setProcessProgress({ current: i + 1, total: duePayouts.length })
            await fetch(`/api/admin/payouts/${duePayouts[i].id}/process`, { method: 'POST' })
        }
        const totalNet = duePayouts.reduce((s, p) => s + (p.net_pence || 0), 0)
        setProcessingAll(false)
        setProcessProgress(null)
        showToast(`${duePayouts.length} payouts processed — ${formatPence(totalNet)} sent`)
        router.refresh()
    }

    async function handleStatusChange() {
        if (!statusModal || !selectedStatus) return
        setLoading(statusModal.id)
        const res = await fetch(`/api/admin/payouts/${statusModal.id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: selectedStatus }),
        })
        setLoading(null)
        if (res.ok) {
            showToast(`Status updated to "${selectedStatus}"`)
            setStatusModal(null)
            setSelectedStatus('')
            router.refresh()
        } else {
            showToast('Failed to update status')
        }
    }

    const totalPages = Math.ceil(totalRows / pageSize)

    return (
        <div className="max-w-7xl">
            {toastMsg && (
                <div className="fixed top-4 right-4 z-50 bg-success/20 border border-success/40 text-success px-4 py-2 rounded-none text-sm">
                    {toastMsg}
                </div>
            )}

            <div className="mb-8">
                <h1 className="font-heading text-4xl text-text tracking-wide">PAYOUTS</h1>
                <p className="text-muted text-sm mt-1">Process organiser payouts</p>
            </div>

            {/* Due Payouts */}
            {duePayouts.length > 0 && (
                <div className="bg-amber-50 border border-gold/30 rounded-none p-6 mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-sm font-medium text-gold">Payouts Due</h2>
                            <p className="text-xs text-gold/60 mt-0.5">{duePayouts.length} payout{duePayouts.length !== 1 ? 's' : ''} ready to process</p>
                        </div>
                        <Button
                            variant="primary"
                            size="md"
                            onClick={handleProcessAll}
                            disabled={processingAll}
                            className="bg-gold hover:bg-gold/80 border-gold text-black"
                        >
                            {processingAll
                                ? processProgress
                                    ? `Processing ${processProgress.current} of ${processProgress.total}...`
                                    : 'Processing...'
                                : `Process All Due (${duePayouts.length})`
                            }
                        </Button>
                    </div>
                    <div className="flex flex-col gap-3">
                        {duePayouts.map(p => (
                            <div key={p.id} className="flex items-center justify-between bg-card rounded-none px-4 py-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm text-text font-medium">{p.organiser_profiles?.org_name ?? '—'}</p>
                                        {p.status === 'requested' && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-400/20 font-medium">
                                                Withdrawal Requested
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted">{p.events?.title ?? '—'}</p>
                                    <p className="text-xs text-muted">Amount: {formatPence(p.net_pence || 0)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setBankModal(p)}
                                        className="text-xs text-muted hover:text-text px-2 py-1 border border-border rounded-sm transition-colors"
                                    >
                                        Bank Details
                                    </button>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={() => setConfirmModal(p)}
                                        disabled={loading === p.id}
                                    >
                                        {loading === p.id ? 'Processing...' : 'Process'}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* All Payouts Table */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-text">All Payouts</h2>
                <select
                    defaultValue={searchParams.get('status') ?? ''}
                    onChange={e => updateParam('status', e.target.value)}
                    className="bg-card border border-border rounded-sm px-3 py-2 text-sm text-text focus:outline-none"
                >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="requested">Requested</option>
                    <option value="processing">Processing</option>
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                </select>
            </div>

            <div className="bg-card border border-border rounded-none overflow-hidden mb-4">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border">
                            {['Organiser', 'Event', 'Amount', 'Method', 'Status', 'Date', 'Actions'].map(h => (
                                <th key={h} className="text-left text-xs text-muted py-3 px-4 font-normal">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {allPayouts.length === 0 && (
                            <tr><td colSpan={7} className="text-center text-muted text-xs py-12">No payouts</td></tr>
                        )}
                        {allPayouts.map(p => (
                            <tr key={p.id} className="border-b border-border/50 hover:bg-surface transition-colors">
                                <td className="py-3 px-4 text-text text-sm">{p.organiser_profiles?.org_name ?? '—'}</td>
                                <td className="py-3 px-4 text-muted text-xs max-w-[150px] truncate">{p.events?.title ?? '—'}</td>
                                <td className="py-3 px-4 text-text text-xs font-medium">{formatPence(p.net_pence || 0)}</td>
                                <td className="py-3 px-4">
                                    <span className="text-xs px-2 py-0.5 rounded-full border border-border text-muted">
                                        {p.organiser_profiles?.payout_method === 'stripe_connect' ? 'Stripe' : 'Bank'}
                                    </span>
                                </td>
                                <td className="py-3 px-4">
                                    <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_BADGE[p.status] || STATUS_BADGE.pending}`}>
                                        {p.status}
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-muted text-xs">
                                    {p.paid_at ? fmt(p.paid_at) : p.requested_at ? fmt(p.requested_at) : p.scheduled_at ? fmt(p.scheduled_at) : '—'}
                                </td>
                                <td className="py-3 px-4">
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => setBankModal(p)}
                                            className="text-[11px] text-muted hover:text-text px-2 py-1 border border-border rounded-sm transition-colors"
                                            title="View bank details"
                                        >
                                            Bank
                                        </button>
                                        <button
                                            onClick={() => { setStatusModal(p); setSelectedStatus(p.status) }}
                                            className="text-[11px] text-muted hover:text-text px-2 py-1 border border-border rounded-sm transition-colors"
                                            title="Change status"
                                        >
                                            Status
                                        </button>
                                        {(p.status === 'pending' || p.status === 'requested') && (
                                            <button
                                                onClick={() => setConfirmModal(p)}
                                                disabled={loading === p.id}
                                                className="text-[11px] text-white bg-accent hover:bg-accent/80 px-2 py-1 rounded-sm transition-colors disabled:opacity-50"
                                            >
                                                {loading === p.id ? '...' : 'Process'}
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-xs text-muted">Page {page} of {totalPages}</p>
                    <div className="flex gap-2">
                        <button disabled={page <= 1} onClick={() => updateParam('page', String(page - 1))} className="text-xs px-3 py-1.5 rounded bg-card border border-border text-muted hover:text-text disabled:opacity-40">← Prev</button>
                        <button disabled={page >= totalPages} onClick={() => updateParam('page', String(page + 1))} className="text-xs px-3 py-1.5 rounded bg-card border border-border text-muted hover:text-text disabled:opacity-40">Next →</button>
                    </div>
                </div>
            )}

            {/* Confirm Process Modal */}
            {confirmModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-none p-6 max-w-sm w-full">
                        <h3 className="font-heading text-xl text-text mb-3">Process Payout</h3>
                        <p className="text-sm text-muted mb-2">{confirmModal.organiser_profiles?.org_name}</p>
                        <p className="text-sm text-muted mb-1">Amount: <span className="text-text font-medium">{formatPence(confirmModal.net_pence || 0)}</span></p>
                        <p className="text-sm text-muted mb-4">
                            {confirmModal.organiser_profiles?.payout_method === 'stripe_connect'
                                ? 'This will trigger an automatic Stripe transfer.'
                                : 'Mark as paid after sending the bank transfer manually.'}
                        </p>
                        <div className="flex gap-3">
                            <Button variant="primary" size="md" onClick={() => handleProcessPayout(confirmModal)} disabled={loading === confirmModal.id}>
                                {loading === confirmModal.id ? 'Processing...' : 'Confirm Payout'}
                            </Button>
                            <Button variant="secondary" size="md" onClick={() => setConfirmModal(null)}>Cancel</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bank Details Modal */}
            {bankModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-none p-6 max-w-sm w-full">
                        <h3 className="font-heading text-xl text-text mb-4">Bank Details</h3>
                        <p className="text-sm text-text font-medium mb-3">{bankModal.organiser_profiles?.org_name}</p>
                        {bankModal.organiser_profiles?.payout_method === 'stripe_connect' ? (
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted">Method</span>
                                    <span className="text-text">Stripe Connect</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted">Account ID</span>
                                    <span className="text-text font-mono text-xs">{bankModal.organiser_profiles?.stripe_account_id || '—'}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted">Method</span>
                                    <span className="text-text">Bank Transfer</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted">Account Name</span>
                                    <span className="text-text">{bankModal.organiser_profiles?.bank_account_name || '—'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted">Sort Code</span>
                                    <span className="text-text font-mono">{bankModal.organiser_profiles?.bank_sort_code || '—'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted">Account Number</span>
                                    <span className="text-text font-mono">{bankModal.organiser_profiles?.bank_account_number || '—'}</span>
                                </div>
                            </div>
                        )}
                        <div className="mt-5">
                            <Button variant="secondary" size="md" onClick={() => setBankModal(null)} className="w-full">Close</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Change Status Modal */}
            {statusModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-none p-6 max-w-sm w-full">
                        <h3 className="font-heading text-xl text-text mb-3">Change Payout Status</h3>
                        <p className="text-sm text-muted mb-1">{statusModal.organiser_profiles?.org_name}</p>
                        <p className="text-sm text-muted mb-4">Amount: {formatPence(statusModal.net_pence || 0)}</p>
                        <div className="mb-4">
                            <label className="text-xs text-muted block mb-1.5">New Status</label>
                            <select
                                value={selectedStatus}
                                onChange={e => setSelectedStatus(e.target.value)}
                                className="w-full bg-surface border border-border rounded-sm px-3 py-2 text-sm text-text focus:outline-none"
                            >
                                <option value="pending">Pending</option>
                                <option value="requested">Requested</option>
                                <option value="processing">Processing</option>
                                <option value="paid">Paid</option>
                                <option value="failed">Failed</option>
                            </select>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                variant="primary"
                                size="md"
                                onClick={handleStatusChange}
                                disabled={loading === statusModal.id || selectedStatus === statusModal.status}
                            >
                                {loading === statusModal.id ? 'Updating...' : 'Update Status'}
                            </Button>
                            <Button variant="secondary" size="md" onClick={() => { setStatusModal(null); setSelectedStatus('') }}>Cancel</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
