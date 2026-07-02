'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { SaveFeedback } from '@/components/ui/SaveFeedback'


interface PromoRow {
    id: string; code: string; discount_type: string; discount_value: number
    max_uses: number | null; uses_count: number; valid_from: string | null; valid_to: string | null; created_at: string
}

interface Props {
    settings: Record<string, string>
    promoCodes: PromoRow[]
}

function fmt(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function SettingsClient({ settings, promoCodes }: Props) {
    const router = useRouter()

    // Fee settings
    const [feePercent, setFeePercent] = useState(settings['booking_fee_percent'] ?? '0')
    const [feeMin, setFeeMin] = useState(String((parseInt(settings['booking_fee_min_pence'] ?? '0') / 100).toFixed(2)))
    const [feeMax, setFeeMax] = useState(String((parseInt(settings['booking_fee_max_pence'] ?? '0') / 100).toFixed(2)))
    const [processingFee, setProcessingFee] = useState(String((parseInt(settings['order_processing_fee_pence'] ?? '0') / 100).toFixed(2)))

    // Homepage settings
    const [maxFeatured, setMaxFeatured] = useState(settings['max_featured_slots'] ?? '6')
    const [maintenanceMode, setMaintenanceMode] = useState(settings['maintenance_mode'] === 'true')

    // Payout settings
    const [payoutCooldown, setPayoutCooldown] = useState(settings['payout_cooldown_days'] ?? '2')
    const [stripeConnectEnabled, setStripeConnectEnabled] = useState(settings['stripe_connect_enabled'] === 'true')

    // Analytics settings
    const [metaPixelId, setMetaPixelId] = useState(settings['meta_pixel_id'] ?? '')

    // Email settings
    const [fromName, setFromName] = useState(settings['from_name'] ?? 'Hexlura')
    const [fromEmail, setFromEmail] = useState(settings['from_email'] ?? 'tickets@hexlura.com')
    const [supportEmail, setSupportEmail] = useState(settings['support_email'] ?? 'support@hexlura.com')

    // Promo codes
    const [promoCode, setPromoCode] = useState('')
    const [promoType, setPromoType] = useState<'percent' | 'fixed'>('percent')
    const [promoValue, setPromoValue] = useState('')
    const [promoMaxUses, setPromoMaxUses] = useState('')
    const [promoValidFrom, setPromoValidFrom] = useState('')
    const [promoValidTo, setPromoValidTo] = useState('')

    const [saving, setSaving] = useState<string | null>(null)
    // Inline save feedback, keyed per section so each Save button gets its
    // own confirmation rendered right next to it.
    const [feedback, setFeedback] = useState<Record<string, string>>({})

    function showFeedback(section: string, msg: string) {
        setFeedback(prev => ({ ...prev, [section]: msg }))
        setTimeout(() => {
            setFeedback(prev => {
                if (prev[section] !== msg) return prev
                const rest = { ...prev }
                delete rest[section]
                return rest
            })
        }, 3000)
    }

    async function saveSetting(key: string, value: string) {
        const res = await fetch('/api/admin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, value }),
        })
        if (!res.ok) {
            const body = await res.json().catch(() => ({}))
            throw new Error(body.error || `Failed to save ${key}`)
        }
    }

    async function handleSaveFees() {
        setSaving('fees')
        try {
            await Promise.all([
                saveSetting('booking_fee_percent', feePercent),
                saveSetting('booking_fee_min_pence', String(Math.round(parseFloat(feeMin) * 100))),
                saveSetting('booking_fee_max_pence', String(Math.round(parseFloat(feeMax) * 100))),
                saveSetting('order_processing_fee_pence', String(Math.round(parseFloat(processingFee) * 100))),
            ])
            showFeedback('fees', 'Fee settings saved')
            router.refresh()
        } catch (e) {
            showFeedback('fees', `Error: ${(e as Error).message}`)
        } finally {
            setSaving(null)
        }
    }

    async function handleSaveHomepage() {
        setSaving('homepage')
        try {
            await Promise.all([
                saveSetting('max_featured_slots', maxFeatured),
                saveSetting('maintenance_mode', maintenanceMode ? 'true' : 'false'),
            ])
            showFeedback('homepage', 'Homepage settings saved')
            router.refresh()
        } catch (e) {
            showFeedback('homepage', `Error: ${(e as Error).message}`)
        } finally {
            setSaving(null)
        }
    }

    async function handleSavePayouts() {
        setSaving('payouts')
        try {
            await Promise.all([
                saveSetting('payout_cooldown_days', payoutCooldown),
                saveSetting('stripe_connect_enabled', stripeConnectEnabled ? 'true' : 'false'),
            ])
            showFeedback('payouts', 'Payout settings saved')
            router.refresh()
        } catch (e) {
            showFeedback('payouts', `Error: ${(e as Error).message}`)
        } finally {
            setSaving(null)
        }
    }

    async function handleSaveAnalytics() {
        setSaving('analytics')
        try {
            await saveSetting('meta_pixel_id', metaPixelId.trim())
            showFeedback('analytics', 'Analytics settings saved')
            router.refresh()
        } catch (e) {
            showFeedback('analytics', `Error: ${(e as Error).message}`)
        } finally {
            setSaving(null)
        }
    }

    async function handleSaveEmail() {
        setSaving('email')
        try {
            await Promise.all([
                saveSetting('from_name', fromName),
                saveSetting('from_email', fromEmail),
                saveSetting('support_email', supportEmail),
            ])
            showFeedback('email', 'Email settings saved')
            router.refresh()
        } catch (e) {
            showFeedback('email', `Error: ${(e as Error).message}`)
        } finally {
            setSaving(null)
        }
    }

    async function handleCreatePromo() {
        if (!promoCode.trim() || !promoValue) return
        setSaving('promo')
        await fetch('/api/admin/promo-codes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code: promoCode.toUpperCase(),
                discount_type: promoType,
                discount_value: parseFloat(promoValue),
                max_uses: promoMaxUses ? parseInt(promoMaxUses) : null,
                valid_from: promoValidFrom || null,
                valid_to: promoValidTo || null,
            }),
        })
        setSaving(null)
        setPromoCode('')
        setPromoValue('')
        setPromoMaxUses('')
        setPromoValidFrom('')
        setPromoValidTo('')
        showFeedback('promo', 'Promo code created')
        router.refresh()
    }

    const sectionClass = "bg-card border border-border rounded-none p-6 mb-6"
    const labelClass = "text-xs text-muted block mb-1"
    const inputClass = "w-full bg-surface border border-border rounded-sm px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"

    return (
        <div className="max-w-3xl">
            <div className="mb-8">
                <h1 className="font-heading text-4xl text-text tracking-wide">SETTINGS</h1>
                <p className="text-muted text-sm mt-1">Platform configuration</p>
            </div>

            {/* Fees */}
            <div className={sectionClass}>
                <h2 className="text-sm font-medium text-text mb-4">Platform Fees</h2>
                <p className="text-xs text-gold mb-4">Note: Fee changes apply to new bookings only</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className={labelClass}>Booking Fee % (per ticket)</label>
                        <input type="number" step="0.1" value={feePercent} onChange={e => setFeePercent(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Order Processing Fee per Order (£)</label>
                        <input type="number" step="0.01" value={processingFee} onChange={e => setProcessingFee(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Minimum Booking Fee per Ticket (£)</label>
                        <input type="number" step="0.01" value={feeMin} onChange={e => setFeeMin(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Maximum Booking Fee per Ticket (£)</label>
                        <input type="number" step="0.01" value={feeMax} onChange={e => setFeeMax(e.target.value)} className={inputClass} />
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <Button variant="primary" size="md" onClick={handleSaveFees} disabled={saving === 'fees'}>
                        {saving === 'fees' ? 'Saving...' : 'Save Fee Settings'}
                    </Button>
                    <SaveFeedback message={feedback.fees ?? null} />
                </div>
            </div>

            {/* Homepage */}
            <div className={sectionClass}>
                <h2 className="text-sm font-medium text-text mb-4">Homepage</h2>
                <div className="mb-4">
                    <label className={labelClass}>Max Featured Event Slots</label>
                    <input type="number" min="1" max="20" value={maxFeatured} onChange={e => setMaxFeatured(e.target.value)} className={inputClass} style={{ width: '120px' }} />
                </div>
                <div className="flex items-center justify-between mb-4 py-3 border-y border-border">
                    <div>
                        <p className="text-sm text-text">Maintenance Mode</p>
                        <p className="text-xs text-muted">Public routes show maintenance page. Admins bypass.</p>
                    </div>
                    <button
                        onClick={() => setMaintenanceMode(!maintenanceMode)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-sm transition-colors ${maintenanceMode ? 'bg-accent' : 'bg-border'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${maintenanceMode ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <Button variant="primary" size="md" onClick={handleSaveHomepage} disabled={saving === 'homepage'}>
                        {saving === 'homepage' ? 'Saving...' : 'Save Homepage Settings'}
                    </Button>
                    <SaveFeedback message={feedback.homepage ?? null} />
                </div>
            </div>

            {/* Payout Settings */}
            <div className={sectionClass}>
                <h2 className="text-sm font-medium text-text mb-4">Payout Settings</h2>
                <div className="flex items-center justify-between mb-4 py-3 border-b border-border">
                    <div>
                        <p className="text-sm text-text">Stripe Connect</p>
                        <p className="text-xs text-muted">Allow organisers to use Stripe Connect for automated payouts</p>
                    </div>
                    <button
                        onClick={() => setStripeConnectEnabled(!stripeConnectEnabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-sm transition-colors ${stripeConnectEnabled ? 'bg-accent' : 'bg-border'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${stripeConnectEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
                <div className="mb-4">
                    <label className={labelClass}>Payout Lock-in Period (days)</label>
                    <input
                        type="number"
                        min="0"
                        max="30"
                        value={payoutCooldown}
                        onChange={e => setPayoutCooldown(e.target.value)}
                        className={inputClass}
                        style={{ width: '120px' }}
                    />
                    <p className="text-xs text-muted mt-2">Days after event ends before payout becomes available for withdrawal. Set to 0 for immediate availability.</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <Button variant="primary" size="md" onClick={handleSavePayouts} disabled={saving === 'payouts'}>
                        {saving === 'payouts' ? 'Saving...' : 'Save Payout Settings'}
                    </Button>
                    <SaveFeedback message={feedback.payouts ?? null} />
                </div>
            </div>

            {/* Platform Promo Codes */}
            <div className={sectionClass}>
                <h2 className="text-sm font-medium text-text mb-4">Platform-wide Promo Codes</h2>
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                        <label className={labelClass}>Code</label>
                        <input type="text" placeholder="SAVE20" value={promoCode} onChange={e => setPromoCode(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Discount Type</label>
                        <select value={promoType} onChange={e => setPromoType(e.target.value as 'percent' | 'fixed')} className={inputClass}>
                            <option value="percent">Percentage (%)</option>
                            <option value="fixed">Fixed Amount (£)</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>Discount Value</label>
                        <input type="number" step="0.01" placeholder={promoType === 'percent' ? '20' : '5.00'} value={promoValue} onChange={e => setPromoValue(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Max Uses (leave blank for unlimited)</label>
                        <input type="number" placeholder="100" value={promoMaxUses} onChange={e => setPromoMaxUses(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Valid From</label>
                        <input type="date" value={promoValidFrom} onChange={e => setPromoValidFrom(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Valid To</label>
                        <input type="date" value={promoValidTo} onChange={e => setPromoValidTo(e.target.value)} className={inputClass} />
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <Button variant="primary" size="md" onClick={handleCreatePromo} disabled={saving === 'promo' || !promoCode.trim() || !promoValue}>
                        {saving === 'promo' ? 'Creating...' : 'Create Promo Code'}
                    </Button>
                    <SaveFeedback message={feedback.promo ?? null} />
                </div>

                {promoCodes.length > 0 && (
                    <div className="mt-6">
                        <h3 className="text-xs text-muted uppercase tracking-wider mb-3">Active Platform Codes</h3>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border">
                                    {['Code', 'Discount', 'Uses', 'Valid To'].map(h => (
                                        <th key={h} className="text-left text-xs text-muted py-2 font-normal">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {promoCodes.map(p => (
                                    <tr key={p.id} className="border-b border-border/50">
                                        <td className="py-2 font-mono text-accent text-xs">{p.code}</td>
                                        <td className="py-2 text-text text-xs">
                                            {p.discount_type === 'percent' ? `${p.discount_value}%` : `£${(p.discount_value / 100).toFixed(2)}`}
                                        </td>
                                        <td className="py-2 text-text text-xs">{p.uses_count}{p.max_uses ? ` / ${p.max_uses}` : ''}</td>
                                        <td className="py-2 text-muted text-xs">{p.valid_to ? fmt(p.valid_to) : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Analytics */}
            <div className={sectionClass}>
                <h2 className="text-sm font-medium text-text mb-4">Analytics</h2>
                <div className="mb-4">
                    <label className={labelClass}>Meta (Facebook) Pixel ID</label>
                    <input
                        type="text"
                        value={metaPixelId}
                        onChange={e => setMetaPixelId(e.target.value.replace(/\D/g, ''))}
                        placeholder="e.g. 1234567890"
                        maxLength={20}
                        className={inputClass}
                    />
                    <p className="text-xs text-muted mt-1.5">Platform-wide Meta Pixel. Fires on every page for Hexlura&apos;s own ad tracking.</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <Button variant="primary" size="md" onClick={handleSaveAnalytics} disabled={saving === 'analytics'}>
                        {saving === 'analytics' ? 'Saving...' : 'Save Analytics Settings'}
                    </Button>
                    <SaveFeedback message={feedback.analytics ?? null} />
                </div>
            </div>

            {/* Email Config */}
            <div className={sectionClass}>
                <h2 className="text-sm font-medium text-text mb-4">Email Configuration</h2>
                <div className="grid grid-cols-1 gap-4 mb-4">
                    <div>
                        <label className={labelClass}>From Name</label>
                        <input type="text" value={fromName} onChange={e => setFromName(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>From Email Address</label>
                        <input type="email" value={fromEmail} onChange={e => setFromEmail(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Support Email</label>
                        <input type="email" value={supportEmail} onChange={e => setSupportEmail(e.target.value)} className={inputClass} />
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <Button variant="primary" size="md" onClick={handleSaveEmail} disabled={saving === 'email'}>
                        {saving === 'email' ? 'Saving...' : 'Save Email Settings'}
                    </Button>
                    <SaveFeedback message={feedback.email ?? null} />
                </div>
            </div>
        </div>
    )
}
