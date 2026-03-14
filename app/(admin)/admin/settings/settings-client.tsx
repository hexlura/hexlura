'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

const UK_CITIES = ['London', 'Manchester', 'Birmingham', 'Bristol', 'Edinburgh', 'Leeds', 'Liverpool', 'Glasgow', 'Newcastle', 'Cardiff', 'Sheffield', 'Nottingham']

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
    const [feePercent, setFeePercent] = useState(settings['booking_fee_percent'] ?? '5')
    const [feeFixed, setFeeFixed] = useState(settings['booking_fee_fixed_pence'] ?? '49')
    const [feeMin, setFeeMin] = useState(String((parseInt(settings['booking_fee_min_pence'] ?? '99') / 100).toFixed(2)))
    const [feeMax, setFeeMax] = useState(String((parseInt(settings['booking_fee_max_pence'] ?? '500') / 100).toFixed(2)))

    // Homepage settings
    const [maxFeatured, setMaxFeatured] = useState(settings['max_featured_slots'] ?? '6')
    const currentCities = (settings['featured_cities'] ?? '').split(',').filter(Boolean)
    const [selectedCities, setSelectedCities] = useState<string[]>(currentCities)
    const [maintenanceMode, setMaintenanceMode] = useState(settings['maintenance_mode'] === 'true')

    // Organiser settings
    const [autoApprove, setAutoApprove] = useState(settings['auto_approve_organisers'] === 'true')

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
    const [toastMsg, setToastMsg] = useState<string | null>(null)

    function showToast(msg: string) {
        setToastMsg(msg)
        setTimeout(() => setToastMsg(null), 3000)
    }

    async function saveSetting(key: string, value: string) {
        await fetch('/api/admin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, value }),
        })
    }

    async function handleSaveFees() {
        setSaving('fees')
        await Promise.all([
            saveSetting('booking_fee_percent', feePercent),
            saveSetting('booking_fee_fixed_pence', feeFixed),
            saveSetting('booking_fee_min_pence', String(Math.round(parseFloat(feeMin) * 100))),
            saveSetting('booking_fee_max_pence', String(Math.round(parseFloat(feeMax) * 100))),
        ])
        setSaving(null)
        showToast('Fee settings saved')
        router.refresh()
    }

    async function handleSaveHomepage() {
        setSaving('homepage')
        await Promise.all([
            saveSetting('max_featured_slots', maxFeatured),
            saveSetting('featured_cities', selectedCities.join(',')),
            saveSetting('maintenance_mode', maintenanceMode ? 'true' : 'false'),
        ])
        setSaving(null)
        showToast('Homepage settings saved')
        router.refresh()
    }

    async function handleSaveOnboarding() {
        setSaving('onboarding')
        await saveSetting('auto_approve_organisers', autoApprove ? 'true' : 'false')
        setSaving(null)
        showToast('Onboarding settings saved')
        router.refresh()
    }

    async function handleSaveEmail() {
        setSaving('email')
        await Promise.all([
            saveSetting('from_name', fromName),
            saveSetting('from_email', fromEmail),
            saveSetting('support_email', supportEmail),
        ])
        setSaving(null)
        showToast('Email settings saved')
        router.refresh()
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
        showToast('Promo code created')
        router.refresh()
    }

    function toggleCity(city: string) {
        setSelectedCities(prev => prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city])
    }

    const sectionClass = "bg-card border border-border rounded-xl p-6 mb-6"
    const labelClass = "text-xs text-muted block mb-1"
    const inputClass = "w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"

    return (
        <div className="max-w-3xl">
            {toastMsg && (
                <div className="fixed top-4 right-4 z-50 bg-success/20 border border-success/40 text-success px-4 py-2 rounded-lg text-sm">
                    {toastMsg}
                </div>
            )}

            <div className="mb-8">
                <h1 className="font-heading text-4xl text-text tracking-wide">SETTINGS</h1>
                <p className="text-muted text-sm mt-1">Platform configuration</p>
            </div>

            {/* Fees */}
            <div className={sectionClass}>
                <h2 className="text-sm font-medium text-text mb-4">Platform Fees</h2>
                <p className="text-xs text-gold mb-4">Note: Fee changes apply to new bookings only</p>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className={labelClass}>Booking Fee % (per ticket)</label>
                        <input type="number" step="0.1" value={feePercent} onChange={e => setFeePercent(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Fixed Fee per Ticket (pence)</label>
                        <input type="number" value={feeFixed} onChange={e => setFeeFixed(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Minimum Fee per Ticket (£)</label>
                        <input type="number" step="0.01" value={feeMin} onChange={e => setFeeMin(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Maximum Fee per Ticket (£)</label>
                        <input type="number" step="0.01" value={feeMax} onChange={e => setFeeMax(e.target.value)} className={inputClass} />
                    </div>
                </div>
                <Button variant="primary" size="md" onClick={handleSaveFees} disabled={saving === 'fees'}>
                    {saving === 'fees' ? 'Saving...' : 'Save Fee Settings'}
                </Button>
            </div>

            {/* Homepage */}
            <div className={sectionClass}>
                <h2 className="text-sm font-medium text-text mb-4">Homepage</h2>
                <div className="mb-4">
                    <label className={labelClass}>Max Featured Event Slots</label>
                    <input type="number" min="1" max="20" value={maxFeatured} onChange={e => setMaxFeatured(e.target.value)} className={inputClass} style={{ width: '120px' }} />
                </div>
                <div className="mb-4">
                    <label className={labelClass}>Featured UK Cities</label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                        {UK_CITIES.map(city => (
                            <label key={city} className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedCities.includes(city)}
                                    onChange={() => toggleCity(city)}
                                    className="accent-accent"
                                />
                                <span className="text-sm text-text">{city}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <div className="flex items-center justify-between mb-4 py-3 border-y border-border">
                    <div>
                        <p className="text-sm text-text">Maintenance Mode</p>
                        <p className="text-xs text-muted">Public routes show maintenance page. Admins bypass.</p>
                    </div>
                    <button
                        onClick={() => setMaintenanceMode(!maintenanceMode)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${maintenanceMode ? 'bg-accent' : 'bg-border'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${maintenanceMode ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
                <Button variant="primary" size="md" onClick={handleSaveHomepage} disabled={saving === 'homepage'}>
                    {saving === 'homepage' ? 'Saving...' : 'Save Homepage Settings'}
                </Button>
            </div>

            {/* Organiser Onboarding */}
            <div className={sectionClass}>
                <h2 className="text-sm font-medium text-text mb-4">Organiser Onboarding</h2>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-sm text-text">Auto-approve Organisers</p>
                        <p className="text-xs text-muted">Skip manual review for new organiser applications</p>
                    </div>
                    <button
                        onClick={() => setAutoApprove(!autoApprove)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoApprove ? 'bg-accent' : 'bg-border'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoApprove ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
                <p className="text-xs text-muted mb-4">Current mode: <strong className="text-text">{autoApprove ? 'Auto-approve' : 'Manual Review'}</strong></p>
                <Button variant="primary" size="md" onClick={handleSaveOnboarding} disabled={saving === 'onboarding'}>
                    {saving === 'onboarding' ? 'Saving...' : 'Save Onboarding Settings'}
                </Button>
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
                <Button variant="primary" size="md" onClick={handleCreatePromo} disabled={saving === 'promo' || !promoCode.trim() || !promoValue}>
                    {saving === 'promo' ? 'Creating...' : 'Create Promo Code'}
                </Button>

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
                <Button variant="primary" size="md" onClick={handleSaveEmail} disabled={saving === 'email'}>
                    {saving === 'email' ? 'Saving...' : 'Save Email Settings'}
                </Button>
            </div>
        </div>
    )
}
