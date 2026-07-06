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
    fee_exempt: boolean
    identity_status: IdentityStatus
    created_at: string; approved_at: string | null; user_id: string
    profiles: { full_name: string | null; email: string | null } | null
}

function fmt(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function OrganiserDetailClient({ organiser }: { organiser: OrganiserDetail }) {
    const router = useRouter()
    const [allowed, setAllowed] = useState(organiser.stripe_connect_allowed)
    const [feeExempt, setFeeExempt] = useState(organiser.fee_exempt)
    const [saving, setSaving] = useState(false)
    const [savingFeeExempt, setSavingFeeExempt] = useState(false)
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

    async function handleFeeExemptToggle() {
        const next = !feeExempt
        setSavingFeeExempt(true)
        const res = await fetch(`/api/admin/organisers/${organiser.id}/fee-exempt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ exempt: next }),
        })
        setSavingFeeExempt(false)
        if (res.ok) {
            setFeeExempt(next)
            showToast(next ? 'Fees waived for this organiser' : 'Fee exemption revoked')
            router.refresh()
        } else {
            const { error } = await res.json().catch(() => ({ error: 'Failed to update — try again' }))
            showToast(error || 'Failed to update — try again')
        }
    }

    const connectReady = allowed && organiser.stripe_charges_enabled

    return (
        <div className="max-w-3xl">
            {toastMsg && (
                <div className="fixed top-4 right-4 z-50 bg-success/20 border border-success/40 text-success px-4 py-2 rounded-none text-sm">
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

            <div className="bg-card border border-border rounded-none p-6 mb-6">
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

            <div className="bg-card border border-border rounded-none p-6">
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
                        className={`relative inline-flex h-6 w-11 items-center rounded-sm transition-colors disabled:opacity-40 ${allowed ? 'bg-accent' : 'bg-border'}`}
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

            <div className="bg-card border border-border rounded-none p-6 mt-6">
                <h2 className="font-heading text-xl text-text mb-2">Fee-free for buyers</h2>
                <p className="text-xs text-muted mb-4">
                    When enabled, buyers pay only the ticket price for this organiser&apos;s events — no booking fee,
                    no order processing fee. Stripe&apos;s own processing cost comes out of the organiser&apos;s
                    connected account instead of the platform&apos;s. Requires Stripe Connect to be enabled above.
                </p>

                <div className="flex items-center justify-between border-t border-border pt-4">
                    <div>
                        <p className="text-sm text-text font-medium">Waive platform fees</p>
                        <p className="text-xs text-muted mt-0.5">
                            {!connectReady
                                ? 'Enable Stripe Connect for this organiser first.'
                                : feeExempt
                                    ? 'Buyers of this organiser\'s events pay ticket price only.'
                                    : 'Buyers pay the standard platform fees.'}
                        </p>
                    </div>
                    <button
                        onClick={handleFeeExemptToggle}
                        disabled={savingFeeExempt || !connectReady}
                        role="switch"
                        aria-checked={feeExempt}
                        className={`relative inline-flex h-6 w-11 items-center rounded-sm transition-colors disabled:opacity-40 ${feeExempt ? 'bg-accent' : 'bg-border'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${feeExempt ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>
        </div>
    )
}
