'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SaveFeedback } from '@/components/ui/SaveFeedback'
import { ThemedSelect } from '@/components/ui/ThemedSelect'

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

    const fieldClass = "w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-warm-red/25"
    const labelClass = "text-xs font-semibold text-muted mb-1.5 block"

    return (
        <div className="max-w-7xl">
            <div className="mb-6">
                <h1 className="font-heading text-4xl tracking-wide">SETTINGS</h1>
                <p className="text-muted text-sm mt-1">Profile and payout preferences.</p>
            </div>

            <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                {/* Profile */}
                <section className="bg-card rounded-2xl shadow-card p-7 h-full">
                    <h2 className="text-sm font-semibold mb-5">Profile</h2>
                    <div className="space-y-4">
                        <div>
                            <label className={labelClass}>Display name</label>
                            <input
                                type="text"
                                value={displayName}
                                onChange={e => setDisplayName(e.target.value)}
                                minLength={2}
                                maxLength={50}
                                required
                                className={fieldClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Referral code</label>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 font-mono text-sm text-accent bg-background border border-border rounded-lg px-3.5 py-2.5">{initial.referralCode}</code>
                                <span className="text-xs text-muted">Cannot be changed</span>
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>Short bio</label>
                            <textarea
                                value={bio}
                                onChange={e => setBio(e.target.value)}
                                rows={3}
                                maxLength={300}
                                className={`${fieldClass} resize-none`}
                            />
                            <p className="text-xs text-muted mt-1 text-right">{bio.length} / 300</p>
                        </div>
                    </div>
                </section>

                {/* Payout */}
                <section className="bg-card rounded-2xl shadow-card p-7 h-full">
                    <h2 className="text-sm font-semibold">Payout method</h2>
                    <p className="text-xs text-muted mb-5">How you&apos;d like to receive your commission.</p>

                    <div className="space-y-4">
                        <div>
                            <label className={labelClass}>Method</label>
                            <ThemedSelect value={payoutMethod} onChange={e => setPayoutMethod(e.target.value)} className="w-full">
                                <option value="">Select…</option>
                                <option value="bank_transfer">Bank Transfer (UK)</option>
                                <option value="stripe_connect">Stripe Connect</option>
                            </ThemedSelect>
                        </div>

                        {payoutMethod === 'bank_transfer' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className={labelClass}>Account name</label>
                                    <input type="text" value={bankName} onChange={e => setBankName(e.target.value)} className={fieldClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Sort code</label>
                                    <input type="text" value={bankSort} onChange={e => setBankSort(e.target.value)} placeholder="00-00-00" className={`${fieldClass} font-mono`} />
                                </div>
                                <div>
                                    <label className={labelClass}>Account number</label>
                                    <input type="text" value={bankNumber} onChange={e => setBankNumber(e.target.value)} placeholder="12345678" className={`${fieldClass} font-mono`} />
                                </div>
                            </div>
                        )}

                        {payoutMethod === 'stripe_connect' && (
                            <p className="text-xs text-muted bg-background border border-border rounded-lg px-3.5 py-2.5">
                                Stripe Connect onboarding is coming soon. For now, please use bank transfer.
                            </p>
                        )}
                    </div>
                </section>

                <div className="lg:col-span-2 flex items-center gap-4 flex-wrap">
                    <button
                        type="submit"
                        disabled={submitting}
                        className="px-8 py-3 rounded-full bg-accent text-white font-semibold shadow-glow hover:brightness-110 transition disabled:opacity-50 disabled:shadow-none"
                    >
                        {submitting ? 'Saving…' : 'Save changes'}
                    </button>
                    <SaveFeedback message={feedback?.message ?? null} tone={feedback?.tone ?? 'success'} />
                </div>
            </form>
        </div>
    )
}
