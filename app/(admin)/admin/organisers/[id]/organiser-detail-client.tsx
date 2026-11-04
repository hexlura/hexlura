'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type IdentityStatus = 'processing' | 'verified' | 'requires_input' | 'canceled' | null

interface OrganiserDetail {
    id: string; org_name: string; slug: string; organiser_type: string | null
    stripe_account_id: string | null; stripe_connect_allowed: boolean
    stripe_charges_enabled: boolean; stripe_payouts_enabled: boolean
    payout_method: string; is_approved: boolean; is_suspended: boolean
    booking_fee_exempt: boolean; processing_fee_exempt: boolean
    identity_status: IdentityStatus
    created_at: string; approved_at: string | null; user_id: string
    bank_account_name: string | null; bank_sort_code: string | null; bank_account_number: string | null
    profiles: { full_name: string | null; email: string | null } | null
}

interface BankChange {
    created_at: string
    metadata: { by?: string; reason?: string; before?: { name?: string | null; account?: string }; after?: { name?: string | null; account?: string } } | null
}

function fmt(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function OrganiserDetailClient({ organiser, bankChanges }: { organiser: OrganiserDetail; bankChanges: BankChange[] }) {
    const router = useRouter()
    const [editingBank, setEditingBank] = useState(false)
    const [bankName, setBankName] = useState(organiser.bank_account_name ?? '')
    const [bankSort, setBankSort] = useState(organiser.bank_sort_code ?? '')
    const [bankNumber, setBankNumber] = useState(organiser.bank_account_number ?? '')
    const [bankReason, setBankReason] = useState('')
    const [bankSaving, setBankSaving] = useState(false)
    const [bankError, setBankError] = useState<string | null>(null)
    const [allowed, setAllowed] = useState(organiser.stripe_connect_allowed)
    const [bookingFeeExempt, setBookingFeeExempt] = useState(organiser.booking_fee_exempt)
    const [processingFeeExempt, setProcessingFeeExempt] = useState(organiser.processing_fee_exempt)
    const [saving, setSaving] = useState(false)
    const [savingField, setSavingField] = useState<string | null>(null)
    const [toastMsg, setToastMsg] = useState<string | null>(null)

    function showToast(msg: string) {
        setToastMsg(msg)
        setTimeout(() => setToastMsg(null), 3000)
    }

    async function handleToggle() {
        const next = !allowed
        setSaving(true)
        const res = await fetch(`/api/admin/organisers/${organiser.id}/stripe-connect-allowed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ allowed: next }),
        })
        setSaving(false)
        if (res.ok) {
            setAllowed(next)
            showToast(next ? 'Stripe Connect allowed for this organiser' : 'Stripe Connect access revoked')
            router.refresh()
        } else {
            showToast('Failed to update — try again')
        }
    }

    async function handleFeeExemptToggle(field: 'booking_fee_exempt' | 'processing_fee_exempt', current: boolean) {
        const next = !current
        setSavingField(field)
        const res = await fetch(`/api/admin/organisers/${organiser.id}/fee-exempt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ field, exempt: next }),
        })
        setSavingField(null)
        if (res.ok) {
            if (field === 'booking_fee_exempt') setBookingFeeExempt(next)
            else setProcessingFeeExempt(next)
            showToast(next ? 'Fee waived for this organiser' : 'Fee exemption revoked')
            router.refresh()
        } else {
            const { error } = await res.json().catch(() => ({ error: 'Failed to update — try again' }))
            showToast(error || 'Failed to update — try again')
        }
    }

    async function saveBankDetails(e: React.FormEvent) {
        e.preventDefault()
        setBankSaving(true)
        setBankError(null)
        try {
            const res = await fetch(`/api/admin/organisers/${organiser.id}/bank-details`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: bankName, sortCode: bankSort, accountNumber: bankNumber, reason: bankReason }),
            })
            const data = await res.json().catch(() => null) as { error?: string } | null
            if (!res.ok) {
                setBankError(data?.error || 'Could not save — try again')
            } else {
                setEditingBank(false)
                setBankReason('')
                showToast('Bank details updated — the organiser has been emailed')
                router.refresh()
            }
        } catch (err) {
            console.error('Admin bank details save failed:', err)
            setBankError('Could not save — try again')
        }
        setBankSaving(false)
    }

    const connectReady = allowed && organiser.stripe_charges_enabled
    const bothWaived = bookingFeeExempt && processingFeeExempt

    return (
        <div className="max-w-3xl">
            {toastMsg && (
                <div className="fixed top-4 right-4 z-50 bg-warm-green/20 border border-warm-green/40 text-success px-4 py-2 rounded-lg text-sm">
                    {toastMsg}
                </div>
            )}

            <div className="mb-8">
                <Link href="/admin/organisers" className="text-xs text-accent hover:underline">&larr; Back to organisers</Link>
                <h1 className="font-heading text-4xl text-text tracking-wide mt-2">{organiser.org_name}</h1>
                <p className="text-muted text-sm mt-1">
                    {organiser.profiles?.full_name ?? '—'} · {organiser.profiles?.email ?? '—'}
                </p>
            </div>

            <div className="bg-card shadow-card rounded-2xl p-6 mb-6">
                <h2 className="font-heading text-xl text-text mb-4">Account</h2>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <dt className="text-xs text-muted">Status</dt>
                        <dd className="text-text">{organiser.is_suspended ? 'Suspended' : organiser.is_approved ? 'Active' : 'Pending'}</dd>
                    </div>
                    <div>
                        <dt className="text-xs text-muted">Joined</dt>
                        <dd className="text-text">{fmt(organiser.created_at)}</dd>
                    </div>
                    <div>
                        <dt className="text-xs text-muted">Identity verification</dt>
                        <dd className="text-text">{organiser.identity_status ?? 'Not started'}</dd>
                    </div>
                    <div>
                        <dt className="text-xs text-muted">Current payout method</dt>
                        <dd className="text-text">{organiser.payout_method === 'stripe_connect' ? 'Stripe Connect' : 'Bank transfer'}</dd>
                    </div>
                </dl>
            </div>

            <div className="bg-card shadow-card rounded-2xl p-6">
                <h2 className="font-heading text-xl text-text mb-2">Stripe Connect</h2>
                <p className="text-xs text-muted mb-4">
                    Bank transfer is the default payout method for every organiser — payouts are gated by the
                    platform cooldown and identity verification. Stripe Connect transfers funds instantly to the
                    organiser, bypassing that cooldown, so it must be granted individually to organisers you trust.
                </p>

                <div className="flex items-center justify-between border-t border-border pt-4">
                    <div>
                        <p className="text-sm text-text font-medium">Allow Stripe Connect</p>
                        <p className="text-xs text-muted mt-0.5">
                            {allowed ? 'This organiser can connect a Stripe account and select it as their payout method.' : 'This organiser cannot use Stripe Connect.'}
                        </p>
                    </div>
                    <button
                        onClick={handleToggle}
                        disabled={saving}
                        role="switch"
                        aria-checked={allowed}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-40 ${allowed ? 'bg-accent' : 'bg-border'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${allowed ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>

                {organiser.stripe_account_id && (
                    <div className="border-t border-border pt-4 mt-4 text-xs text-muted space-y-1">
                        <p>Connected account: <span className="text-text">{organiser.stripe_account_id}</span></p>
                        <p>Charges enabled: <span className="text-text">{organiser.stripe_charges_enabled ? 'Yes' : 'No'}</span></p>
                        <p>Payouts enabled: <span className="text-text">{organiser.stripe_payouts_enabled ? 'Yes' : 'No'}</span></p>
                    </div>
                )}
            </div>

            <div className="bg-card shadow-card rounded-2xl p-6 mt-6">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="font-heading text-xl text-text">Bank details</h2>
                    {!editingBank && (
                        <button onClick={() => setEditingBank(true)} className="text-xs text-accent font-semibold hover:underline">
                            {organiser.bank_account_number ? 'Edit' : 'Add'}
                        </button>
                    )}
                </div>
                <p className="text-xs text-muted mb-4">
                    Where a bank-transfer payout is sent. Every change needs a reason, is audit-logged, and the organiser is emailed.
                </p>
                {!editingBank ? (
                    <dl className="grid grid-cols-3 gap-4 text-sm border-t border-border pt-4">
                        <div><dt className="text-xs text-muted">Account holder</dt><dd className="text-text">{organiser.bank_account_name || '—'}</dd></div>
                        <div><dt className="text-xs text-muted">Sort code</dt><dd className="text-text font-mono">{organiser.bank_sort_code || '—'}</dd></div>
                        <div><dt className="text-xs text-muted">Account number</dt><dd className="text-text font-mono">{organiser.bank_account_number || '—'}</dd></div>
                    </dl>
                ) : (
                    <form onSubmit={saveBankDetails} className="space-y-3 border-t border-border pt-4">
                        <div>
                            <label className="text-xs text-muted block mb-1">Account holder name</label>
                            <input value={bankName} onChange={e => setBankName(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-muted block mb-1">Sort code</label>
                                <input value={bankSort} onChange={e => setBankSort(e.target.value)} placeholder="00-00-00" maxLength={8} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text font-mono" />
                            </div>
                            <div>
                                <label className="text-xs text-muted block mb-1">Account number</label>
                                <input value={bankNumber} onChange={e => setBankNumber(e.target.value)} placeholder="12345678" maxLength={8} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text font-mono" />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-muted block mb-1">Reason for the change (audit-logged, required)</label>
                            <textarea value={bankReason} onChange={e => setBankReason(e.target.value)} rows={2} placeholder="e.g. Organiser emailed support to change account" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text" />
                        </div>
                        {bankError && <p className="text-xs text-accent">{bankError}</p>}
                        <div className="flex gap-3">
                            <button type="submit" disabled={bankSaving} className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">{bankSaving ? 'Saving...' : 'Save bank details'}</button>
                            <button type="button" onClick={() => { setEditingBank(false); setBankError(null) }} className="px-4 py-2 rounded-lg text-sm border border-border text-text">Cancel</button>
                        </div>
                    </form>
                )}
                {bankChanges.length > 0 && (
                    <div className="border-t border-border pt-4 mt-4">
                        <p className="text-xs text-muted mb-2">Recent changes</p>
                        <ul className="text-xs text-text space-y-1">
                            {bankChanges.map((c, i) => (
                                <li key={i}>
                                    {fmt(c.created_at)} · {c.metadata?.by === 'admin' ? 'by an admin' : 'by the organiser'} · {c.metadata?.before?.account ?? '—'} → {c.metadata?.after?.account ?? '—'}
                                    {c.metadata?.reason ? <span className="text-muted"> · “{c.metadata.reason}”</span> : null}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            <div className="bg-card shadow-card rounded-2xl p-6 mt-6">
                <h2 className="font-heading text-xl text-text mb-2">Fee waivers</h2>
                <p className="text-xs text-muted mb-4">
                    Waive the booking fee and/or order processing fee for this organiser&apos;s events — independently,
                    and available regardless of payout method.
                    {connectReady
                        ? bothWaived
                            ? ' Since both are waived, Stripe’s own processing cost comes out of this organiser’s connected account instead of the platform’s.'
                            : ' If both are waived together, Stripe’s own processing cost shifts to this organiser’s connected account instead of the platform’s; otherwise the platform continues to absorb it.'
                        : ' This organiser is on bank transfer, so the platform simply collects less on each sale — there’s no connected Stripe account to shift costs to.'}
                </p>

                <div className="flex items-center justify-between border-t border-border pt-4">
                    <div>
                        <p className="text-sm text-text font-medium">Waive booking fee</p>
                        <p className="text-xs text-muted mt-0.5">
                            {bookingFeeExempt ? 'Buyers of this organiser\'s events are not charged the booking fee.' : 'Buyers pay the standard booking fee.'}
                        </p>
                    </div>
                    <button
                        onClick={() => handleFeeExemptToggle('booking_fee_exempt', bookingFeeExempt)}
                        disabled={savingField === 'booking_fee_exempt'}
                        role="switch"
                        aria-checked={bookingFeeExempt}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-40 ${bookingFeeExempt ? 'bg-accent' : 'bg-border'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${bookingFeeExempt ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>

                <div className="flex items-center justify-between border-t border-border pt-4 mt-4">
                    <div>
                        <p className="text-sm text-text font-medium">Waive order processing fee</p>
                        <p className="text-xs text-muted mt-0.5">
                            {processingFeeExempt ? 'Buyers of this organiser\'s events are not charged the order processing fee.' : 'Buyers pay the standard order processing fee.'}
                        </p>
                    </div>
                    <button
                        onClick={() => handleFeeExemptToggle('processing_fee_exempt', processingFeeExempt)}
                        disabled={savingField === 'processing_fee_exempt'}
                        role="switch"
                        aria-checked={processingFeeExempt}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-40 ${processingFeeExempt ? 'bg-accent' : 'bg-border'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${processingFeeExempt ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>
        </div>
    )
}
