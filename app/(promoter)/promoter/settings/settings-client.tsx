'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SaveFeedback } from '@/components/ui/SaveFeedback'

interface Initial {
    displayName: string
    referralCode: string
    bio: string
    payoutMethod: string
    bankAccountName: string
    bankAccountNumber: string
    bankSortCode: string
}

export function SettingsClient({ initial }: { initial: Initial }) {
    const router = useRouter()
    const [displayName, setDisplayName] = useState(initial.displayName)
    const [bio, setBio] = useState(initial.bio)
    const [payoutMethod, setPayoutMethod] = useState(initial.payoutMethod)
    const [bankName, setBankName] = useState(initial.bankAccountName)
    const [bankNumber, setBankNumber] = useState(initial.bankAccountNumber)
    const [bankSort, setBankSort] = useState(initial.bankSortCode)
    const [submitting, setSubmitting] = useState(false)
    const [feedback, setFeedback] = useState<{ message: string; tone: 'success' | 'error' } | null>(null)

    function showFeedback(message: string, tone: 'success' | 'error' = 'success') {
        setFeedback({ message, tone })
        setTimeout(() => setFeedback(curr => (curr?.message === message ? null : curr)), 3000)
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault()
        setSubmitting(true)
        const res = await fetch('/api/promoter/settings', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                display_name: displayName,
                bio,
                payout_method: payoutMethod || null,
                bank_account_name: bankName || null,
                bank_account_number: bankNumber || null,
                bank_sort_code: bankSort || null,
            }),
        })
        const json = await res.json().catch(() => ({}))
        setSubmitting(false)
        if (!res.ok) {
            showFeedback(json.error || 'Failed to save', 'error')
            return
        }
        showFeedback('Settings saved')
        router.refresh()
    }

    return (
        <div className="max-w-3xl">
            <h1 className="font-heading text-4xl text-text tracking-wide mb-2">SETTINGS</h1>
            <p className="text-muted text-sm mb-8">Profile and payout preferences.</p>

            <form onSubmit={handleSave} className="flex flex-col gap-8">
                {/* Profile */}
                <section className="bg-card border border-border p-6">
                    <h2 className="text-sm font-medium text-text mb-4">Profile</h2>

                    <div className="mb-4">
                        <label className="text-xs uppercase tracking-wider text-muted block mb-2">Display name</label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={e => setDisplayName(e.target.value)}
                            minLength={2}
                            maxLength={50}
                            required
                            className="w-full bg-surface border border-border rounded-sm px-3 py-2.5 text-sm text-text focus:outline-none focus:border-accent"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="text-xs uppercase tracking-wider text-muted block mb-2">Referral code</label>
                        <code className="block bg-surface border border-border px-3 py-2.5 text-sm text-accent font-mono">{initial.referralCode}</code>
                        <p className="text-xs text-muted mt-1">Cannot be changed.</p>
                    </div>

                    <div>
                        <label className="text-xs uppercase tracking-wider text-muted block mb-2">Short bio</label>
                        <textarea
                            value={bio}
                            onChange={e => setBio(e.target.value)}
                            rows={3}
                            maxLength={300}
                            className="w-full bg-surface border border-border rounded-sm px-3 py-2.5 text-sm text-text focus:outline-none focus:border-accent resize-none"
                        />
                    </div>
                </section>

                {/* Payout */}
                <section className="bg-card border border-border p-6">
                    <h2 className="text-sm font-medium text-text mb-1">Payout method</h2>
                    <p className="text-xs text-muted mb-4">How you&apos;d like to receive your commission.</p>

                    <div className="mb-4">
                        <label className="text-xs uppercase tracking-wider text-muted block mb-2">Method</label>
                        <select
                            value={payoutMethod}
                            onChange={e => setPayoutMethod(e.target.value)}
                            className="bg-surface border border-border rounded-sm px-3 py-2.5 text-sm text-text focus:outline-none"
                        >
                            <option value="">Select…</option>
                            <option value="bank_transfer">Bank Transfer (UK)</option>
                            <option value="stripe_connect">Stripe Connect</option>
                        </select>
                    </div>

                    {payoutMethod === 'bank_transfer' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="text-xs uppercase tracking-wider text-muted block mb-2">Account name</label>
                                <input
                                    type="text"
                                    value={bankName}
                                    onChange={e => setBankName(e.target.value)}
                                    className="w-full bg-surface border border-border rounded-sm px-3 py-2.5 text-sm text-text focus:outline-none focus:border-accent"
                                />
                            </div>
                            <div>
                                <label className="text-xs uppercase tracking-wider text-muted block mb-2">Sort code</label>
                                <input
                                    type="text"
                                    value={bankSort}
                                    onChange={e => setBankSort(e.target.value)}
                                    placeholder="00-00-00"
                                    className="w-full bg-surface border border-border rounded-sm px-3 py-2.5 text-sm text-text focus:outline-none focus:border-accent"
                                />
                            </div>
                            <div>
                                <label className="text-xs uppercase tracking-wider text-muted block mb-2">Account number</label>
                                <input
                                    type="text"
                                    value={bankNumber}
                                    onChange={e => setBankNumber(e.target.value)}
                                    placeholder="12345678"
                                    className="w-full bg-surface border border-border rounded-sm px-3 py-2.5 text-sm text-text focus:outline-none focus:border-accent"
                                />
                            </div>
                        </div>
                    )}

                    {payoutMethod === 'stripe_connect' && (
                        <p className="text-xs text-muted bg-surface border border-border px-3 py-2.5">
                            Stripe Connect onboarding is coming soon. For now, please use bank transfer.
                        </p>
                    )}
                </section>

                <div className="flex items-center gap-3 flex-wrap">
                    <button
                        type="submit"
                        disabled={submitting}
                        className="bg-accent text-white font-bold uppercase tracking-wider text-sm py-3 px-6 hover:bg-accent/90 disabled:opacity-50"
                    >
                        {submitting ? 'Saving…' : 'Save Changes'}
                    </button>
                    <SaveFeedback message={feedback?.message ?? null} tone={feedback?.tone ?? 'success'} />
                </div>
            </form>
        </div>
    )
}
