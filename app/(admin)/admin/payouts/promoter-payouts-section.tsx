'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { formatPence } from '@/lib/fees'

export interface PromoterPayoutRow {
    id: string
    gross_pence: number
    net_pence: number
    status: string
    requested_at: string | null
    paid_at: string | null
    created_at: string
    payout_method: string | null
    reference: string | null
    promoter_profiles: {
        id: string
        display_name: string
        referral_code: string
        payout_method: string | null
        bank_account_name: string | null
        bank_sort_code: string | null
        bank_account_number: string | null
        stripe_account_id: string | null
    } | null
}

interface Props {
    duePayouts: PromoterPayoutRow[]
    allPayouts: PromoterPayoutRow[]
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

function deriveReference(payoutId: string): string {
    return `HXL-PRM-${payoutId.replace(/-/g, '').slice(0, 8).toUpperCase()}`
}

export function PromoterPayoutsSection({ duePayouts, allPayouts }: Props) {
    const router = useRouter()

    const [confirmModal, setConfirmModal] = useState<PromoterPayoutRow | null>(null)
    const [bankModal, setBankModal] = useState<PromoterPayoutRow | null>(null)
    const [statusModal, setStatusModal] = useState<PromoterPayoutRow | null>(null)
    const [selectedStatus, setSelectedStatus] = useState('')
    const [referenceInput, setReferenceInput] = useState('')
    const [loading, setLoading] = useState<string | null>(null)
    const [toastMsg, setToastMsg] = useState<string | null>(null)

    function showToast(msg: string) {
        setToastMsg(msg)
        setTimeout(() => setToastMsg(null), 4000)
    }

    async function handleProcessPayout(payout: PromoterPayoutRow) {
        setLoading(payout.id)
        const isBankTransfer = (payout.payout_method ?? payout.promoter_profiles?.payout_method) !== 'stripe_connect'
        const ref = isBankTransfer ? (referenceInput.trim() || deriveReference(payout.id)) : undefined
        const res = await fetch(`/api/admin/promoter-payouts/${payout.id}/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ref ? { reference: ref } : {}),
        })
        setLoading(null)
        if (res.ok) {
            showToast(`Promoter payout of ${formatPence(payout.net_pence)} processed`)
            setConfirmModal(null)
            setReferenceInput('')
            router.refresh()
        } else {
            showToast('Failed to process payout')
        }
    }

    async function handleStatusChange() {
        if (!statusModal || !selectedStatus) return
        setLoading(statusModal.id)
        const body: { status: string; reference?: string } = { status: selectedStatus }
        if (selectedStatus === 'paid') {
            body.reference = referenceInput.trim() || deriveReference(statusModal.id)
        }
        const res = await fetch(`/api/admin/promoter-payouts/${statusModal.id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
        setLoading(null)
        if (res.ok) {
            showToast(`Status updated to "${selectedStatus}"`)
            setStatusModal(null)
            setSelectedStatus('')
            setReferenceInput('')
            router.refresh()
        } else {
            showToast('Failed to update status')
        }
    }

    return (
        <div className="mt-12 max-w-7xl">
            {toastMsg && (
                <div className="fixed top-4 right-4 z-50 bg-success/20 border border-success/40 text-success px-4 py-2 rounded-none text-sm">
                    {toastMsg}
                </div>
            )}

            <div className="mb-4 pt-8 border-t border-border">
                <h2 className="font-heading text-2xl text-text tracking-wide">PROMOTER PAYOUTS</h2>
                <p className="text-muted text-xs mt-1">Commission payouts to affiliate promoters</p>
            </div>

            {/* Due Promoter Payouts */}
            {duePayouts.length > 0 && (
                <div className="bg-amber-50 border border-gold/30 rounded-none p-6 mb-8">
                    <div className="mb-4">
                        <h3 className="text-sm font-medium text-gold">Promoter Payouts Due</h3>
                        <p className="text-xs text-gold/60 mt-0.5">{duePayouts.length} request{duePayouts.length !== 1 ? 's' : ''} awaiting processing</p>
                    </div>
                    <div className="flex flex-col gap-3">
                        {duePayouts.map(p => (
                            <div key={p.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card rounded-none px-4 py-3">
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm text-text font-medium">{p.promoter_profiles?.display_name ?? '—'}</p>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-400/20 font-mono">
                                            {p.promoter_profiles?.referral_code}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted">Amount: {formatPence(p.net_pence)}</p>
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
                                        onClick={() => {
                                            setReferenceInput(p.reference || deriveReference(p.id))
                                            setConfirmModal(p)
                                        }}
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

            {/* All Promoter Payouts Table */}
            <div className="bg-card border border-border rounded-none overflow-x-auto mb-4">
                <table className="w-full min-w-[680px] text-sm">
                    <thead>
                        <tr className="border-b border-border">
                            {['Promoter', 'Code', 'Amount', 'Status', 'Date', 'Actions'].map(h => (
                                <th key={h} className="text-left text-xs text-muted py-3 px-4 font-normal">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {allPayouts.length === 0 && (
                            <tr><td colSpan={6} className="text-center text-muted text-xs py-12">No promoter payouts</td></tr>
                        )}
                        {allPayouts.map(p => (
                            <tr key={p.id} className="border-b border-border/50 hover:bg-surface transition-colors">
                                <td className="py-3 px-4 text-text text-sm">
                                    <div>{p.promoter_profiles?.display_name ?? '—'}</div>
                                    {p.reference && (
                                        <div className="text-[10px] text-muted font-mono mt-0.5">Ref: {p.reference}</div>
                                    )}
                                </td>
                                <td className="py-3 px-4 text-muted text-xs font-mono">{p.promoter_profiles?.referral_code ?? '—'}</td>
                                <td className="py-3 px-4 text-text text-xs font-medium">{formatPence(p.net_pence)}</td>
                                <td className="py-3 px-4">
                                    <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_BADGE[p.status] || STATUS_BADGE.pending}`}>
                                        {p.status}
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-muted text-xs">
                                    {p.paid_at ? fmt(p.paid_at) : p.requested_at ? fmt(p.requested_at) : fmt(p.created_at)}
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
                                            onClick={() => {
                                                setStatusModal(p)
                                                setSelectedStatus(p.status)
                                                setReferenceInput(p.reference || deriveReference(p.id))
                                            }}
                                            className="text-[11px] text-muted hover:text-text px-2 py-1 border border-border rounded-sm transition-colors"
                                            title="Change status"
                                        >
                                            Status
                                        </button>
                                        {(p.status === 'pending' || p.status === 'requested') && (
                                            <button
                                                onClick={() => {
                                                    setReferenceInput(p.reference || deriveReference(p.id))
                                                    setConfirmModal(p)
                                                }}
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

            {/* Confirm Process Modal */}
            {confirmModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-none p-6 max-w-sm w-full max-h-[90vh] overflow-y-auto">
                        <h3 className="font-heading text-xl text-text mb-3">Process Promoter Payout</h3>
                        <p className="text-sm text-muted mb-2">{confirmModal.promoter_profiles?.display_name} ({confirmModal.promoter_profiles?.referral_code})</p>
                        <p className="text-sm text-muted mb-1">Amount: <span className="text-text font-medium">{formatPence(confirmModal.net_pence)}</span></p>
                        <p className="text-sm text-muted mb-4">
                            {(confirmModal.payout_method ?? confirmModal.promoter_profiles?.payout_method) === 'stripe_connect'
                                ? 'This will trigger an automatic Stripe transfer.'
                                : 'Mark as paid after sending the bank transfer manually.'}
                        </p>
                        {(confirmModal.payout_method ?? confirmModal.promoter_profiles?.payout_method) !== 'stripe_connect' && (
                            <div className="mb-4">
                                <label className="text-xs text-muted block mb-1.5">Bank Reference</label>
                                <input
                                    type="text"
                                    value={referenceInput}
                                    onChange={e => setReferenceInput(e.target.value)}
                                    placeholder={deriveReference(confirmModal.id)}
                                    className="w-full bg-surface border border-border rounded-sm px-3 py-2 text-sm text-text font-mono focus:outline-none"
                                />
                                <p className="text-[10px] text-muted mt-1">Paste the FPS/CHAPS ID from your bank, or leave as-is to use the auto reference. Sent to the promoter in their commission email.</p>
                            </div>
                        )}
                        <div className="flex gap-3">
                            <Button variant="primary" size="md" onClick={() => handleProcessPayout(confirmModal)} disabled={loading === confirmModal.id}>
                                {loading === confirmModal.id ? 'Processing...' : 'Confirm Payout'}
                            </Button>
                            <Button variant="secondary" size="md" onClick={() => { setConfirmModal(null); setReferenceInput('') }}>Cancel</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bank Details Modal */}
            {bankModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-none p-6 max-w-sm w-full max-h-[90vh] overflow-y-auto">
                        <h3 className="font-heading text-xl text-text mb-4">Promoter Payout Details</h3>
                        <p className="text-sm text-text font-medium mb-3">{bankModal.promoter_profiles?.display_name}</p>
                        {(bankModal.payout_method ?? bankModal.promoter_profiles?.payout_method) === 'stripe_connect' ? (
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted">Method</span>
                                    <span className="text-text">Stripe Connect</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted">Account ID</span>
                                    <span className="text-text font-mono text-xs">{bankModal.promoter_profiles?.stripe_account_id || '—'}</span>
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
                                    <span className="text-text">{bankModal.promoter_profiles?.bank_account_name || '—'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted">Sort Code</span>
                                    <span className="text-text font-mono">{bankModal.promoter_profiles?.bank_sort_code || '—'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted">Account Number</span>
                                    <span className="text-text font-mono">{bankModal.promoter_profiles?.bank_account_number || '—'}</span>
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
                    <div className="bg-card border border-border rounded-none p-6 max-w-sm w-full max-h-[90vh] overflow-y-auto">
                        <h3 className="font-heading text-xl text-text mb-3">Change Payout Status</h3>
                        <p className="text-sm text-muted mb-1">{statusModal.promoter_profiles?.display_name}</p>
                        <p className="text-sm text-muted mb-4">Amount: {formatPence(statusModal.net_pence)}</p>
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
                        {selectedStatus === 'paid' && (
                            <div className="mb-4">
                                <label className="text-xs text-muted block mb-1.5">Bank Reference</label>
                                <input
                                    type="text"
                                    value={referenceInput}
                                    onChange={e => setReferenceInput(e.target.value)}
                                    placeholder={deriveReference(statusModal.id)}
                                    className="w-full bg-surface border border-border rounded-sm px-3 py-2 text-sm text-text font-mono focus:outline-none"
                                />
                                <p className="text-[10px] text-muted mt-1">Paste the FPS/CHAPS ID from your bank, or leave as-is to use the auto reference.</p>
                            </div>
                        )}
                        <div className="flex gap-3">
                            <Button
                                variant="primary"
                                size="md"
                                onClick={handleStatusChange}
                                disabled={loading === statusModal.id || selectedStatus === statusModal.status}
                            >
                                {loading === statusModal.id ? 'Updating...' : 'Update Status'}
                            </Button>
                            <Button variant="secondary" size="md" onClick={() => { setStatusModal(null); setSelectedStatus(''); setReferenceInput('') }}>Cancel</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
